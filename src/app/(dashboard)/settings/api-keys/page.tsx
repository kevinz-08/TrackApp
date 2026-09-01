import { listApiKeys } from "@/actions/settings";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { MicroLabel } from "@/components/ui/surface";

export const metadata = { title: "API Keys — TrackApp" };

export default async function ApiKeysPage() {
  const keys = await listApiKeys();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <MicroLabel>Tokens para Atajos</MicroLabel>
        <p className="text-ink-2 max-w-[60ch] text-[13px] leading-[18px]">
          Cada token solo habilita <code className="text-ink font-mono">/api/quick-log</code>. No
          sirve para leer datos ni para el chat, y se muestra una sola vez.
        </p>
      </div>
      <ApiKeyManager keys={keys} />
    </div>
  );
}
