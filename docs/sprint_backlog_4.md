**ID:** HU-20 | **Sprint:** 4
**Título:** ABM de Unidades Funcionales
**Como…** Responsable de Proyectos
**Necesito…** Registrar las unidades funcionales (departamentos, locales) que tiene el proyecto, con sus características básicas y su costo
**Para…** Que el módulo de Comercialización pueda publicarlas más adelante sin tener que volver a cargar información que ya existe en Proyectos, y que el presupuesto del proyecto surja automáticamente de sumar el costo de sus unidades
**Criterios de Aceptación:**
- Opera en tres modos controlados por parámetro: INSERCIÓN, EDICIÓN Y LECTURA
- Campos obligatorios: proyecto al que pertenece (seleccionado mediante tabla emergente entre los proyectos activos, HU-31), identificador de la unidad (único entre las no dadas de baja del mismo proyecto — ej. "3A"), tipología (monoambiente, 1/2/3 dormitorios, local comercial, u otro), superficie cubierta (mayor a cero) y costo en pesos (mayor a cero, valor ya definido en la planificación de obra previa a este sistema). El sistema opera en una única moneda: no se registran ni convierten monedas alternativas.
- Campos opcionales: piso, superficie descubierta, comodidades, observaciones, e imágenes, que se suben desde el formulario y quedan almacenadas en el servicio de almacenamiento de objetos del sistema, accesibles públicamente porque se muestran en el catálogo, sin control de versiones ni permisos
- El presupuesto del proyecto no se carga de forma independiente: se calcula automáticamente como la suma del costo de todas las unidades activas del proyecto, y se muestra en la ficha del proyecto (HU-31) junto con la cantidad de unidades cargadas respecto de la cantidad planificada.
- No permite dar de alta más unidades activas que la cantidad de unidades planificadas del proyecto (HU-31): el sistema lo informa e indica que primero debe actualizarse esa cantidad en el proyecto.
- Alta, edición y baja libres mientras el proyecto está En planificación (estado de obra, HU-31). Con el proyecto En ejecución o Finalizado, se pueden editar las características descriptivas, pero ya no se puede eliminar ninguna unidad.
- El costo, en cambio, es editable por Proyectos únicamente mientras la unidad no tiene ninguna publicación (ni siquiera "en preparación"). Desde el momento en que se publica por primera vez (HU-21), el costo queda fijo para siempre, aunque la unidad se despublique después. A partir de ahí, cualquier ajuste sobre lo que paga el cliente se hace exclusivamente desde el precio de lista que define Comercialización (HU-22), nunca modificando el costo.
- No se puede eliminar ni dar de baja una unidad que tenga una publicación vigente en el ecommerce (HU-21 Publicación de Unidad Funcional en el Ecommerce); el sistema lo informa e indica que primero hay que despublicarla.
- Si el proyecto no tiene cargada fecha de finalización estimada, la condición de entrega se muestra como "A entregar, fecha a confirmar".
- Lista las unidades por proyecto, mostrando el estado comercial de cada una (sin publicar, Publicación en preparación, Disponible, En Plan de Pago o Vendida, HU-21), con filtros por tipología, rango de superficie y estado comercial.
- La baja es lógica, con modal de confirmación, y toda la operación queda auditada.
**Puntos de función:** 2
**Origen del cambio:** ACTUALIZADA (versión Sprint 3 → Sprint 4) — Se integra con el ABM de Proyecto (HU-31): el proyecto se elige de los proyectos activos, no se pueden cargar más unidades que las planificadas, el presupuesto se ve en la ficha del proyecto y el listado muestra el estado comercial de cada unidad.

**ID:** HU-21 | **Sprint:** 4
**Título:** Publicación de Unidad Funcional en el Ecommerce
**Como…** Responsable de Comercialización
**Necesito…** Habilitar y publicar en el ecommerce una unidad funcional que ya alcanzó alguno de los dos hitos de construcción definidos por Proyectos (proyecto en ejecución o proyecto finalizado)
**Para…** Poner a disposición del público la unidad, heredando automáticamente sus datos descriptivos desde Proyectos sin volver a cargarlos
**Criterios de Aceptación:**
- Disponible solo para unidades cuyo proyecto esté En ejecución (venta en pozo) o Finalizado (unidad terminada); una unidad de un proyecto 'En planificación' no puede publicarse — el sistema explica por qué al intentarlo.
- La publicación referencia en vivo, no copia, los datos que nacen en Proyectos: identificador, proyecto, tipología, superficies, piso, comodidades, imágenes y observaciones (HU-20). Si Proyectos edita esos datos descriptivos después de publicada, el cambio se refleja automáticamente en la publicación sin acción de Comercialización.
- Muestra además la fecha de finalización estimada vigente del proyecto (HU-31) como fecha de entrega de referencia, y calcula la condición de entrega: "Terminada, disponible para entrega inmediata" si el proyecto está Finalizado; "A entregar, fecha estimada [fecha]" en cualquier otro caso.
- La unidad tiene un estado comercial propio, independiente del estado del proyecto, con cuatro valores: Publicación en preparación → Disponible → En Plan de Pago → Vendida.
- Al publicarse siempre nace en "Publicación en preparación" y no es visible en el catálogo público (HU-25). Pasa a Disponible automáticamente en cuanto Comercialización define su precio de lista (HU-22).
- Pasa a En Plan de Pago al confirmarse su venta (HU-27); vuelve a Disponible si esa venta se cancela, y pasa a Vendida cuando el saldo pendiente de todas las cuotas de la venta llega a cero (HU-27).
- Una unidad con publicación vigente no puede volver a publicarse: el sistema lo informa y ofrece despublicarla primero. Solo puede existir una publicación activa por unidad a la vez.
- Despublicar solo se permite en estado Disponible o Publicación en preparación (no en En Plan de Pago ni en Vendida), con motivo obligatorio, y devuelve la unidad a su condición interna sin borrar el historial ni las consultas ya recibidas (HU-26).
- La selección de la unidad a publicar se realiza mediante tabla emergente con filtros por proyecto y tipología, mostrando solo unidades sin publicación vigente.
- Toda alta y baja (despublicación) de una publicación queda en el historial de auditoría con usuario, fecha y, en la baja, motivo.
**Puntos de función:** 2
**Origen del cambio:** ACTUALIZADA (versión Sprint 3 → Sprint 4) — La unidad pasa a Disponible cuando tiene precio de lista (HU-22); antes pasaba cuando tenía al menos un plan de pago activo. Se elimina la regla de inactivación de planes y la fecha de entrega sale del ABM de Proyecto (HU-31).

**ID:** HU-22 | **Sprint:** 4
**Título:** Definición del Precio de Lista y de los Planes de Pago de Ejemplo de la Unidad Publicada
**Como…** Responsable de Comercialización
**Necesito…** Definir el precio de lista de cada unidad publicada, usando como apoyo un porcentaje de ganancia y un margen sobre su costo, y armar algunos planes de pago de ejemplo calculados con la tasa del plazo y el sistema francés
**Para…** Que el cliente vea en el catálogo el precio de la unidad y ejemplos concretos de cómo podría pagarla (HU-25), sabiendo que el plan definitivo se acuerda en la venta presencial (HU-27), y sin que vea el margen de ganancia
**Criterios de Aceptación:**
- Cada publicación tiene un único precio de lista, expresado en la misma moneda del costo. El sistema opera en una única moneda: no se registran ni convierten monedas alternativas.
- El precio de lista es el precio de contado de la unidad y la base de cualquier plan de pago: el cliente lo paga al contado, o con anticipo y cuotas a las que se suma el interés del plazo elegido (HU-27, HU-32). No se aplican descuentos ni recargos sobre el precio de lista fuera de ese interés.
- El plan de pago real no se define antes de la venta: se arma con cada cliente al registrar la venta presencial y es el único que se guarda, asociado a esa venta (HU-27). Los planes que se definen en esta historia son solo de ejemplo.
- Para fijar el precio, el formulario ofrece como herramientas opcionales un porcentaje de ganancia y un margen (importe fijo) sobre el costo de la unidad (HU-20). Cuando se utilizan, el sistema muestra en vivo el precio sugerido = costo + (costo × porcentaje de ganancia) + margen. Este cálculo es de apoyo y no condiciona el precio final.
- Si Comercialización carga el precio de forma directa, el sistema calcula en vivo el porcentaje de ganancia que representa sobre el costo: (precio − costo) / costo × 100, lo completa en el campo de porcentaje y limpia el margen, para no contar el mismo ajuste dos veces. Si el precio queda por debajo del costo no completa nada: porcentaje y margen quedan vacíos.
- El precio de lista debe ser mayor a cero. Si resulta menor al costo de la unidad, el sistema advierte antes de guardar pero permite continuar.
- El precio almacenado es la fuente de verdad; el porcentaje de ganancia y el margen utilizados se conservan como información de referencia del cálculo comercial.
- Al guardarse el precio de lista por primera vez, la publicación pasa automáticamente de "Publicación en preparación" a "Disponible" (HU-21).
- El precio de lista puede modificarse mientras la publicación está en "Disponible". Desde que la unidad pasa a "En Plan de Pago" o "Vendida" queda bloqueado; si la venta se cancela y la unidad vuelve a Disponible, vuelve a ser editable. Las ventas ya confirmadas conservan congelado el precio con el que se pactaron (HU-27).
- Si la unidad se despublica y luego vuelve a publicarse, la nueva publicación nace sin precio y debe definirse nuevamente.
- El costo de la unidad nunca se modifica desde esta pantalla: está congelado desde la primera publicación (HU-20).
- Los cambios de precio, porcentaje de ganancia y margen se actualizan directo sobre la publicación, sin guardar historial de valores anteriores: alcanza con la auditoría estándar (usuario y fecha de la última actualización).
- Planes de pago de ejemplo: además del precio, Comercialización puede definir para cada unidad publicada uno o más planes de ejemplo, que el catálogo muestra como referencia en su simulador (HU-25). Se cargan de a uno; no hay carga masiva ni copia entre unidades.
- Cada plan de ejemplo define: nombre (ej. "Anticipo 30 % + 12 cuotas"), anticipo en porcentaje del precio de lista (mayor a cero y menor a 100 %), plazo elegido entre los plazos de financiación activos (HU-32) y estado (activo / inactivo). Las cuotas son siempre mensuales. El pago de contado no se carga como plan: es el precio de lista.
- Los importes de un plan de ejemplo no se cargan ni se guardan: el sistema los calcula con el sistema francés y la TNA vigente del plazo, con la misma lógica y redondeo de la venta (HU-27), y muestra en vivo anticipo, saldo a financiar, valor de la cuota, total de intereses y total a pagar mientras se arma el plan.
- Como se calculan cada vez que se muestran, los planes de ejemplo reflejan siempre el precio de lista y la TNA vigentes: si cambia el precio o la tasa del plazo (HU-32), se actualizan solos. Si el plazo de un plan se inactiva, el plan deja de mostrarse.
- Los planes de ejemplo son solo informativos: no reservan la unidad, no comprometen a la empresa ni al cliente y no se usan para registrar la venta tal cual. En la venta presencial el plan se arma con el cliente y es el único que se guarda (HU-27).
- Se pueden crear, editar e inactivar únicamente mientras la publicación está en "Disponible", porque sus importes se calculan con el precio de lista, que recién existe en ese estado. Cuando la unidad pasa a En Plan de Pago o Vendida dejan de mostrarse, porque la unidad sale del catálogo. 
- Tener planes de ejemplo es opcional: una unidad puede estar Disponible solo con su precio de lista; en ese caso el catálogo ofrece únicamente la simulación libre (HU-25).
- El alta, la modificación y la inactivación de planes de ejemplo quedan auditadas con usuario y fecha, sin historial de valores anteriores.
**Puntos de función:** 5
**Origen del cambio:** ACTUALIZADA (versión Sprint 3 → Sprint 4) — Feedback: el plan de pago real no se define antes de la venta (se acuerda en HU-27). Los planes que en el Sprint 3 se definían por unidad se reutilizan como planes de ejemplo para el simulador del catálogo (HU-25), ahora calculados con la TNA del plazo (HU-32) y sistema francés, en lugar de tener un precio propio por plan.

**ID:** HU-24 | **Sprint:** 4
**Título:** Página de Inicio del Ecommerce (Landing)
**Como…** Cliente potencial (sin sesión)
**Necesito…** Una portada de la empresa con identidad propia antes de entrar al catálogo
**Para…** Conocer quién vende las unidades y sentir confianza antes de ver precios.
**Criterios de Aceptación:**
- Header fijo: logo de la empresa (enlace a la página de inicio) y botón "Iniciar sesión / Registrarme" (HU-23), visible en toda la página. El acceso al catálogo se ofrece desde el botón principal del Hero y desde las tarjetas de "Proyectos destacados", en la página de inicio.
- Hero principal: imagen de portada a pantalla ancha, nombre de la empresa, un eslogan corto y un botón de llamada a la acción (‘Ver unidades disponibles’) que lleva al catálogo. Este contenido es estático y se define en el frontend.
- Sección "Quiénes somos": texto institucional breve (2-3 párrafos) + opcionalmente una imagen o ícono por punto destacado (ej. años en el mercado, proyectos entregados, unidades vendidas).
- Sección "Proyectos destacados": tarjetas visuales con la imagen de portada del proyecto (HU-31), nombre del proyecto, ubicación (localidad), cantidad de unidades Disponibles y precio "desde" (el menor precio de lista entre sus unidades Disponibles, HU-22). Se calculan automáticamente tomando los proyectos con más unidades Disponibles (hasta 4), a partir de los datos ya existentes en HU-21/HU-22 — sin tabla ni carga manual aparte. Cada tarjeta lleva al catálogo filtrado por ese proyecto. Si no hay ninguna unidad Disponible en todo el sistema, la sección se oculta en vez de mostrarse vacía.
- Sección "Cómo funciona": 3 o 4 pasos ilustrados con ícono + texto corto y fijo (ej. "1. Explorá el catálogo y simulá cómo pagar tu unidad", "2. Visitanos para elegir tu unidad, acordar tu plan y firmar tu contrato", "3. Seguí tus cuotas y declará tus pagos desde tu perfil") — contenido estático, sin lógica de negocio.
- Sección de contacto: teléfono, correo, dirección y, opcionalmente, enlaces a redes sociales. Estos datos son estáticos y se definen en el frontend
- Footer fijo con el copyright de la empresa, visible en toda la página. Los datos de contacto y los accesos a Catálogo y Login ya están disponibles desde el header y la sección Contacto, por lo que no se repiten en el pie.
- Accesible sin sesión, es la página raíz del dominio público; el catálogo pasa a ser una sección/ruta propia enlazada desde el header.
- Todo el contenido de la página (imagen de portada, nombre, eslogan, textos institucionales, números destacados y datos de contacto) vive hardcodeado en el frontend — no hay pantalla de administración ni tabla de configuración
**Puntos de función:** 1
**Origen del cambio:** ACTUALIZADA (versión Sprint 3 → Sprint 4) — El precio "desde" se calcula con el precio de lista (HU-22), la imagen de cada proyecto destacado sale del ABM de Proyecto (HU-31) y la sección "Cómo funciona" aclara que la compra es presencial.

**ID:** HU-25 | **Sprint:** 4
**Título:** Catálogo Público de Unidades Funcionales y Simulador de Planes de Pago
**Como…** Cliente potencial (sin sesión)
**Necesito…** Consultar el catálogo de unidades publicadas con sus datos comerciales y de construcción
**Para…** Conocer las opciones de compra sin acceder a información interna
**Criterios de Aceptación:**
- Accesible sin autenticación, por URL pública.
- Lista únicamente unidades Disponibles; las Vendidas y las En Plan de Pago no se listan (pero conservan su registro en la gestión interna de ventas, HU-27), y las "en Preparación" tampoco aparecen.
- Muestra por unidad: proyecto, tipología, superficies, piso, imágenes, precio de lista (precio de contado, HU-22) y condición de entrega (HU-21).
- Nunca muestra costos de obra, presupuesto del proyecto, margen de ganancia ni datos de clientes.
- Filtros combinables por proyecto, tipología, rango de superficie y condición de entrega.
- El detalle de la unidad incluye un simulador de planes de pago, de solo consulta, con dos partes: (a) los planes de ejemplo activos que definió Comercialización para esa unidad (HU-22), cada uno con anticipo, cantidad de cuotas, TNA, valor de la cuota, total de intereses y total a pagar; y (b) una simulación libre, donde el cliente ingresa el anticipo (en monto o en porcentaje del precio de lista, mayor a cero y menor al precio) y elige uno de los plazos de financiación activos (HU-32), que se muestran con su cantidad de cuotas y TNA.
- Todos los importes se calculan con la TNA vigente del plazo y la misma lógica de sistema francés y redondeo de la venta (HU-27): se reutiliza el mismo servicio de cálculo, no se reimplementa. La simulación libre muestra además el cronograma de cuotas (número, amortización de capital, interés e importe).
- El simulador no requiere iniciar sesión, no guarda nada y no genera ninguna venta, reserva ni consulta.
- Muestra de forma visible la leyenda: "Simulación informativa. La compra se concreta únicamente de forma presencial, con la firma del contrato, y las condiciones definitivas se acuerdan en ese momento. Las tasas pueden modificarse."
- Si no hay plazos de financiación activos, el simulador no se muestra y el detalle informa solo el precio de contado.
- El ecommerce no permite comprar, reservar ni pagar una unidad: el detalle invita a contactar a la empresa o a enviar una consulta (HU-26) para avanzar con la compra presencial.
- Si no hay resultados, el sistema lo indica explícitamente.
- Listado paginado, ordenado por fecha de publicación descendente por defecto.
**Puntos de función:** 5
**Origen del cambio:** ACTUALIZADA (versión Sprint 3 → Sprint 4) — Lo que en el Sprint 3 mostraba los planes predefinidos de la unidad se reutiliza como simulador: planes de ejemplo de HU-22 más una simulación libre, calculados con la TNA del plazo y sistema francés. Se deja explícito que el ecommerce no vende: la compra es presencial.

**ID:** HU-27 | **Sprint:** 4
**Título:** Registro de Venta Presencial con Plan de Pago Acordado (Sistema Francés)
**Como…** Responsable de Comercialización
**Necesito…** Registrar la venta de una unidad Disponible al cliente que se acerca a comprarla, armando con él su plan de pago —anticipo y cantidad de cuotas— y calculando las cuotas por sistema francés con la tasa del plazo elegido
**Para…** Acordar la financiación según las posibilidades de cada cliente, mostrarle el cronograma antes de que decida y, solo si acepta, formalizar la venta con su plan de pago y su cronograma de cuotas
**Criterios de Aceptación:**
- La venta se concreta únicamente de forma presencial, en la empresa y con la firma del contrato de compraventa. El ecommerce no permite comprar, reservar ni pagar el total de una unidad (HU-25); desde el ecommerce el cliente solo declara pagos de cuotas de una venta ya registrada (HU-29).
- Solo sobre unidades Disponibles, que por definición ya tienen precio de lista (HU-22). La unidad se selecciona mediante tabla emergente con filtros por proyecto y tipología.
- Comercialización busca al cliente por DNI/CUIL o correo; si no existe, lo da de alta ahí mismo con nombre, apellido, DNI/CUIL, correo y teléfono (HU-23), sin que el cliente necesite iniciar sesión. Si el cliente ya tenía cuenta propia, la venta queda asociada a esa cuenta, sin generar una identidad nueva. Si el cliente fue dado de alta en esta pantalla y finalmente no compra, su registro se conserva como cliente sin compras (HU-33).
- La fecha de venta es la fecha del día en que se confirma y no es editable.
- Modalidad de pago: Contado o Financiado.
- Contado: se genera una única cuota (número 0) por el 100 % del precio de lista, sin interés, que vence el día de la venta.
- Financiado: Comercialización carga el anticipo, en monto o en porcentaje del precio de lista (al cargar uno, el sistema calcula el otro), que debe ser mayor a cero y menor al precio; y elige el plazo entre los plazos de financiación activos (HU-32), mediante tabla emergente que muestra cantidad de cuotas y TNA.
- Como punto de partida, Comercialización puede elegir uno de los planes de ejemplo de la unidad (HU-22), que precarga su anticipo y su plazo, y ajustarlo con el cliente. El plan que se guarda es siempre el que se confirma en esta pantalla.
- Simulación: con esos datos el sistema calcula y muestra en vivo, sin guardar nada: saldo a financiar (precio de lista − anticipo), TNA, tasa mensual (TNA ÷ 12), valor de la cuota, total de intereses y total a pagar (anticipo + suma de cuotas), y el cronograma completo con, por cuota: número, fecha de vencimiento, amortización de capital, interés, importe de la cuota y saldo de capital restante. Cambiar el anticipo o el plazo recalcula todo al instante, para comparar alternativas con el cliente.
- Cálculo por sistema francés (cuota constante): valor de cuota = S × i / (1 − (1 + i)^−n), donde S es el saldo a financiar, i la tasa mensual y n la cantidad de cuotas. Para cada cuota: interés = saldo de capital anterior × i; amortización = valor de cuota − interés; saldo de capital = saldo anterior − amortización. Si la TNA del plazo es 0 %, el valor de cuota es S ÷ n.
- Redondeo: el valor de la cuota y el interés de cada cuota se redondean a dos decimales; la última cuota amortiza exactamente el saldo de capital restante (su importe puede diferir unos centavos del resto), de modo que el saldo de capital cierre en cero.
- Vencimientos: en Financiado, la cuota 0 es el anticipo, sin interés, y vence el día de la venta; la cuota N vence a los N meses de la fecha de venta. Si el día no existe en el mes de destino, vence el último día de ese mes.
- Si el cliente no acepta, Comercialización descarta la simulación y no queda ningún registro de venta, plan ni cuotas. Antes de descartarla puede imprimirla: la vista de impresión muestra unidad, precio de lista, anticipo, plazo, TNA, cronograma y la leyenda "Simulación informativa, sin validez contractual. Tasas sujetas a modificación." con la fecha del día.
- Si el cliente acepta, la confirmación es atómica y genera en una única operación la venta, su plan de pago y el cronograma de cuotas. Antes de guardar, el sistema vuelve a verificar que la unidad siga Disponible y que el precio de lista y la TNA del plazo no hayan cambiado desde la simulación; si algo cambió, rechaza la confirmación sin generar nada y muestra la simulación recalculada para volver a acordarla con el cliente.
- El plan de pago pertenece a la venta y, por medio de ella, al cliente: cada venta tiene exactamente un plan de pago. Si un mismo cliente compra dos unidades, se registran dos ventas con dos planes de pago independientes.
- Al confirmar quedan congelados en el plan: modalidad, precio de venta (el precio de lista vigente), anticipo, plazo elegido, cantidad de cuotas, TNA y valor de cuota. Cambios posteriores en el precio de lista (HU-22) o en la tasa del plazo (HU-32) no afectan la venta.
- El plan de pago confirmado no se modifica: la refinanciación o el cambio de condiciones quedan fuera de esta historia.
- Al confirmar, la unidad pasa a En Plan de Pago (HU-21). Una unidad no admite más de una venta vigente.
- La unidad pasa automáticamente a Vendida cuando el saldo pendiente de todas las cuotas de la venta llega a cero (última cuota saldada, sea por cobro presencial, HU-30, o validado desde el ecommerce, HU-29).
- Permite cancelar la venta con motivo obligatorio únicamente mientras no exista ningún cobro confirmado. Si existen declaraciones de pago pendientes de validación (HU-29), deben resolverse antes de permitir la cancelación. Al cancelarse, las cuotas quedan en estado ANULADA sin eliminarse físicamente, el plan de pago se conserva asociado a la venta cancelada como registro histórico, y la unidad vuelve a Disponible.
- Comercialización cuenta con un listado propio de ventas, filtrable por proyecto, unidad, cliente, modalidad, estado y período, que muestra por venta: fecha, cliente, unidad, precio, modalidad, cantidad de cuotas, TNA y saldo pendiente. Desde el detalle se accede al plan de pago y a su cronograma.
- Toda alta y cancelación queda en el historial de auditoría (creador = usuario de Comercialización que registró la venta).
**Puntos de función:** 13
**Origen del cambio:** ACTUALIZADA (versión Sprint 3 → Sprint 4) — Feedback: el plan de pago (anticipo y saldo a financiar) se acuerda en la venta según las posibilidades del cliente, con la TNA del plazo y sistema francés, y es el único plan que se guarda, asociado a la venta y al cliente. Se deja explícito que la venta es solo presencial, con firma de contrato.

**ID:** HU-28 | **Sprint:** 4
**Título:** Perfil del Cliente: Plan de Pago Acordado e Historial de Pagos
**Como…** Cliente autenticado
**Necesito…** Ver mi unidad, el plan de pago que acordé al comprarla y mi historial de pagos desde mi perfil
**Para…** Hacer seguimiento de mi compra sin consultarlo con la empresa
**Criterios de Aceptación:**
- Muestra los datos de la unidad comprada y su condición de entrega vigente (HU-21).
- Muestra el plan de pago acordado en la venta (HU-27): modalidad, precio, anticipo, saldo financiado, cantidad de cuotas, TNA, valor de la cuota, total de intereses y total a pagar.
- Muestra el cronograma de cuotas con, por cuota: número, fecha de vencimiento, amortización de capital, interés, importe, saldo pendiente de la cuota y estado; identifica de forma visible las cuotas vencidas con saldo pendiente.
- Muestra el saldo total pendiente de la venta.
- Muestra el historial de pagos, del más reciente al más antiguo, venga del ecommerce (HU-29) o presencial (HU-30). Los pagos validados figuran como pagos; en los declarados desde el ecommerce permite ver el comprobante que adjuntó (HU-29).
- También muestra las declaraciones pendientes de validación y las rechazadas (con su motivo), identificadas por estado (HU-29).
- Si tiene más de una unidad, lista todas con acceso individual; cada una con su propio plan de pago.
- Solo lectura. Si no tiene ninguna venta registrada, invita a ver el catálogo (HU-25).
**Puntos de función:** 2
**Origen del cambio:** ACTUALIZADA (versión Sprint 3 → Sprint 4) — Muestra el plan acordado en la venta (HU-27), con TNA, valor de cuota, total de intereses y el desglose capital / interés de cada cuota, y el comprobante de cada pago declarado (HU-29).

**ID:** HU-29 | **Sprint:** 4
**Título:** Declaración y Validación de Pagos Online con Comprobante
**Como…** Cliente autenticado / Responsable de Tesorería
**Necesito…** Que el cliente pueda declarar el pago de una cuota desde su perfil adjuntando el comprobante, y que Tesorería lo valide antes de que impacte la cuenta corriente
**Para…** Dejar constancia del pago sin trasladarse a la empresa, asegurando que el dinero efectivamente ingresó
**Criterios de Aceptación:**
- Disponible solo sobre cuotas pendientes o parciales de una venta propia y no cancelada.
- El cliente indica monto, medio de pago (limitado a los habilitados para autogestión) y número de referencia —obligatorio cuando la forma de pago lo requiere (HU-15)— y adjunta obligatoriamente el comprobante del pago (por ejemplo, la constancia de la transferencia). Sin comprobante no se puede enviar la declaración.
- El comprobante es un único archivo por declaración, en formato PDF, JPG o PNG y de hasta 5 MB; el sistema valida tipo y tamaño antes de aceptar la carga.
- El comprobante se guarda en un repositorio privado del servicio de almacenamiento de objetos, separado del repositorio público de imágenes: solo pueden verlo el cliente que lo cargó y los usuarios de Tesorería, y nunca se expone por una URL pública.
- Tesorería valida desde una bandeja de declaraciones pendientes, filtrable por cliente, forma de pago y período, donde abre el comprobante adjunto y lo contrasta con el número de referencia y el extracto bancario antes de aprobar o rechazar la declaración.
- Una vez enviada la declaración, el comprobante no puede reemplazarse ni eliminarse; si la declaración es rechazada, el cliente puede volver a declarar adjuntando un comprobante nuevo.
- El comprobante queda asociado a la declaración y se puede consultar también desde el detalle del cobro generado al validarla (HU-30) y desde la ficha del cliente (HU-33).
- Los medios de pago ofrecidos al cliente son un subconjunto de las formas de pago activas del sistema (HU-15).
- La declaración nace en Pendiente de validación y no impacta ningún saldo hasta ser resuelta.
- Al validar la declaración, el sistema genera un COBRO confirmado con origen ECOMMERCE, utilizando la misma entidad y reglas de imputación definidas para las cobranzas de HU-30. El cobro descuenta el saldo de la cuota correspondiente y no puede editarse una vez confirmado; únicamente puede anularse mediante el mecanismo de anulación definido en HU-30
- Si posteriormente el cobro generado es anulado, la declaración conserva el estado Validada como registro histórico de la validación realizada y continúa vinculada al cobro anulado; la restitución del saldo se rige por HU-30
- Al rechazar, Tesorería indica un motivo obligatorio; la declaración queda Rechazada con ese motivo, visible para el cliente, que puede volver a declarar.
- El cliente ve en su historial (HU-28) tanto las declaraciones pendientes/rechazadas como los pagos validados, y en cada declaración puede ver el comprobante que adjuntó.
- Al validar, el sistema vuelve a verificar que el saldo pendiente de la cuota alcance el importe declarado antes de generar el cobro; si no alcanza (por ejemplo, por un cobro presencial en el ínterin), Tesorería debe rechazarla en lugar de validarla.
**Puntos de función:** 3
**Origen del cambio:** ACTUALIZADA (versión Sprint 3 → Sprint 4) — El cliente adjunta obligatoriamente el comprobante del pago al declararlo y Tesorería lo ve al validar. En el Sprint 3 no se adjuntaban archivos y la validación se hacía solo con el número de referencia.

**ID:** HU-31 | **Sprint:** 4
**Título:** ABM de Proyecto
**Como…** Responsable de Proyectos
**Necesito…** Registrar, consultar, modificar y listar los proyectos (por ejemplo, una torre o un edificio) mediante un formulario paramétrico único, con su diseño, su estado de obra y un resumen de sus unidades funcionales
**Para…** Agrupar las unidades funcionales de cada proyecto y conocer de un vistazo su diseño, su presupuesto, su precio estimado de venta y en qué situación se encuentra, tanto de obra como comercial
**Criterios de Aceptación:**
- Opera en tres modos controlados por parámetro: INSERCIÓN, EDICIÓN y LECTURA.
- Campos obligatorios: nombre (único entre proyectos activos), dirección, localidad y cantidad de unidades planificadas (entero mayor a cero). El código único lo genera el sistema.
- Campos opcionales: descripción, fecha de inicio de obra, fecha de finalización estimada (no anterior a la de inicio), imagen de portada e imágenes de diseño (renders y planos), cada una identificada por su tipo y con un orden de visualización. Las imágenes se suben al servicio de almacenamiento de objetos según las convenciones transversales.
- Estado de obra: En planificación → En ejecución → Finalizado. El proyecto nace En planificación; el avance lo realiza manualmente el Responsable de Proyectos desde el detalle, con confirmación modal, y no admite retroceso.
- No puede pasar a En ejecución sin al menos una unidad funcional activa cargada (HU-20).
- El estado de obra condiciona las demás historias: define qué puede hacerse con las unidades (HU-20) y cuándo pueden publicarse (HU-21: solo En ejecución o Finalizado).
- La fecha de finalización estimada puede actualizarse mientras el proyecto no esté Finalizado; el cambio se refleja automáticamente como fecha de entrega de referencia en las publicaciones de sus unidades (HU-21).
- La ficha del proyecto muestra los siguientes datos, calculados por el sistema al consultar, no editables y no almacenados: (a) presupuesto = suma del costo de sus unidades activas (HU-20), junto con las unidades cargadas respecto de las planificadas; (b) precio estimado de venta = suma de los precios de lista de sus unidades con publicación vigente (HU-22), indicando sobre cuántas unidades se calculó; (c) situación comercial = cantidad de unidades sin publicar, en preparación, Disponibles, En Plan de Pago y Vendidas (HU-21), y porcentaje de unidades con venta registrada.
- El estado de obra y la situación comercial se muestran por separado, porque son independientes: un proyecto puede estar En ejecución y tener todas sus unidades vendidas (venta en pozo). Cuando todas las unidades activas tienen una venta vigente (En Plan de Pago o Vendida), el proyecto se identifica como "Todas las unidades vendidas".
- La ficha lista las unidades funcionales del proyecto con identificador, tipología, superficie cubierta, costo, precio de lista y estado comercial, con acceso al detalle de cada una (HU-20).
- La cantidad de unidades planificadas no puede ser menor a la cantidad de unidades activas ya cargadas.
- La baja es lógica, con modal de confirmación, y solo se permite en un proyecto En planificación sin unidades funcionales activas.
- Lista los proyectos mostrando código, nombre, localidad, estado de obra, unidades cargadas / planificadas, porcentaje vendido y fecha de finalización estimada; por defecto solo los activos, con filtros por estado de obra y localidad, y búsqueda por código o nombre, ordenados por nombre.
- Toda alta, modificación, cambio de estado y baja queda en el historial de auditoría.
- Quedan fuera de esta historia y se incorporarán con el módulo de Gestión de Obra: etapas, tareas, cronograma, avance físico, hitos, documentos, recursos, incidencias y riesgos del proyecto (HU-46 a HU-56).
**Puntos de función:** 8
**Origen del cambio:** NUEVA EN EL SPRINT (tomada del Product Backlog y refinada: ítem "ABM de Proyecto") — Feedback de la Sprint Review 3: incorporar el ABM de Proyecto para agrupar las unidades funcionales y consultar su diseño, precio estimado y estado. Se recorta el alcance original (normativa, financiamiento, versionado, cierre por hitos).

**ID:** HU-32 | **Sprint:** 4
**Título:** ABM de Plazos de Financiación
**Como…** Responsable de Comercialización
**Necesito…** Registrar, consultar, modificar y listar los plazos de financiación que ofrece la empresa, definiendo para cada cantidad de cuotas su tasa nominal anual
**Para…** Que la tasa de interés de cada venta financiada dependa de la cantidad de cuotas que elige el cliente —a más cuotas, mayor tasa— y se aplique automáticamente al calcular su plan de pago (HU-27)
**Criterios de Aceptación:**
- Opera en tres modos controlados por parámetro: INSERCIÓN, EDICIÓN y LECTURA.
- Campos: código único generado por el sistema, cantidad de cuotas, tasa nominal anual (TNA, en porcentaje), descripción (opcional, ej. "Promoción lanzamiento") y estado (activo / inactivo).
- Todas las cuotas son mensuales: el sistema no maneja otras periodicidades. Por eso la cantidad de cuotas equivale al plazo en meses.
- La cantidad de cuotas es un número entero mayor a cero y no puede repetirse entre plazos activos (no pueden existir dos plazos activos de 12 cuotas con tasas distintas).
- La cantidad de cuotas se define únicamente en el alta y queda bloqueada: para ofrecer otro plazo se crea uno nuevo.
- La TNA es mayor o igual a cero; una TNA de 0 % representa un plazo sin interés. Junto a la TNA, el formulario muestra en vivo, como dato informativo no editable, la tasa mensual que usa el cálculo de cuotas: TNA ÷ 12.
- La TNA puede modificarse en modo EDICIÓN. El cambio afecta a las ventas que se registren a partir de ese momento y a los planes de ejemplo y simulaciones del catálogo, que se recalculan con la nueva tasa (HU-22, HU-25); las ventas ya confirmadas conservan congelada la tasa con la que se pactaron (HU-27).
- La baja es lógica, con modal de confirmación. Un plazo inactivo deja de ofrecerse en nuevas ventas (HU-27), en los planes de ejemplo (HU-22) y en el simulador del catálogo (HU-25); las ventas que lo usaron lo conservan.
- Si no hay ningún plazo activo, las ventas solo pueden registrarse en modalidad Contado (HU-27).
- Lista los plazos mostrando cantidad de cuotas, TNA, tasa mensual, descripción y estado; por defecto solo los activos, ordenados por cantidad de cuotas ascendente, con filtro por estado.
- Toda alta, modificación de tasa y baja queda en el historial de auditoría con usuario y fecha.
**Puntos de función:** 3
**Origen del cambio:** NUEVA — Feedback de la Sprint Review 3: la tasa de interés varía según la cantidad de cuotas elegida (ejemplo de Mercado Pago: una tasa para 3 cuotas y otra para 6). Hay una TNA por plazo y las cuotas son siempre mensuales.

**ID:** HU-33 | **Sprint:** 4
**Título:** Gestión y Consulta de Clientes
**Como…** Responsable de Comercialización
**Necesito…** Consultar el listado de todos los clientes registrados con sus datos, y acceder a la ficha de cada uno con sus compras, planes de pago, cuotas, pagos y consultas
**Para…** Tener en un solo lugar la situación de cada cliente, atenderlo sin buscar su información en distintas pantallas y mantener actualizados sus datos de contacto
**Criterios de Aceptación:**
- Accesible desde el menú lateral de Comercialización.
- Incluye a todos los clientes, cualquiera sea su origen: registrados desde el ecommerce con Google (HU-23) o dados de alta por Comercialización al registrar una venta (HU-27). No hay alta independiente desde esta pantalla.
- Listado: nombre y apellido, DNI/CUIL, correo, teléfono, indicador de cuenta de Google vinculada, cantidad de ventas vigentes, saldo total pendiente e indicador de mora (al menos una cuota vencida con saldo pendiente). Saldo y mora los calcula el sistema al consultar.
- Filtros combinables: búsqueda por nombre, apellido, DNI/CUIL o correo; con compras / sin compras (estos últimos son los interesados que se registraron o consultaron sin comprar); en mora; y proyecto (clientes con alguna venta en ese proyecto). Ordenado por apellido y nombre, y paginado.
- Ficha del cliente (modo LECTURA), organizada en secciones: (a) datos personales y de contacto, y fecha de alta; (b) ventas, vigentes y canceladas, con unidad, proyecto, fecha, modalidad, cantidad de cuotas, TNA, estado y saldo pendiente, y acceso al plan de pago y su cronograma (HU-27); (c) cobros recibidos, presenciales y del ecommerce, con acceso al detalle de cada cobro (HU-30); (d) declaraciones de pago pendientes o rechazadas, con su comprobante adjunto (HU-29); (e) consultas realizadas sobre unidades, con su estado y respuesta (HU-26).
- Modo EDICIÓN: permite modificar nombre, apellido, DNI/CUIL y teléfono. El DNI/CUIL no puede repetirse entre clientes. El correo solo puede modificarse mientras el cliente no tenga una cuenta de Google vinculada, validando que no se repita; una vez vinculada, el correo es su identidad de acceso y no se edita.
- Desde la ficha no se registran ventas, cobros ni respuestas: cada acción se realiza en su propia pantalla, a la que la ficha da acceso.
- Los clientes no se dan de baja: conservan su historial comercial y de pagos.
- Toda modificación de datos queda en el historial de auditoría con usuario y fecha.
- Quedan fuera de esta historia el seguimiento comercial de interesados (HU-57) y las etapas del proceso de venta (HU-59).
**Puntos de función:** 5
**Origen del cambio:** NUEVA EN EL SPRINT (tomada del Product Backlog y refinada: ítem "ABM de Clientes e Interesados") — Pedido del equipo: panel interno con el listado de todos los clientes y la ficha de cada uno. Se recorta el alcance original (estados comerciales, origen del contacto, encriptación).

**ID:** HU-34 | **Sprint:** 4
**Título:** Tablero del Gerente: Ingresos, Egresos y Margen por Proyecto
**Como…** Gerente General
**Necesito…** Consultar en un tablero los ingresos y egresos de la empresa en distintos períodos, y el margen que está dejando cada proyecto
**Para…** Saber si la constructora está ganando o perdiendo dinero en cada período y qué proyectos son más rentables, y tomar decisiones sin armar reportes a mano
**Criterios de Aceptación:**
- Accesible desde el menú lateral únicamente para el rol Gerente General.
- Período: el gerente elige la agrupación —mensual, trimestral o anual— y el rango de fechas (desde–hasta). Por defecto muestra el año en curso agrupado por mes.
- Ingresos: importe total cobrado a clientes en cada período (cobros confirmados, presenciales y validados desde el ecommerce, excluyendo anulados; HU-30, HU-29), con su apertura por proyecto.
- Egresos: importe total pagado a proveedores en cada período (pagos confirmados, excluyendo anulados), reutilizando el cálculo del reporte de egresos (HU-19). Los egresos no se abren por proyecto porque los pagos no se asocian a proyectos, y así se indica en pantalla.
- Resultado: ingresos − egresos de cada período, identificado de forma visible como positivo o negativo (con signo, no solo con color).
- Evolución: un gráfico de barras con ingresos y egresos de cada mes, trimestre o año del rango elegido, y una tabla con los mismos valores y el resultado de cada período.
- Indicadores destacados en la parte superior: ingresos, egresos y resultado del rango elegido, cada uno con su variación porcentual respecto del rango anterior de igual duración, y margen total realizado de todos los proyectos (importe y porcentaje).
- Margen por proyecto (a la fecha), en una tabla con una fila por proyecto activo: (a) margen realizado = suma de precios de venta de sus unidades con venta vigente, En Plan de Pago o Vendida (HU-27), menos el costo de esas unidades (HU-20), en importe y en porcentaje sobre las ventas; (b) margen proyectado = suma de precios de lista de sus unidades Disponibles (HU-22) menos su costo, en importe y porcentaje; (c) margen total esperado = realizado + proyectado, junto con el porcentaje de unidades vendidas. Las unidades sin publicar o sin precio de lista no entran en el cálculo y se informa cuántas son.
- El margen es comercial: compara el precio de venta con el costo de cada unidad. No incluye los intereses de financiación ni gastos que no estén cargados como costo de la unidad, y así se aclara en pantalla.
- Filtro por proyecto (opcional): aplica a ingresos y margen. Con un proyecto seleccionado no se muestra el resultado, porque los egresos no pueden atribuirse a un proyecto.
- Todos los valores se calculan al momento de la consulta a partir de los datos registrados; el tablero es de solo lectura y no almacena valores.
- Si no hay datos para los filtros elegidos, cada indicador muestra cero en lugar de un error o un espacio vacío.
- Quedan fuera de esta historia otros indicadores comerciales (unidades por estado, cartera a cobrar, morosidad, consultas pendientes) y el acceso a los listados que respaldan cada valor.
**Puntos de función:** 8
**Origen del cambio:** NUEVA — Pedido del equipo: tablero para el Gerente General solo con ingresos y egresos por período e indicadores útiles para la constructora, como el margen de cada proyecto. Reemplaza la versión anterior del tablero, que tenía indicadores comerciales.