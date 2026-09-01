# TrackApp — Documento de Visión y Alcance

**Versión:** 1.0
**Fecha:** Septiembre 2026
**Autor:** Santiago Gutiérrez
**Estado:** Borrador para validación

---

## 1. Resumen Ejecutivo (Elevator Pitch)

**TrackApp es una aplicación de finanzas personales diseñada para quienes odian llevar cuentas.**

Existe una brecha enorme entre saber que deberías controlar tus gastos y hacerlo realmente. La mayoría de las apps del mercado asumen un usuario disciplinado: alguien dispuesto a abrir la aplicación, navegar tres pantallas, elegir una categoría de una lista de cuarenta opciones y escribir una descripción — todo esto por un café de $8.000. Ese usuario existe, pero es minoría. La mayoría abandona la app en la segunda semana, no por falta de voluntad, sino por exceso de fricción.

TrackApp invierte la premisa. En lugar de exigir disciplina, la elimina de la ecuación. El registro de una transacción ocurre en menos de cinco segundos, sin abrir la aplicación, mediante un atajo del sistema operativo activado por el botón de acción del iPhone o por voz. El usuario dice "gasté 25 mil en almuerzo" y la transacción queda registrada, categorizada y reflejada en sus gráficos. La app deja de ser un lugar al que hay que ir y se convierte en una capa invisible sobre el día a día.

Sobre esa base de datos limpia y consistente se construye la segunda mitad del producto: un asistente financiero conversacional con contexto total del historial del usuario, capaz de responder preguntas concretas ("¿puedo permitirme este gasto?", "¿en qué se me fue la plata este mes?") y de detectar patrones antes de que se conviertan en problemas. El resultado no es otro dashboard de gráficos bonitos, sino un producto que convierte el registro sin esfuerzo en decisiones financieras mejor informadas.

---

## 2. Público Objetivo y Problema a Resolver

### 2.1 Perfil del usuario

**Usuario primario — "El procrastinador financiero"**

- Edad aproximada: 20–35 años.
- Ingresos estables o semi-estables (empleado, freelancer, estudiante con trabajo).
- Alfabetizado digitalmente, dueño de un smartphone que usa intensivamente.
- Ha intentado usar apps de finanzas al menos una vez y las ha abandonado.
- Sabe cuánto gana; no tiene idea de cuánto gasta ni en qué.

**Usuario secundario — "El endeudado accidental"**

- Tiene una o más tarjetas de crédito.
- No comprende del todo cómo funcionan los intereses, las fechas de corte ni el pago mínimo.
- Ha pagado intereses por desconocimiento, no por incapacidad de pago.
- Siente ansiedad al revisar el estado de cuenta y por eso lo pospone.

### 2.2 Los dolores centrales

**Dolor 1 — La fricción del registro mata el hábito.**
Registrar un gasto en la mayoría de apps toma entre 30 y 60 segundos y requiere atención consciente. Multiplicado por 5–8 transacciones diarias, se convierte en una carga cognitiva que ningún usuario promedio sostiene más de dos semanas. El abandono no es un fallo del usuario, es un fallo de diseño del producto.

**Dolor 2 — El miedo a mirar.**
Existe un componente emocional subestimado: revisar las finanzas produce ansiedad anticipatoria. El usuario sospecha que la cifra será mala y prefiere no confirmarlo. Las apps actuales refuerzan esto presentando la información como un juicio (números rojos, alertas de "excediste tu presupuesto") en lugar de como una herramienta de decisión.

**Dolor 3 — La tarjeta de crédito como caja negra.**
El crédito se enseña mal o no se enseña. El usuario típico no distingue entre fecha de corte y fecha de pago, no sabe que el pago mínimo capitaliza intereses, y no dimensiona el costo real de diferir una compra a 12 cuotas. El resultado es una deuda que crece sin que el usuario entienda por qué.

**Dolor 4 — Las suscripciones invisibles.**
Los cobros recurrentes de bajo monto son el punto ciego perfecto: individualmente son irrelevantes, en conjunto representan una fuga significativa. Nadie recuerda todas las suscripciones activas que tiene.

**Dolor 5 — Datos sin interpretación.**
Incluso el usuario que logra registrar todo termina con gráficos que describen el pasado pero no orientan el futuro. Saber que gastaste el 34% en restaurantes no te dice qué hacer al respecto.

---

## 3. Propuesta de Valor

TrackApp compite en un mercado saturado. La diferenciación no está en tener más funcionalidades, sino en tres decisiones de producto deliberadas:

### 3.1 Fricción cero como característica principal, no como mejora

La mayoría de apps tratan el registro rápido como un extra. En TrackApp **es el producto**. La integración con Atajos de iOS no es un añadido de la versión 3.0: es el flujo principal desde el día uno. El resto de la aplicación existe para dar sentido a los datos que ese flujo genera.

**Diferenciador concreto:** el tiempo desde el impulso ("acabo de gastar") hasta el registro completado debe ser inferior a 5 segundos, sin desbloquear la app.

### 3.2 Inteligencia artificial con contexto real, no con plantillas

Muchas apps ya anuncian "IA". En la práctica, ofrecen mensajes generados a partir de reglas fijas ("gastaste más que el mes pasado"). TrackApp expone el historial financiero completo del usuario como contexto a un modelo de lenguaje, permitiendo conversación abierta y preguntas que ninguna interfaz predefinida podría anticipar.

**Diferenciador concreto:** el usuario puede preguntar cualquier cosa sobre su propia data en lenguaje natural y recibir una respuesta razonada, no un widget preconfigurado.

### 3.3 Enfoque educativo sobre el crédito, no solo de control

El gestor de tarjetas de TrackApp no busca replicar el estado de cuenta del banco. Busca que el usuario **entienda** el crédito. Es una herramienta pedagógica disfrazada de utilidad, y ese ángulo está prácticamente desatendido en el mercado hispanohablante.

### 3.4 Tono no punitivo

Decisión de diseño transversal: TrackApp nunca regaña. Presenta información, ofrece contexto y sugiere alternativas, pero no emite juicios morales sobre el gasto. Esto ataca directamente el Dolor 2 (miedo a mirar) y es un diferenciador de marca sostenible.

---

## 4. Core Features (Funcionalidades Principales)

### 4.1 Fast-Logging — Registro sin fricción

**Prioridad: P0 (crítico, define el producto)**

Es la funcionalidad fundacional. Debe existir en el MVP.

- **Integración con Atajos de iOS (Shortcuts):** un atajo asignado al botón de acción del iPhone que dispara una petición HTTP autenticada a la API sin abrir la aplicación.
- **Entrada por texto:** el atajo solicita una entrada de texto libre ("almuerzo 25000") que el backend interpreta y estructura.
- **Entrada por voz:** aprovechando el dictado nativo del sistema operativo, el usuario dicta la transacción. La transcripción llega al backend como texto plano.
- **Parsing en lenguaje natural:** el backend interpreta monto, concepto y categoría probable a partir de una frase no estructurada. Esta es la pieza técnica clave del feature.
- **Confirmación mínima:** notificación de sistema confirmando el registro, con opción de corregir. Sin pantallas intermedias.
- **Paridad en Android:** equivalente funcional mediante App Shortcuts, widget de pantalla de inicio o integración con Tasker.

**Criterio de éxito:** registrar una transacción típica en menos de 5 segundos, medido desde la pulsación del botón hasta la confirmación.

---

### 4.2 Gestión de Flujos — Ingresos y Egresos

**Prioridad: P0**

El núcleo transaccional del sistema.

- Registro de **ingresos** (salario, freelance, ingresos extraordinarios) y **egresos**.
- Distinción entre **movimientos fijos** (recurrentes y predecibles: arriendo, salario, servicios) y **variables** (ocasionales: restaurantes, entretenimiento).
- **Automatización de recurrentes:** los movimientos fijos se proyectan automáticamente cada período, sin requerir registro manual. El usuario los define una vez.
- **Balance mensual:** cálculo automático de ingresos menos egresos, con desglose entre lo comprometido (fijo) y lo disponible (variable).
- **Edición y corrección:** toda transacción registrada por Fast-Logging debe ser editable desde la interfaz, asumiendo que el parsing automático puede equivocarse.

---

### 4.3 Categorización Inteligente

**Prioridad: P0**

- **Categorías base predefinidas:** Hogar, Alimentación, Transporte, Suscripciones, Salidas y Ocio, Salud, Educación, Otros.
- **Categorías personalizables:** el usuario puede crear, renombrar, asignar color e ícono.
- **Sugerencia automática de categoría:** al registrar mediante Fast-Logging, el sistema propone una categoría a partir del concepto ("Rappi" → Alimentación). El usuario puede corregirla, y el sistema aprende de esa corrección.
- **Aprendizaje por historial:** el mapeo concepto → categoría se refuerza con cada corrección, mejorando la precisión con el uso.
- **Subcategorías (opcional, fase 2):** para usuarios que quieran mayor granularidad sin forzarla en el resto.

---

### 4.4 Visualización e Insights

**Prioridad: P0**

- **Distribución por categoría:** gráfico de dona o barras del período actual.
- **Evolución temporal:** línea de gasto mensual comparando períodos.
- **Comparativa fijo vs. variable:** para que el usuario visualice cuánto de su ingreso ya está comprometido antes de empezar el mes.
- **Top movimientos:** las cinco transacciones de mayor monto del período.
- **Vista de flujo de caja:** proyección simple del saldo esperado al cierre del mes, considerando fijos pendientes.

---

### 4.5 Gestor Educativo de Tarjetas de Crédito

**Prioridad: P1**

Diseñado explícitamente como herramienta de aprendizaje, no como replicador de estados de cuenta bancarios.

- **Registro simplificado:** nombre de la tarjeta y descripción breve. Sin números de tarjeta, sin credenciales bancarias, sin conexión con la entidad financiera.
- **Parámetros configurables por el usuario:** cupo total, fecha de corte, fecha de pago, tasa de interés efectiva anual.
- **Simulador de compras diferidas:** el usuario ingresa un monto y un número de cuotas, y ve el costo total real, el desglose de intereses y cuánto está pagando de más frente al pago de contado. Este es el corazón educativo del módulo.
- **Simulador de pago mínimo:** proyección visual de cuánto tiempo y cuánto dinero tomaría liquidar un saldo pagando solo el mínimo. Es la lección más importante que la mayoría de usuarios nunca recibe.
- **Indicador de utilización de cupo:** porcentaje del cupo usado, con contexto sobre por qué mantenerlo bajo importa.
- **Alertas de fechas clave:** recordatorio antes de la fecha de corte (para decidir si conviene comprar antes o después) y antes de la fecha de pago.
- **Contenido educativo contextual:** explicaciones breves integradas en la interfaz sobre corte, pago mínimo, capitalización de intereses y utilización de cupo. Se muestran en el momento en que son relevantes, no en una sección de "ayuda" que nadie visita.

> **Nota de alcance:** este módulo es deliberadamente manual. No se integra con APIs bancarias en la versión inicial, lo que elimina complejidad regulatoria, de seguridad y de costos.

---

### 4.6 Metas de Ahorro Visuales

**Prioridad: P1**

- **Creación de metas** con nombre, monto objetivo, fecha límite opcional e **imagen motivacional** cargada por el usuario.
- **Barra de progreso visual** con la imagen como fondo o elemento principal de la tarjeta.
- **Aportes manuales** a la meta, registrados como movimiento.
- **Cálculo de ritmo requerido:** cuánto necesita ahorrar mensualmente para cumplir la meta en la fecha objetivo, y si el ritmo actual alcanza.
- **Vinculación opcional con el balance:** sugerencia de cuánto podría destinar al ahorro según su superávit del mes.

---

### 4.7 Suscripciones y Gastos Recurrentes

**Prioridad: P1**

- **Inventario de suscripciones activas:** nombre, monto, frecuencia (mensual/anual), próxima fecha de cobro, categoría.
- **Costo agregado:** total mensual y **total anualizado** de todas las suscripciones. La cifra anual es deliberadamente prominente: es la que genera el momento de toma de conciencia.
- **Detección de suscripciones olvidadas:** identificación de servicios sin uso reportado o cargados durante muchos períodos sin revisión.
- **Registro de cancelaciones:** historial de lo que el usuario dejó de pagar, mostrando el ahorro acumulado. Refuerzo positivo.

---

### 4.8 Sistema de Alertas

**Prioridad: P1**

- **Notificaciones push** mediante Web Push API (compatible con PWA en iOS 16.4+ y Android).
- **Alertas de suscripciones y gastos fijos** con antelación configurable.
- **Alertas de fechas de tarjetas** (corte y pago).
- **Recordatorio de registro** para usuarios que llevan varios días sin actividad — con tono neutral, nunca culpabilizante.
- **Centro de notificaciones in-app** para quienes tengan el push deshabilitado.
- **Control granular:** el usuario decide qué tipos de alerta recibir. Una app que notifica de más se silencia por completo.

---

## 5. Ecosistema de Inteligencia Artificial

La IA en TrackApp no es una capa decorativa: es el mecanismo que convierte datos crudos en decisiones. Se plantea en dos niveles de madurez.

### 5.1 Nivel 1 — Chatbot Financiero Contextual

**Prioridad: P1 (incluir en la versión 1.0)**

Un asistente conversacional con acceso al historial financiero completo del usuario.

**Capacidades esperadas:**

- Responder preguntas analíticas sobre la data propia: *"¿cuánto llevo gastado en salidas este mes?"*, *"¿en qué categoría se me disparó el gasto comparado con el mes pasado?"*.
- Realizar cálculos de viabilidad: *"si compro esto de $800.000, ¿me alcanza para llegar a fin de mes?"*.
- Explicar conceptos financieros en el contexto de la situación real del usuario.
- Ejecutar acciones sobre la data mediante function calling: registrar una transacción, crear una meta, marcar una suscripción como cancelada.

**Arquitectura de contexto:**

En lugar de enviar el historial completo en cada consulta (costoso e ineficiente), el backend precalcula y adjunta un **resumen financiero estructurado**: balance del período, totales por categoría, suscripciones activas, metas en curso y las transacciones más recientes o relevantes. Esto mantiene el prompt en un tamaño reducido y constante.

Para consultas que requieran datos específicos fuera de ese resumen, se expone al modelo un conjunto de herramientas (function calling) que consultan la base de datos bajo demanda: `consultarGastosPorCategoria`, `obtenerTransaccionesDelPeriodo`, `calcularProyeccionMeta`.

**Proveedor de inferencia:**

Se propone un enrutador de modelos que permita alternar proveedores sin reescribir la lógica:

- **Groq** como opción principal por su latencia excepcionalmente baja y su capa gratuita, ideal para una experiencia conversacional fluida.
- **OpenRouter** como enrutador con acceso a múltiples modelos gratuitos y de bajo costo, útil como respaldo y para experimentar con distintos modelos sin cambiar la integración.
- **Abstracción de proveedor:** toda la comunicación con LLMs debe pasar por una capa de servicio interna con una interfaz única. Cambiar de proveedor debe ser una variable de entorno, no una refactorización.

---

### 5.2 Nivel 2 — Agente Financiero Proactivo

**Prioridad: P2 (evolución posterior)**

Mientras el chatbot responde cuando se le pregunta, el agente **actúa sin que se le pregunte**.

**Capacidades planteadas:**

- **Análisis periódico automatizado:** ejecución programada (semanal o mensual) que revisa la data del usuario y genera observaciones relevantes.
- **Detección de anomalías:** identificación de desviaciones significativas respecto al comportamiento habitual del usuario.
- **Recomendaciones accionables:** propuestas concretas de reasignación de gasto hacia metas, estrategias de pago de deuda, o identificación de suscripciones prescindibles.
- **Planes de acción:** frente a una deuda de tarjeta, proponer un cronograma de pago con proyección de intereses ahorrados.
- **Resumen periódico:** un informe breve y legible al cierre de cada mes, entregado como notificación.

**Consideración de diseño:** el agente debe ser configurable en frecuencia e intensidad. Un asesor que opina demasiado se vuelve ruido.

---

### 5.3 Feature Sugerida — Registro por fotografía de recibo

**Prioridad: P2**

Complemento natural del Fast-Logging: el usuario fotografía un recibo o comprobante de pago y un modelo con capacidad de visión extrae monto, comercio y fecha, generando la transacción automáticamente.

Es particularmente valioso en el contexto colombiano, donde comprobantes de Nequi, Daviplata o transferencias PSE son capturas de pantalla frecuentes. Reduce la fricción a un nivel aún menor que el registro por voz para transacciones ya documentadas.

---

### 5.4 Features Sugeridas Adicionales

Basadas en la naturaleza del producto y los dolores identificados:

**a) Modo "¿Puedo permitírmelo?"**
Consulta rápida antes de una compra. El usuario ingresa un monto y recibe una respuesta contextualizada: cuánto le queda disponible tras cubrir fijos pendientes, y qué impacto tendría sobre sus metas activas. Ataca el momento exacto de la decisión, que es donde el producto puede cambiar comportamiento.

**b) Presupuesto por categoría con semáforo**
Límites mensuales autoimpuestos por categoría, con indicador visual de consumo. Presentado como información, no como restricción: el objetivo es conciencia, no bloqueo.

**c) Detección de gastos hormiga**
Análisis que agrupa transacciones pequeñas y frecuentes y las presenta agregadas. El gasto de $8.000 diario en café es invisible; los $240.000 mensuales no lo son.

**d) Racha de registro (gamificación ligera)**
Contador de días consecutivos con actividad registrada. Refuerzo de hábito de baja intensidad, sin badges ni mecánicas invasivas.

**e) Exportación de datos**
Descarga del historial en CSV o Excel. Genera confianza (el usuario es dueño de su data) y facilita respaldos.

**f) Modo multi-moneda**
Registro de transacciones en divisa distinta a la principal, con conversión. Relevante para freelancers que facturan en dólares — perfil que coincide bastante con el usuario objetivo.

---

## 6. Consideraciones Técnicas

### 6.1 Stack propuesto

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript** | PWA instalable en iOS, Android y escritorio desde un solo código base. Server Components para reducir el JavaScript enviado al cliente. |
| Estilos | **Tailwind CSS + shadcn/ui** | Velocidad de desarrollo y consistencia visual sin mantener un design system propio. |
| Visualización | **Recharts** | Integración natural con React, cubre todos los tipos de gráfico requeridos. |
| Backend | **NestJS + TypeScript** | Arquitectura modular que escala bien; los módulos mapean directamente a los dominios del producto (transacciones, tarjetas, metas, IA). |
| ORM | **Prisma** | Type-safety extremo a extremo, migraciones versionadas y buena experiencia de desarrollo. |
| Base de datos | **PostgreSQL** | Necesaria para las agregaciones y consultas temporales que alimentan los insights. |
| Autenticación | **JWT + refresh tokens** | Necesario que el token de larga duración para el atajo de iOS sea independiente y revocable. |
| Monorepo | **Turborepo** | Tipos compartidos entre frontend y backend, caché de builds. |
| IA | **Capa de abstracción propia sobre Groq / OpenRouter** | Independencia de proveedor. |

### 6.2 Infraestructura (fase inicial, costo $0)

| Servicio | Proveedor | Capa gratuita |
|---|---|---|
| Frontend | **Vercel** (plan Hobby) | Deploy continuo desde Git, sin costo para proyectos personales. |
| Backend | **Render** o **Fly.io** | Servicio web gratuito. Considerar el cold start de Render en el diseño de UX. |
| Base de datos | **Neon** (Postgres serverless) | Capa gratuita suficiente para un usuario; compatible con Prisma. |
| Almacenamiento de imágenes | **Cloudinary** | Upload directo desde el cliente mediante presets firmados, evitando que el archivo pase por el backend. |
| Tareas programadas | **Vercel Cron** o **GitHub Actions** | Alertas, recurrentes y análisis del agente. |
| Inferencia LLM | **Groq / OpenRouter** | Capas gratuitas con límites de tasa razonables para un usuario. |

### 6.3 Arquitectura de la capa de IA

Este es el punto de mayor riesgo técnico y económico. Cuatro principios de diseño:

**1. La clave de API nunca toca el cliente.**
Todas las llamadas a modelos de lenguaje se originan exclusivamente en el backend. El frontend consume un endpoint propio (`/ia/consultar`), nunca al proveedor directamente.

**2. Contexto precalculado, no historial completo.**
Antes de cada consulta, el backend construye un objeto de resumen financiero compacto. El costo por consulta se mantiene predecible y el modelo recibe información densa en lugar de ruido.

**3. Function calling para lo que no cabe en el resumen.**
Herramientas expuestas al modelo para consultar la base de datos bajo demanda. Cada herramienta debe validar que la consulta corresponda al usuario autenticado — nunca confiar en parámetros generados por el modelo para determinar identidad.

**4. Caché y control de tasa.**
Las respuestas del agente proactivo (que son deterministas dado un período) se cachean. Se implementa límite de consultas por usuario desde el día uno, incluso siendo un solo usuario, para que el sistema esté listo si se abre a más gente.

**5. Degradación elegante.**
Si el proveedor de IA falla o agota su cuota, la aplicación debe seguir siendo completamente funcional. La IA es una capa de valor añadido, no una dependencia crítica del núcleo transaccional.

### 6.4 Consideraciones de seguridad

- **Autenticación del atajo de iOS:** el token usado por Shortcuts es de larga duración y vive en un dispositivo. Debe tener alcance restringido (solo creación de transacciones), ser revocable individualmente y estar sujeto a límite de tasa.
- **Cifrado en tránsito** obligatorio (HTTPS) en todos los endpoints.
- **Aislamiento por usuario a nivel de consulta:** aunque hoy exista un solo usuario, toda query debe filtrar por `userId` desde el inicio.
- **Sin datos bancarios sensibles:** decisión de producto que también es decisión de seguridad. No se almacenan números de tarjeta, credenciales bancarias ni se realizan conexiones con entidades financieras.
- **Validación estricta de entradas** provenientes del parsing en lenguaje natural, antes de persistir.

### 6.5 Preparación para escalar

Aunque la versión inicial sea de un solo usuario, tres decisiones deben tomarse desde el día uno para evitar una migración dolorosa:

1. **Modelar `Usuario` y la relación `userId` en todas las tablas desde el primer schema**, aunque el valor sea siempre el mismo.
2. **Separar la lógica de negocio de la capa de presentación** en el backend, para que la API pueda servir a otros clientes en el futuro.
3. **Registrar métricas de uso** (latencia de endpoints, consumo de tokens de IA, frecuencia de uso de features) desde el inicio, para que las decisiones de producto futuras se basen en datos y no en intuición.

---

## 7. Alcance por Fases

**Fase 1 — MVP funcional**
Fast-Logging con atajos de iOS, gestión de ingresos y egresos, categorización con sugerencia automática, gráficos básicos de distribución y evolución, autenticación.

**Fase 2 — Producto completo**
Metas visuales con imagen, inventario de suscripciones, sistema de alertas push, gestor educativo de tarjetas con simuladores, chatbot financiero contextual.

**Fase 3 — Inteligencia avanzada**
Agente proactivo, registro por fotografía de recibo, modo "¿puedo permitírmelo?", detección de gastos hormiga, exportación de datos.

**Fase 4 — Apertura (condicional)**
Solo si la validación personal demuestra retención sostenida: multiusuario real, onboarding, y evaluación del modelo de monetización.

---

## 8. Métricas de Éxito

Dado que el producto nace para uso personal, las métricas iniciales deben validar la hipótesis central antes que el crecimiento:

| Métrica | Objetivo | Qué valida |
|---|---|---|
| Tiempo de registro por transacción | < 5 segundos | La hipótesis de fricción cero |
| Días consecutivos con registro | > 30 días | Que el producto genera hábito real |
| Porcentaje de transacciones vía Fast-Logging | > 70% | Que el canal sin fricción es el dominante |
| Precisión de categorización automática | > 80% sin corrección | Que el parsing es confiable |
| Consultas al chatbot por semana | > 3 | Que la IA aporta valor y no es decorativa |

Si tras dos meses de uso propio el registro sigue siendo consistente y el porcentaje de Fast-Logging es alto, la hipótesis central del producto queda validada y tiene sentido considerar la Fase 4.

---

*Documento vivo. Sujeto a revisión conforme avance la validación del producto.*