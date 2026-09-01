import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Anatomía del press (§3.3): escala 0.97 —nunca menos, por debajo de 0.94 el
 * botón parece hundirse en el papel— más un salto de luminancia de un peldaño.
 *
 * El release usa duración base (220ms) y el press es instantáneo (80ms). Esa
 * asimetría entre un press inmediato y un release con frenado es exactamente lo
 * que se percibe como material de calidad; simétrico se siente mecánico.
 *
 * Solo se anima `transform`: el cambio de luminancia va por `brightness`, que
 * el compositor resuelve sin repintar el layout.
 */
const button = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-btn font-semibold",
    "min-h-11 select-none", // 44pt: el mínimo táctil de iOS, no una sugerencia
    "transition-[transform,filter] duration-base ease-standard",
    "active:scale-[0.97] active:duration-instant",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-ground active:brightness-[1.4] dark:active:brightness-[0.84]",
        ghost: "border border-hairline bg-transparent text-ink active:bg-sunken",
        quiet: "text-ink-2 active:text-ink",
      },
      size: {
        md: "px-5 py-3.5 text-[15px]",
        sm: "min-h-9 rounded-chip px-3.5 py-2 text-[13px]",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export function Button({
  className,
  variant,
  size,
  block,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size, block }), className)} {...props} />;
}

export const buttonClass = button;
