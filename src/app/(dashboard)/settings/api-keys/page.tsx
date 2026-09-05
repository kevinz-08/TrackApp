import { listApiKeys } from "@/actions/settings";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { PageHeader } from "@/components/nav/page-header";

export const metadata = { title: "API Keys — TrackApp" };

export default async function ApiKeysPage() {
  const keys = await listApiKeys();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tokens para Atajos"
        hint={
          <>
            Cada token solo habilita <code className="text-ink font-mono">/api/quick-log</code>. No
            sirve para leer datos ni para el chat, y se muestra una sola vez.
          </>
        }
      />
      <ApiKeyManager keys={keys} />
    </div>
  );
}
