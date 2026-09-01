import { listApiKeys } from "@/actions/settings";
import { ApiKeyManager } from "@/components/settings/api-key-manager";

export const metadata = { title: "API Keys — TrackApp" };

export default async function ApiKeysPage() {
  const keys = await listApiKeys();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Tokens para Atajos</h1>
        <p className="text-sm opacity-60">
          Cada token solo habilita <code>/api/quick-log</code>. No sirve para leer datos ni
          para el chat, y se muestra una sola vez.
        </p>
      </div>
      <ApiKeyManager keys={keys} />
    </div>
  );
}
