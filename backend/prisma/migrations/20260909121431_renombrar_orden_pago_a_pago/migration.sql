/*
  Warnings:

  - You are about to drop the `DETALLEORDENPAGO` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ORDENPAGO` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('BORRADOR', 'CONFIRMADA', 'ANULADA');

-- DropForeignKey
ALTER TABLE "DETALLEORDENPAGO" DROP CONSTRAINT "DETALLEORDENPAGO_FK_comprobante_proveedor_fkey";

-- DropForeignKey
ALTER TABLE "DETALLEORDENPAGO" DROP CONSTRAINT "DETALLEORDENPAGO_FK_orden_pago_fkey";

-- DropForeignKey
ALTER TABLE "ORDENPAGO" DROP CONSTRAINT "ORDENPAGO_FK_forma_pago_fkey";

-- DropForeignKey
ALTER TABLE "ORDENPAGO" DROP CONSTRAINT "ORDENPAGO_FK_proveedor_fkey";

-- DropForeignKey
ALTER TABLE "ORDENPAGO" DROP CONSTRAINT "ORDENPAGO_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "ORDENPAGO" DROP CONSTRAINT "ORDENPAGO_FK_usuario_creador_fkey";

-- DropTable
DROP TABLE "DETALLEORDENPAGO";

-- DropTable
DROP TABLE "ORDENPAGO";

-- DropEnum
DROP TYPE "EstadoOrdenPago";

-- CreateTable
CREATE TABLE "PAGO" (
    "id_pago" SERIAL NOT NULL,
    "fecha_pago" TIMESTAMP(3) NOT NULL,
    "numero_referencia" TEXT,
    "importe_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'BORRADOR',
    "motivo_anulacion" TEXT,
    "banco_utilizado" TEXT,
    "titular_utilizado" TEXT,
    "cbu_utilizado" TEXT,
    "alias_utilizado" TEXT,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_proveedor" INTEGER NOT NULL,
    "FK_forma_pago" INTEGER NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "PAGO_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "DETALLEPAGO" (
    "id_detalle_pago" SERIAL NOT NULL,
    "FK_pago" INTEGER NOT NULL,
    "FK_comprobante_proveedor" INTEGER NOT NULL,
    "importe_imputado" DECIMAL(14,2) NOT NULL,
    "saldo_anterior" DECIMAL(14,2) NOT NULL,
    "saldo_posterior" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "DETALLEPAGO_pkey" PRIMARY KEY ("id_detalle_pago")
);

-- CreateIndex
CREATE INDEX "PAGO_FK_proveedor_idx" ON "PAGO"("FK_proveedor");

-- CreateIndex
CREATE INDEX "PAGO_FK_forma_pago_idx" ON "PAGO"("FK_forma_pago");

-- CreateIndex
CREATE INDEX "PAGO_estado_idx" ON "PAGO"("estado");

-- CreateIndex
CREATE INDEX "PAGO_fecha_pago_idx" ON "PAGO"("fecha_pago");

-- CreateIndex
CREATE UNIQUE INDEX "DETALLEPAGO_FK_pago_FK_comprobante_proveedor_key" ON "DETALLEPAGO"("FK_pago", "FK_comprobante_proveedor");

-- AddForeignKey
ALTER TABLE "PAGO" ADD CONSTRAINT "PAGO_FK_proveedor_fkey" FOREIGN KEY ("FK_proveedor") REFERENCES "PROVEEDOR"("id_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGO" ADD CONSTRAINT "PAGO_FK_forma_pago_fkey" FOREIGN KEY ("FK_forma_pago") REFERENCES "FORMAPAGO"("id_forma_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGO" ADD CONSTRAINT "PAGO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PAGO" ADD CONSTRAINT "PAGO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLEPAGO" ADD CONSTRAINT "DETALLEPAGO_FK_pago_fkey" FOREIGN KEY ("FK_pago") REFERENCES "PAGO"("id_pago") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLEPAGO" ADD CONSTRAINT "DETALLEPAGO_FK_comprobante_proveedor_fkey" FOREIGN KEY ("FK_comprobante_proveedor") REFERENCES "COMPROBANTEPROVEEDOR"("id_comprobante_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;
