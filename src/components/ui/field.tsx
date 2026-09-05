import { cn } from "@/lib/utils";

/**
 * Campos de formulario del sistema monocromo.
 *
 * El campo hundido (`bg-sunken`) sobre superficie elevada es lo que lo hace
 * legible como zona editable sin recurrir a un color de acento. El foco se
 * marca con un anillo de tinta, no con un halo de color.
 *
 * `min-h-11` en todos los controles: 44pt es el mínimo táctil de iOS.
 */
const CONTROL = [
  "w-full rounded-btn bg-sunken border border-transparent px-3.5 py-3 min-h-11",
  "text-ink text-control placeholder:text-ink-3",
  "transition-[border-color,background-color] duration-base ease-standard",
  "focus:border-ink focus:outline-none",
  "disabled:opacity-50",
].join(" ");

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-ink-2 block text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-ink-3 block text-[11.5px]">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

/**
 * Selector de tipo: ingreso o egreso. Es un grupo de radios, no un toggle,
 * porque las dos opciones son igual de válidas y ninguna es "el estado apagado".
 */
export function SegmentedField({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div role="radiogroup" className="bg-sunken rounded-btn flex gap-1 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "rounded-chip flex min-h-9 flex-1 cursor-pointer items-center justify-center text-[13px] font-semibold",
              "duration-base ease-standard transition-[background-color,color]",
              active ? "bg-surface text-ink shadow-sm" : "text-ink-2",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
