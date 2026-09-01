"use client";

import { useState, useTransition } from "react";
import { generateApiKey, revokeApiKey } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, MicroLabel } from "@/components/ui/surface";

type KeyRow = {
  id: string;
  name: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export function ApiKeyManager({ keys }: { keys: KeyRow[] }) {
  const [name, setName] = useState("iPhone — botón de acción");
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del token"
          className="rounded-btn border-hairline bg-surface text-ink duration-fast ease-standard focus:border-ink min-w-0 flex-1 border px-3.5 py-3 text-sm transition-colors"
        />
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await generateApiKey(name);
              setToken(res.token);
            })
          }
        >
          Generar
        </Button>
      </div>

      {token && (
        /* Borde de tinta, no de color: en el sistema monocromo lo urgente se
           marca con contraste, no con matiz. */
        <Card className="animate-rise border-ink p-4">
          <MicroLabel className="text-ink">Cópialo ahora — no vuelve a mostrarse</MicroLabel>
          <code className="text-ink mt-2 block font-mono text-[12.5px] break-all">{token}</code>
        </Card>
      )}

      <ul className="flex flex-col gap-1.5">
        {keys.map((k) => (
          <li key={k.id}>
            <Card className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="text-ink block truncate text-sm">{k.name}</span>
                <span className="text-ink-3 block truncate text-[11.5px]">
                  {k.revokedAt
                    ? "Revocado"
                    : k.lastUsedAt
                      ? `Último uso: ${new Date(k.lastUsedAt).toLocaleString("es-CO")}`
                      : "Sin usar"}
                </span>
              </span>
              {!k.revokedAt && (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => startTransition(() => revokeApiKey(k.id))}
                  disabled={pending}
                >
                  Revocar
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
