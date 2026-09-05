import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defineTool, modelAmount } from "./define";
import {
  simulateInstallments,
  simulateMinimumPayment,
  utilization,
} from "@/services/finance/credit";

/** Resuelve la tarjeta por nombre parcial; sin nombre, la primera del usuario. */
async function findCard(userId: string, name?: string) {
  return prisma.creditCard.findFirst({
    where: { userId, ...(name && { name: { contains: name, mode: "insensitive" } }) },
    select: {
      name: true,
      annualRate: true,
      currentDebt: true,
      creditLimit: true,
      statementDay: true,
      paymentDay: true,
    },
  });
}

const simularDiferido = defineTool({
  name: "simularDiferido",
  description:
    "Calcula el costo real de diferir una compra a cuotas con la tasa de la tarjeta: cuota mensual, total pagado, intereses y sobrecosto porcentual. Usala SIEMPRE antes de opinar sobre si conviene diferir algo; nunca estimes tu los intereses.",
  schema: z.object({
    monto: modelAmount,
    cuotas: z.number().int().min(1).max(60),
    tarjeta: z.string().optional().describe("Nombre de la tarjeta; si se omite se usa la primera"),
  }),
  async run({ monto, cuotas, tarjeta }, { userId }) {
    const card = await findCard(userId, tarjeta);
    if (!card) return { error: "El usuario no tiene tarjetas de crédito registradas" };

    const plan = simulateInstallments(Math.round(monto), cuotas, card.annualRate);
    return {
      tarjeta: card.name,
      tasaEfectivaAnual: card.annualRate,
      cuotas: plan.installments,
      cuotaMensual: plan.monthlyPayment,
      totalPagado: plan.totalPaid,
      intereses: plan.totalInterest,
      sobrecostoPct: plan.overpayPercent,
    };
  },
});

const simularPagoMinimo = defineTool({
  name: "simularPagoMinimo",
  description:
    "Proyecta qué pasa si el usuario paga solo el mínimo de la tarjeta: cuántos meses tarda, cuánto paga en intereses, y si la deuda no termina nunca. Úsala cuando mencionen el pago mínimo o pregunten cuánto tardarán en salir de la deuda.",
  schema: z.object({
    deuda: modelAmount.optional().describe("Deuda a proyectar; si se omite se usa la real"),
    tarjeta: z.string().optional(),
    porcentajeMinimo: z.number().min(0.01).max(1).default(0.05),
  }),
  async run({ deuda, tarjeta, porcentajeMinimo }, { userId }) {
    const card = await findCard(userId, tarjeta);
    if (!card) return { error: "El usuario no tiene tarjetas de crédito registradas" };

    const debt = Math.round(deuda ?? card.currentDebt);
    if (debt <= 0) return { tarjeta: card.name, mensaje: "Esa tarjeta no tiene deuda pendiente" };

    const p = simulateMinimumPayment(debt, card.annualRate, porcentajeMinimo);
    return {
      tarjeta: card.name,
      deuda: debt,
      meses: p.months,
      totalPagado: p.totalPaid,
      intereses: p.totalInterest,
      // El caso en que el mínimo no cubre ni los intereses es la lección más
      // importante del módulo: se devuelve como bandera explícita para que el
      // modelo no tenga que deducirlo de una tabla de 600 filas.
      nuncaTermina: p.neverEnds,
    };
  },
});

const estadoTarjetas = defineTool({
  name: "estadoTarjetas",
  description:
    "Devuelve deuda, cupo, utilización y días que faltan para el corte y para el pago de cada tarjeta. Úsala cuando pregunten por sus tarjetas o cuando el momento de una compra importe.",
  schema: z.object({}),
  async run(_args, { userId }) {
    const cards = await prisma.creditCard.findMany({
      where: { userId },
      select: {
        name: true,
        currentDebt: true,
        creditLimit: true,
        statementDay: true,
        paymentDay: true,
        annualRate: true,
      },
    });

    const now = new Date();
    const daysUntil = (day: number) => {
      const next = new Date(now.getFullYear(), now.getMonth(), day);
      if (next < now) next.setMonth(next.getMonth() + 1);
      return Math.ceil((next.getTime() - now.getTime()) / 86_400_000);
    };

    return cards.map((c) => ({
      nombre: c.name,
      deuda: c.currentDebt,
      cupo: c.creditLimit,
      utilizacionPct: utilization(c.currentDebt, c.creditLimit),
      tasaEfectivaAnual: c.annualRate,
      // El corte importa ANTES de comprar: lo que pase después cae al siguiente
      // extracto y se paga un mes más tarde.
      diasParaCorte: daysUntil(c.statementDay),
      diasParaPago: daysUntil(c.paymentDay),
    }));
  },
});

export const creditTools = [simularDiferido, simularPagoMinimo, estadoTarjetas];
