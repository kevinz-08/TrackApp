import Link from "next/link";
import { ChevronRight, KeyRound, Repeat, Tags } from "lucide-react";
import { Card } from "@/components/ui/surface";
import { PageHeader } from "@/components/nav/page-header";
import { PushSettings } from "@/components/pwa/push-settings";

export const metadata = { title: "Ajustes — TrackApp" };

const ITEMS = [
  {
    href: "/subscriptions",
    label: "Suscripciones",
    hint: "Inventario y coste anual de los cobros recurrentes",
    icon: Repeat,
  },
  {
    href: "/categories",
    label: "Categorías",
    hint: "Nombres, colores y categorías propias",
    icon: Tags,
  },
  {
    href: "/settings/api-keys",
    label: "Tokens para Atajos",
    hint: "La credencial del botón de acción del iPhone",
    icon: KeyRound,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Ajustes" />

      <PushSettings vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />

      <Card className="divide-hairline divide-y">
        {ITEMS.map(({ href, label, hint, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="active:bg-sunken duration-base ease-standard flex min-h-14 items-center gap-3 px-4 py-3 transition-colors"
          >
            <Icon className="text-ink-3 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="text-ink block text-sm">{label}</span>
              <span className="text-ink-3 block truncate text-[11.5px]">{hint}</span>
            </span>
            <ChevronRight className="text-ink-3 size-4 shrink-0" aria-hidden />
          </Link>
        ))}
      </Card>
    </div>
  );
}
