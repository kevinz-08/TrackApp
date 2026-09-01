import { formatCOP, splitCOP } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * La cifra es la figura principal del producto: el usuario abre la app con una
 * pregunta de una sola respuesta —cuánto me queda—, y esa respuesta es un
 * número, no una curva.
 *
 * Tres tamaños de la escala tipográfica (§1.4). `xl` es única por pantalla: la
 * segunda cifra grande destruye la jerarquía de la primera.
 */
const SIZES = {
  xl: "text-[44px] leading-none tracking-[-0.035em] font-bold",
  lg: "text-[32px] leading-[34px] tracking-[-0.03em] font-bold",
  md: "text-xl leading-6 tracking-[-0.01em] font-semibold",
} as const;

export function Money({
  amount,
  size = "xl",
  sign = false,
  className,
}: {
  amount: number;
  size?: keyof typeof SIZES;
  /** Muestra `+` / `−`. La polaridad va en el glifo, nunca en el color. */
  sign?: boolean;
  className?: string;
}) {
  const { sign: minus, currency, lead, tail } = splitCOP(amount);
  const prefix = sign ? (minus ? "−" : "+") : minus;

  return (
    <p className={cn("text-ink flex items-baseline gap-px tabular-nums", SIZES[size], className)}>
      {/* El monto completo para lectores de pantalla: el troceado es visual. */}
      <span className="sr-only">{formatCOP(amount)}</span>
      <span aria-hidden className="flex items-baseline gap-px">
        {prefix && <span className="text-ink-3">{prefix}</span>}
        <span className="text-ink-3 translate-y-[-0.1em] text-[0.5em] font-medium tracking-normal">
          {currency}
        </span>
        {lead}
        {tail && <span className="text-ink-3 text-[0.55em] font-medium">{tail}</span>}
      </span>
    </p>
  );
}

/**
 * Monto de lista: mismo peso para ingresos y egresos, alineado a la derecha y
 * tabular. Cambiar el peso para marcar egresos crea una jerarquía falsa donde
 * el gasto más reciente parece el más importante.
 */
export function MoneyInline({
  amount,
  income = false,
  className,
}: {
  amount: number;
  income?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("text-ink shrink-0 text-sm tabular-nums", className)}>
      {income ? "+" : "−"}
      {formatCOP(Math.abs(amount))}
    </span>
  );
}
