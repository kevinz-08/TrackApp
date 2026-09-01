/**
 * Simuladores del módulo educativo de tarjetas. Son cálculos puros: no tocan la
 * base de datos y pueden ejecutarse en el cliente o en una Server Action.
 */

/** Tasa efectiva anual → tasa mensual equivalente. 0.28 EA ≈ 2.08% mensual. */
export const monthlyRate = (annualRate: number) => Math.pow(1 + annualRate, 1 / 12) - 1;

export type InstallmentPlan = {
  installments: number;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  /** Cuánto se paga de más frente a comprar de contado, en porcentaje. */
  overpayPercent: number;
};

/** Simulador de compras diferidas: el corazón educativo del módulo. */
export function simulateInstallments(
  amount: number,
  installments: number,
  annualRate: number,
): InstallmentPlan {
  const i = monthlyRate(annualRate);
  const monthlyPayment =
    i === 0 ? amount / installments : (amount * i) / (1 - Math.pow(1 + i, -installments));

  const totalPaid = Math.round(monthlyPayment * installments);
  return {
    installments,
    monthlyPayment: Math.round(monthlyPayment),
    totalPaid,
    totalInterest: totalPaid - amount,
    overpayPercent: amount > 0 ? Math.round(((totalPaid - amount) / amount) * 100) : 0,
  };
}

export type MinimumPaymentProjection = {
  months: number;
  totalPaid: number;
  totalInterest: number;
  neverEnds: boolean;
  schedule: Array<{ month: number; balance: number; interest: number }>;
};

/**
 * Simulador de pago mínimo: la lección más importante que la mayoría de
 * usuarios nunca recibe. Si el mínimo no cubre los intereses, la deuda no baja
 * nunca — y eso hay que mostrarlo explícitamente.
 */
export function simulateMinimumPayment(
  debt: number,
  annualRate: number,
  minimumPercent = 0.05,
  maxMonths = 600,
): MinimumPaymentProjection {
  const i = monthlyRate(annualRate);
  const schedule: MinimumPaymentProjection["schedule"] = [];

  /*
   * Si el pago mínimo no supera a la tasa mensual, la deuda NUNCA baja: cada
   * mes se paga menos de lo que se genera. Es una propiedad de los dos
   * porcentajes, no del saldo, así que se decide antes de simular.
   *
   * Esta comprobación va aquí y no dentro del bucle a propósito. Hacerla por
   * iteración da un falso positivo en la cola: con saldos de pocos pesos el
   * redondeo a enteros iguala pago e interés (1 contra 1) y una deuda de 27
   * pesos se reportaba como "nunca se acaba".
   */
  if (minimumPercent <= i) {
    return { months: 0, totalPaid: 0, totalInterest: 0, neverEnds: true, schedule };
  }

  let balance = debt;
  let totalPaid = 0;
  let totalInterest = 0;
  let month = 0;

  // Se corta en el último peso: por debajo de eso el saldo es polvo de
  // redondeo, no deuda.
  while (balance >= 1 && month < maxMonths) {
    month++;
    const interest = Math.round(balance * i);
    // El pago cubre al menos el interés más un peso, para que la aritmética
    // entera no estanque la cola de la amortización.
    const payment = Math.min(balance + interest, Math.max(Math.round(balance * minimumPercent), interest + 1));

    balance = balance + interest - payment;
    totalPaid += payment;
    totalInterest += interest;
    if (month <= 120) schedule.push({ month, balance: Math.round(balance), interest });
  }

  return {
    months: month,
    totalPaid: Math.round(totalPaid),
    totalInterest: Math.round(totalInterest),
    neverEnds: month >= maxMonths,
    schedule,
  };
}

/** Porcentaje de cupo usado. Mantenerlo bajo importa para el historial crediticio. */
export const utilization = (currentDebt: number, creditLimit: number) =>
  creditLimit <= 0 ? 0 : Math.round((currentDebt / creditLimit) * 100);
