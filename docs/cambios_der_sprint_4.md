# Cambios del DER — Sprint 4

Documento de cambios del DER para el Sprint 4, tal como lo entregó el equipo de análisis. Es la entrada de la tarea de migración (T121) y de la limpieza del esquema (T159) de [tareas_sprint_4.md](tareas_sprint_4.md).

> **Estado:** definido en T121 (2026-10-05). El esquema de `backend/prisma/schema.prisma` y la migración `t121_der_sprint4` implementan este documento.

## Cambios por entidad

Esta tabla describe el DER **final**, el que se entrega: el estado del esquema después de T159. Hasta que T159 mergee, el esquema tiene además las columnas de [Columnas legado](#columnas-legado-se-eliminan-en-t159).

| Entidad | Tipo de cambio | Detalle del cambio | Atributos resultantes | Motivo / HU |
|---|---|---|---|---|
| PLANPAGO | Modificada (relación y atributos) | La PLANPAGO del Sprint 3 (ligada a PUBLICACIONUNIDAD) se reutiliza como PLANEJEMPLO (ver fila siguiente). La nueva PLANPAGO se relaciona 1 a 1 con VENTA: cada venta tiene exactamente un plan de pago, el único que se guarda, y nace con ella. Respecto de la tabla del Sprint 3 se eliminan: FK_publicacion, nombre, tipo, precio, porcentaje_ganancia, margen, anticipo_porcentaje, periodicidad, estado, hora_actualizacion y FK_usuario_actualizador (el plan confirmado no se modifica). Se agregan: FK_venta (única), FK_plazo_financiacion (vacía en Contado), modalidad, precio_venta, tasa_nominal_anual y valor_cuota. cantidad_cuotas y tasa_nominal_anual se copian del plazo porque quedan congeladas aunque el plazo cambie después. No se guardan valores derivables: saldo financiado = precio_venta − anticipo_monto; tasa mensual = TNA ÷ 12; total de intereses = suma de importe_interes de sus cuotas. | id_plan_pago, FK_venta, FK_plazo_financiacion, modalidad (CONTADO / FINANCIADO), precio_venta, anticipo_monto, cantidad_cuotas, tasa_nominal_anual, valor_cuota, hora_creacion, FK_usuario_creador | Feedback Sprint Review 3: el plan se acuerda en la venta y se asocia a la venta y al cliente, no a la unidad. HU-27. |
| PLANEJEMPLO | Nueva (reutiliza la PLANPAGO del Sprint 3) | Planes de pago de ejemplo que Comercialización arma por unidad publicada para el simulador del catálogo. Relación: una publicación tiene muchos planes de ejemplo; cada plan de ejemplo usa un plazo de financiación. No guarda importes ni tasa: la cuota se calcula al mostrarlo con la TNA vigente del plazo y sistema francés. No se relaciona con VENTA. | id_plan_ejemplo, FK_publicacion, FK_plazo_financiacion, nombre, anticipo_porcentaje, estado, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | Feedback Sprint Review 3: reutilizar los planes del Sprint 3 como simulador para el cliente. HU-22, HU-25. |
| VENTA | Modificada | Se eliminan FK_plan_pago y los atributos congelados (precio_congelado, anticipo_congelado, tipo_plan_congelado, cantidad_cuotas_congelada, periodicidad_congelada): ahora viven en PLANPAGO, que pertenece a la venta. fecha_adhesion pasa a llamarse fecha_venta. Se agregan hora_actualizacion y FK_usuario_actualizador, porque la cancelación modifica la venta. El vínculo del plan con el cliente se da a través de VENTA.FK_cliente (no se repite en PLANPAGO). | id_venta, FK_cliente, FK_publicacion, fecha_venta, estado, motivo_cancelacion, fecha_cancelacion, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | HU-27. Convención de auditoría de la Definition of Done. |
| CUOTA | Modificada | FK_venta se reemplaza por FK_plan_pago: las cuotas son el cronograma del plan. Se agregan importe_capital, importe_interes y saldo_capital (desglose del sistema francés), y hora_creacion / hora_actualizacion. importe = importe_capital + importe_interes; se conserva porque lo usan los cobros. Ojo: saldo_pendiente es lo que falta pagar de esa cuota (lo modifican los cobros); saldo_capital es la deuda del plan después de esa cuota (fijo, lo calcula el sistema francés al confirmar). | id_cuota, FK_plan_pago, numero, fecha_vencimiento, importe_capital, importe_interes, importe, saldo_capital, saldo_pendiente, estado, hora_creacion, hora_actualizacion | HU-27, HU-28. |
| PUBLICACIONUNIDAD | Modificada | Se agregan precio_lista, porcentaje_ganancia y margen, que antes estaban en cada plan de pago. precio_lista es nulo mientras la publicación está en preparación. porcentaje_ganancia y margen son de referencia y pueden quedar vacíos. | Atributos actuales + precio_lista, porcentaje_ganancia, margen | HU-22, HU-21. |
| PLAZOFINANCIACION | Nueva | Tabla de plazos que ofrece la empresa, cada uno con su tasa. Relación: un plazo puede usarse en muchos planes de pago; un plan Financiado usa un plazo y un plan Contado ninguno. También lo usan los planes de ejemplo (PLANEJEMPLO). cantidad_cuotas es única entre los plazos activos. | id_plazo_financiacion, codigo, cantidad_cuotas, tasa_nominal_anual, descripcion, estado, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | Feedback Sprint Review 3: la tasa varía según la cantidad de cuotas (ejemplo Mercado Pago). HU-32, HU-22, HU-25. |
| PROYECTO | Modificada | El atributo estado (estado de obra) pasa a llamarse estado_obra; admite En planificación / En ejecución / Finalizado / Cancelado (Cancelado se mantiene hasta que se responda OBS-22). Se agrega estado (verdadero / falso) para la baja lógica, como en el resto del modelo. Se agregan descripcion y fecha_inicio. direccion y cantidad_unidades_planificadas pasan a ser obligatorios. Presupuesto, precio estimado de venta y situación comercial NO son atributos: se calculan desde sus unidades funcionales y publicaciones. | id_proyecto, codigo, nombre, descripcion, localidad, direccion, fecha_inicio, fecha_fin_estimada, estado_obra, cantidad_unidades_planificadas, imagen_portada_url, estado, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | Feedback Sprint Review 3: ABM de Proyecto. HU-31. |
| IMAGENPROYECTO | Nueva | Imágenes de diseño del proyecto (renders y planos). Relación: un proyecto tiene muchas imágenes; cada imagen pertenece a un proyecto. Misma lógica que IMAGENUNIDAD. | id_imagen_proyecto, FK_proyecto, url, tipo (RENDER / PLANO), orden, hora_creacion | Feedback Sprint Review 3: consultar el diseño del proyecto. HU-31. |
| CLIENTE | Modificada | No se renombra ningún atributo (google_sub, email y refreshTokenHash quedan como están). Se agrega FK_usuario_actualizador, que puede quedar vacío: registra qué usuario interno hizo la última modificación desde el panel de clientes, y queda vacío cuando el cambio lo hace el propio cliente desde el ecommerce o el login con Google (OBS-25). | id_cliente, google_sub, email, nombre, apellido, dni_cuil, telefono, refreshTokenHash, hora_creacion, hora_actualizacion, FK_usuario_actualizador | HU-33: registrar usuario y fecha de cada modificación. |
| FORMAPAGO | Sin cambios | En el dibujo figura como "FORMA DE PAGO", solo con habilitada_autogestion y con un atributo codigo. En el esquema ya se llama FORMAPAGO y tiene todos sus atributos. No se agrega codigo: es un error del dibujo. | id_forma_pago, nombre, descripcion, requiere_referencia, habilitada_autogestion, estado, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | Consistencia del modelo (HU-15, HU-29). |
| DETALLECOBRO | Sin cambios | En el dibujo figura como "DETALLLECOBRO" (con una L de más). Es un error del dibujo: en el esquema ya se llama DETALLECOBRO. | Sin cambios | Error de tipeo del dibujo. |
| CONSULTAUNIDAD | Sin cambios | En el dibujo figura FK_usuario_respiesta. Es un error del dibujo: en el esquema ya se llama FK_usuario_respuesta. | Sin cambios | Error de tipeo del dibujo. |
| DECLARACIONPAGO | Modificada | Se agregan los datos del comprobante adjunto. El archivo se guarda en el repositorio privado del almacenamiento de objetos; la tabla guarda su ruta, no el archivo. | Atributos actuales + comprobante_ruta, comprobante_nombre_archivo, comprobante_tipo | HU-29: el cliente adjunta el comprobante al declarar el pago. |
| UNIDADFUNCIONAL, IMAGENUNIDAD, COBRO | Sin cambios | No se modifican. Los cobros siguen imputándose a CUOTA a través de DETALLECOBRO; la cuota ahora incluye interés, pero la lógica de cobro es la misma. | Sin cambios | HU-29, HU-30. |
| Enumeraciones | Modificadas | El tipo de plan (TipoPlanPago) pasa a llamarse ModalidadPago, con los mismos valores; lo usa PLANPAGO.modalidad. Se agrega TipoImagenProyecto para IMAGENPROYECTO.tipo. La periodicidad deja de existir: según HU-32, "todas las cuotas son mensuales: el sistema no maneja otras periodicidades". | ModalidadPago (CONTADO / FINANCIADO), TipoImagenProyecto (RENDER / PLANO) | HU-27, HU-31, HU-32. |
| General (módulo Compras) | Verificado, sin cambios | En el esquema la relación entre Orden de Compra y Comprobante ya es opcional y de uno a muchos: COMPROBANTEPROVEEDOR.FK_orden_compra puede quedar vacía y una orden puede tener varios comprobantes. | — | Feedback general de la Sprint Review 3: la relación OC – Factura no es 1 a 1. |
| General | Descartado | La revisión de nombres en inglés en todo el DER queda descartada por decisión del equipo: el foco del sprint está en las entidades que necesitan las historias del Sprint 4. | — | Feedback general de la Sprint Review 3: uso responsable de IA. |

## Caso de prueba — Sistema francés

Aplica a HU-27 (venta), HU-22 (planes de ejemplo) y HU-25 (simulador): los tres usan el mismo cálculo y redondeo. Los valores son de ejemplo, no son precios ni tasas reales de la empresa.

| Dato | Valor |
|---|---|
| Precio de lista | $ 20.000.000,00 |
| Anticipo (cuota 0) | $ 10.000.000,00 |
| Cantidad de cuotas (plazo, máx. 60) | 12 |
| TNA del plazo | 24,00 % |
| Saldo a financiar | $ 10.000.000,00 |
| Tasa mensual (TNA ÷ 12) | 2,0000 % |
| Valor de la cuota | $ 945.595,97 |
| Total de intereses | $ 1.347.151,59 |
| Total a pagar (anticipo + cuotas) | $ 21.347.151,59 |
| Control: saldo de capital al final (debe dar 0) | $ 0,00 |

| Cuota | Vence (meses después de la venta) | Amortización de capital | Interés | Importe de la cuota | Saldo de capital |
|---|---|---|---|---|---|
| 0 | 0 | | $ 0,00 | $ 10.000.000,00 | $ 10.000.000,00 |
| 1 | 1 | $ 745.595,97 | $ 200.000,00 | $ 945.595,97 | $ 9.254.404,03 |
| 2 | 2 | $ 760.507,89 | $ 185.088,08 | $ 945.595,97 | $ 8.493.896,14 |
| 3 | 3 | $ 775.718,05 | $ 169.877,92 | $ 945.595,97 | $ 7.718.178,09 |
| 4 | 4 | $ 791.232,41 | $ 154.363,56 | $ 945.595,97 | $ 6.926.945,68 |
| 5 | 5 | $ 807.057,06 | $ 138.538,91 | $ 945.595,97 | $ 6.119.888,62 |
| 6 | 6 | $ 823.198,20 | $ 122.397,77 | $ 945.595,97 | $ 5.296.690,42 |
| 7 | 7 | $ 839.662,16 | $ 105.933,81 | $ 945.595,97 | $ 4.457.028,26 |
| 8 | 8 | $ 856.455,40 | $ 89.140,57 | $ 945.595,97 | $ 3.600.572,86 |
| 9 | 9 | $ 873.584,51 | $ 72.011,46 | $ 945.595,97 | $ 2.726.988,35 |
| 10 | 10 | $ 891.056,20 | $ 54.539,77 | $ 945.595,97 | $ 1.835.932,15 |
| 11 | 11 | $ 908.877,33 | $ 36.718,64 | $ 945.595,97 | $ 927.054,82 |
| 12 | 12 | $ 927.054,82 | $ 18.541,10 | $ 945.595,92 | $ 0,00 |

## Columnas legado (se eliminan en T159)

La migración de T121 es aditiva: lo que el DER final elimina se conserva hasta T159, porque el código del Sprint 3 lo sigue usando hasta que mergeen las tareas de cada historia. En `schema.prisma` cada una está marcada con `// LEGADO Sprint 3 — se elimina en T159`.

| Entidad | Qué queda por compatibilidad |
|---|---|
| PLANEJEMPLO | Columnas `tipo` y `precio` (pasaron a admitir vacío), `porcentaje_ganancia`, `margen`, `anticipo_monto`, `cantidad_cuotas` y `periodicidad`. Relación con VENTA (`ventas`). |
| VENTA | Columna `FK_plan_ejemplo` (es la `FK_plan_pago` del Sprint 3, renombrada para que no se confunda con `CUOTA.FK_plan_pago`), con su clave foránea a PLANEJEMPLO y su índice. Columnas `precio_congelado`, `anticipo_congelado`, `tipo_plan_congelado`, `cantidad_cuotas_congelada` y `periodicidad_congelada`. Todas admiten vacío. Relación directa con CUOTA (`cuotas`). |
| CUOTA | Columna `FK_venta`, con su clave foránea a VENTA, y la restricción de unicidad `[FK_venta, numero]`. Convive con `FK_plan_pago` y con `[FK_plan_pago, numero]`, que son las definitivas. |
| Enumeraciones | `Periodicidad`. La usan solo `PLANEJEMPLO.periodicidad` y `VENTA.periodicidad_congelada`. |

También son transitorios, y los resuelve T159: `PLANEJEMPLO.FK_plazo_financiacion` y `PLANEJEMPLO.anticipo_porcentaje` admiten vacío porque los planes del Sprint 3 no tienen plazo ni, en algunos casos, anticipo en porcentaje.

**Regla de convivencia hasta T159**

- El código nuevo no lee columnas legado.
- Las condiciones de una venta (precio, anticipo, modalidad, cantidad de cuotas) se leen de su PLANPAGO. Mientras existan los contratos del Sprint 3, se leen a través de `backend/src/modules/comercializacion/venta/condiciones-venta.ts`, que es el único lugar que las traduce.
- Toda venta nace con su PLANPAGO, en la misma transacción. Una venta sin plan de pago es un dato inconsistente.
- Toda cuota se escribe con las dos claves foráneas (`FK_venta` y `FK_plan_pago`) hasta T159.

## Puntos resueltos

Diferencias que se habían detectado entre la tabla original, las historias de usuario del Sprint 4 y el esquema, con la resolución que tomó T121.

**Lo que las historias pedían y la tabla no traía**

1. **PROYECTO, baja lógica.** Resuelto: el estado de obra pasa a `estado_obra` y se agrega `estado` (verdadero / falso) para la baja lógica.
2. **PROYECTO, campos obligatorios.** Resuelto: `direccion` y `cantidad_unidades_planificadas` son obligatorios en la base.
3. **PROYECTO, estado CANCELADO.** Se mantiene en la enumeración hasta que se responda OBS-22. T122 y T159 actúan según esa respuesta.
4. **CLIENTE, auditoría.** Resuelto: se agrega `FK_usuario_actualizador`, que queda vacío cuando el cambio lo hace el propio cliente (OBS-25).

**Lo que la tabla pedía y ya estaba, o no coincidía con el esquema**

5. **FORMAPAGO.codigo.** No se agrega: es un error del dibujo.
6. **DETALLECOBRO y FK_usuario_respuesta.** Errores del dibujo, no de la base.
7. **VENTA en mayúsculas.** Error del dibujo: ya estaba bien en el esquema.

**Efectos sobre el código que la tabla no mencionaba**

8. **CLIENTE.email → correo.** Descartado: no se renombra ningún atributo de CLIENTE.
9. **CUOTA.FK_venta → FK_plan_pago.** Las dos claves foráneas conviven hasta T159 (ver [Columnas legado](#columnas-legado-se-eliminan-en-t159)).
10. **Ventas existentes.** No se migran datos: el sistema no está en producción y la base se resetea. Las ventas que crea el código del Sprint 3 se guardan como planes con TNA 0 %, que es el reparto en partes iguales: toda la cuota es capital.
11. **Enumeraciones.** Resuelto como figura en la tabla: ModalidadPago y TipoImagenProyecto; Periodicidad queda como legado.
12. **Máximo de 60 cuotas.** Es una validación del ABM de plazos (T126), no de la base. El valor depende de OBS-13.

## Dibujo del DER

El dibujo del DER tiene que actualizarse con estos cambios. No es parte del repositorio.
