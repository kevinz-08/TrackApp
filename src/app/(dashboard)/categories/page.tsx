import { listCategories, categoryUsage } from "@/actions/categories";
import { PageHeader } from "@/components/nav/page-header";
import { CategoryManager } from "@/components/categories/category-manager";

export const metadata = { title: "Categorías — TrackApp" };

export default async function CategoriesPage() {
  const [categories, usage] = await Promise.all([listCategories(), categoryUsage()]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categorías"
        hint="Toca una para renombrarla o cambiarle el color. El número es cuántos movimientos la usan."
      />

      <CategoryManager categories={categories} usage={usage} />
    </div>
  );
}
