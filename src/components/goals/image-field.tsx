"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Cloudinary rechaza por encima de 10 MB en la capa gratuita; cortamos antes. */
const MAX_BYTES = 8 * 1024 * 1024;

export type UploadedImage = { url: string; publicId: string };

/**
 * Sube la imagen de la meta DIRECTAMENTE del navegador a Cloudinary, firmada
 * por nuestro backend. El archivo nunca pasa por el servidor: en Vercel Hobby
 * el cuerpo de una función está limitado y una foto de móvil lo agota.
 *
 * Degrada con elegancia: si Cloudinary no está configurado el endpoint de firma
 * responde 503 y aquí se explica en vez de romper el formulario. La meta se
 * puede crear igual, solo que sin imagen.
 */
export function ImageField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (image: UploadedImage | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setError("La imagen pesa más de 8 MB. Elige una más liviana.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const signRes = await fetch("/api/cloudinary/sign", { method: "POST" });
      if (signRes.status === 503) {
        setError("Falta configurar Cloudinary. Puedes guardar la meta sin imagen.");
        return;
      }
      if (!signRes.ok) throw new Error("firma");
      const sign = await signRes.json();

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sign.apiKey);
      body.append("timestamp", String(sign.timestamp));
      body.append("folder", sign.folder);
      body.append("signature", sign.signature);

      const up = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
        method: "POST",
        body,
      });
      if (!up.ok) throw new Error("upload");
      const json = await up.json();
      onChange({ url: json.secure_url, publicId: json.public_id });
    } catch {
      setError("No se pudo subir la imagen. La meta se puede guardar sin ella.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-ink-2 block text-[13px] font-medium">Imagen</span>

      {value ? (
        <div className="rounded-btn relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- host externo */}
          <img src={value} alt="" className="h-28 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar imagen"
            className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/60 text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          block
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <ImagePlus className="size-4" aria-hidden />
          {busy ? "Subiendo…" : "Elegir imagen"}
        </Button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pick(file);
          e.target.value = ""; // permite volver a elegir el mismo archivo
        }}
      />

      {error && <p className="text-ink-3 text-[12px]">{error}</p>}
    </div>
  );
}
