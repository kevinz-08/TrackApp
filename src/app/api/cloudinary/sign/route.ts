import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Firma para subir la imagen de una meta directamente desde el cliente a
 * Cloudinary, sin que el archivo pase por el backend.
 */
export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new Response("No autorizado", { status: 401 });

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiSecret || !apiKey || !cloudName) {
    return new Response("Cloudinary no está configurado", { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "trackapp/goals";
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  return NextResponse.json({ timestamp, folder, signature, apiKey, cloudName });
}
