/*
  Warnings:

  - You are about to drop the column `estado_saldo` on the `COMPROBANTEPROVEEDOR` table. All the data in the column will be lost.
  - You are about to drop the column `efecto_saldo` on the `TIPOCOMPROBANTE` table. All the data in the column will be lost.
  - Added the required column `aumenta_saldo` to the `TIPOCOMPROBANTE` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "COMPROBANTEPROVEEDOR_estado_saldo_idx";

-- AlterTable
ALTER TABLE "COMPROBANTEPROVEEDOR" DROP COLUMN "estado_saldo",
ADD COLUMN     "saldo_cancelado" BOOLEAN;

-- AlterTable
ALTER TABLE "TIPOCOMPROBANTE" DROP COLUMN "efecto_saldo",
ADD COLUMN     "aumenta_saldo" BOOLEAN NOT NULL;

-- DropEnum
DROP TYPE "EfectoSaldo";

-- DropEnum
DROP TYPE "EstadoSaldo";

-- CreateIndex
CREATE INDEX "COMPROBANTEPROVEEDOR_saldo_cancelado_idx" ON "COMPROBANTEPROVEEDOR"("saldo_cancelado");
