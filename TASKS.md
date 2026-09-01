# TrackApp — Estado y plan de trabajo

Última actualización: 1 de septiembre de 2026.

Este archivo es la lista viva de tareas. El orden de lo pendiente sigue el §8 del
doc técnico ("Orden de construcción sugerido"), y las prioridades P0/P1/P2 son las
del §4 del doc de visión.

**Leyenda:** `[x]` hecho y verificado · `[ ]` pendiente

---

## Resumen

| Fase | Estado |
|---|---|
| Infraestructura y andamiaje | Completa |
| Fase 1 — MVP funcional | ~70% (falta UI de edición y de categorías) |
| Fase 2 — Producto completo | Backend parcial, UI sin empezar |
| Fase 3 — Inteligencia avanzada | Sin empezar |
| Fase 4 — Apertura multiusuario | Condicional, no evaluada |

**La hipótesis central sigue sin validar:** el paso 5 del doc técnico pide usar el
atajo de iOS durante una semana antes de seguir construyendo. Eso no ha ocurrido.

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
- [ ] Desplegar en Vercel y cargar las variables de entorno de producción
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
- [ ] **UI de edición de transacciones** (hoy solo existe la Server Action)
- [ ] **UI de gestión de categorías**: crear, renombrar, color e ícono
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
- [x] Top movimientos con punto de color por categoría
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
- [ ] **UI del chat**: el endpoint está listo, la página es un placeholder
- [ ] **Bucle de function calling en el endpoint**: las herramientas están definidas
      y son seguras, pero el endpoint todavía no las pasa al modelo ni resuelve
      las llamadas que este devuelva
- [ ] Persistir el historial en `ChatMessage` (el modelo existe, nadie escribe en él)
- [ ] Caché de respuestas y límite de consultas por usuario
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
- [ ] **Íconos reales** de 192, 512 y maskable: hoy el manifest apunta a archivos
      que no existen
- [ ] Service worker: cache-first para estáticos, network-first para datos
- [ ] Cola offline en IndexedDB con sincronización al recuperar red
- [ ] Onboarding que explique añadir a pantalla de inicio: sin ese paso no hay
      push en iOS y todo el sistema de alertas queda inutilizado
- [ ] Tauri para escritorio (pospuesto a propósito hasta después del MVP)

## 12. Calidad

- [x] Verificación manual de punta a punta del quick-log contra la base real
- [x] Verificación visual de los gráficos en navegador, claro y oscuro
- [ ] **No hay framework de tests automatizados.** El parser de montos y los
      simuladores de crédito son lógica pura y deberían ser lo primero en cubrirse
- [ ] Tests de integración de los endpoints
- [ ] Métricas de uso: latencia, consumo de tokens y frecuencia por feature. El
      §6.5 del doc de visión pide registrarlas desde el día uno

---

## Lo siguiente, en orden

1. **UI de edición de transacciones y de categorías.** Cierra la Fase 1. Sin esto
   no se puede corregir lo que el parser categorice mal, y el aprendizaje por
   historial se alimenta justamente de esas correcciones.
2. **Íconos PWA e instalación en el iPhone.** Desbloquea el paso 5.
3. **Usar el atajo una semana.** Es la validación que el doc pide antes de seguir.
4. **UI del chat y bucle de function calling.** Solo tiene sentido con historial real.
5. Metas, tarjetas y suscripciones.
