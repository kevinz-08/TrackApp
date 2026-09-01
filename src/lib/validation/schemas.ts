import { z } from "zod";

/** Todo lo que llega del parsing en lenguaje natural se valida antes de persistir. */
export const amountSchema = z
  .number()
  .int("El monto debe ser un entero (unidad mínima de la moneda)")
  .positive()
  .max(999_999_999_999);

export const quickLogSchema = z.object({
  text: z.string().min(1).max(280),
  type: z.enum(["EXPENSE", "INCOME"]).optional(),
});

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: amountSchema,
  description: z.string().min(1).max(140),
  categoryId: z.string().cuid().nullable().optional(),
  accountId: z.string().cuid().nullable().optional(),
  occurredAt: z.coerce.date().optional(),
  isFixed: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(40),
  kind: z.enum(["INCOME", "EXPENSE"]).default("EXPENSE"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido"),
  icon: z.string().max(40).optional(),
});

export const goalSchema = z.object({
  name: z.string().min(1).max(60),
  targetAmount: amountSchema,
  targetDate: z.coerce.date().optional(),
  imageUrl: z.string().url().optional(),
  imagePublicId: z.string().optional(),
});

export const recurringRuleSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: amountSchema,
  frequency: z.enum(["WEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  dayOfMonth: z.number().int().min(1).max(31).default(1),
  isSubscription: z.boolean().default(false),
  categoryId: z.string().cuid().nullable().optional(),
});

export const creditCardSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(140).optional(),
  creditLimit: z.number().int().min(0),
  currentDebt: z.number().int().min(0),
  statementDay: z.number().int().min(1).max(31),
  paymentDay: z.number().int().min(1).max(31),
  annualRate: z.number().min(0).max(3),
});

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});
