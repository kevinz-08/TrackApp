import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/nav/page-header";
import { listCategories } from "@/actions/categories";
import {
  TransactionList,
  type ListedTransaction,
} from "@/components/transactions/transaction-list";
import { NewTransactionButton } from "@/components/transactions/new-transaction-button";

export default async function TransactionsPage() {
  const user = await requireUser();
  const [rows, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { occurredAt: "desc" },
      take: 100,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        categoryId: true,
        occurredAt: true,
        rawInput: true,
        needsReview: true,
        category: { select: { name: true } },
      },
    }),
    listCategories(),
  ]);

  // Las fechas se formatean en el servidor: si el cliente las formatea con su
  // propia zona horaria, la fecha renderizada no coincide con la del SSR y
  // React marca discordancia de hidratación.
  const transactions: ListedTransaction[] = rows.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    categoryId: t.categoryId,
    occurredAt: t.occurredAt.toISOString(),
    rawInput: t.rawInput,
    needsReview: t.needsReview,
    categoryName: t.category?.name ?? null,
    occurredLabel: t.occurredAt.toLocaleDateString("es-CO"),
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Movimientos"
        hint="Los últimos 100. Toca una fila para editarla; deslízala a la izquierda para borrarla."
        action={<NewTransactionButton categories={categories} />}
      />

      {transactions.length === 0 ? (
        <p className="rounded-card border-hairline text-ink-2 border border-dashed px-6 py-10 text-center text-[13px]">
          Aún no hay movimientos. Regístralos desde el atajo de iOS, o toca &ldquo;Nuevo&rdquo;.
        </p>
      ) : (
        <TransactionList transactions={transactions} categories={categories} />
      )}
    </div>
  );
}
