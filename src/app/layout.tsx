import type { Metadata, Viewport } from "next";
import { KeyboardInset } from "@/components/ui/keyboard-inset";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackApp",
  description: "Control de gastos sin fricción",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TrackApp" },
  /**
   * iOS ignora por completo los iconos del manifest: para el icono de la
   * pantalla de inicio lee `apple-touch-icon`, y sin él usa una captura de la
   * página. Como iOS es el cliente principal del producto, esta etiqueta no es
   * opcional. Tampoco admite `maskable`: recorta a su propio radio, así que el
   * PNG va a sangre y sin esquinas redondeadas propias.
   */
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  /* La barra de estado se funde con el fondo de página de cada tema. */
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Sin webfont: la tipografía es SF Pro en iOS, que ya está en el dispositivo.
 * Además de ahorrar una descarga en la ruta crítica —la hipótesis del producto
 * son cinco segundos—, SF cambia de diseño óptico entre Text y Display a los
 * 20pt, y esa óptica es lo que sostiene una jerarquía sin color acento.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className="h-full antialiased">
      <body className="bg-ground text-ink flex min-h-full flex-col font-sans">
        <KeyboardInset />
        {children}
      </body>
    </html>
  );
}
