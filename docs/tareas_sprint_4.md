# Tareas del Sprint 4

Tareas técnicas del Sprint 4, tomadas del tablero de GitHub Projects [Proyecto SGI IES](https://github.com/users/TomasMollinedo/projects/1) (campo **Sprints** = `Sprint 4`, milestone `Sprint 4`). Las historias de usuario a las que responden están en [sprint_backlog_4.md](sprint_backlog_4.md).

- **Cantidad de tareas:** 37 (33 del tablero y 4 nuevas; 2 del tablero se dan de baja)
- **Estimación total:** 188 h (BD/Infra: 16 h, Frontend: 84 h, Backend: 88 h)
- **Última sincronización con el tablero:** 2026-10-05
- **Estado de este archivo:** sincronizado con los issues el 2026-10-05

## Cómo editar este archivo

Cada tarea es una sección `## T<número> — <título>` y corresponde a un issue de GitHub, identificado por el comentario `<!-- issue: N -->` que la precede: no hay que borrarlo ni cambiarlo, porque es lo que permite llevar los cambios de vuelta al issue correcto. Las tareas con `<!-- issue: nuevo -->` todavía no tienen issue.

- El título de la sección es el título del issue.
- **Estado**, **Etiquetas**, **Perfil sugerido** y **Asignado a** son campos del tablero.
- El resto de la sección (HU, Rama, Depende de, Estimación, Tipo de cambio, Objetivo, Punto de partida, Alcance, Listo cuando y la nota final) es el cuerpo del issue. En el issue, los encabezados `###` son de nivel 2 (`##`), y las líneas de HU a Tipo de cambio van sin viñeta ni negrita.
- Las dependencias se referencian por T-número, nunca por número de issue.

## Numeración

El número T120 ya estaba usado por un issue del Sprint 3 ([#276](https://github.com/TomasMollinedo/SGI-ies/issues/276)), así que las tareas del Sprint 4 empiezan en T121: todas se corrieron un número respecto de como están cargadas hoy en el tablero (T120 pasó a T121, y así hasta T154, que pasó a T155). La columna "En el tablero" del resumen y de las bajas muestra el número anterior. Las tareas nuevas son T156 a T159. Los números de las tareas dadas de baja no se reutilizan.

## Reglas comunes a todas las tareas

- **Punto de partida** dice qué código ya existe y qué no hay que rehacer. Los criterios de aceptación completos están en la historia de usuario; la tarea dice qué parte toca.
- Una tarea de backend está lista con lint y tests en verde, incluidos los tests que ya existían del módulo que modifica, y con Swagger completo: es el contrato que usa la tarea de frontend que depende de ella.
- Una tarea de frontend está lista con build, lint y format en verde, y verificada a mano contra su Listo cuando.
- Rutas y entradas del menú lateral solo se tocan en T157.
- Las tareas de backend que leen datos de otras historias se prueban contra el seed (T156), no esperan a que mergee la tarea que genera esos datos.

## Orden de trabajo

Las dependencias que quedan son las obligatorias: esquema antes que servicios, API antes que pantalla, y dos tareas seguidas cuando editan el mismo archivo.

1. **Día 1, sin dependencias:** T121, T132, T157 y T143.
2. **Con T121 mergeada, en paralelo:** T156, T122, T124, T126, T128, T133, T137 (con T132), T140 (con T132), T144, T146, T149 y T152.
3. **Cadenas que no se pueden paralelizar:** T133 → T134 → T136; T137 → T158 → T138 y T139; T152 → T153; T154 → T155.
4. **Cierre:** T159.

Archivos compartidos a coordinar: `venta.service.ts` (T158 y T144), el módulo de proyectos (T122 y T124), la feature de ventas del frontend (T138 y T139).

## Resumen

| Tarea | En el tablero | Issue | Título | HU | Perfil | Depende de | Estimación |
|---|---|---|---|---|---|---|---|
| [T121](#t121) | T120 | [#323](https://github.com/TomasMollinedo/SGI-ies/issues/323) | Infra: Migración de base de datos del Sprint 4, con el backend compilando | Transversal | BD/Infra | Ninguna | 8 h |
| [T156](#t156) | — | [#358](https://github.com/TomasMollinedo/SGI-ies/issues/358) | Infra: Seed de escenario del Sprint 4 | Transversal | BD/Infra | T121 | 5 h |
| [T157](#t157) | — | [#359](https://github.com/TomasMollinedo/SGI-ies/issues/359) | Front: Rutas, menú lateral y acceso por rol de las pantallas nuevas | Transversal | Frontend | Ninguna | 3 h |
| [T122](#t122) | T121 | [#324](https://github.com/TomasMollinedo/SGI-ies/issues/324) | Back: ABM de Proyecto: alta, edición, baja lógica, estado de obra, imágenes y listado | HU-31 | Backend | T121 | 8 h |
| [T123](#t123) | T122 | [#325](https://github.com/TomasMollinedo/SGI-ies/issues/325) | Front: Formulario y listado de proyectos | HU-31 | Frontend | T122, T157 | 6 h |
| [T124](#t124) | T123 | [#326](https://github.com/TomasMollinedo/SGI-ies/issues/326) | Back: Ficha del proyecto: presupuesto, precio estimado y situación comercial calculados | HU-31 | Backend | T121 | 5 h |
| [T125](#t125) | T124 | [#327](https://github.com/TomasMollinedo/SGI-ies/issues/327) | Front: Ficha del proyecto con resumen comercial y unidades | HU-31 | Frontend | T124, T157 | 5 h |
| [T126](#t126) | T125 | [#328](https://github.com/TomasMollinedo/SGI-ies/issues/328) | Back: ABM de Plazos de Financiación | HU-32 | Backend | T121 | 5 h |
| [T127](#t127) | T126 | [#329](https://github.com/TomasMollinedo/SGI-ies/issues/329) | Front: Formulario y listado de plazos de financiación | HU-32 | Frontend | T126, T157 | 4 h |
| [T128](#t128) | T127 | [#330](https://github.com/TomasMollinedo/SGI-ies/issues/330) | Fix Back: Ajustar ABM de Unidades: límite de planificadas y estado comercial en el listado | HU-20 | Backend | T121 | 4 h |
| [T129](#t129) | T128 | [#331](https://github.com/TomasMollinedo/SGI-ies/issues/331) | Fix Front: Ajustar listado y formulario de unidades: estado comercial y aviso de planificadas | HU-20 | Frontend | T128 | 3 h |
| [T131](#t131) | T130 | [#333](https://github.com/TomasMollinedo/SGI-ies/issues/333) | Fix Front: Ajustar pantallas de publicación: precio de lista en lugar de planes | HU-21 | Frontend | T133 | 2 h |
| [T132](#t132) | T131 | [#334](https://github.com/TomasMollinedo/SGI-ies/issues/334) | Back: Servicio de cálculo del sistema francés | HU-27 / HU-22 / HU-25 | Backend | Ninguna | 6 h |
| [T133](#t133) | T132 | [#335](https://github.com/TomasMollinedo/SGI-ies/issues/335) | Fix Back: Precio de lista en la publicación y paso a Disponible | HU-22 | Backend | T121 | 6 h |
| [T134](#t134) | T133 | [#336](https://github.com/TomasMollinedo/SGI-ies/issues/336) | Fix Back: Convertir los planes de la unidad en planes de ejemplo con TNA y sistema francés | HU-22 | Backend | T132, T133 | 6 h |
| [T135](#t135) | T134 | [#337](https://github.com/TomasMollinedo/SGI-ies/issues/337) | Fix Front: Ajustar formulario de precio de lista con cálculo en vivo | HU-22 | Frontend | T133 | 4 h |
| [T136](#t136) | T135 | [#338](https://github.com/TomasMollinedo/SGI-ies/issues/338) | Fix Front: Ajustar planes de ejemplo: plazo de financiación e importes en vivo | HU-22 | Frontend | T126, T134, T135 | 4 h |
| [T137](#t137) | T136 | [#339](https://github.com/TomasMollinedo/SGI-ies/issues/339) | Fix Back: Simulación de venta con sistema francés | HU-27 | Backend | T121, T132 | 4 h |
| [T158](#t158) | — | [#360](https://github.com/TomasMollinedo/SGI-ies/issues/360) | Fix Back: Confirmación de la venta con plan de pago y cuotas, cancelación y listado | HU-27 | Backend | T137 | 7 h |
| [T138](#t138) | T137 | [#340](https://github.com/TomasMollinedo/SGI-ies/issues/340) | Fix Front: Ajustar pantalla de venta: simulación con cronograma y confirmación | HU-27 | Frontend | T126, T137, T158 | 8 h |
| [T139](#t139) | T138 | [#341](https://github.com/TomasMollinedo/SGI-ies/issues/341) | Fix Front: Ajustar listado de ventas y detalle: plan de pago y cronograma | HU-27 | Frontend | T158 | 4 h |
| [T140](#t140) | T139 | [#342](https://github.com/TomasMollinedo/SGI-ies/issues/342) | Fix Back: Ajustar API pública: precio de lista, destacados, planes de ejemplo y simulación libre | HU-25 | Backend | T121, T132 | 7 h |
| [T141](#t141) | T140 | [#343](https://github.com/TomasMollinedo/SGI-ies/issues/343) | Fix Front: Ajustar catálogo y detalle de unidad: precio de lista y simulador de planes de pago | HU-25 | Frontend | T140 | 5 h |
| [T143](#t143) | T142 | [#345](https://github.com/TomasMollinedo/SGI-ies/issues/345) | Fix Front: Ajustar landing: Cómo funciona, header y sección de contacto | HU-24 | Frontend | Ninguna | 3 h |
| [T144](#t144) | T143 | [#346](https://github.com/TomasMollinedo/SGI-ies/issues/346) | Fix Back: Ajustar perfil del cliente: plan acordado y desglose de cuotas | HU-28 | Backend | T121 | 4 h |
| [T145](#t145) | T144 | [#347](https://github.com/TomasMollinedo/SGI-ies/issues/347) | Fix Front: Ajustar perfil del cliente: plan acordado y cronograma | HU-28 | Frontend | T144 | 4 h |
| [T146](#t146) | T145 | [#348](https://github.com/TomasMollinedo/SGI-ies/issues/348) | Fix Back: Agregar comprobante adjunto a la declaración de pago | HU-29 | Backend | T121 | 7 h |
| [T147](#t147) | T146 | [#349](https://github.com/TomasMollinedo/SGI-ies/issues/349) | Fix Front: Ajustar declaración de pago: adjuntar y ver el comprobante | HU-29 | Frontend | T146 | 4 h |
| [T148](#t148) | T147 | [#350](https://github.com/TomasMollinedo/SGI-ies/issues/350) | Fix Front: Ajustar bandeja de Tesorería: abrir el comprobante al validar o rechazar | HU-29 | Frontend | T146 | 3 h |
| [T149](#t149) | T148 | [#351](https://github.com/TomasMollinedo/SGI-ies/issues/351) | Back: Listado y ficha de clientes con edición y auditoría | HU-33 | Backend | T121 | 8 h |
| [T150](#t150) | T149 | [#352](https://github.com/TomasMollinedo/SGI-ies/issues/352) | Front: Listado de clientes con filtros | HU-33 | Frontend | T149, T157 | 4 h |
| [T151](#t151) | T150 | [#353](https://github.com/TomasMollinedo/SGI-ies/issues/353) | Front: Ficha del cliente | HU-33 | Frontend | T146, T149, T157 | 6 h |
| [T152](#t152) | T151 | [#354](https://github.com/TomasMollinedo/SGI-ies/issues/354) | Back: Ingresos, egresos y resultado por período | HU-34 | Backend | T121 | 6 h |
| [T153](#t153) | T152 | [#355](https://github.com/TomasMollinedo/SGI-ies/issues/355) | Back: Margen por proyecto: realizado, proyectado y total esperado | HU-34 | Backend | T121, T152 | 5 h |
| [T154](#t154) | T153 | [#356](https://github.com/TomasMollinedo/SGI-ies/issues/356) | Front: Tablero del Gerente: indicadores, gráfico y tabla | HU-34 | Frontend | T152, T157 | 7 h |
| [T155](#t155) | T154 | [#357](https://github.com/TomasMollinedo/SGI-ies/issues/357) | Front: Tabla de margen por proyecto y filtro por proyecto | HU-34 | Frontend | T153, T154 | 5 h |
| [T159](#t159) | — | [#361](https://github.com/TomasMollinedo/SGI-ies/issues/361) | Infra: Limpieza del esquema: quitar lo que quedó obsoleto del Sprint 3 | Transversal | BD/Infra | T134, T140, T144, T158 | 3 h |

## Tareas del tablero que se dan de baja

| Tarea | En el tablero | Issue | Título | La absorbe | Motivo |
|---|---|---|---|---|---|
| T130 | T129 | [#332](https://github.com/TomasMollinedo/SGI-ies/issues/332) | Fix Back: Ajustar publicación: paso a Disponible con precio de lista y fecha de entrega desde Proyecto | T133 | La regla de paso a Disponible estaba repetida en T133 y no se podía probar sin ella; la condición y la fecha de entrega ya salen del proyecto (`common/condicion-entrega.ts`). |
| T142 | T141 | [#344](https://github.com/TomasMollinedo/SGI-ies/issues/344) | Fix Back: Ajustar proyectos destacados: precio desde y portada del proyecto | T140 | La portada del proyecto ya se devuelve; lo único nuevo es el precio desde, que comparte helper con el catálogo en el mismo archivo. |

## Cambios de la revisión del 2026-10-05

Revisión de las tareas contra las historias de usuario del Sprint 4 y contra el código de `testing`.

| Tarea | Qué cambió y por qué |
|---|---|
| T121 | Pasa a BD/Infra y de 6 a 8 h. Ahora exige que el backend compile y los tests pasen después del merge: tal como estaba, renombraba PLANPAGO y dejaba `testing` roto hasta que mergearan seis tareas más. El alcance se reescribió con el documento de cambios del DER y es provisorio hasta que se revise. |
| T156 | Nueva. Ninguna tarea actualizaba los seeds, que dejan de servir con el esquema nuevo. Con los datos sembrados, ficha de proyecto, clientes, perfil, catálogo y tablero dejan de depender de la venta nueva. |
| T157 | Nueva. Seis tareas de frontend iban a editar los mismos tres archivos de rutas y menú. También resuelve el acceso por rol del tablero, que no tenía dueño: hoy el menú no filtra por rol. |
| T122 | Suma el listado con sus filtros y las validaciones de HU-31 que faltaban (planificadas no menor a las activas, fechas). |
| T123 | Suma las columnas del listado de HU-31 y la dependencia con T157. |
| T124 | Sigue HU-31: la base del porcentaje vendido son las unidades activas, no las planificadas como decía la tarea. Depende solo de T121 (antes T122) y baja a 5 h: el presupuesto ya está calculado. Se quita la nota de que se completa a medida que estén listas otras historias: con el seed se termina de una vez. Suma la lista de unidades que necesita T125. |
| T125 | Suma las imágenes de diseño y la dependencia con T157. |
| T126 | Se quita el criterio de que cambiar la TNA no modifica ventas confirmadas: lo garantiza la venta (T158), acá no se puede probar. Suma el listado y el catálogo de plazos activos que consumen otras pantallas. |
| T127 | Suma la dependencia con T157. |
| T128 | De 5 a 4 h y depende solo de T121. Se quitan tres puntos que ya están implementados (presupuesto, costo congelado, reglas por estado de obra) y se suma lo que faltaba para T129: estado comercial y su filtro. La duda sobre altas con el proyecto En ejecución ya está resuelta en el código: no se permiten. |
| T129 | De 4 a 3 h y depende solo de T128. La tabla emergente de proyectos y los filtros de tipología y superficie ya existen. |
| T131 | De 3 a 2 h y depende de T133. Casi todo el alcance ya está hecho (tabla emergente, despublicación con motivo, mensaje de En planificación); queda mostrar el precio y quitar los textos sobre planes. |
| T132 | Aclara que se evoluciona `motor-cuotas.ts` en lugar de crear un cálculo paralelo, y suma contado, totales y un caso de vencimiento. |
| T133 | Absorbe T130, de 5 a 6 h, y depende solo de T121. Es la dueña única del paso a Disponible y de eliminar la regla de inactivación de planes. |
| T134 | Depende de T132 y T133 (el plazo se lee de la tabla, no hace falta T126). Suma reemplazar el endpoint de simulación del Sprint 3. |
| T135 | Sin cambios de fondo; aclara que el precio sale del formulario de cada plan. |
| T136 | Suma T126 (lista de plazos) y T135 (editan los mismos archivos) como dependencias. |
| T137 | Dividida, como pedía su propia nota. Queda la simulación (4 h), que desbloquea a T138 antes; la confirmación pasa a T158. |
| T158 | Nueva: segunda mitad de la T137 original (7 h). Suma el backend del listado y el detalle que T139 necesitaba y nadie tenía. Deja de depender de T133 y T126: lee el precio y los plazos de la base. |
| T138 | Suma T126 como dependencia y el manejo del rechazo de la confirmación. |
| T139 | Depende de T158. Se quita la cancelación del alcance: ya existe. |
| T140 | Absorbe T142, de 5 a 7 h, y depende de T121 y T132. Suma el precio del listado del catálogo, que no estaba en ninguna tarea y hoy sale del plan más barato. |
| T141 | Suma las tarjetas del catálogo, que hoy muestran un precio desde. |
| T143 | De 4 a 3 h y sin dependencias: las tarjetas con portada ya existen y el contrato de destacados no cambia. |
| T144 | Depende solo de T121 (antes T137 y T146). El historial con declaraciones ya existe y el acceso al comprobante queda en T146. Se quita la nota sobre actualizar HU-28: ya está actualizada. |
| T145 | De 5 a 4 h. Se reparte con T147 qué componentes toca cada una, porque las dos editaban el perfil. |
| T146 | De 6 a 7 h. Suma la infraestructura del repositorio privado, que hoy no existe, y los endpoints de acceso al comprobante que antes se repetían en T144. |
| T147 | Se quitan dos puntos ya implementados y se suma ver el comprobante, que antes estaba en T145. |
| T148 | Se quitan dos puntos ya implementados (rechazo con motivo, saldo insuficiente). |
| T149 | Depende solo de T121. La falta de FK_usuario_actualizador en CLIENTE pasa a los puntos a revisar del DER. |
| T150 | Suma la dependencia con T157. |
| T151 | Suma T146 y T157 como dependencias; enlaza a los detalles existentes en lugar de repetirlos. |
| T152 | Depende de T121 (antes T137). Se quita crear el rol Gerente General: ya existe. |
| T153 | De 6 a 5 h. El porcentaje vendido es sobre unidades activas, igual que T124. Depende de T121 y T152 (mismo módulo), no de T137 ni T133. |
| T154 | Suma T157 como dependencia. El acceso por rol pasa a T157. Prevé instalar una librería de gráficos, porque el frontend no tiene ninguna. |
| T155 | Suma T154 como dependencia: se monta sobre su pantalla. |
| T159 | Nueva. Cierra la migración aditiva de T121 eliminando lo que el DER da de baja. Provisoria hasta definir el DER final. |

## Cambios por el cierre de T121 (2026-10-05)

Ajustes a las tareas después de definir el DER final y de mergear la migración.

| Tarea | Qué cambió y por qué |
|---|---|
| T121 | Alcance y Listo cuando reescritos con lo que se hizo. Salen los renombres de CLIENTE y la migración de datos del Sprint 3 (la base se resetea). Entran estado_obra y la baja lógica de PROYECTO, sus campos obligatorios, FK_usuario_actualizador de CLIENTE, el renombre a FK_plan_ejemplo en VENTA, la doble escritura de la venta y los seeds adaptados. Deja de ser provisoria. |
| T122 | El Punto de partida aclara que `estado` ahora es la baja lógica y `estado_obra` el estado de obra, y que cambiar el contrato de las respuestas es de esta tarea. CANCELADO queda atado a OBS-22. |
| T134 | El Punto de partida suma lo que ya hizo T121 en PLANEJEMPLO (tipo y precio admiten vacío, existe el plazo) y lo que queda para esta tarea y para T159. |
| T144 | El Punto de partida suma que el perfil ya lee del plan de pago, y que el nombre del plan todavía sale del plan de ejemplo: lo reemplaza esta tarea. |
| T146 | El Punto de partida aclara que las columnas del comprobante ya existen. |
| T149 | El Punto de partida aclara que FK_usuario_actualizador de CLIENTE ya existe y que no hubo renombres. |
| T156 | El Punto de partida refleja que los seeds ya crean el plan de pago con TNA 0 %. Suma dejar de depender del cliente con id 1. |
| T158 | El Punto de partida suma la doble escritura actual, las dos FK de CUOTA, las lecturas que asumen plan de ejemplo y el destino de periodicidad_congelada. |
| T159 | Alcance reescrito con la lista exacta de columnas legado. Suma borrar el código de transición, definir los obligatorios de PLANEJEMPLO y CANCELADO según OBS-22. El enum de modalidad no se elimina. Deja de ser provisoria. |

## Pendientes de definición

- **Historias de usuario:** las inconsistencias y vacíos detectados están en [observaciones_hu_sprint_4.md](observaciones_hu_sprint_4.md), para que las Product Owners los resuelvan. Cuando respondan, se actualizan las tareas que cada observación indica.
- **DER:** resuelto. T121 definió el DER final en [cambios_der_sprint_4.md](cambios_der_sprint_4.md), que lista cómo se resolvió cada punto y las columnas que quedan por compatibilidad hasta T159.
- **Responsables:** las tareas no tienen asignados. Este sprint no usa Deadline.

---

<a id="t121"></a>
<!-- issue: 323 -->
## T121 — Infra: Migración de base de datos del Sprint 4, con el backend compilando

- **Issue:** [#323](https://github.com/TomasMollinedo/SGI-ies/issues/323)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** BD/Infra
- **Asignado a:** Sin asignar
- **HU:** Transversal · Cambios del DER del Sprint 4
- **Rama:** `feat/t121-migracion-der-sprint4`
- **Depende de:** Ninguna
- **Estimación:** 8 h
- **Tipo de cambio:** Cambio transversal

### Objetivo

Dejar la base de datos lista para las historias del Sprint 4 según [cambios_der_sprint_4.md](cambios_der_sprint_4.md), sin romper `testing`: después del merge el backend compila y los tests pasan.

### Punto de partida

- `backend/prisma/schema.prisma`: hoy `PLANPAGO` cuelga de la publicación y tiene precio propio; `VENTA` apunta a ese plan y guarda las condiciones en columnas `*_congelado`; `CUOTA` cuelga de la venta y solo tiene `importe` y `saldo_pendiente`.
- Ya están bien en el esquema y no requieren cambios: los nombres FORMAPAGO, DETALLECOBRO y VENTA, y el atributo FK_usuario_respuesta.
- Usan esos modelos: `plan-pago/`, `venta/`, `declaracion-pago/`, `publicacion/` y `catalogo/` del backend, y `prisma/seed-comercializacion.ts`.

### Alcance

- [x] Crear PLAZOFINANCIACION, IMAGENPROYECTO (tipo RENDER o PLANO) y la nueva PLANPAGO, 1 a 1 con VENTA, con modalidad, precio de venta, anticipo, cantidad de cuotas, TNA y valor de cuota
- [x] Renombrar la PLANPAGO del Sprint 3 a PLANEJEMPLO y agregarle el plazo de financiación; el enum de tipo de plan pasa a llamarse ModalidadPago
- [x] CUOTA: agregar FK_plan_pago, importe_capital, importe_interes, saldo_capital y las horas de creación y actualización
- [x] VENTA: renombrar fecha_adhesion a fecha_venta y FK_plan_pago a FK_plan_ejemplo, y agregar hora_actualizacion y FK_usuario_actualizador
- [x] PROYECTO: renombrar estado a estado_obra, agregar estado (baja lógica), descripcion y fecha_inicio, y hacer obligatorias direccion y cantidad_unidades_planificadas
- [x] PUBLICACIONUNIDAD: agregar precio_lista, porcentaje_ganancia y margen; DECLARACIONPAGO: agregar ruta, nombre y tipo del comprobante; CLIENTE: agregar FK_usuario_actualizador, sin renombrar atributos
- [x] Migración aditiva: lo que el DER elimina no se borra acá, se elimina en T159. La lista exacta está en [cambios_der_sprint_4.md](cambios_der_sprint_4.md#columnas-legado-se-eliminan-en-t159)
- [x] No se migran datos del Sprint 3: el sistema no está en producción y la base se resetea
- [x] Aplicar en el código solo los renombres mecánicos necesarios para que compile, sin cambiar ningún contrato HTTP; el comportamiento nuevo es de las tareas de cada historia
- [x] Doble escritura en la venta presencial: además de las columnas del Sprint 3, crea el plan de pago de la venta (con TNA 0 %) y cada cuota con las dos FK y su desglose de capital, interés y saldo
- [x] Las condiciones de la venta se leen del plan de pago, en un único lugar (`venta/condiciones-venta.ts`)
- [x] Seeds y pruebas de integración adaptados: cada venta sembrada tiene su plan de pago y sus cuotas desglosadas

### Listo cuando

- [x] La migración corre de cero con `prisma migrate reset` y los seeds, y no hay diferencias entre el esquema y las migraciones
- [x] El backend compila, levanta y pasan los tests
- [x] Sin errores de lint nuevos en los archivos que toca la tarea
- [x] Los contratos HTTP no cambian: el frontend y el ecommerce siguen funcionando sin modificaciones
- [x] La PR incluye el protocolo de reset para el equipo

> ⚠️ La migración no se puede aplicar sobre una base con datos del Sprint 3: después del merge todo el equipo resetea su base con el protocolo de la PR. Tiene que mergear el primer día: bloquea a casi todo el backend.

---

<a id="t156"></a>
<!-- issue: 358 -->
## T156 — Infra: Seed de escenario del Sprint 4

- **Issue:** [#358](https://github.com/TomasMollinedo/SGI-ies/issues/358)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** BD/Infra
- **Asignado a:** Sin asignar
- **HU:** Transversal · Datos de prueba del Sprint 4
- **Rama:** `feat/t156-seed-sprint4`
- **Depende de:** T121
- **Estimación:** 5 h
- **Tipo de cambio:** Cambio transversal

### Objetivo

Sembrar los datos del Sprint 4 tal como los dejarían los servicios que todavía no existen, para que las tareas se puedan desarrollar y probar en paralelo.

### Punto de partida

- `backend/prisma/seed-comercializacion.ts` y `seed-t112-cliente1.ts` siembran el escenario del Sprint 3, ya adaptado al esquema nuevo por T121: cada venta tiene su plan de pago con TNA 0 % y sus cuotas desglosadas, a través de `prisma/seed-venta-con-plan-pago.ts`.
- Las ventas financiadas del Sprint 4 tienen que sembrarse con sistema francés real (T132), no con ese helper.

### Alcance

- [ ] Plazos de financiación activos e inactivos, uno con TNA 0 %
- [ ] Proyectos en los tres estados de obra, con portada e imágenes de diseño, uno sin fecha de finalización estimada
- [ ] Publicaciones en los cuatro estados comerciales, con precio de lista y planes de ejemplo
- [ ] Ventas de contado y financiadas con su plan de pago y sus cuotas con capital, interés y saldo, incluyendo cuotas vencidas
- [ ] Declaraciones de pago pendientes, validadas y rechazadas con comprobante, y clientes con y sin compras
- [ ] Dejar de depender de que el cliente de prueba tenga el id 1: buscarlo por email

### Listo cuando

- [ ] El seed corre dos veces seguidas sin duplicar ni fallar
- [ ] Las cuotas sembradas coinciden con el caso de prueba del sistema francés (T132)
- [ ] Con el usuario gerente@axontech.test y el administrador se puede entrar al sistema

> ⚠️ Es lo que permite que ficha de proyecto, clientes, perfil, catálogo y tablero no esperen a la venta nueva.

---

<a id="t157"></a>
<!-- issue: 359 -->
## T157 — Front: Rutas, menú lateral y acceso por rol de las pantallas nuevas

- **Issue:** [#359](https://github.com/TomasMollinedo/SGI-ies/issues/359)
- **Estado:** To do
- **Etiquetas:** Frontend
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** Transversal · HU-31, HU-32, HU-33 y HU-34
- **Rama:** `feat/t157-rutas-menu-sprint4`
- **Depende de:** Ninguna
- **Estimación:** 3 h
- **Tipo de cambio:** Cambio transversal

### Objetivo

Cargar una sola vez las rutas y entradas de menú de todas las pantallas internas nuevas, para que las demás ramas no editen los mismos archivos.

### Punto de partida

- `frontend/src/app/router/paths.ts`, `frontend/src/app/router/index.tsx` y `frontend/src/layouts/navItems.ts`.
- Hoy el menú lateral no filtra por rol: muestra todo a cualquier usuario.

### Alcance

- [ ] Rutas y entradas de menú de Proyectos (listado, alta, edición y ficha), Plazos de Financiación, Clientes (listado y ficha) y Tablero del Gerente
- [ ] Mecanismo para que una ruta y su entrada de menú se muestren solo a un rol, aplicado al Tablero del Gerente
- [ ] Cada ruta nueva apunta a una pantalla provisoria hasta que mergee su tarea

### Listo cuando

- [ ] Un Administrador no ve el Tablero en el menú ni puede entrar por URL
- [ ] El Gerente General ve el Tablero y el resto del menú
- [ ] Pasan build, lint y format

> ⚠️ Tiene que mergear el primer día. Ninguna otra tarea del sprint agrega rutas ni entradas de menú.

---

<a id="t122"></a>
<!-- issue: 324 -->
## T122 — Back: ABM de Proyecto: alta, edición, baja lógica, estado de obra, imágenes y listado

- **Issue:** [#324](https://github.com/TomasMollinedo/SGI-ies/issues/324)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-31 · ABM de Proyecto
- **Rama:** `feat/t122-abm-proyecto`
- **Depende de:** T121
- **Estimación:** 8 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Permitir registrar, modificar, listar y dar de baja proyectos con su estado de obra e imágenes.

### Punto de partida

- `backend/src/modules/proyectos/` hoy solo lee: listado con presupuesto y unidades cargadas, detalle y estados.
- Desde T121, `PROYECTO.estado` es la baja lógica (verdadero / falso) y `estado_obra` es el estado de obra. Las respuestas actuales siguen exponiendo `estado` con el estado de obra, y el filtro `estado` del listado filtra por estado de obra: cambiar ese contrato es de esta tarea.
- La base ya tiene `descripcion`, `fecha_inicio`, IMAGENPROYECTO, y `direccion` y `cantidad_unidades_planificadas` obligatorias.
- Las imágenes se suben con el endpoint existente de `almacenamiento/`; acá solo se guardan las URL.

### Alcance

- [ ] Alta y edición con código generado por el sistema, nombre único entre activos, dirección, localidad y cantidad de unidades planificadas mayor a cero y no menor a las unidades activas ya cargadas
- [ ] Fecha de finalización estimada no anterior a la de inicio y editable mientras el proyecto no esté Finalizado
- [ ] Estado de obra En planificación > En ejecución > Finalizado, sin retroceso y sin pasar a En ejecución sin unidades activas
- [ ] Portada e imágenes de diseño (render y plano) con tipo y orden de visualización
- [ ] Baja lógica solo en proyectos En planificación sin unidades activas
- [ ] Listado: solo activos por defecto, filtros por estado de obra y localidad, búsqueda por código o nombre y orden por nombre

### Listo cuando

- [ ] Crear un proyecto con un nombre repetido es rechazado
- [ ] Intentar pasar a En ejecución sin unidades activas es rechazado
- [ ] Bajar la cantidad planificada por debajo de las unidades activas es rechazado
- [ ] Toda alta, modificación, cambio de estado y baja registra usuario y fecha

> ⚠️ El enum de estado de proyecto tiene además CANCELADO, que HU-31 no contempla: sigue en el enum hasta que se responda OBS-22.

---

<a id="t123"></a>
<!-- issue: 325 -->
## T123 — Front: Formulario y listado de proyectos

- **Issue:** [#325](https://github.com/TomasMollinedo/SGI-ies/issues/325)
- **Estado:** To do
- **Etiquetas:** Frontend
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-31 · ABM de Proyecto
- **Rama:** `feat/t123-proyectos-formulario-listado`
- **Depende de:** T122, T157
- **Estimación:** 6 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Dar al Responsable de Proyectos la pantalla para cargar y consultar proyectos.

### Punto de partida

- `frontend/src/features/proyectos/` ya tiene servicio, hooks y tipos de lectura, sin pantallas.
- Reutilizar la carga de imágenes de `unidades-funcionales/components/GaleriaImagenesForm.tsx`.

### Alcance

- [ ] Formulario paramétrico con modos INSERCIÓN, EDICIÓN y LECTURA
- [ ] Carga de portada e imágenes de diseño con validación de tipo y tamaño, tipo y orden
- [ ] Listado con código, nombre, localidad, estado de obra, unidades cargadas / planificadas, porcentaje vendido y fecha de finalización estimada
- [ ] Filtros por estado de obra y localidad, y búsqueda por código o nombre
- [ ] Modal de confirmación para la baja y para el avance de estado

### Listo cuando

- [ ] El listado muestra por defecto solo los proyectos activos
- [ ] Una baja pide confirmación y no elimina datos físicamente
- [ ] El avance de estado no ofrece volver a un estado anterior

---

<a id="t124"></a>
<!-- issue: 326 -->
## T124 — Back: Ficha del proyecto: presupuesto, precio estimado y situación comercial calculados

- **Issue:** [#326](https://github.com/TomasMollinedo/SGI-ies/issues/326)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-31 · ABM de Proyecto
- **Rama:** `feat/t124-proyecto-ficha-calculos`
- **Depende de:** T121
- **Estimación:** 5 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Calcular al consultar los datos resumen del proyecto, sin almacenarlos.

### Punto de partida

- El presupuesto y las unidades cargadas ya se calculan en `proyecto.service.ts` (`calcularResumenes`).
- Va en un archivo propio del módulo de proyectos para no pisarse con T122, que trabaja en paralelo sobre el mismo módulo.

### Alcance

- [ ] Precio estimado de venta = suma de precios de lista de las unidades con publicación vigente, indicando sobre cuántas unidades se calculó
- [ ] Situación comercial: cantidad de unidades sin publicar, en preparación, Disponibles, En Plan de Pago y Vendidas, y porcentaje de unidades activas con venta registrada
- [ ] Identificar Todas las unidades vendidas cuando todas las unidades activas tienen una venta vigente
- [ ] Lista de unidades del proyecto con identificador, tipología, superficie cubierta, costo, precio de lista y estado comercial
- [ ] Exponer el porcentaje vendido también en el listado de proyectos

### Listo cuando

- [ ] Los valores no se guardan en tablas: se calculan en cada consulta
- [ ] Se prueba contra los datos del seed (T156), sin esperar a las tareas de precio ni de venta

> ⚠️ Se sigue HU-31: la base son las unidades activas, no las planificadas. Un proyecto con 10 planificadas y una sola cargada y vendida figura como Todas las unidades vendidas; el caso está avisado en observaciones_hu_sprint_4.md.

---

<a id="t125"></a>
<!-- issue: 327 -->
## T125 — Front: Ficha del proyecto con resumen comercial y unidades

- **Issue:** [#327](https://github.com/TomasMollinedo/SGI-ies/issues/327)
- **Estado:** To do
- **Etiquetas:** Frontend
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-31 · ABM de Proyecto
- **Rama:** `feat/t125-proyecto-ficha-pantalla`
- **Depende de:** T124, T157
- **Estimación:** 5 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Mostrar de un vistazo la situación del proyecto.

### Alcance

- [ ] Mostrar el estado de obra y la situación comercial por separado
- [ ] Mostrar presupuesto, precio estimado y unidades cargadas respecto de las planificadas
- [ ] Mostrar la portada y las imágenes de diseño
- [ ] Listar las unidades con identificador, tipología, superficie, costo, precio de lista y estado comercial

### Listo cuando

- [ ] Cada unidad de la lista abre su detalle
- [ ] El indicador Todas las unidades vendidas aparece solo cuando corresponde

---

<a id="t126"></a>
<!-- issue: 328 -->
## T126 — Back: ABM de Plazos de Financiación

- **Issue:** [#328](https://github.com/TomasMollinedo/SGI-ies/issues/328)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-32 · ABM de Plazos de Financiación
- **Rama:** `feat/t126-abm-plazos-financiacion`
- **Depende de:** T121
- **Estimación:** 5 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Registrar los plazos que ofrece la empresa, cada uno con su tasa nominal anual.

### Alcance

- [ ] Código generado por el sistema, cantidad de cuotas entera mayor a cero y TNA mayor o igual a cero
- [ ] Cantidad de cuotas única entre plazos activos y bloqueada después del alta
- [ ] Baja lógica
- [ ] Listado: solo activos por defecto, orden por cantidad de cuotas ascendente, filtro por estado, con la tasa mensual (TNA / 12)
- [ ] Catálogo de plazos activos para las tablas emergentes de venta y de planes de ejemplo

### Listo cuando

- [ ] No se puede crear un segundo plazo activo con la misma cantidad de cuotas
- [ ] La cantidad de cuotas no se puede modificar después del alta
- [ ] Alta, cambio de tasa y baja registran usuario y fecha

> ⚠️ Falta confirmar con el equipo el máximo de cuotas (el caso de prueba usa 60) y agregarlo a HU-32.

---

<a id="t127"></a>
<!-- issue: 329 -->
## T127 — Front: Formulario y listado de plazos de financiación

- **Issue:** [#329](https://github.com/TomasMollinedo/SGI-ies/issues/329)
- **Estado:** To do
- **Etiquetas:** Frontend
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-32 · ABM de Plazos de Financiación
- **Rama:** `feat/t127-plazos-formulario-listado`
- **Depende de:** T126, T157
- **Estimación:** 4 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Dar a Comercialización la pantalla para administrar los plazos de financiación.

### Alcance

- [ ] Formulario paramétrico con modos INSERCIÓN, EDICIÓN y LECTURA
- [ ] Mostrar la tasa mensual (TNA / 12) en vivo como dato no editable
- [ ] Listado ordenado por cantidad de cuotas con filtro por estado
- [ ] Modal de confirmación para la baja

### Listo cuando

- [ ] La cantidad de cuotas no se puede editar después del alta
- [ ] El listado muestra cantidad de cuotas, TNA, tasa mensual, descripción y estado

---

<a id="t128"></a>
<!-- issue: 330 -->
## T128 — Fix Back: Ajustar ABM de Unidades: límite de planificadas y estado comercial en el listado

- **Issue:** [#330](https://github.com/TomasMollinedo/SGI-ies/issues/330)
- **Estado:** To do
- **Etiquetas:** Backend, Fix
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-20 · ABM de Unidades Funcionales
- **Rama:** `fix/t128-unidades-integracion-proyecto`
- **Depende de:** T121
- **Estimación:** 4 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Adaptar el ABM de Unidades Funcionales ya hecho a las reglas nuevas de HU-20.

### Punto de partida

- `backend/src/modules/comercializacion/unidades-funcionales/`.
- Ya está hecho y no se toca: presupuesto calculado con las unidades activas, costo congelado desde la primera publicación, altas solo con el proyecto En planificación y sin bajas con el proyecto En ejecución o Finalizado.

### Alcance

- [ ] No permitir dar de alta ni reactivar más unidades activas que las planificadas del proyecto
- [ ] El proyecto de la unidad tiene que estar activo (baja lógica de HU-31)
- [ ] Devolver en el listado el estado comercial de cada unidad (sin publicar, en preparación, Disponible, En Plan de Pago o Vendida)
- [ ] Filtro por estado comercial, combinable con los de tipología y superficie que ya existen

### Listo cuando

- [ ] Al superar la cantidad planificada el sistema informa que primero hay que actualizarla en el proyecto
- [ ] El listado filtra por estado comercial

---

<a id="t129"></a>
<!-- issue: 331 -->
## T129 — Fix Front: Ajustar listado y formulario de unidades: estado comercial y aviso de planificadas

- **Issue:** [#331](https://github.com/TomasMollinedo/SGI-ies/issues/331)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-20 · ABM de Unidades Funcionales
- **Rama:** `fix/t129-unidades-pantallas`
- **Depende de:** T128
- **Estimación:** 3 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Adaptar las pantallas de unidades a las reglas nuevas de HU-20.

### Punto de partida

- `frontend/src/features/proyectos/unidades-funcionales/`.
- Ya está hecho y no se toca: la tabla emergente de proyectos (`SelectorProyectoModal`) y los filtros por tipología y rango de superficie.

### Alcance

- [ ] Mostrar el estado comercial de cada unidad en el listado
- [ ] Agregar el filtro por estado comercial
- [ ] Mostrar el aviso cuando se supera la cantidad de unidades planificadas
- [ ] La tabla emergente de proyectos ofrece solo proyectos activos

### Listo cuando

- [ ] El listado por proyecto muestra el estado comercial de cada unidad
- [ ] El aviso indica que primero hay que actualizar la cantidad en el proyecto

---

<a id="t131"></a>
<!-- issue: 333 -->
## T131 — Fix Front: Ajustar pantallas de publicación: precio de lista en lugar de planes

- **Issue:** [#333](https://github.com/TomasMollinedo/SGI-ies/issues/333)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-21 · Publicación de Unidad Funcional en el Ecommerce
- **Rama:** `fix/t131-publicacion-pantalla`
- **Depende de:** T133
- **Estimación:** 2 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Quitar de las pantallas de publicación la dependencia con los planes de pago y mostrar el precio de lista.

### Punto de partida

- `frontend/src/features/comercializacion/publicaciones/`.
- Ya está hecho y no se toca: tabla emergente de unidades, despublicación con motivo, mensaje para proyectos En planificación y condición de entrega.

### Alcance

- [ ] Mostrar el precio de lista en el listado y en el detalle de la publicación
- [ ] Indicar que una publicación en preparación pasa a Disponible al definir su precio
- [ ] Quitar los textos y avisos que atan el estado a tener planes de pago activos

### Listo cuando

- [ ] Una publicación en preparación invita a definir el precio, no a cargar planes
- [ ] Ningún texto menciona la inactivación de planes como causa de un cambio de estado

---

<a id="t132"></a>
<!-- issue: 334 -->
## T132 — Back: Servicio de cálculo del sistema francés

- **Issue:** [#334](https://github.com/TomasMollinedo/SGI-ies/issues/334)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-27 / HU-22 / HU-25 · Servicio compartido
- **Rama:** `feat/t132-servicio-sistema-frances`
- **Depende de:** Ninguna
- **Estimación:** 6 h
- **Tipo de cambio:** Cambio transversal

### Objetivo

Tener un único servicio de cálculo que usen la venta, los planes de ejemplo y el simulador.

### Punto de partida

- `backend/src/modules/comercializacion/plan-pago/motor-cuotas.ts` ya resuelve vencimientos, anticipo como cuota 0 y redondeo con decimales exactos, repartiendo en partes iguales.
- Es una función pura, sin base de datos: no depende de la migración.

### Alcance

- [ ] Valor de cuota = S × i / (1 − (1 + i)^−n), con i = TNA / 12, redondeado a dos decimales
- [ ] Cronograma con capital, interés y saldo por cuota; la última cuota amortiza el saldo exacto
- [ ] Si la TNA es 0 %, la cuota es saldo / n
- [ ] Contado: una única cuota 0 por el total, que vence el día de la venta
- [ ] Devolver también los totales: saldo a financiar, total de intereses y total a pagar
- [ ] Evolucionar el motor existente en lugar de crear un segundo cálculo; quitar las periodicidades que no sean mensuales

### Listo cuando

- [ ] Con precio 20.000.000, anticipo 10.000.000, 12 cuotas y TNA 24 % da cuota 945.595,97, última cuota 945.595,92 e intereses 1.347.151,59
- [ ] El cronograma coincide cuota por cuota con el caso de prueba y el saldo de capital final es 0
- [ ] Venta el 31/01 con vencimiento a 1 mes cae el último día de febrero

> ⚠️ El cronograma completo del caso de prueba está en [cambios_der_sprint_4.md](cambios_der_sprint_4.md). Publicar el tipo de la respuesta el primer día: lo consumen T134, T137 y T140.

---

<a id="t133"></a>
<!-- issue: 335 -->
## T133 — Fix Back: Precio de lista en la publicación y paso a Disponible

- **Issue:** [#335](https://github.com/TomasMollinedo/SGI-ies/issues/335)
- **Estado:** To do
- **Etiquetas:** Backend, Fix
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-22 · Precio de Lista y Planes de Pago de Ejemplo / HU-21 · Publicación
- **Rama:** `fix/t133-precio-lista-publicacion`
- **Depende de:** T121
- **Estimación:** 6 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Pasar del precio por plan a un único precio de lista por publicación, que es lo que hace Disponible a la unidad.

### Punto de partida

- Hoy el precio vive en cada plan y la publicación pasa a Disponible al tener un plan activo, y vuelve a preparación al quedarse sin planes: `plan-pago.service.ts` (`sincronizarEstadoPublicacion`).
- Absorbe la parte de backend de HU-21 (ex T130): la condición y la fecha de entrega ya salen del proyecto en `common/condicion-entrega.ts` y no se tocan.

### Alcance

- [ ] Endpoint para definir y modificar el precio de lista de una publicación, mayor a cero
- [ ] Guardar porcentaje de ganancia y margen como referencia; al cargar el precio directo, calcular el porcentaje sobre el costo y limpiar el margen
- [ ] Al guardar el precio por primera vez la publicación pasa a Disponible
- [ ] Eliminar la regla que cambia el estado de la publicación según sus planes activos
- [ ] Bloquear la edición del precio en En Plan de Pago o Vendida
- [ ] Devolver precio de lista, porcentaje y margen en el listado y el detalle de publicaciones

### Listo cuando

- [ ] Una publicación sin precio de lista sigue en preparación y no es visible en el catálogo
- [ ] Una publicación que se vuelve a publicar nace sin precio
- [ ] Un precio menor al costo se guarda, y la respuesta lo advierte
- [ ] El costo de la unidad no se modifica desde este endpoint

---

<a id="t134"></a>
<!-- issue: 336 -->
## T134 — Fix Back: Convertir los planes de la unidad en planes de ejemplo con TNA y sistema francés

- **Issue:** [#336](https://github.com/TomasMollinedo/SGI-ies/issues/336)
- **Estado:** To do
- **Etiquetas:** Backend, Fix
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-22 · Precio de Lista y Planes de Pago de Ejemplo
- **Rama:** `fix/t134-planes-ejemplo`
- **Depende de:** T132, T133
- **Estimación:** 6 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Reutilizar los planes del Sprint 3 como planes de ejemplo para el simulador.

### Punto de partida

- `backend/src/modules/comercializacion/plan-pago/` (servicio, DTO y tests). Depende de T133 porque las dos tocan `plan-pago.service.ts`.
- Desde T121 la tabla es PLANEJEMPLO: `tipo` y `precio` ya admiten vacío y `FK_plazo_financiacion` ya existe (también admite vacío). El servicio todavía los escribe y los exige al leer.
- Los planes de contado y los planes sin `anticipo_porcentaje` que dejó el Sprint 3 los resuelve esta tarea. Que `FK_plazo_financiacion` y `anticipo_porcentaje` pasen a obligatorios en la base se define en T159.

### Alcance

- [ ] Cada plan guarda nombre, anticipo en porcentaje (mayor a 0 y menor a 100 %), plazo activo y estado
- [ ] Los importes no se guardan: se calculan al mostrarlos con el servicio del sistema francés, el precio de lista y la TNA vigentes
- [ ] Crear, editar e inactivar solo con la publicación en Disponible
- [ ] Si el plazo se inactiva, el plan deja de devolverse
- [ ] Reemplazar el endpoint de simulación de cuotas del Sprint 3 por el cálculo nuevo

### Listo cuando

- [ ] Si cambia el precio de lista o la TNA, los importes devueltos cambian sin editar el plan
- [ ] Alta, modificación e inactivación registran usuario y fecha
- [ ] Los tests del módulo quedan actualizados y en verde

---

<a id="t135"></a>
<!-- issue: 337 -->
## T135 — Fix Front: Ajustar formulario de precio de lista con cálculo en vivo

- **Issue:** [#337](https://github.com/TomasMollinedo/SGI-ies/issues/337)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-22 · Precio de Lista y Planes de Pago de Ejemplo
- **Rama:** `fix/t135-precio-lista-pantalla`
- **Depende de:** T133
- **Estimación:** 4 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Adaptar el formulario al precio único por publicación.

### Punto de partida

- `frontend/src/features/comercializacion/planes-pago/`: la ayuda de precio ya existe por plan (`AyudaDePrecio.tsx`, `utils/calculoPrecio.ts`).

### Alcance

- [ ] Un solo campo de precio por publicación, fuera del formulario de cada plan
- [ ] Mostrar el precio sugerido en vivo cuando se usan porcentaje y margen
- [ ] Completar el porcentaje y limpiar el margen al cargar el precio directo
- [ ] Advertir antes de guardar si el precio es menor al costo

### Listo cuando

- [ ] Con la unidad En Plan de Pago o Vendida el precio queda bloqueado
- [ ] La advertencia permite continuar con el guardado
- [ ] El costo se muestra y no es editable

---

<a id="t136"></a>
<!-- issue: 338 -->
## T136 — Fix Front: Ajustar planes de ejemplo: plazo de financiación e importes en vivo

- **Issue:** [#338](https://github.com/TomasMollinedo/SGI-ies/issues/338)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-22 · Precio de Lista y Planes de Pago de Ejemplo
- **Rama:** `fix/t136-planes-ejemplo-pantalla`
- **Depende de:** T126, T134, T135
- **Estimación:** 4 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Adaptar la pantalla de planes a los planes de ejemplo calculados.

### Punto de partida

- `frontend/src/features/comercializacion/planes-pago/`. Depende de T135 porque las dos editan `PlanesPagoPublicacionPage.tsx` y `PlanPagoForm.tsx`.

### Alcance

- [ ] Elegir el plazo entre los plazos activos con tabla emergente
- [ ] Quitar del plan el precio propio, el tipo y la periodicidad
- [ ] Mostrar en vivo anticipo, saldo a financiar, cuota, intereses y total a pagar, pidiéndolos al backend
- [ ] Listar los planes con la opción de inactivar

### Listo cuando

- [ ] Los importes mostrados coinciden con los del servicio de cálculo
- [ ] La pantalla solo permite cargar planes con la publicación en Disponible

---

<a id="t137"></a>
<!-- issue: 339 -->
## T137 — Fix Back: Simulación de venta con sistema francés

- **Issue:** [#339](https://github.com/TomasMollinedo/SGI-ies/issues/339)
- **Estado:** To do
- **Etiquetas:** Backend, Fix
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-27 · Registro de Venta Presencial con Plan de Pago
- **Rama:** `fix/t137-venta-simulacion`
- **Depende de:** T121, T132
- **Estimación:** 4 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Calcular, sin guardar nada, el plan de pago que se está acordando con el cliente.

### Punto de partida

- `backend/src/modules/comercializacion/venta/`. Es la primera mitad de la T137 original; la confirmación pasó a T158.

### Alcance

- [ ] Endpoint de simulación: unidad Disponible, modalidad Contado o Financiado, anticipo en monto o en porcentaje (calculando el otro) y plazo activo
- [ ] Anticipo mayor a cero y menor al precio de lista
- [ ] Devolver saldo a financiar, TNA, tasa mensual, valor de cuota, total de intereses, total a pagar y cronograma completo
- [ ] Sin plazos activos solo se admite Contado

### Listo cuando

- [ ] La simulación no crea venta, plan ni cuotas
- [ ] El contrato queda publicado en Swagger para que T138 arranque

---

<a id="t158"></a>
<!-- issue: 360 -->
## T158 — Fix Back: Confirmación de la venta con plan de pago y cuotas, cancelación y listado

- **Issue:** [#360](https://github.com/TomasMollinedo/SGI-ies/issues/360)
- **Estado:** To do
- **Etiquetas:** Backend, Fix
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-27 · Registro de Venta Presencial con Plan de Pago
- **Rama:** `fix/t158-venta-confirmacion`
- **Depende de:** T137
- **Estimación:** 7 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Formalizar la venta con el plan acordado y su cronograma, en una única operación.

### Punto de partida

- `backend/src/modules/comercializacion/venta/venta.service.ts`.
- Ya está hecho y se conserva: búsqueda o alta de cliente, una sola venta vigente por unidad y cancelación bloqueada con cobros confirmados o declaraciones pendientes.
- Desde T121, `crear` hace doble escritura: las columnas del Sprint 3 de VENTA y, además, el plan de pago de la venta con TNA 0 % y las cuotas desglosadas.
- CUOTA exige `FK_venta` y `FK_plan_pago` hasta T159: las dos se siguen escribiendo.
- Son de esta tarea las lecturas que asumen que la venta tiene un plan de ejemplo: el `FK_plan_pago` de la respuesta de venta (`mapearVenta`) y la validación del plan elegido en `crear`. Una venta sin plan de ejemplo hoy da error 500 en el listado y el detalle.
- `periodicidad_congelada` deja de tener sentido con el sistema francés: no tiene equivalente en el plan de pago.

### Alcance

- [ ] Confirmación atómica: crea la venta, un único plan de pago y las cuotas con capital, interés y saldo
- [ ] Revalidar antes de guardar que la unidad siga Disponible y que precio de lista y TNA no hayan cambiado desde la simulación
- [ ] Congelar en el plan modalidad, precio, anticipo, plazo, cantidad de cuotas, TNA y valor de cuota
- [ ] Cancelación con motivo: cuotas ANULADAS, plan conservado y la unidad vuelve a Disponible
- [ ] Listado con modalidad, cantidad de cuotas, TNA y saldo pendiente, y filtros por modalidad y período además de los existentes
- [ ] Detalle de la venta con su plan de pago y el cronograma desglosado

### Listo cuando

- [ ] Si cambió el precio o la TNA desde la simulación, la confirmación se rechaza y devuelve la simulación recalculada
- [ ] Cambiar después el precio de lista o la TNA del plazo no modifica una venta confirmada
- [ ] Una unidad no admite más de una venta vigente
- [ ] Los tests del módulo quedan actualizados y en verde

> ⚠️ Conviene que la tome la misma persona que T137.

---

<a id="t138"></a>
<!-- issue: 340 -->
## T138 — Fix Front: Ajustar pantalla de venta: simulación con cronograma y confirmación

- **Issue:** [#340](https://github.com/TomasMollinedo/SGI-ies/issues/340)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-27 · Registro de Venta Presencial con Plan de Pago
- **Rama:** `fix/t138-venta-pantalla-simulacion`
- **Depende de:** T126, T137, T158
- **Estimación:** 8 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Adaptar la pantalla de venta para acordar el plan con el cliente.

### Punto de partida

- `frontend/src/features/comercializacion/ventas/`: hoy la venta se registra en `RegistrarVentaModal` eligiendo un plan predefinido (`SelectorPlanPagoModal`).
- Se puede empezar con T137 mergeada; T158 solo hace falta para la confirmación.

### Alcance

- [ ] Tabla emergente de unidad y de plazo, con precarga opcional desde un plan de ejemplo
- [ ] Modalidad Contado o Financiado; anticipo en monto o porcentaje, calculando el otro valor
- [ ] Cronograma en vivo con número, vencimiento, capital, interés, importe y saldo
- [ ] Impresión de la simulación con la leyenda de simulación informativa y la fecha del día
- [ ] Confirmación; si el backend la rechaza por cambio de precio o tasa, mostrar la simulación recalculada

### Listo cuando

- [ ] Cambiar el anticipo o el plazo recalcula todo al instante
- [ ] Si el cliente no acepta, no queda ningún registro de venta
- [ ] Sin plazos activos solo se ofrece Contado

---

<a id="t139"></a>
<!-- issue: 341 -->
## T139 — Fix Front: Ajustar listado de ventas y detalle: plan de pago y cronograma

- **Issue:** [#341](https://github.com/TomasMollinedo/SGI-ies/issues/341)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-27 · Registro de Venta Presencial con Plan de Pago
- **Rama:** `fix/t139-ventas-listado-detalle`
- **Depende de:** T158
- **Estimación:** 4 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Mostrar en el listado y el detalle de ventas el plan acordado.

### Punto de partida

- `VentasPage.tsx`, `VentaDetallePage.tsx` y `FiltrosVentasBar.tsx`.
- Ya está hecho y no se toca: la cancelación con motivo obligatorio y sus bloqueos.

### Alcance

- [ ] Agregar los filtros por modalidad y período
- [ ] Columnas de fecha, cliente, unidad, precio, modalidad, cuotas, TNA y saldo pendiente
- [ ] Detalle con el plan de pago y el cronograma con capital e interés por cuota

### Listo cuando

- [ ] Los filtros se pueden combinar
- [ ] El detalle de una venta de contado muestra una única cuota sin interés

> ⚠️ Edita la misma feature que T138: coordinar o asignar a la misma persona.

---

<a id="t140"></a>
<!-- issue: 342 -->
## T140 — Fix Back: Ajustar API pública: precio de lista, destacados, planes de ejemplo y simulación libre

- **Issue:** [#342](https://github.com/TomasMollinedo/SGI-ies/issues/342)
- **Estado:** To do
- **Etiquetas:** Backend, Fix
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-25 · Catálogo Público y Simulador de Planes de Pago / HU-24 · Landing
- **Rama:** `fix/t140-catalogo-simulador-api`
- **Depende de:** T121, T132
- **Estimación:** 7 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Hacer que el catálogo, el detalle y los destacados usen el precio de lista, y convertir los planes predefinidos en un simulador.

### Punto de partida

- `backend/src/modules/catalogo/catalogo.service.ts`: listado, detalle y destacados toman hoy el precio del plan activo más barato, con un helper compartido.
- Absorbe la ex T142 (destacados) porque toca ese mismo helper. La portada del proyecto ya se devuelve y no se toca.

### Alcance

- [ ] Listado, detalle y precio desde de los destacados calculados con el precio de lista
- [ ] Destacados: hasta 4 proyectos, los de más unidades Disponibles, con desempate por nombre
- [ ] Detalle: planes de ejemplo activos con anticipo, cuotas, TNA, valor de cuota, intereses y total a pagar
- [ ] Endpoint público de simulación libre con anticipo en monto o porcentaje, plazo activo y cronograma
- [ ] Devolver los plazos activos con su cantidad de cuotas y TNA
- [ ] No exponer costos, presupuesto, porcentaje de ganancia, margen ni datos de clientes

### Listo cuando

- [ ] Sin plazos activos no se devuelve el simulador y solo se informa el precio de contado
- [ ] Si no hay unidades Disponibles los destacados vuelven vacíos
- [ ] El simulador no guarda nada ni genera ventas, reservas o consultas

> ⚠️ El desempate por nombre es una propuesta: HU-24 no lo define.

---

<a id="t141"></a>
<!-- issue: 343 -->
## T141 — Fix Front: Ajustar catálogo y detalle de unidad: precio de lista y simulador de planes de pago

- **Issue:** [#343](https://github.com/TomasMollinedo/SGI-ies/issues/343)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-25 · Catálogo Público y Simulador de Planes de Pago
- **Rama:** `fix/t141-catalogo-simulador-pantalla`
- **Depende de:** T140
- **Estimación:** 5 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Mostrar el precio de lista y el simulador de planes de pago en el catálogo público.

### Punto de partida

- `frontend/src/features/ecommerce/catalogo/` (`TarjetaUnidad.tsx`, `DetalleUnidadPage.tsx`, `components/PlanesPagoUnidad.tsx`).

### Alcance

- [ ] Tarjetas y detalle con el precio de lista como precio de contado, sin el desde
- [ ] Planes de ejemplo con anticipo, cuotas, TNA, valor de cuota, intereses y total a pagar
- [ ] Simulación libre con anticipo en monto o porcentaje, plazo y cronograma
- [ ] Leyenda de simulación informativa
- [ ] Dejar explícito que el ecommerce no vende e invitar a contactar o consultar

### Listo cuando

- [ ] La leyenda es visible en el simulador
- [ ] Si no hay plazos activos solo se ve el precio de contado
- [ ] El simulador funciona sin iniciar sesión

---

<a id="t143"></a>
<!-- issue: 345 -->
## T143 — Fix Front: Ajustar landing: Cómo funciona, header y sección de contacto

- **Issue:** [#345](https://github.com/TomasMollinedo/SGI-ies/issues/345)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-24 · Página de Inicio del Ecommerce (Landing)
- **Rama:** `fix/t143-landing-pantalla`
- **Depende de:** Ninguna
- **Estimación:** 3 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Actualizar la landing con el mensaje de compra presencial.

### Punto de partida

- `frontend/src/features/ecommerce/config/sitioPublico.config.ts` y `layout/components/`.
- Ya está hecho y no se toca: las tarjetas de destacados ya muestran la portada del proyecto y llevan al catálogo filtrado. El contrato de destacados no cambia, así que no depende del backend.

### Alcance

- [ ] Sección Cómo funciona con los pasos que aclaran que la compra es presencial
- [ ] Header según HU-24
- [ ] Usar el nombre Contacto en lugar de Consultanos

### Listo cuando

- [ ] La landing es accesible sin sesión
- [ ] Ningún texto sugiere que se puede comprar o reservar online

> ⚠️ HU-24 se contradice sobre el header: un criterio dice solo logo y botón de sesión, y otro dice que el catálogo se enlaza desde el header. Falta definir cuál vale; hoy el header tiene enlaces a las secciones y al catálogo.

---

<a id="t144"></a>
<!-- issue: 346 -->
## T144 — Fix Back: Ajustar perfil del cliente: plan acordado y desglose de cuotas

- **Issue:** [#346](https://github.com/TomasMollinedo/SGI-ies/issues/346)
- **Estado:** To do
- **Etiquetas:** Backend, Fix
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-28 · Perfil del Cliente
- **Rama:** `fix/t144-perfil-plan-api`
- **Depende de:** T121
- **Estimación:** 4 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Devolver en el perfil el plan acordado en la venta y su desglose.

### Punto de partida

- `venta-cliente.controller.ts` y los métodos de cliente de `venta.service.ts` (`misVentas`, `detalleVentaCliente`, `historialPagosVenta`).
- Ya está hecho y no se toca: el historial con pagos validados y declaraciones pendientes y rechazadas. El acceso al archivo del comprobante es de T146.
- Desde T121 el perfil ya lee las condiciones de la venta desde su plan de pago, a través de `venta/condiciones-venta.ts`.
- `plan.nombre` del detalle (`detalleVentaCliente`) sale del plan de ejemplo con el que se registró la venta y da error 500 para las ventas que cree T158 sin plan de ejemplo: esta tarea lo reemplaza.

### Alcance

- [ ] Devolver el plan acordado: modalidad, precio, anticipo, saldo financiado, cuotas, TNA, valor de cuota, total de intereses y total a pagar
- [ ] Cronograma con capital, interés, saldo pendiente y estado de cada cuota
- [ ] Saldo total pendiente de la venta
- [ ] Indicar en cada declaración si tiene comprobante adjunto

### Listo cuando

- [ ] Un cliente solo ve sus propias ventas
- [ ] Se prueba contra las ventas del seed (T156), sin esperar a la venta nueva

> ⚠️ Toca `venta.service.ts` igual que T158: los métodos son distintos, pero conviene coordinar el orden de merge.

---

<a id="t145"></a>
<!-- issue: 347 -->
## T145 — Fix Front: Ajustar perfil del cliente: plan acordado y cronograma

- **Issue:** [#347](https://github.com/TomasMollinedo/SGI-ies/issues/347)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-28 · Perfil del Cliente
- **Rama:** `fix/t145-perfil-pantalla`
- **Depende de:** T144
- **Estimación:** 4 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Mostrar el plan acordado y el cronograma desglosado.

### Punto de partida

- `frontend/src/features/ecommerce/mis-compras/`: esta tarea toca `PlanDePagoResumen.tsx`, `TablaCuotas.tsx` y `TarjetaMiCompra.tsx`.
- Los componentes de declaraciones e historial son de T147.

### Alcance

- [ ] Mostrar modalidad, TNA, valor de cuota, total de intereses y total a pagar
- [ ] Desglose de capital e interés por cuota
- [ ] Destacar las cuotas vencidas con saldo pendiente
- [ ] Mostrar el saldo total pendiente de la venta

### Listo cuando

- [ ] Si tiene más de una unidad, cada una tiene su acceso y su plan
- [ ] Si no tiene ventas, el perfil invita a ver el catálogo
- [ ] La pantalla es de solo lectura

---

<a id="t146"></a>
<!-- issue: 348 -->
## T146 — Fix Back: Agregar comprobante adjunto a la declaración de pago

- **Issue:** [#348](https://github.com/TomasMollinedo/SGI-ies/issues/348)
- **Estado:** To do
- **Etiquetas:** Backend, Fix
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-29 · Declaración y Validación de Pagos Online
- **Rama:** `fix/t146-declaracion-comprobante-api`
- **Depende de:** T121
- **Estimación:** 7 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Exigir un comprobante adjunto al declarar un pago y guardarlo de forma privada.

### Punto de partida

- `backend/src/modules/almacenamiento/` solo maneja un repositorio público de imágenes; `docker-compose.yml` crea solo ese.
- `declaracion-pago.controller.ts` recibe hoy la declaración sin archivos.
- Las columnas `comprobante_ruta`, `comprobante_nombre_archivo` y `comprobante_tipo` de DECLARACIONPAGO ya existen desde T121 (admiten vacío: la obligatoriedad la valida el servicio).

### Alcance

- [ ] Repositorio privado: crearlo en `docker-compose.yml`, sumar la variable a `.env.example` y el método de subida y de lectura al servicio de almacenamiento
- [ ] La declaración se envía con el archivo: uno solo, PDF, JPG o PNG, de hasta 5 MB, validando tipo y tamaño
- [ ] Registrar ruta, nombre y tipo del archivo en la declaración
- [ ] Endpoint para ver el comprobante desde el perfil (solo el cliente que lo cargó) y otro interno para Tesorería y Comercialización, nunca con URL pública
- [ ] No permitir reemplazar ni eliminar el comprobante una vez enviada la declaración
- [ ] Devolver en el detalle del cobro la declaración que lo originó

### Listo cuando

- [ ] Sin comprobante la declaración es rechazada
- [ ] Un cliente no puede ver el comprobante de otro
- [ ] Si la declaración es rechazada, el cliente puede volver a declarar con un comprobante nuevo

> ⚠️ T122 también usa el servicio de almacenamiento, pero solo el endpoint público que ya existe.

---

<a id="t147"></a>
<!-- issue: 349 -->
## T147 — Fix Front: Ajustar declaración de pago: adjuntar y ver el comprobante

- **Issue:** [#349](https://github.com/TomasMollinedo/SGI-ies/issues/349)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-29 · Declaración y Validación de Pagos Online / HU-28 · Perfil del Cliente
- **Rama:** `fix/t147-declaracion-comprobante-pantalla`
- **Depende de:** T146
- **Estimación:** 4 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Agregar la carga del comprobante donde el cliente declara un pago, y permitirle verlo después.

### Punto de partida

- `frontend/src/features/ecommerce/mis-compras/`: esta tarea toca `DeclararPagoModal.tsx`, `DeclaracionesPago.tsx` y `HistorialPagos.tsx`.
- Ya está hecho y no se toca: el estado de cada declaración con su motivo de rechazo y el aviso cuando no hay formas de pago habilitadas.

### Alcance

- [ ] Campo de carga del comprobante, obligatorio
- [ ] Validar tipo y tamaño antes de enviar
- [ ] Ver el comprobante adjunto de cada declaración y de cada pago declarado desde el ecommerce

### Listo cuando

- [ ] No se puede enviar sin comprobante
- [ ] Un archivo de más de 5 MB o de otro formato es rechazado con un mensaje claro
- [ ] Una declaración enviada no ofrece reemplazar ni eliminar el comprobante

---

<a id="t148"></a>
<!-- issue: 350 -->
## T148 — Fix Front: Ajustar bandeja de Tesorería: abrir el comprobante al validar o rechazar

- **Issue:** [#350](https://github.com/TomasMollinedo/SGI-ies/issues/350)
- **Estado:** To do
- **Etiquetas:** Frontend, Fix
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-29 · Declaración y Validación de Pagos Online
- **Rama:** `fix/t148-bandeja-tesoreria-comprobante`
- **Depende de:** T146
- **Estimación:** 3 h
- **Tipo de cambio:** Historia ya hecha en un sprint anterior: solo hay que modificar lo existente

### Objetivo

Permitir a Tesorería ver el comprobante antes de validar o rechazar.

### Punto de partida

- `frontend/src/features/tesoreria/declaraciones-pago/` y `tesoreria/cobranzas/pages/CobroDetallePage.tsx`.
- Ya está hecho y no se toca: el rechazo con motivo obligatorio y el bloqueo cuando el saldo de la cuota no alcanza.

### Alcance

- [ ] Abrir el comprobante adjunto desde la bandeja de pendientes y desde los modales de validar y rechazar
- [ ] Mostrarlo junto al número de referencia para contrastarlos
- [ ] Mostrar también el comprobante en el detalle del cobro generado

### Listo cuando

- [ ] Tesorería ve el comprobante sin una URL pública
- [ ] Un cobro presencial no muestra comprobante

---

<a id="t149"></a>
<!-- issue: 351 -->
## T149 — Back: Listado y ficha de clientes con edición y auditoría

- **Issue:** [#351](https://github.com/TomasMollinedo/SGI-ies/issues/351)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-33 · Gestión y Consulta de Clientes
- **Rama:** `feat/t149-clientes-api`
- **Depende de:** T121
- **Estimación:** 8 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Dar a Comercialización el listado y la ficha de todos los clientes.

### Punto de partida

- No existe un módulo interno de clientes: `comercializacion/cliente/` es el del cliente del ecommerce. Va en un controller interno aparte.
- Ventas, cobros, declaraciones y consultas ya tienen sus propios servicios: la ficha los consulta, no los reimplementa.
- `CLIENTE.FK_usuario_actualizador` ya existe desde T121 (admite vacío). No se renombró ningún atributo de CLIENTE: el correo sigue siendo `email`.

### Alcance

- [ ] Listado con indicador de cuenta de Google, cantidad de ventas vigentes, saldo total pendiente e indicador de mora, calculados al consultar
- [ ] Filtros combinables: texto, con o sin compras, en mora y proyecto; orden por apellido y nombre, paginado
- [ ] Ficha con datos personales, ventas, cobros, declaraciones pendientes o rechazadas y consultas
- [ ] Edición de nombre, apellido, DNI/CUIL y teléfono; correo editable solo sin cuenta de Google vinculada y sin repetirse
- [ ] Registrar usuario y fecha de cada modificación

### Listo cuando

- [ ] El DNI/CUIL no puede repetirse entre clientes
- [ ] No existe alta ni baja de clientes desde este módulo
- [ ] Se prueba contra los clientes del seed (T156)

---

<a id="t150"></a>
<!-- issue: 352 -->
## T150 — Front: Listado de clientes con filtros

- **Issue:** [#352](https://github.com/TomasMollinedo/SGI-ies/issues/352)
- **Estado:** To do
- **Etiquetas:** Frontend
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-33 · Gestión y Consulta de Clientes
- **Rama:** `feat/t150-clientes-listado`
- **Depende de:** T149, T157
- **Estimación:** 4 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Mostrar el listado de clientes con sus filtros.

### Alcance

- [ ] Búsqueda por nombre, apellido, DNI/CUIL o correo
- [ ] Filtros con compras o sin compras, en mora y por proyecto
- [ ] Orden por apellido y nombre, con paginación
- [ ] Mostrar indicador de cuenta de Google, cantidad de ventas, saldo e indicador de mora

### Listo cuando

- [ ] Los filtros se pueden combinar
- [ ] Cada fila abre la ficha del cliente

---

<a id="t151"></a>
<!-- issue: 353 -->
## T151 — Front: Ficha del cliente

- **Issue:** [#353](https://github.com/TomasMollinedo/SGI-ies/issues/353)
- **Estado:** To do
- **Etiquetas:** Frontend
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-33 · Gestión y Consulta de Clientes
- **Rama:** `feat/t151-clientes-ficha`
- **Depende de:** T146, T149, T157
- **Estimación:** 6 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Mostrar en un solo lugar la situación de cada cliente.

### Punto de partida

- El plan de pago y el cronograma se ven en el detalle de venta que ya existe, y el cobro en su detalle: la ficha enlaza, no los repite.
- Solo el comprobante de las declaraciones necesita T146; el resto se puede hacer antes.

### Alcance

- [ ] Secciones de datos personales, ventas, cobros, declaraciones y consultas
- [ ] Modo LECTURA y modo EDICIÓN para los datos permitidos
- [ ] Enlace al detalle de cada venta y de cada cobro
- [ ] Mostrar el comprobante de las declaraciones pendientes o rechazadas

### Listo cuando

- [ ] Desde la ficha no se registran ventas, cobros ni respuestas
- [ ] El correo no se edita si hay una cuenta de Google vinculada

---

<a id="t152"></a>
<!-- issue: 354 -->
## T152 — Back: Ingresos, egresos y resultado por período

- **Issue:** [#354](https://github.com/TomasMollinedo/SGI-ies/issues/354)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-34 · Tablero del Gerente
- **Rama:** `feat/t152-tablero-ingresos-egresos`
- **Depende de:** T121
- **Estimación:** 6 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Calcular ingresos, egresos y resultado de la empresa por período.

### Punto de partida

- El rol Gerente General ya existe (enum, guard y usuario del seed): no hay que crearlo.
- Los egresos del período ya se calculan en `tesoreria/pago/pago.service.ts` (`calcularResumenPeriodo`); los cobros confirmados existen desde el Sprint 3.

### Alcance

- [ ] Módulo nuevo del tablero, con el endpoint restringido al rol Gerente General y sumado al spec de roles
- [ ] Agrupación mensual, trimestral o anual y rango de fechas; por defecto el año en curso por mes
- [ ] Ingresos = cobros confirmados (presenciales y ecommerce) sin anulados, con apertura por proyecto y filtro opcional por proyecto
- [ ] Egresos = pagos confirmados sin anulados, reutilizando el cálculo existente; resultado y variación contra el rango anterior de igual duración

### Listo cuando

- [ ] Un Administrador recibe acceso denegado
- [ ] Con filtro por proyecto no se devuelve el resultado
- [ ] Sin datos, cada indicador devuelve cero

> ⚠️ Es el primer endpoint que no admite al Administrador: revisar que el spec de roles lo contemple.

---

<a id="t153"></a>
<!-- issue: 355 -->
## T153 — Back: Margen por proyecto: realizado, proyectado y total esperado

- **Issue:** [#355](https://github.com/TomasMollinedo/SGI-ies/issues/355)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** Backend
- **Asignado a:** Sin asignar
- **HU:** HU-34 · Tablero del Gerente
- **Rama:** `feat/t153-tablero-margen-proyecto`
- **Depende de:** T121, T152
- **Estimación:** 5 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Calcular el margen comercial de cada proyecto.

### Punto de partida

- Va en el módulo del tablero que crea T152: por eso depende de ella, o la toma la misma persona.

### Alcance

- [ ] Margen realizado = precios de venta de las unidades con venta vigente menos su costo, en importe y porcentaje
- [ ] Margen proyectado = precios de lista de las unidades Disponibles menos su costo
- [ ] Margen total esperado y porcentaje de unidades activas vendidas, por proyecto activo
- [ ] Margen total realizado de todos los proyectos, para los indicadores
- [ ] Informar cuántas unidades sin publicar o sin precio quedaron fuera del cálculo

### Listo cuando

- [ ] El cálculo no incluye intereses de financiación
- [ ] Todos los valores se calculan al consultar, sin almacenarse
- [ ] Se prueba contra las ventas del seed (T156)

---

<a id="t154"></a>
<!-- issue: 356 -->
## T154 — Front: Tablero del Gerente: indicadores, gráfico y tabla

- **Issue:** [#356](https://github.com/TomasMollinedo/SGI-ies/issues/356)
- **Estado:** To do
- **Etiquetas:** Frontend
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-34 · Tablero del Gerente
- **Rama:** `feat/t154-tablero-pantalla`
- **Depende de:** T152, T157
- **Estimación:** 7 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Mostrar al Gerente General cómo viene la empresa.

### Punto de partida

- El frontend no tiene ninguna librería de gráficos instalada.

### Alcance

- [ ] Selector de agrupación y rango de fechas
- [ ] Indicadores de ingresos, egresos y resultado con variación porcentual
- [ ] Instalar una librería de gráficos y dejarla envuelta en un componente compartido
- [ ] Gráfico de barras de ingresos y egresos por período y tabla con los mismos valores
- [ ] Resultado positivo o negativo identificado con signo, no solo con color
- [ ] Aclarar en pantalla que los egresos no se abren por proyecto

### Listo cuando

- [ ] Sin datos muestra cero y no un error ni un espacio vacío
- [ ] Por defecto muestra el año en curso agrupado por mes

---

<a id="t155"></a>
<!-- issue: 357 -->
## T155 — Front: Tabla de margen por proyecto y filtro por proyecto

- **Issue:** [#357](https://github.com/TomasMollinedo/SGI-ies/issues/357)
- **Estado:** To do
- **Etiquetas:** Frontend
- **Perfil sugerido:** Frontend
- **Asignado a:** Sin asignar
- **HU:** HU-34 · Tablero del Gerente
- **Rama:** `feat/t155-tablero-margen-pantalla`
- **Depende de:** T153, T154
- **Estimación:** 5 h
- **Tipo de cambio:** Historia nueva del Sprint 4

### Objetivo

Mostrar el margen de cada proyecto en el tablero.

### Punto de partida

- Se monta sobre la pantalla que crea T154: por eso depende de ella.

### Alcance

- [ ] Tabla con una fila por proyecto activo: margen realizado, proyectado y total
- [ ] Aclarar en pantalla que es margen comercial, sin intereses de financiación
- [ ] Filtro opcional por proyecto para ingresos y margen
- [ ] Ocultar el resultado cuando se filtra por proyecto

### Listo cuando

- [ ] Se informa cuántas unidades no entraron en el cálculo
- [ ] El margen total realizado de todos los proyectos figura en los indicadores

---

<a id="t159"></a>
<!-- issue: 361 -->
## T159 — Infra: Limpieza del esquema: quitar lo que quedó obsoleto del Sprint 3

- **Issue:** [#361](https://github.com/TomasMollinedo/SGI-ies/issues/361)
- **Estado:** To do
- **Etiquetas:** Backend
- **Perfil sugerido:** BD/Infra
- **Asignado a:** Sin asignar
- **HU:** Transversal · Cambios del DER del Sprint 4
- **Rama:** `feat/t159-limpieza-schema`
- **Depende de:** T134, T140, T144, T158
- **Estimación:** 3 h
- **Tipo de cambio:** Cambio transversal

### Objetivo

Cerrar la migración del sprint eliminando las columnas y enums que T121 dejó por compatibilidad.

### Alcance

La lista sale de [Columnas legado](cambios_der_sprint_4.md#columnas-legado-se-eliminan-en-t159).

- [ ] PLANEJEMPLO: eliminar `tipo`, `precio`, `porcentaje_ganancia`, `margen`, `anticipo_monto`, `cantidad_cuotas` y `periodicidad`, y la relación con VENTA
- [ ] VENTA: eliminar `FK_plan_ejemplo` (con su clave foránea y su índice) y `precio_congelado`, `anticipo_congelado`, `tipo_plan_congelado`, `cantidad_cuotas_congelada` y `periodicidad_congelada`
- [ ] CUOTA: eliminar `FK_venta` y la unicidad `[FK_venta, numero]`, y pasar a `FK_plan_pago` las consultas de cobros, declaraciones y ventas que todavía la usen
- [ ] Eliminar el enum `Periodicidad`. `ModalidadPago` no se elimina: lo usa el plan de pago
- [ ] Borrar el código de transición si quedó sin uso: `venta/condiciones-venta.ts`, `completarDesgloseTasaCero` (`plan-pago/desglose-tasa-cero.ts`) y `prisma/seed-venta-con-plan-pago.ts`
- [ ] Definir si `PLANEJEMPLO.FK_plazo_financiacion` y `anticipo_porcentaje` pasan a obligatorios en la base
- [ ] Estado de obra CANCELADO: eliminarlo o conservarlo según la respuesta a OBS-22

### Listo cuando

- [ ] El esquema coincide exactamente con el DER que se entrega
- [ ] El backend compila, pasan lint y tests, y los seeds corren
- [ ] Cobranzas y declaraciones de pago siguen funcionando

> ⚠️ Es la última tarea de backend del sprint.
