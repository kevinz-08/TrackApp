"use client";

import { useLayoutEffect } from "react";

/**
 * Publica el alto del teclado en pantalla como `--keyboard-h`.
 *
 * El problema que resuelve: en Safari de iOS el teclado NO encoge el viewport
 * de maquetación, solo el visual. Todo lo anclado abajo —el compositor del
 * chat, una hoja— sigue midiendo contra un borde inferior que ahora está detrás
 * del teclado, y Safari compensa desplazando la página entera hacia arriba.
 * Desde fuera se ve como que el teclado empuja el contenido en vez de
 * superponerse a él.
 *
 * La salida canónica sería `interactive-widget=resizes-content` en el meta del
 * viewport, pero Safari no lo implementa —hay un bug de WebKit abierto—, así
 * que la única fuente fiable del alto del teclado es `visualViewport`.
 *
 * Se mide y se publica, igual que `--tabbar-h`: escribir un número fijo aquí
 * sería inventarse el alto de un teclado que cambia con el idioma, la barra de
 * predicciones, el dictado y el teclado flotante del iPad.
 *
 * Va en el layout raíz y no en el del panel para que el login también lo tenga:
 * es la otra pantalla de la app con un campo pegado al borde inferior.
 */
export function KeyboardInset() {
  useLayoutEffect(() => {
    const vv = window.visualViewport;
    // Sin `visualViewport` no hay nada que medir. La variable se queda en su
    // valor por defecto de globals.css (0px) y todo cae al comportamiento de
    // siempre, que es lo correcto en escritorio.
    if (!vv) return;

    const root = document.documentElement;

    const publish = () => {
      /*
       * Lo que le falta al viewport visual para llegar al fondo del de
       * maquetación. `offsetTop` entra en la cuenta porque Safari desplaza el
       * viewport visual dentro del de maquetación al abrir el teclado, y sin
       * restarlo el inset se queda corto justo en el frame en que más se nota.
       */
      const inset = window.innerHeight - vv.height - vv.offsetTop;

      /*
       * Dos casos en los que esa resta da un número que NO es un teclado:
       *
       *  - Con la página ampliada a pellizco el viewport visual es más pequeño
       *    por definición, y la diferencia no tiene nada que ver con el teclado.
       *  - Las barras del navegador de iOS al plegarse y desplegarse dejan una
       *    diferencia de unas pocas decenas de píxeles. Publicarla movería el
       *    compositor hacia arriba de forma permanente, que es un fallo más
       *    sutil y más molesto que el que se está arreglando.
       *
       * El suelo son 120px: el teclado más pequeño de iOS —el dividido del
       * iPad— pasa de 150, así que nada real cae por debajo. La contrapartida
       * conocida es la barra de accesorios que aparece con un teclado físico
       * conectado, de unos 45px: se ignora, y ahí el compositor queda como
       * estaba antes de este arreglo.
       */
      const isKeyboard = vv.scale <= 1.01 && inset >= 120;
      root.style.setProperty("--keyboard-h", isKeyboard ? `${Math.round(inset)}px` : "0px");
    };

    publish();
    vv.addEventListener("resize", publish);
    // `scroll` además de `resize`: al enfocar un campo Safari desplaza el
    // viewport visual sin cambiar su alto, y solo este evento lo reporta.
    vv.addEventListener("scroll", publish);

    return () => {
      vv.removeEventListener("resize", publish);
      vv.removeEventListener("scroll", publish);
      root.style.removeProperty("--keyboard-h");
    };
  }, []);

  return null;
}
