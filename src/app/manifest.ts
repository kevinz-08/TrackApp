import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` fija la identidad de la app: sin él, cambiar `start_url` en el
    // futuro haría que el navegador la trate como una app distinta y el usuario
    // acabaría con dos iconos instalados.
    id: "/",
    name: "TrackApp",
    short_name: "TrackApp",
    description: "Control de gastos sin fricción",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f3",
    theme_color: "#0a0a0b",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
