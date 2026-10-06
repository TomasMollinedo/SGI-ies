# Cambios del DER — Sprint 4

Documento de cambios del DER para el Sprint 4, tal como lo entregó el equipo de análisis. Es la entrada de la tarea de migración (T121) y de la limpieza del esquema (T159) de [tareas_sprint_4.md](tareas_sprint_4.md).

> **Estado:** en revisión. Antes de migrar se va a contrastar atributo por atributo con las historias de usuario; el DER final puede diferir de esta tabla. Las diferencias ya detectadas contra el esquema actual están al final, en [Puntos a revisar](#puntos-a-revisar-antes-de-migrar).

## Cambios por entidad

| Entidad | Tipo de cambio | Detalle del cambio | Atributos resultantes | Motivo / HU |
|---|---|---|---|---|
| PLANPAGO | Modificada (relación y atributos) | La PLANPAGO del Sprint 3 (ligada a PUBLICACIONUNIDAD) se reutiliza como PLANEJEMPLO (ver fila siguiente). La nueva PLANPAGO se relaciona 1 a 1 con VENTA: cada venta tiene exactamente un plan de pago, el único que se guarda, y nace con ella. Respecto de la tabla del Sprint 3 se eliminan: FK_publicacion, nombre, tipo, precio, porcentaje_ganancia, margen, anticipo_porcentaje, periodicidad, estado, hora_actualizacion y FK_usuario_actualizador (el plan confirmado no se modifica). Se agregan: FK_venta (única), FK_plazo_financiacion (vacía en Contado), modalidad, precio_venta, tasa_nominal_anual y valor_cuota. cantidad_cuotas y tasa_nominal_anual se copian del plazo porque quedan congeladas aunque el plazo cambie después. No se guardan valores derivables: saldo financiado = precio_venta − anticipo_monto; tasa mensual = TNA ÷ 12; total de intereses = suma de importe_interes de sus cuotas. | id_plan_pago, FK_venta, FK_plazo_financiacion, modalidad (CONTADO / FINANCIADO), precio_venta, anticipo_monto, cantidad_cuotas, tasa_nominal_anual, valor_cuota, hora_creacion, FK_usuario_creador | Feedback Sprint Review 3: el plan se acuerda en la venta y se asocia a la venta y al cliente, no a la unidad. HU-27. |
| PLANEJEMPLO | Nueva (reutiliza la PLANPAGO del Sprint 3) | Planes de pago de ejemplo que Comercialización arma por unidad publicada para el simulador del catálogo. Relación: una publicación tiene muchos planes de ejemplo; cada plan de ejemplo usa un plazo de financiación. No guarda importes ni tasa: la cuota se calcula al mostrarlo con la TNA vigente del plazo y sistema francés. No se relaciona con VENTA. | id_plan_ejemplo, FK_publicacion, FK_plazo_financiacion, nombre, anticipo_porcentaje, estado, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | Feedback Sprint Review 3: reutilizar los planes del Sprint 3 como simulador para el cliente. HU-22, HU-25. |
| VENTA | Modificada | Se eliminan FK_plan_pago y los atributos congelados (precio_congelado, anticipo_congelado, tipo_plan_congelado, cantidad_cuotas_congelada, periodicidad_congelada): ahora viven en PLANPAGO, que pertenece a la venta. fecha_adhesion pasa a llamarse fecha_venta. Se agregan hora_actualizacion y FK_usuario_actualizador, porque la cancelación modifica la venta. El vínculo del plan con el cliente se da a través de VENTA.FK_cliente (no se repite en PLANPAGO). Corregir el nombre de la entidad a mayúsculas (VENTA), como el resto. | id_venta, FK_cliente, FK_publicacion, fecha_venta, estado, motivo_cancelacion, fecha_cancelacion, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | HU-27. Convención de auditoría de la Definition of Done. |
| CUOTA | Modificada | FK_venta se reemplaza por FK_plan_pago: las cuotas son el cronograma del plan. Se agregan importe_capital, importe_interes y saldo_capital (desglose del sistema francés), y hora_creacion / hora_actualizacion. importe = importe_capital + importe_interes; se conserva porque lo usan los cobros. Ojo: saldo_pendiente es lo que falta pagar de esa cuota (lo modifican los cobros); saldo_capital es la deuda del plan después de esa cuota (fijo, lo calcula el sistema francés al confirmar). | id_cuota, FK_plan_pago, numero, fecha_vencimiento, importe_capital, importe_interes, importe, saldo_capital, saldo_pendiente, estado, hora_creacion, hora_actualizacion | HU-27, HU-28. |
| PUBLICACIONUNIDAD | Modificada | Se agregan precio_lista, porcentaje_ganancia y margen, que antes estaban en cada plan de pago. precio_lista es nulo mientras la publicación está en preparación. | Atributos actuales + precio_lista, porcentaje_ganancia, margen | HU-22, HU-21. |
| PLAZOFINANCIACION | Nueva | Tabla de plazos que ofrece la empresa, cada uno con su tasa. Relación: un plazo puede usarse en muchos planes de pago; un plan Financiado usa un plazo y un plan Contado ninguno. También lo usan los planes de ejemplo (PLANEJEMPLO). cantidad_cuotas es única entre los plazos activos. | id_plazo_financiacion, codigo, cantidad_cuotas, tasa_nominal_anual, descripcion, estado, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | Feedback Sprint Review 3: la tasa varía según la cantidad de cuotas (ejemplo Mercado Pago). HU-32, HU-22, HU-25. |
| PROYECTO | Modificada | Se agregan descripcion y fecha_inicio. Verificar que estado admita En planificación / En ejecución / Finalizado. Presupuesto, precio estimado de venta y situación comercial NO son atributos: se calculan desde sus unidades funcionales y publicaciones. | Atributos actuales + descripcion, fecha_inicio | Feedback Sprint Review 3: ABM de Proyecto. HU-31. |
| IMAGENPROYECTO | Nueva | Imágenes de diseño del proyecto (renders y planos). Relación: un proyecto tiene muchas imágenes; cada imagen pertenece a un proyecto. Misma lógica que IMAGENUNIDAD. | id_imagen_proyecto, FK_proyecto, url, tipo (RENDER / PLANO), orden, hora_creacion | Feedback Sprint Review 3: consultar el diseño del proyecto. HU-31. |
| CLIENTE | Renombrar atributos | google_sub → id_google; refreshTokenHash → hash_token_refresco; email → correo (para que coincida con cómo lo nombran las historias). Sin cambios de estructura: el panel de clientes (HU-33) usa los atributos existentes. | id_cliente, id_google, correo, nombre, apellido, dni_cuil, telefono, hash_token_refresco, hora_creacion, hora_actualizacion | Feedback: nombres de tablas y atributos en castellano. |
| FORMA DE PAGO | Completar y renombrar | En el dibujo solo figura habilitada_autogestion. Completar con todos sus atributos y renombrar a FORMAPAGO para seguir la convención de nombres del resto del DER. | id_forma_pago, codigo, nombre, descripcion, requiere_referencia, habilitada_autogestion, estado, hora_creacion, hora_actualizacion, FK_usuario_creador, FK_usuario_actualizador | Consistencia del modelo (HU-15, HU-29). |
| DETALLLECOBRO | Corregir nombre | Renombrar a DETALLECOBRO (tiene una L de más). | Sin cambios | Error de tipeo. |
| CONSULTAUNIDAD | Corregir nombre de atributo | FK_usuario_respiesta → FK_usuario_respuesta. | Sin cambios | Error de tipeo. |
| DECLARACIONPAGO | Modificada | Se agregan los datos del comprobante adjunto. El archivo se guarda en el repositorio privado del almacenamiento de objetos; la tabla guarda su ruta, no el archivo. | Atributos actuales + comprobante_ruta, comprobante_nombre_archivo, comprobante_tipo | HU-29: el cliente adjunta el comprobante al declarar el pago. |
| UNIDADFUNCIONAL, IMAGENUNIDAD, COBRO | Sin cambios | No se modifican. Los cobros siguen imputándose a CUOTA a través de DETALLECOBRO; la cuota ahora incluye interés, pero la lógica de cobro es la misma. | Sin cambios | HU-29, HU-30. |
| General (módulo Compras) | Revisar | Verificar en el DER completo que la relación entre Orden de Compra y Comprobante sea opcional y de uno a muchos: un comprobante puede no tener orden previa y una orden puede recibir varios comprobantes. | — | Feedback general de la Sprint Review 3: la relación OC – Factura no es 1 a 1. |
| General | Revisar | Recorrer todo el DER buscando nombres en inglés o tablas que no correspondan al contexto del proyecto (por ejemplo, tablas generadas por IA para otros países o normativas). | — | Feedback general de la Sprint Review 3: uso responsable de IA. |

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

## Puntos a revisar antes de migrar

Diferencias entre esta tabla, las historias de usuario del Sprint 4 y `backend/prisma/schema.prisma` en `testing`.

**Lo que las historias piden y la tabla no trae**

1. **PROYECTO, baja lógica.** HU-31 pide baja lógica y nombre único "entre proyectos activos". Hoy `estado` es el estado de obra y no hay un indicador de activo.
2. **PROYECTO, campos obligatorios.** HU-31 hace obligatorias la dirección y la cantidad de unidades planificadas; hoy `direccion` y `cantidad_unidades_planificadas` admiten vacío, y hay que completar las filas existentes.
3. **PROYECTO, estado CANCELADO.** El enum actual tiene un cuarto valor, CANCELADO, que HU-31 no contempla y que el código de unidades usa. La tabla pide verificar los tres estados, no dice qué hacer con el cuarto.
4. **CLIENTE, auditoría.** HU-33 pide registrar usuario y fecha de cada modificación; CLIENTE no tiene FK_usuario_actualizador y la tabla dice "sin cambios de estructura".

**Lo que la tabla pide y ya está, o no coincide con el esquema**

5. **FORMAPAGO.codigo.** Figura entre los atributos resultantes y no existe en el esquema. El resto de la fila (nombre de la tabla, demás atributos) ya está como se pide.
6. **DETALLECOBRO y FK_usuario_respuesta.** Ya están bien escritos en el esquema: son errores del dibujo del DER, no de la base.
7. **VENTA en mayúsculas.** Ya lo está.

**Efectos sobre el código que la tabla no menciona**

8. **CLIENTE.email → correo.** `email` también es el nombre del campo en la API del cliente y lo usan unos 15 archivos del frontend. Hay que decidir si el renombre es solo de la columna o también del contrato.
9. **CUOTA.FK_venta → FK_plan_pago.** Lo usan los servicios de cobros, declaraciones de pago y ventas del Sprint 3, que la tabla da por "sin cambios".
10. **Ventas existentes.** Cada venta del Sprint 3 necesita que la migración le cree su PLANPAGO y le reasigne sus cuotas; para esas cuotas, capital, interés y saldo de capital no se pueden reconstruir con sistema francés porque se vendieron sin interés.
11. **Enums.** Aparece la modalidad (CONTADO / FINANCIADO) y el tipo de imagen (RENDER / PLANO); quedan sin uso el tipo de plan y la periodicidad.
12. **Máximo de 60 cuotas.** Figura en el caso de prueba y no en HU-32.
