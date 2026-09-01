"use client";

import { formatCOP } from "@/lib/money";
import { goalProgress } from "@/services/finance/goals";
import { cn } from "@/lib/utils";

export type GoalView = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  imageUrl: string | null;
  imagePublicId: string | null;
  targetDate: string | null;
  completedAt: string | null;
  monthlyPace: number | null;
};

/**
 * Tarjeta de meta. La imagen es el motivo por el que el usuario ahorra, así que
 * ocupa toda la tarjeta y el texto va encima; sin imagen la tarjeta es plana y
 * no finge una vacía con un marcador de posición.
 *
 * Sobre la imagen SIEMPRE va un velo oscuro: no se puede saber qué foto subirá
 * el usuario, y sin velo el texto blanco es ilegible sobre un cielo claro.
 */
export function GoalCard({ goal, onOpen }: { goal: GoalView; onOpen: () => void }) {
  const pct = goalProgress(goal.currentAmount, goal.targetAmount);
  const done = Boolean(goal.completedAt);
  const hasImage = Boolean(goal.imageUrl);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "rounded-card border-hairline relative w-full overflow-hidden border text-left",
        "transition-transform duration-base ease-standard active:scale-[0.99]",
        hasImage ? "text-white" : "bg-surface text-ink",
      )}
    >
      {hasImage && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary
              sirve la imagen ya optimizada y su host no está en next.config */}
          <img
            src={goal.imageUrl!}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
          <div aria-hidden className="absolute inset-0 bg-black/55" />
        </>
      )}

      <div className="relative space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-semibold">{goal.name}</p>
          <span
            className={cn(
              "shrink-0 text-[11px] font-semibold tracking-[0.14em] uppercase",
              hasImage ? "text-white/70" : "text-ink-3",
            )}
          >
            {done ? "Cumplida" : `${pct}%`}
          </span>
        </div>

        <div>
          <p className="text-[22px] font-bold tabular-nums">{formatCOP(goal.currentAmount)}</p>
          <p className={cn("text-[12px]", hasImage ? "text-white/70" : "text-ink-3")}>
            de {formatCOP(goal.targetAmount)}
          </p>
        </div>

        {/* La barra se dibuja con scaleX para que anime en el compositor. */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Avance de ${goal.name}`}
          className={cn(
            "h-1.5 w-full overflow-hidden rounded-full",
            hasImage ? "bg-white/25" : "bg-sunken",
          )}
        >
          <div
            className={cn(
              "duration-base ease-standard h-full origin-left rounded-full transition-transform",
              hasImage ? "bg-white" : "bg-ink",
            )}
            style={{ transform: `scaleX(${pct / 100})`, width: "100%" }}
          />
        </div>

        <p className={cn("text-[12px]", hasImage ? "text-white/75" : "text-ink-2")}>
          {done
            ? "Meta cumplida."
            : goal.monthlyPace
              ? `Necesitas ${formatCOP(goal.monthlyPace)} al mes para llegar a tiempo.`
              : `Te faltan ${formatCOP(goal.targetAmount - goal.currentAmount)}.`}
        </p>
      </div>
    </button>
  );
}
