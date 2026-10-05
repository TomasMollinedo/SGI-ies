# Observaciones sobre las historias de usuario del Sprint 4

Inconsistencias y vacíos que el equipo de desarrollo encontró en [sprint_backlog_4.md](sprint_backlog_4.md) al armar las tareas del sprint. Están dirigidas a las Product Owners: cada una necesita una definición para que la historia quede cerrada y las tareas se puedan ajustar.

- **Fecha de la revisión:** 2026-10-05
- **Historias revisadas:** HU-20, HU-21, HU-22, HU-24, HU-25, HU-27, HU-28, HU-29, HU-31, HU-32, HU-33 y HU-34
- **Total de observaciones:** 30 (8 de prioridad alta)

## Cómo responder

Cada observación tiene un identificador (`OBS-01`, `OBS-02`…), lo que dice la historia hoy, el problema y una propuesta del equipo. Alcanza con responder por identificador: "de acuerdo con la propuesta" o la definición que corresponda. Con la respuesta se actualiza la historia y después las tareas indicadas en [tareas_sprint_4.md](tareas_sprint_4.md).

La prioridad indica qué pasa si la observación no se responde:

- **Alta:** dos personas pueden implementar cosas distintas, o hay dos criterios que no se pueden cumplir a la vez.
- **Media:** el equipo puede avanzar con la propuesta, pero conviene confirmarla antes de la entrega.
- **Baja:** es un ajuste de redacción; no cambia lo que se construye.

## Resumen

| ID | Historia | Tema | Prioridad | Tareas afectadas |
|---|---|---|---|---|
| OBS-01 | Varias | Qué significa "historial de auditoría" | Alta | T122, T126, T149 |
| OBS-02 | Varias | Nombre del estado "en preparación" | Baja | — |
| OBS-03 | HU-20 | Alta de unidades con el proyecto En ejecución | Alta | T128 |
| OBS-04 | HU-20 / HU-21 | Condición de entrega sin fecha, definida en la historia equivocada | Baja | — |
| OBS-05 | HU-21 | Una unidad Vendida a la que se le anula un cobro | Media | T158 |
| OBS-06 | HU-21 / HU-22 | Qué pasa con los planes de ejemplo al despublicar | Media | T134 |
| OBS-07 | HU-21 / HU-25 | Si las observaciones de la unidad se muestran al público | Alta | T140, T141 |
| OBS-08 | HU-22 | Plan de ejemplo con el plazo inactivo, en la pantalla interna | Media | T134, T136 |
| OBS-09 | HU-22 | Planes de ejemplo repetidos | Baja | T134 |
| OBS-10 | HU-24 | Contenido del header | Alta | T143 |
| OBS-11 | HU-24 | Desempate de los proyectos destacados | Media | T140 |
| OBS-12 | HU-24 | Proyecto destacado sin imagen de portada | Baja | T143 |
| OBS-13 | HU-27 / HU-32 | Máximo de cuotas | Alta | T126, T127 |
| OBS-14 | HU-27 | Venta de contado: cuándo se puede cancelar | Media | T158 |
| OBS-15 | HU-27 | Pago adelantado de cuotas | Media | — |
| OBS-16 | HU-27 | A qué fecha se refiere el filtro por período | Baja | T158, T139 |
| OBS-17 | HU-28 | Ventas canceladas en el perfil del cliente | Media | T144, T145 |
| OBS-18 | HU-29 / HU-33 | Quién puede ver el comprobante | Alta | T146, T151 |
| OBS-19 | HU-29 | Varias declaraciones pendientes sobre la misma cuota | Media | T146 |
| OBS-20 | HU-29 | Historia con dos actores | Baja | — |
| OBS-21 | HU-31 | "Todas las unidades vendidas" con unidades sin cargar | Media | T124, T153 |
| OBS-22 | HU-31 | Proyecto que se cancela | Alta | T121, T122 |
| OBS-23 | HU-31 | Filtro por localidad | Baja | T122, T123 |
| OBS-24 | HU-32 | Reactivar un plazo dado de baja | Media | T126, T127 |
| OBS-25 | HU-33 | Auditoría cuando el cliente edita sus propios datos | Media | T149 |
| OBS-26 | HU-33 | Editar el DNI/CUIL de un cliente con ventas | Media | T149 |
| OBS-27 | HU-34 | Si el Administrador ve el tablero | Alta | T152, T157 |
| OBS-28 | HU-34 | Variación porcentual cuando el período anterior es cero | Media | T152, T154 |
| OBS-29 | HU-34 | Base del porcentaje de unidades vendidas | Baja | T153 |
| OBS-30 | HU-34 | Ingresos con intereses y margen sin intereses | Baja | T154, T155 |

---

## Observaciones generales

### OBS-01 — Qué significa "historial de auditoría" · Prioridad alta

- **Qué dicen las historias:** HU-20, HU-21, HU-27, HU-31, HU-32 y HU-33 piden que las operaciones queden "en el historial de auditoría". HU-22, en cambio, aclara que alcanza con "la auditoría estándar (usuario y fecha de la última actualización)", "sin guardar historial de valores anteriores".
- **Problema:** el sistema hoy guarda en cada registro quién lo creó, quién lo modificó por última vez y cuándo. No existe un historial que conserve cada cambio. Con eso no se puede responder, por ejemplo, qué tasa tenía un plazo antes de la última modificación (HU-32 pide auditar cada "modificación de tasa") ni quién cambió el estado de obra de un proyecto en cada paso (HU-31).
- **Propuesta:** dejar en todas las historias el criterio de HU-22: se registra usuario y fecha de creación y de la última modificación, sin historial de valores. Si para algún dato hace falta el historial completo (la tasa de un plazo, el estado de obra), indicarlo expresamente en esa historia, porque es trabajo adicional.

### OBS-02 — Nombre del estado "en preparación" · Prioridad baja

- **Qué dicen las historias:** el mismo estado comercial aparece como "Publicación en preparación" (HU-20, HU-21, HU-22), "en Preparación" (HU-25) y "en preparación" (HU-31, HU-34).
- **Problema:** no queda claro cuál es el texto que debe ver el usuario en pantalla.
- **Propuesta:** usar "En preparación" en todas las historias y pantallas, igual que "Disponible", "En Plan de Pago" y "Vendida".

---

## HU-20 — ABM de Unidades Funcionales

### OBS-03 — Alta de unidades con el proyecto En ejecución · Prioridad alta

- **Qué dice la historia:** "Alta, edición y baja libres mientras el proyecto está En planificación. Con el proyecto En ejecución o Finalizado, se pueden editar las características descriptivas, pero ya no se puede eliminar ninguna unidad."
- **Problema:** para En ejecución y Finalizado la historia habla de editar y de eliminar, pero no dice si se pueden dar de alta unidades nuevas. Lo que se construyó en el Sprint 3 no lo permite: solo se cargan unidades con el proyecto En planificación.
- **Propuesta:** confirmar el comportamiento actual y dejarlo escrito: con el proyecto En ejecución o Finalizado no se dan de alta unidades. Si se necesita cargar unidades en un proyecto En ejecución (por ejemplo, porque se amplió la cantidad planificada), indicarlo.

### OBS-04 — Condición de entrega sin fecha, definida en la historia equivocada · Prioridad baja

- **Qué dicen las historias:** HU-20 dice que si el proyecto no tiene fecha de finalización estimada, la condición de entrega se muestra como "A entregar, fecha a confirmar". HU-21, que es la que define la condición de entrega, solo contempla dos textos: "Terminada, disponible para entrega inmediata" y "A entregar, fecha estimada [fecha]".
- **Problema:** el tercer caso está en la historia de unidades y falta en la de publicación.
- **Propuesta:** mover ese criterio de HU-20 a HU-21, que quedaría con los tres casos. No cambia el comportamiento, que ya está construido.

---

## HU-21 — Publicación de Unidad Funcional en el Ecommerce

### OBS-05 — Una unidad Vendida a la que se le anula un cobro · Prioridad media

- **Qué dice la historia:** los cambios de estado previstos son Publicación en preparación → Disponible → En Plan de Pago → Vendida, más la vuelta de En Plan de Pago a Disponible si se cancela la venta.
- **Problema:** una unidad pasa a Vendida cuando se salda la última cuota. Si después Tesorería anula ese cobro (HU-30 lo permite), la unidad vuelve a tener saldo pendiente, pero la historia no prevé la vuelta de Vendida a En Plan de Pago. El sistema hoy hace esa vuelta.
- **Propuesta:** agregar a HU-21 que una unidad Vendida vuelve a En Plan de Pago si la anulación de un cobro deja saldo pendiente.

### OBS-06 — Qué pasa con los planes de ejemplo al despublicar · Prioridad media

- **Qué dicen las historias:** HU-22 dice que si la unidad se despublica y se vuelve a publicar, "la nueva publicación nace sin precio y debe definirse nuevamente". No dice nada de los planes de ejemplo.
- **Problema:** no se sabe si la nueva publicación conserva los planes de ejemplo de la anterior o si también hay que cargarlos de nuevo.
- **Propuesta:** la nueva publicación nace sin precio y sin planes de ejemplo, igual que con el precio.

### OBS-07 — Si las observaciones de la unidad se muestran al público · Prioridad alta

- **Qué dicen las historias:** HU-21 dice que la publicación referencia "identificador, proyecto, tipología, superficies, piso, comodidades, imágenes y observaciones". HU-25 dice que el catálogo muestra por unidad "proyecto, tipología, superficies, piso, imágenes, precio de lista y condición de entrega".
- **Problema:** las listas no coinciden. Identificador, comodidades y observaciones están en la publicación pero no en lo que muestra el catálogo. El caso delicado son las observaciones: es un campo de texto libre que carga Proyectos y puede tener notas internas.
- **Propuesta:** el catálogo muestra identificador y comodidades, y no muestra las observaciones, que quedan como dato interno. Ajustar la lista de HU-25 y quitar las observaciones de la de HU-21.

---

## HU-22 — Precio de Lista y Planes de Pago de Ejemplo

### OBS-08 — Plan de ejemplo con el plazo inactivo, en la pantalla interna · Prioridad media

- **Qué dice la historia:** "Si el plazo de un plan se inactiva, el plan deja de mostrarse."
- **Problema:** está claro para el catálogo público. No está claro para la pantalla de Comercialización: si el plan también desaparece ahí, nadie se entera de que quedó un plan sin plazo ni puede corregirlo.
- **Propuesta:** en el catálogo el plan deja de mostrarse; en la pantalla interna se sigue viendo, marcado como "plazo inactivo", para que Comercialización lo edite o lo inactive.

### OBS-09 — Planes de ejemplo repetidos · Prioridad baja

- **Qué dice la historia:** una unidad puede tener "uno o más planes de ejemplo". No pone límite ni habla de duplicados.
- **Problema:** se pueden cargar dos planes activos con el mismo anticipo y el mismo plazo, que el cliente vería repetidos.
- **Propuesta:** no permitir dos planes de ejemplo activos con el mismo anticipo y plazo en la misma publicación. Indicar también si hay un máximo de planes por unidad.

---

## HU-24 — Página de Inicio del Ecommerce (Landing)

### OBS-10 — Contenido del header · Prioridad alta

- **Qué dice la historia:** tres criterios hablan del header y no coinciden.
  - "Header fijo: logo de la empresa y botón Iniciar sesión / Registrarme. El acceso al catálogo se ofrece desde el botón principal del Hero y desde las tarjetas de Proyectos destacados."
  - "El catálogo pasa a ser una sección/ruta propia enlazada desde el header."
  - "Los datos de contacto y los accesos a Catálogo y Login ya están disponibles desde el header y la sección Contacto."
- **Problema:** el primero dice que el header no tiene enlace al catálogo; los otros dos dicen que sí. Además, la landing actual tiene en el header enlaces a cada sección de la página (Quiénes somos, Proyectos, Cómo funciona, Contacto) que ningún criterio menciona.
- **Propuesta:** el header tiene el logo, los enlaces a las secciones, el enlace al catálogo y el botón de sesión, que es como está hoy. Corregir el primer criterio.

### OBS-11 — Desempate de los proyectos destacados · Prioridad media

- **Qué dice la historia:** se muestran "los proyectos con más unidades Disponibles (hasta 4)".
- **Problema:** si dos proyectos tienen la misma cantidad de unidades Disponibles y solo queda un lugar, no se sabe cuál entra. Sin regla, la landing puede mostrar uno u otro en cada visita.
- **Propuesta:** a igual cantidad, orden alfabético por nombre del proyecto.

### OBS-12 — Proyecto destacado sin imagen de portada · Prioridad baja

- **Qué dice la historia:** cada tarjeta muestra "la imagen de portada del proyecto (HU-31)". En HU-31 la portada es opcional.
- **Problema:** un proyecto sin portada puede salir destacado.
- **Propuesta:** se muestra igual, con una imagen genérica en lugar de la portada, que es lo que hace hoy.

---

## HU-27 — Registro de Venta Presencial con Plan de Pago Acordado

### OBS-13 — Máximo de cuotas · Prioridad alta

- **Qué dicen las historias:** HU-32 pide que la cantidad de cuotas de un plazo sea "un número entero mayor a cero". El caso de prueba del sistema francés que acompaña al DER dice "máx. 60".
- **Problema:** el máximo no está en ninguna historia. Tampoco hay un máximo para la TNA.
- **Propuesta:** agregar a HU-32 el máximo de 60 cuotas. Indicar si la TNA tiene un tope o solo debe ser mayor o igual a cero.

### OBS-14 — Venta de contado: cuándo se puede cancelar · Prioridad media

- **Qué dice la historia:** la venta se puede cancelar "únicamente mientras no exista ningún cobro confirmado". En contado, la única cuota "vence el día de la venta"; en financiado, el anticipo también.
- **Problema:** si el cliente paga el anticipo o el contado en el momento de firmar, la venta ya no se puede cancelar nunca desde el sistema, ni siquiera por un error de carga detectado ese mismo día. La única salida es que Tesorería anule primero el cobro.
- **Propuesta:** confirmar que ese es el circuito esperado (anular el cobro y después cancelar la venta) y dejarlo escrito en la historia.

### OBS-15 — Pago adelantado de cuotas · Prioridad media

- **Qué dice la historia:** las cuotas incluyen el interés calculado al confirmar, y "el plan de pago confirmado no se modifica".
- **Problema:** no se dice qué pasa si un cliente quiere pagar por adelantado varias cuotas o cancelar todo el saldo: si paga el importe completo de cada cuota, con sus intereses, o si corresponde alguna quita. Tampoco se menciona si una cuota vencida genera algún recargo.
- **Propuesta:** dejar escrito que en este sprint el pago adelantado paga el importe completo de cada cuota y que no hay recargos por mora, y que cualquier otra regla queda para una historia futura.

### OBS-16 — A qué fecha se refiere el filtro por período · Prioridad baja

- **Qué dice la historia:** el listado de ventas es filtrable por "período".
- **Problema:** no dice sobre qué fecha.
- **Propuesta:** sobre la fecha de venta.

---

## HU-28 — Perfil del Cliente

### OBS-17 — Ventas canceladas en el perfil del cliente · Prioridad media

- **Qué dice la historia:** "Si tiene más de una unidad, lista todas con acceso individual" y "si no tiene ninguna venta registrada, invita a ver el catálogo".
- **Problema:** no dice si el cliente ve las ventas que fueron canceladas. Un cliente cuya única venta se canceló, ¿ve esa venta o la invitación al catálogo?
- **Propuesta:** el perfil muestra solo las ventas vigentes; un cliente que solo tiene ventas canceladas ve la invitación al catálogo. Es como funciona hoy.

---

## HU-29 — Declaración y Validación de Pagos Online con Comprobante

### OBS-18 — Quién puede ver el comprobante · Prioridad alta

- **Qué dicen las historias:** HU-29 dice que el comprobante "solo pueden verlo el cliente que lo cargó y los usuarios de Tesorería". La misma HU-29 dice que se puede consultar "desde la ficha del cliente (HU-33)", y HU-33, que es de Comercialización, incluye en la ficha las declaraciones "con su comprobante adjunto".
- **Problema:** los dos criterios se contradicen: según el primero, Comercialización no puede ver el comprobante; según el segundo, lo ve en la ficha del cliente.
- **Propuesta:** el comprobante lo ven el cliente que lo cargó y los usuarios internos de Tesorería y de Comercialización. Corregir el criterio de HU-29.

### OBS-19 — Varias declaraciones pendientes sobre la misma cuota · Prioridad media

- **Qué dice la historia:** el cliente declara sobre "cuotas pendientes o parciales", y al validar el sistema verifica que el saldo de la cuota alcance.
- **Problema:** no se dice si un cliente puede tener dos declaraciones pendientes sobre la misma cuota al mismo tiempo. Si puede, entre las dos pueden superar el saldo, y la segunda tendría que rechazarse aunque el pago sea real.
- **Propuesta:** no permitir una nueva declaración sobre una cuota mientras tenga otra pendiente de validación.

### OBS-20 — Historia con dos actores · Prioridad baja

- **Qué dice la historia:** "Como Cliente autenticado / Responsable de Tesorería".
- **Problema:** es la única historia con dos actores y, en la práctica, dos funcionalidades: declarar el pago y validarlo.
- **Propuesta:** no hace falta dividirla en este sprint; tenerlo en cuenta si se vuelve a modificar.

---

## HU-31 — ABM de Proyecto

### OBS-21 — "Todas las unidades vendidas" con unidades sin cargar · Prioridad media

- **Qué dice la historia:** "Cuando todas las unidades activas tienen una venta vigente, el proyecto se identifica como Todas las unidades vendidas", y la situación comercial incluye el "porcentaje de unidades con venta registrada".
- **Problema:** la cuenta se hace sobre las unidades cargadas, no sobre las planificadas. Un proyecto con 10 unidades planificadas y una sola cargada y vendida figura como "Todas las unidades vendidas" y con 100 % vendido.
- **Decisión tomada:** el equipo va a implementar lo que dice la historia. Se deja la observación para que las Product Owners confirmen que es el comportamiento buscado o cambien la base a las unidades planificadas. La misma base se usa en el tablero del gerente (ver OBS-29).

### OBS-22 — Proyecto que se cancela · Prioridad alta

- **Qué dice la historia:** los estados de obra son En planificación → En ejecución → Finalizado, sin retroceso, y la baja "solo se permite en un proyecto En planificación sin unidades funcionales activas".
- **Problema:** un proyecto En ejecución que se suspende o se cae no tiene salida: no puede retroceder, no puede darse de baja y seguiría figurando como activo para siempre. Además, el sistema ya tiene desde el Sprint 3 un cuarto estado, Cancelado, que esta historia no menciona.
- **Propuesta:** definir si existe el estado Cancelado. Si existe: desde qué estados se llega, y qué pasa con sus unidades publicadas y sus ventas. Si no existe, se elimina del sistema.

### OBS-23 — Filtro por localidad · Prioridad baja

- **Qué dice la historia:** la localidad es un campo obligatorio del proyecto y el listado se filtra por localidad.
- **Problema:** la localidad es texto libre. "Salta", "Salta Capital" y "salta" serían tres valores distintos en el filtro.
- **Propuesta:** el filtro ofrece las localidades ya cargadas en los proyectos y busca sin distinguir mayúsculas. Indicar si en cambio se quiere una lista fija de localidades.

---

## HU-32 — ABM de Plazos de Financiación

### OBS-24 — Reactivar un plazo dado de baja · Prioridad media

- **Qué dice la historia:** "La baja es lógica" y la cantidad de cuotas "no puede repetirse entre plazos activos".
- **Problema:** no dice si un plazo inactivo se puede volver a activar. Si se puede, hay que definir qué pasa cuando ya existe otro plazo activo con la misma cantidad de cuotas.
- **Propuesta:** un plazo inactivo se puede reactivar, salvo que ya exista otro activo con la misma cantidad de cuotas; en ese caso el sistema lo informa.

Ver también OBS-01 (auditoría de los cambios de tasa) y OBS-13 (máximo de cuotas).

---

## HU-33 — Gestión y Consulta de Clientes

### OBS-25 — Auditoría cuando el cliente edita sus propios datos · Prioridad media

- **Qué dice la historia:** "Toda modificación de datos queda en el historial de auditoría con usuario y fecha."
- **Problema:** los datos de un cliente los puede modificar Comercialización desde esta pantalla, pero también el propio cliente desde su perfil del ecommerce (HU-23). En ese caso no hay un usuario interno que registrar.
- **Propuesta:** se registra el usuario interno solo cuando la modificación la hace Comercialización; cuando la hace el cliente, se registra solo la fecha.

### OBS-26 — Editar el DNI/CUIL de un cliente con ventas · Prioridad media

- **Qué dice la historia:** se puede modificar "nombre, apellido, DNI/CUIL y teléfono".
- **Problema:** el DNI/CUIL identifica al cliente en el contrato de compraventa. La historia permite cambiarlo aunque el cliente ya tenga ventas registradas.
- **Propuesta:** confirmar que se permite (por ejemplo, para corregir un error de carga), o restringir la edición del DNI/CUIL a clientes sin ventas.

Ver también OBS-18 (comprobantes en la ficha del cliente).

---

## HU-34 — Tablero del Gerente

### OBS-27 — Si el Administrador ve el tablero · Prioridad alta

- **Qué dice la historia:** "Accesible desde el menú lateral únicamente para el rol Gerente General."
- **Problema:** hasta ahora todo el sistema lo opera un único Administrador que ve todas las pantallas, y el Gerente General entra a todo. Esta sería la primera pantalla que el Administrador no puede ver, y obliga a construir el control de acceso por rol en el menú, que hoy no existe.
- **Propuesta:** confirmar que el Administrador no debe ver el tablero. Si puede verlo, la tarea de menú y roles se simplifica.

### OBS-28 — Variación porcentual cuando el período anterior es cero · Prioridad media

- **Qué dice la historia:** cada indicador muestra "su variación porcentual respecto del rango anterior de igual duración".
- **Problema:** si en el rango anterior no hubo ingresos o egresos, la variación no se puede calcular (sería una división por cero). Va a pasar en los primeros meses de uso.
- **Propuesta:** en ese caso se muestra "sin datos del período anterior" en lugar de un porcentaje.

### OBS-29 — Base del porcentaje de unidades vendidas · Prioridad baja

- **Qué dice la historia:** el margen por proyecto se muestra "junto con el porcentaje de unidades vendidas".
- **Problema:** no dice sobre qué total.
- **Propuesta:** la misma base que se confirme en OBS-21, para que la ficha del proyecto y el tablero muestren el mismo número.

### OBS-30 — Ingresos con intereses y margen sin intereses · Prioridad baja

- **Qué dice la historia:** los ingresos son el "importe total cobrado a clientes", que incluye los intereses de las cuotas. El margen "no incluye los intereses de financiación".
- **Problema:** los dos números se muestran en la misma pantalla y no son comparables: los ingresos de un proyecto pueden superar su precio de venta total. La historia pide aclarar en pantalla qué excluye el margen, pero no pide aclarar que los ingresos incluyen intereses.
- **Propuesta:** agregar en pantalla la aclaración de que los ingresos incluyen los intereses cobrados.
