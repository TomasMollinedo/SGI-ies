-- CreateEnum
CREATE TYPE "CondicionIVA" AS ENUM ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'EXENTO', 'CONSUMIDOR_FINAL');

-- CreateEnum
CREATE TYPE "EstadoOrdenCompra" AS ENUM ('BORRADOR', 'EMITIDA', 'RECIBIDA_PARCIAL', 'RECIBIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EfectoSaldo" AS ENUM ('AUMENTA', 'DISMINUYE');

-- CreateEnum
CREATE TYPE "EstadoComprobante" AS ENUM ('BORRADOR', 'REGISTRADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "EstadoSaldo" AS ENUM ('PENDIENTE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoOrdenPago" AS ENUM ('BORRADOR', 'CONFIRMADA', 'ANULADA');

-- CreateTable
CREATE TABLE "PROVEEDOR" (
    "id_proveedor" SERIAL NOT NULL,
    "razon_social" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "condicion_iva" "CondicionIVA" NOT NULL,
    "domicilio" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "observaciones" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "PROVEEDOR_pkey" PRIMARY KEY ("id_proveedor")
);

-- CreateTable
CREATE TABLE "ORDENCOMPRA" (
    "id_orden_compra" SERIAL NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL,
    "fecha_entrega_solicitada" TIMESTAMP(3),
    "observaciones" TEXT,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estado" "EstadoOrdenCompra" NOT NULL DEFAULT 'BORRADOR',
    "motivo_cancelacion" TEXT,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_proveedor" INTEGER NOT NULL,
    "FK_deposito" INTEGER NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "ORDENCOMPRA_pkey" PRIMARY KEY ("id_orden_compra")
);

-- CreateTable
CREATE TABLE "DETALLEORDENCOMPRA" (
    "id_detalle_orden_compra" SERIAL NOT NULL,
    "FK_orden_compra" INTEGER NOT NULL,
    "FK_articulo" INTEGER NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "precio_unitario" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "DETALLEORDENCOMPRA_pkey" PRIMARY KEY ("id_detalle_orden_compra")
);

-- CreateTable
CREATE TABLE "TIPOCOMPROBANTE" (
    "id_tipo_comprobante" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "efecto_saldo" "EfectoSaldo" NOT NULL,
    "requiere_comprobante_origen" BOOLEAN NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "TIPOCOMPROBANTE_pkey" PRIMARY KEY ("id_tipo_comprobante")
);

-- CreateTable
CREATE TABLE "FORMAPAGO" (
    "id_forma_pago" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "requiere_referencia" BOOLEAN NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "FORMAPAGO_pkey" PRIMARY KEY ("id_forma_pago")
);

-- CreateTable
CREATE TABLE "COMPROBANTEPROVEEDOR" (
    "id_comprobante_proveedor" SERIAL NOT NULL,
    "letra" VARCHAR(1) NOT NULL,
    "punto_de_venta" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "importe_neto" DECIMAL(14,2) NOT NULL,
    "alicuota_iva" DECIMAL(5,2) NOT NULL,
    "importe_iva" DECIMAL(14,2) NOT NULL,
    "importe_total" DECIMAL(14,2) NOT NULL,
    "saldo_pendiente" DECIMAL(14,2),
    "estado" "EstadoComprobante" NOT NULL DEFAULT 'BORRADOR',
    "estado_saldo" "EstadoSaldo",
    "observaciones" TEXT,
    "motivo_anulacion" TEXT,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_proveedor" INTEGER NOT NULL,
    "FK_tipo_comprobante" INTEGER NOT NULL,
    "FK_orden_compra" INTEGER,
    "FK_comprobante_origen" INTEGER,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "COMPROBANTEPROVEEDOR_pkey" PRIMARY KEY ("id_comprobante_proveedor")
);

-- CreateTable
CREATE TABLE "DETALLECOMPROBANTE" (
    "id_detalle_comprobante" SERIAL NOT NULL,
    "FK_comprobante_proveedor" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "FK_articulo" INTEGER,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "precio_unitario" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "DETALLECOMPROBANTE_pkey" PRIMARY KEY ("id_detalle_comprobante")
);

-- CreateTable
CREATE TABLE "ORDENPAGO" (
    "id_orden_pago" SERIAL NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL,
    "numero_referencia" TEXT,
    "importe_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "estado" "EstadoOrdenPago" NOT NULL DEFAULT 'BORRADOR',
    "motivo_anulacion" TEXT,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_proveedor" INTEGER NOT NULL,
    "FK_forma_pago" INTEGER NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "ORDENPAGO_pkey" PRIMARY KEY ("id_orden_pago")
);

-- CreateTable
CREATE TABLE "DETALLEORDENPAGO" (
    "id_detalle_orden_pago" SERIAL NOT NULL,
    "FK_orden_pago" INTEGER NOT NULL,
    "FK_comprobante_proveedor" INTEGER NOT NULL,
    "importe_imputado" DECIMAL(14,2) NOT NULL,
    "saldo_anterior" DECIMAL(14,2) NOT NULL,
    "saldo_posterior" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "DETALLEORDENPAGO_pkey" PRIMARY KEY ("id_detalle_orden_pago")
);

-- CreateIndex
CREATE UNIQUE INDEX "PROVEEDOR_cuit_key" ON "PROVEEDOR"("cuit");

-- CreateIndex
CREATE INDEX "PROVEEDOR_estado_idx" ON "PROVEEDOR"("estado");

-- CreateIndex
CREATE INDEX "ORDENCOMPRA_FK_proveedor_idx" ON "ORDENCOMPRA"("FK_proveedor");

-- CreateIndex
CREATE INDEX "ORDENCOMPRA_estado_idx" ON "ORDENCOMPRA"("estado");

-- CreateIndex
CREATE INDEX "ORDENCOMPRA_fecha_emision_idx" ON "ORDENCOMPRA"("fecha_emision");

-- CreateIndex
CREATE UNIQUE INDEX "DETALLEORDENCOMPRA_FK_orden_compra_FK_articulo_key" ON "DETALLEORDENCOMPRA"("FK_orden_compra", "FK_articulo");

-- CreateIndex
CREATE INDEX "TIPOCOMPROBANTE_estado_idx" ON "TIPOCOMPROBANTE"("estado");

-- CreateIndex
CREATE INDEX "FORMAPAGO_estado_idx" ON "FORMAPAGO"("estado");

-- CreateIndex
CREATE INDEX "COMPROBANTEPROVEEDOR_FK_proveedor_FK_tipo_comprobante_letra_idx" ON "COMPROBANTEPROVEEDOR"("FK_proveedor", "FK_tipo_comprobante", "letra", "punto_de_venta", "numero");

-- CreateIndex
CREATE INDEX "COMPROBANTEPROVEEDOR_FK_proveedor_idx" ON "COMPROBANTEPROVEEDOR"("FK_proveedor");

-- CreateIndex
CREATE INDEX "COMPROBANTEPROVEEDOR_estado_idx" ON "COMPROBANTEPROVEEDOR"("estado");

-- CreateIndex
CREATE INDEX "COMPROBANTEPROVEEDOR_estado_saldo_idx" ON "COMPROBANTEPROVEEDOR"("estado_saldo");

-- CreateIndex
CREATE INDEX "COMPROBANTEPROVEEDOR_fecha_emision_idx" ON "COMPROBANTEPROVEEDOR"("fecha_emision");

-- CreateIndex
CREATE INDEX "COMPROBANTEPROVEEDOR_fecha_vencimiento_idx" ON "COMPROBANTEPROVEEDOR"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "ORDENPAGO_FK_proveedor_idx" ON "ORDENPAGO"("FK_proveedor");

-- CreateIndex
CREATE INDEX "ORDENPAGO_FK_forma_pago_idx" ON "ORDENPAGO"("FK_forma_pago");

-- CreateIndex
CREATE INDEX "ORDENPAGO_estado_idx" ON "ORDENPAGO"("estado");

-- CreateIndex
CREATE INDEX "ORDENPAGO_fecha_pago_idx" ON "ORDENPAGO"("fecha_pago");

-- CreateIndex
CREATE UNIQUE INDEX "DETALLEORDENPAGO_FK_orden_pago_FK_comprobante_proveedor_key" ON "DETALLEORDENPAGO"("FK_orden_pago", "FK_comprobante_proveedor");

-- AddForeignKey
ALTER TABLE "PROVEEDOR" ADD CONSTRAINT "PROVEEDOR_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PROVEEDOR" ADD CONSTRAINT "PROVEEDOR_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENCOMPRA" ADD CONSTRAINT "ORDENCOMPRA_FK_proveedor_fkey" FOREIGN KEY ("FK_proveedor") REFERENCES "PROVEEDOR"("id_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENCOMPRA" ADD CONSTRAINT "ORDENCOMPRA_FK_deposito_fkey" FOREIGN KEY ("FK_deposito") REFERENCES "DEPOSITO"("id_deposito") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENCOMPRA" ADD CONSTRAINT "ORDENCOMPRA_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENCOMPRA" ADD CONSTRAINT "ORDENCOMPRA_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLEORDENCOMPRA" ADD CONSTRAINT "DETALLEORDENCOMPRA_FK_orden_compra_fkey" FOREIGN KEY ("FK_orden_compra") REFERENCES "ORDENCOMPRA"("id_orden_compra") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLEORDENCOMPRA" ADD CONSTRAINT "DETALLEORDENCOMPRA_FK_articulo_fkey" FOREIGN KEY ("FK_articulo") REFERENCES "ARTICULO"("id_articulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TIPOCOMPROBANTE" ADD CONSTRAINT "TIPOCOMPROBANTE_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TIPOCOMPROBANTE" ADD CONSTRAINT "TIPOCOMPROBANTE_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FORMAPAGO" ADD CONSTRAINT "FORMAPAGO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FORMAPAGO" ADD CONSTRAINT "FORMAPAGO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COMPROBANTEPROVEEDOR" ADD CONSTRAINT "COMPROBANTEPROVEEDOR_FK_proveedor_fkey" FOREIGN KEY ("FK_proveedor") REFERENCES "PROVEEDOR"("id_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COMPROBANTEPROVEEDOR" ADD CONSTRAINT "COMPROBANTEPROVEEDOR_FK_tipo_comprobante_fkey" FOREIGN KEY ("FK_tipo_comprobante") REFERENCES "TIPOCOMPROBANTE"("id_tipo_comprobante") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COMPROBANTEPROVEEDOR" ADD CONSTRAINT "COMPROBANTEPROVEEDOR_FK_orden_compra_fkey" FOREIGN KEY ("FK_orden_compra") REFERENCES "ORDENCOMPRA"("id_orden_compra") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COMPROBANTEPROVEEDOR" ADD CONSTRAINT "COMPROBANTEPROVEEDOR_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COMPROBANTEPROVEEDOR" ADD CONSTRAINT "COMPROBANTEPROVEEDOR_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COMPROBANTEPROVEEDOR" ADD CONSTRAINT "COMPROBANTEPROVEEDOR_FK_comprobante_origen_fkey" FOREIGN KEY ("FK_comprobante_origen") REFERENCES "COMPROBANTEPROVEEDOR"("id_comprobante_proveedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLECOMPROBANTE" ADD CONSTRAINT "DETALLECOMPROBANTE_FK_comprobante_proveedor_fkey" FOREIGN KEY ("FK_comprobante_proveedor") REFERENCES "COMPROBANTEPROVEEDOR"("id_comprobante_proveedor") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLECOMPROBANTE" ADD CONSTRAINT "DETALLECOMPROBANTE_FK_articulo_fkey" FOREIGN KEY ("FK_articulo") REFERENCES "ARTICULO"("id_articulo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENPAGO" ADD CONSTRAINT "ORDENPAGO_FK_proveedor_fkey" FOREIGN KEY ("FK_proveedor") REFERENCES "PROVEEDOR"("id_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENPAGO" ADD CONSTRAINT "ORDENPAGO_FK_forma_pago_fkey" FOREIGN KEY ("FK_forma_pago") REFERENCES "FORMAPAGO"("id_forma_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENPAGO" ADD CONSTRAINT "ORDENPAGO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENPAGO" ADD CONSTRAINT "ORDENPAGO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLEORDENPAGO" ADD CONSTRAINT "DETALLEORDENPAGO_FK_orden_pago_fkey" FOREIGN KEY ("FK_orden_pago") REFERENCES "ORDENPAGO"("id_orden_pago") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLEORDENPAGO" ADD CONSTRAINT "DETALLEORDENPAGO_FK_comprobante_proveedor_fkey" FOREIGN KEY ("FK_comprobante_proveedor") REFERENCES "COMPROBANTEPROVEEDOR"("id_comprobante_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;
