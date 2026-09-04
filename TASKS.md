# TrackApp — Estado y plan de trabajo

Última actualización: 1 de septiembre de 2026 (MVP completo construido).

Este archivo es la lista viva de tareas. El orden de lo pendiente sigue el §8 del
doc técnico ("Orden de construcción sugerido"), y las prioridades P0/P1/P2 son las
del §4 del doc de visión.

**Leyenda:** `[x]` hecho y verificado · `[ ]` pendiente

---

## Resumen

| Fase                           | Estado                              |
| ------------------------------ | ----------------------------------- |
| Infraestructura y andamiaje    | Completa                            |
| Fase 1 — MVP funcional         | Completa                            |
| Fase 2 — Producto completo     | Completa salvo entrega real de push |
| Fase 3 — Inteligencia avanzada | Sin empezar                         |
| Fase 4 — Apertura multiusuario | Condicional, no evaluada            |

**La hipótesis central sigue sin validar:** el paso 5 del doc técnico pide usar el
atajo de iOS durante una semana antes de seguir construyendo. Eso no ha ocurrido.

---

## Estado del MVP completo

Los diez entregables están construidos y verificados contra la base real. Lo que
queda son cosas que dependen de un despliegue o de un dispositivo real, no de
código.

| #   | Entregable                                           | Estado                        |
| --- | ---------------------------------------------------- | ----------------------------- |
| 1   | Alta manual de movimientos                           | Hecho                         |
| 2   | UI de metas: imagen, progreso, aportes y retiros     | Hecho                         |
| 3   | Subida de imagen a Cloudinary                        | Hecho, subida real verificada |
| 4   | UI del asistente con streaming                       | Hecho                         |
| 5   | Bucle de function calling en `/api/chat`             | Hecho, lectura y escritura    |
| 6   | Historial en conversaciones con retención de 30 días | Hecho                         |
| 7   | UI de tarjetas y los dos simuladores                 | Hecho                         |
| 8   | Suscripciones con total anualizado                   | Hecho                         |
| 9   | Web Push: modelo, VAPID, service worker, cron        | Hecho salvo entrega real      |
| 10  | Service worker y cola offline                        | Hecho, verificado sin red     |

### Lo único que no se pudo verificar aquí

**La entrega real de una notificación push.** El Chromium de pruebas no tiene
servicio de push (`Registration failed - permission denied`), así que no se puede
crear una suscripción real. Sí está verificado todo lo demás de la cadena: la
clave VAPID decodifica a un punto P-256 válido de 65 bytes, el permiso se
concede, el cron construye las alertas correctas, y `sendPush` cifra, firma y
envía de verdad —comprobado con una suscripción falsa: FCM respondió 404 y la
limpieza automática la borró—.

Queda comprobarlo en un dispositivo real. En iPhone, además, **solo funciona con
la app añadida a la pantalla de inicio**.

### Pendiente, y depende de ti

- **Desplegar en Vercel.** Da el HTTPS que iOS exige y permite medir la latencia
  real del quick-log.
- **Rotar las credenciales** que pasaron por el chat (Groq, Neon, Cloudinary).
- **Usar el atajo una semana.** La validación que el doc pide antes de seguir.

### Decisiones tomadas durante la construcción

- **Los aportes a metas no cuentan como gasto.** Se guardan como `EXPENSE` con
  `savingGoalId` porque el dinero sale del disponible, pero se excluyen del gasto
  en el balance, en los gráficos y en el snapshot de la IA, y se muestran como
  cifra propia. Si contaran como gasto, el panel diría que gastaste de más justo
  el mes en que fuiste más disciplinado. A largo plazo lo correcto sigue siendo un
  tipo `TRANSFER` en el modelo.
- **Categorías salió de la barra inferior y entró Tarjetas.** Las categorías se
  configuran una vez y viven en Ajustes; las tarjetas se consultan seguido, y el
  momento de "simular antes de comprar" solo ocurre si está a un toque.
- **Los modelos de Groq son configurables por entorno.** Los `llama-3.x` que
  fijaba el documento técnico ya devolvían 404.

### Fuera del MVP, a propósito

Agente proactivo, registro por fotografía, gastos hormiga, exportación,
multi-moneda, Tauri y subcategorías. Son Fase 3 y 4 en el doc de visión.

---

## 0. Infraestructura y andamiaje

- [x] Proyecto Next.js 16 (App Router) + TypeScript + Tailwind v4 con **pnpm**
- [x] Estructura de directorios del §2 del doc técnico (`actions/`, `services/`, `lib/`)
- [x] `pnpm-workspace.yaml` con `onlyBuiltDependencies` para los scripts de Prisma
- [x] Prettier y ESLint configurados; `pnpm typecheck`, `lint` y `build` pasan
- [x] `.env.example` versionado y `.env.local` fuera de git (verificado con `git check-ignore`)
- [x] `vercel.json` con los dos crons diarios
- [x] Build de Vercel fijado a `prisma generate && next build`
- [x] Repositorio git inicializado con historial limpio
- [ ] **Desplegar en Vercel y cargar las variables de entorno de producción.**
      Es el desbloqueo real: da el HTTPS que iOS exige para instalar y permite
      medir la latencia del quick-log en condiciones reales
- [x] Túnel de VS Code operativo: `serverActions.allowedOrigins` en
      `next.config.ts`. Autoriza el ORIGEN del navegador (`localhost:3000`), no
      el host del túnel — poner ahí el host del túnel no surte efecto, porque el
      `origin` que llega es el de localhost. Verificado que no abre un CSRF:
      reproduciendo una Server Action real con `origin` ajeno responde 500
- [ ] Rotar las credenciales que pasaron por el chat (Groq, Neon) antes de producción

## 1. Base de datos

- [x] Schema completo de Prisma: 11 modelos, enums e índices por `userId`
- [x] Montos como `Int` en unidad mínima en todo el modelo, nunca `Float`
- [x] Adaptación a Prisma 7: `prisma.config.ts` y driver adapter `@prisma/adapter-pg`
- [x] Singleton perezoso del cliente: importar un módulo no exige `DATABASE_URL`
- [x] Migración inicial aplicada contra Neon
- [x] Seed de categorías base y usuario inicial; resincroniza las categorías por
      defecto sin pisar las que el usuario haya personalizado
- [x] `sslmode=verify-full` explícito en ambas cadenas de conexión
- [ ] Estrategia de archivado si el historial crece (no urgente con un solo usuario)

## 2. Autenticación y seguridad

- [x] Auth.js v5 con proveedor de credenciales y sesión JWT de 30 días
- [x] `requireUser()`, `requireApiKey()` e `isCronAuthorized()` en `lib/auth/guards.ts`
- [x] Guardia de sesión en el layout del dashboard (verificado: redirige a `/login`)
- [x] API Keys hasheadas con SHA-256, revocables y con registro de último uso
- [x] Alcance restringido: la API Key solo habilita `/api/quick-log`
- [x] Rate limiting en quick-log, 20 peticiones por minuto
- [x] Validación estricta con Zod de todo lo que entra al sistema
- [x] `userId` inyectado desde la sesión en las herramientas de IA, nunca del modelo
- [ ] Página de registro y de cambio de contraseña (hoy el usuario nace del seed)
- [ ] Revisar expiración y rotación de las API Keys de larga duración

## 3. Fast-Logging — la hipótesis central (P0)

- [x] `POST /api/quick-log` completo y probado contra la base real
- [x] Parser determinista de montos colombianos: `25000`, `25.000`, `25k`, `25 mil`,
      `1.5 millones` (10 casos verificados)
- [x] Detección de ingreso contra egreso por pistas de lenguaje
- [x] Fallback a Groq cuando el regex no logra extraer un monto
- [x] Categorización diferida con `waitUntil`, no bloquea la respuesta
- [x] `GET /api/quick-log/summary` para el atajo de consulta de balance
- [x] Mensajes listos para mostrarse tal cual en la notificación de iOS
- [ ] **Configurar el atajo real en el iPhone y usarlo una semana** ← paso 5 del doc
- [ ] Medir la latencia en producción contra el objetivo de 800 ms
- [ ] Paridad en Android: App Shortcuts, widget o Tasker

## 4. Gestión de flujos y categorización (P0)

- [x] Server Actions de crear, editar y borrar transacciones
- [x] Server Actions de reglas recurrentes y cancelación de suscripciones
- [x] Materialización de recurrentes, con manejo del día 31 en meses de 30
- [x] Categorización por reglas locales sobre comercios colombianos
- [x] Aprendizaje por historial: una corrección previa gana sobre las reglas
- [x] Refinamiento de categoría con IA en segundo plano
- [x] Listado de movimientos con marca de "revisar"
- [x] **UI de edición de transacciones**: hoja inferior con arrastre para
      descartar (proyección por velocidad, gesto interrumpible). Se abre tocando
      la fila; el toque se distingue del swipe por distancia recorrida
- [x] **Bucle de aprendizaje cerrado y verificado**: "veterinario" cayó en Otros,
      tras corregirlo a Salud el siguiente registro del mismo concepto entró
      directo en Salud. Antes de esta UI la memoria de correcciones no se
      alimentaba nunca
- [x] **UI de gestión de categorías**: crear, renombrar y recolorear, agrupadas
      por tipo y con el número de movimientos que usan cada una
- [x] Borrado de categorías con confirmación que dice cuántos movimientos
      quedarán sin categoría; las categorías base están protegidas
- [x] El selector de categoría del editor filtra por tipo: una categoría de
      ingreso no aparece en un egreso
- [ ] Ícono por categoría (el modelo lo soporta, la UI todavía no lo edita)
- [ ] UI de alta de movimientos fijos y suscripciones
- [ ] Filtros por período y por categoría en el listado
- [ ] Subcategorías (opcional, fase 2 del doc de visión)

## 5. Visualización e insights (P0)

- [x] Paleta de visualización validada para daltonismo en modo claro y oscuro
      (`lib/chart-palette.ts`). Los colores originales del seed se reemplazaron:
      morado y azul eran indistinguibles bajo deuteranopía
- [x] Figura principal de balance y fila de tarjetas de estadística
- [x] Gasto por categoría: barras de un solo hue ordenadas por magnitud
- [x] Comprometido contra disponible: barra apilada con separador de superficie
- [x] Evolución de seis meses: línea de dos series con leyenda y puntos
- [x] Tooltips en los tres gráficos; el texto usa tokens, nunca el color de la serie
- [x] Vista de tabla desplegable en cada gráfico, para accesibilidad
- [x] Modo oscuro con escalones elegidos, no un volteo automático de los claros
- [x] Verificado en navegador real, claro y oscuro, sin errores de consola
- [x] Migrados al sistema monocromo: rampa de luminancia por rango, evolución
      convertida en área (serie secundaria por textura, sin eje Y), punto solo
      en el último dato. El punto de color por categoría se eliminó: no aportaba
      identidad que el nombre adyacente no diera ya
- [ ] Selector de período: hoy todos los gráficos son del mes actual
- [ ] Flujo de caja con proyección al cierre como gráfico
- [ ] Detección de gastos hormiga

## 6. Ecosistema de IA

- [x] Cliente de Groq con dos modelos: el grande para chat, el pequeño para
      tareas mecánicas (parsear, clasificar)
- [x] Snapshot financiero precalculado y acotado, de unos 400 a 600 tokens
- [x] Serialización del snapshot como texto denso, no como JSON
- [x] System prompt con las reglas de tono no punitivo
- [x] `POST /api/chat` con streaming
- [x] Definición de herramientas: `consultarGastos` y `registrarTransaccion`
- [x] Degradación elegante: sin `GROQ_API_KEY` la app registra transacciones igual
- [x] UI del chat: streaming, Markdown mínimo, avatares y pantalla de bienvenida
      con saludo elegido en el servidor
- [x] Bucle de function calling en el endpoint (una ronda de herramientas)
- [x] Historial en conversaciones: `ChatSession` + `ChatMessage`, múltiples chats,
      título derivado del primer mensaje y hoja de historial con borrado
- [x] Retención de 30 días desde la creación: `expiresAt` materializado, barrido
      en `/api/cron/chat-retention` (04:00 UTC) y filtro por `expiresAt` en las
      lecturas, para que un cron caído no resucite lo vencido
- [x] Límite de consultas por usuario y hora (60)
- [ ] Caché de respuestas
- [ ] Nivel 2: agente proactivo con análisis programado (P2)
- [ ] Registro por fotografía de recibo con modelo de visión (P2)

## 7. Tarjetas de crédito (P1)

- [x] Modelo con cupo, fechas de corte y pago, y tasa efectiva anual
- [x] Simulador de compras diferidas con costo total, intereses y sobrecosto
- [x] Simulador de pago mínimo, incluido el caso en que la deuda no baja nunca
- [x] Cálculo de utilización de cupo
- [x] Server Actions de alta, edición y simulación
- [ ] **UI del módulo** (página placeholder)
- [ ] Contenido educativo contextual integrado en la interfaz
- [ ] Alertas de fecha de corte y de pago

## 8. Metas de ahorro (P1)

- [x] Modelo con monto objetivo, imagen y fecha límite
- [x] Aporte a meta como transacción y avance en una sola operación atómica
- [x] Cálculo del ritmo mensual requerido para llegar a la fecha objetivo
- [x] Endpoint de firma para subir a Cloudinary sin pasar por el backend
- [ ] **UI de metas** con barra de progreso e imagen de fondo
- [ ] Listar, editar y borrar metas (solo existen crear y aportar)
- [ ] **Decisión pendiente de contabilidad.** `contributeToGoal` registra el
      aporte como `EXPENSE` sin categoría, así que hoy un aporte a una meta
      engorda los egresos del mes y aparece en "Gasto por categoría" como
      "Sin categoría". Ahorrar no es gastar. Tres salidas: excluir de las
      agregaciones los movimientos con `savingGoalId`, darles una categoría
      propia "Ahorro", o añadir un tipo `TRANSFER` al modelo. La tercera es la
      correcta a largo plazo y la más cara
- [ ] Componente de carga de imagen
- [ ] Falta el secreto real de Cloudinary: el recibido era un texto de relleno

## 9. Suscripciones (P1)

- [x] Modeladas como `RecurringRule` con la bandera `isSubscription`
- [x] Cancelación con fecha, para poder mostrar el ahorro acumulado
- [ ] Inventario de suscripciones activas
- [ ] Costo agregado mensual y **anualizado**: la cifra anual es la que impacta
- [ ] Detección de suscripciones olvidadas
- [ ] Historial de cancelaciones con ahorro acumulado

## 10. Alertas (P1)

- [x] Cron de alertas protegido por `CRON_SECRET`
- [x] Cron de recurrentes que además mantiene despierta la base de Neon
- [ ] Web Push con VAPID (faltan las llaves)
- [ ] Centro de notificaciones in-app
- [ ] Control granular de qué alertas recibir
- [ ] Recordatorio de registro, con tono neutral

## 11. PWA y multiplataforma

- [x] Manifest con nombre, colores y orientación
- [x] **Íconos reales** de 192, 512 y maskable, generados a partir de la marca
      de barras del propio gráfico de categorías. Fuente vectorial versionada en
      `public/icons/*.svg`
- [x] `apple-touch-icon` de 180px: iOS ignora los iconos del manifest y sin esta
      etiqueta usa una captura de la página como icono
- [x] Zona segura del maskable verificada por píxel, no a ojo: la marca llega a
      165px del centro con un radio seguro de 205px
- [x] `id` y `scope` en el manifest, para que cambiar `start_url` no genere un
      segundo icono instalado
- [x] Eliminados los restos de marca de la plantilla de Next (favicon y SVG)
- [ ] Service worker: cache-first para estáticos, network-first para datos
- [ ] Cola offline en IndexedDB con sincronización al recuperar red
- [ ] Onboarding que explique añadir a pantalla de inicio: sin ese paso no hay
      push en iOS y todo el sistema de alertas queda inutilizado
- [ ] **Bloqueo para instalar en el iPhone: hace falta HTTPS.** localhost no
      sirve desde el teléfono. Las dos vías son el túnel de VS Code (ya operativo)
      o desplegar en Vercel, que sigue siendo la buena porque además permite
      medir la latencia real del quick-log
- [ ] Tauri para escritorio (pospuesto a propósito hasta después del MVP)

## 11b. Sistema de diseño

- [x] Migración a sistema monocromo (superficies, tipografía, tab bar, press)
- [x] `ui/sheet.tsx`: hoja inferior con arrastre 1:1, proyección de inercia al
      soltar e interrupción desde la posición real en pantalla
- [x] `ui/field.tsx`: campo hundido, select y control segmentado, todos con
      altura táctil mínima de 44pt
- [ ] Respetar `prefers-reduced-motion` en la hoja y en el swipe de las filas

## 12. Calidad

- [x] Verificación manual de punta a punta del quick-log contra la base real
- [x] Verificación visual de los gráficos en navegador, claro y oscuro
- [ ] **No hay framework de tests automatizados.** El parser de montos y los
      simuladores de crédito son lógica pura y deberían ser lo primero en cubrirse
- [ ] Tests de integración de los endpoints
- [ ] Métricas de uso: latencia, consumo de tokens y frecuencia por feature. El
      §6.5 del doc de visión pide registrarlas desde el día uno

## 13. Sistema de diseño monocromo

Guía visual v1.0 (Style Guide & Motion Principles). Es normativa: ver la sección
«Diseño» de `CLAUDE.md`.

- [x] Tokens completos en `app/globals.css`: cinco valores base por tema, roles,
      rampa de gráfico, curvas, duraciones, radios. Tema oscuro con escalones
      elegidos, no invertidos
- [x] Duraciones y curvas como utilidades del tema (`duration-base`,
      `ease-standard`): ningún `cubic-bezier` literal fuera de `globals.css`
- [x] Color acento eliminado de toda la UI (quedaba `#1d9e75` en login, ajustes,
      lista de movimientos, `manifest` y `themeColor`)
- [x] Tipografía del sistema (SF Pro vía `-apple-system`): se retiró la webfont
      Geist de la ruta crítica
- [x] Primitivas en `components/ui/`: `Money`, `Card`, `Panel`, `MicroLabel`,
      `EmptyState`, `Skeleton`, `Button` con la asimetría press/release
- [x] Cifra con tratamiento tipográfico: símbolo a 0.5em y último grupo de miles
      atenuado, con el monto completo en `sr-only` para lectores de pantalla
- [x] Navegación anclada abajo con `safe-area-inset`, activo marcado por dos
      canales (tinta + marca), objetivos ≥ 44pt
- [x] Swipe-to-action en las filas de movimientos, con `will-change` prestado y
      devuelto, resistencia elástica y snap por spring
- [x] `contain: layout paint` en tarjetas y `content-visibility` en la lista larga
- [x] `prefers-reduced-motion`: el feedback cambia de canal, no se desactiva
- [x] `pnpm typecheck`, `lint` y `build` pasan; utilidades verificadas en el CSS
      compilado, ambos temas
- [ ] Verificación en iPhone real: Dynamic Type hasta AX1 sin truncar la cifra
      principal, y perfil de rendimiento con throttling 4× durante el swipe
- [ ] Háptico en `touchstart` del botón primario (falta el envoltorio de
      `UIImpactFeedbackGenerator` desde la PWA)
- [ ] Transición de elemento compartido lista → detalle (necesita la pantalla de
      detalle, que aún no existe)
- [ ] Sobre-arrastre destructivo en el swipe: se dejó fuera a propósito porque el
      borrado no tiene deshacer. Reactivar cuando exista undo

---

## Lo siguiente, en orden

1. **Desplegar en Vercel.** Los iconos ya están; lo que falta para instalar en
   el iPhone es HTTPS, y el despliegue lo resuelve a la vez que habilita medir
   la latencia real del quick-log.
2. **Instalar en el iPhone y usar el atajo una semana.** Es la validación que el
   doc pide antes de seguir construyendo.
3. **Alta manual de movimientos y filtros del listado.** Lo que resta de Fase 1.
4. **UI del chat y bucle de function calling.** Solo tiene sentido con historial real.
5. Metas, tarjetas y suscripciones.
