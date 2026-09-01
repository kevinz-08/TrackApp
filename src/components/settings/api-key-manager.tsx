"use client";

import { useState, useTransition } from "react";
import { generateApiKey, revokeApiKey } from "@/actions/settings";

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
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20"
        />
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await generateApiKey(name);
              setToken(res.token);
            })
          }
          className="rounded-lg bg-[#1d9e75] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Generar
        </button>
      </div>

      {token && (
        <div className="rounded-lg border border-[#1d9e75] p-3 text-sm">
          <p className="mb-1 font-medium">Cópialo ahora: no volverá a mostrarse.</p>
          <code className="break-all">{token}</code>
        </div>
      )}

      <ul className="divide-y divide-black/10 text-sm dark:divide-white/15">
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between py-2">
            <span>
              {k.name}
              <span className="block text-xs opacity-50">
                {k.revokedAt
                  ? "Revocado"
                  : k.lastUsedAt
                    ? `Último uso: ${new Date(k.lastUsedAt).toLocaleString("es-CO")}`
                    : "Sin usar"}
              </span>
            </span>
            {!k.revokedAt && (
              <button
                onClick={() => startTransition(() => revokeApiKey(k.id))}
                className="text-xs opacity-60 hover:opacity-100"
              >
                Revocar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
