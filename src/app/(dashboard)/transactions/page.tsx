import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatCOP } from "@/lib/money";

export default async function TransactionsPage() {
  const user = await requireUser();
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { occurredAt: "desc" },
    take: 100,
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      occurredAt: true,
      source: true,
      needsReview: true,
      category: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Movimientos</h1>
      {transactions.length === 0 ? (
        <p className="text-sm opacity-60">
          Aún no hay movimientos. Registra el primero desde el atajo de iOS.
        </p>
      ) : (
        <ul className="divide-y divide-black/10 text-sm dark:divide-white/15">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2">
              <span>
                {t.description}
                {t.needsReview && <span className="ml-2 text-xs opacity-50">revisar</span>}
                <span className="block text-xs opacity-50">
                  {t.category?.name ?? "Sin categoría"} · {t.occurredAt.toLocaleDateString("es-CO")}
                </span>
              </span>
              <span className={t.type === "INCOME" ? "text-[#1d9e75]" : ""}>
                {t.type === "INCOME" ? "+" : "−"}
                {formatCOP(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
