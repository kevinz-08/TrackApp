import { cn } from "@/lib/utils";

/**
 * Marca de TrackApp: las tres barras del icono de la app, con la geometría
 * exacta de `public/icons/icon.svg` (viewBox de 512, extremo derecho redondeado
 * y ordenadas por longitud).
 *
 * Va como SVG en línea y no como <img> por dos razones: hereda `currentColor`,
 * así que la tesela se invierte sola entre temas —tinta con barras del color de
 * la página—, y no cuesta una petición en la ruta crítica.
 */
const BARS = [
  "M 102.4 142.336 H 393.87136 A 15.72864 15.72864 0 0 1 409.6 158.06464 V 175.75936 A 15.72864 15.72864 0 0 1 393.87136 191.488 H 102.4 Z",
  "M 102.4 231.424 H 246.41536 A 15.72864 15.72864 0 0 1 262.144 247.15264 V 264.84736 A 15.72864 15.72864 0 0 1 246.41536 280.576 H 102.4 Z",
  "M 102.4 320.512 H 329.35936 A 15.72864 15.72864 0 0 1 345.088 336.24064 V 353.93536 A 15.72864 15.72864 0 0 1 329.35936 369.664 H 102.4 Z",
];

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        // La tesela es tinta y las barras son del color de la página: en oscuro
        // se invierte sola sin una segunda versión del arte.
        "bg-ink text-ground grid size-7 shrink-0 place-items-center rounded-[8px]",
        className,
      )}
    >
      <svg viewBox="0 0 512 512" fill="currentColor" className="size-full">
        {BARS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}

/**
 * Lockup de cabecera: marca y palabra. El tracking negativo aprieta la palabra
 * para que su mancha pese lo mismo que la tesela; sin ese ajuste la marca se ve
 * suelta al lado del texto.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-ink text-[15px] font-semibold tracking-[-0.02em]">TrackApp</span>
    </span>
  );
}
