import { listCategories, categoryUsage } from "@/actions/categories";
import { MicroLabel } from "@/components/ui/surface";
import { CategoryManager } from "@/components/categories/category-manager";

export const metadata = { title: "Categorías — TrackApp" };

export default async function CategoriesPage() {
  const [categories, usage] = await Promise.all([listCategories(), categoryUsage()]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <MicroLabel>Categorías</MicroLabel>
        <p className="text-ink-2 text-[13px] leading-[18px]">
          Toca una para renombrarla o cambiarle el color. El número es cuántos
          movimientos la usan.
        </p>
      </div>

      <CategoryManager categories={categories} usage={usage} />
    </div>
  );
}
