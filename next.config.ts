import type { NextConfig } from "next";

/**
 * Ajustes SOLO de desarrollo para el reenvío de puertos de VS Code.
 *
 * El síntoma: el túnel entrega la petición a `localhost` añadiendo
 * `x-forwarded-host: <algo>.devtunnels.ms`, mientras el navegador sigue
 * mandando `origin: localhost:3000`. Next compara ambos en cada Server Action y
 * al no coincidir la rechaza entera — el login devuelve 500 con "Invalid Server
 * Actions request" y la app es inusable por el túnel.
 *
 * En producción no interviene: en Vercel el host y el `origin` coinciden.
 */
const nextConfig: NextConfig = {
  reactCompiler: true,

  /*
   * Para cuando el navegador carga la URL del túnel directamente: evita el
   * aviso de origen cruzado al pedir los recursos de `/_next/*` en dev. No
   * influye en las Server Actions.
   */
  allowedDevOrigins: ["*.devtunnels.ms"],

  experimental: {
    /*
     * Esto es lo único que desbloquea el login, y conviene entender por qué: no
     * se autoriza el host del túnel, se autoriza el ORIGEN del navegador. Con
     * `localhost:3000` en la lista la comprobación pasa y el `x-forwarded-host`
     * deja de importar.
     *
     * No abre un CSRF: un atacante en evil.com manda `origin: evil.com`, que no
     * está en la lista. Comprobado reproduciendo una Server Action real con el
     * origen cambiado — origen legítimo 200, origen ajeno 500.
     *
     * Poner aquí el host del túnel no sirve de nada en este escenario: el
     * `origin` que llega es el de localhost, no el del túnel.
     */
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
