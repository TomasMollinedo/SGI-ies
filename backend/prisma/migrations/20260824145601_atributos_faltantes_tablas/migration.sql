/*
  Warnings:

  - Added the required column `nombre` to the `ARTICULO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `FK_Deposito` to the `MOVIMIENTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `FK_usuario_actualizador` to the `STOCK` table without a default value. This is not possible if the table is not empty.
  - Added the required column `FK_usuario_creador` to the `STOCK` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cantidad` to the `STOCKMOVIMIENTO` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ARTICULO" DROP CONSTRAINT "ARTICULO_FK_Marca_fkey";

-- AlterTable
ALTER TABLE "ARTICULO" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nombre" TEXT NOT NULL,
ALTER COLUMN "FK_Marca" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MOVIMIENTO" ADD COLUMN     "FK_Deposito" INTEGER NOT NULL,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "referencia" TEXT;

-- AlterTable
ALTER TABLE "STOCK" ADD COLUMN     "FK_usuario_actualizador" INTEGER NOT NULL,
ADD COLUMN     "FK_usuario_creador" INTEGER NOT NULL,
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "umbral_minimo" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "STOCKMOVIMIENTO" ADD COLUMN     "cantidad" INTEGER NOT NULL,
ADD COLUMN     "observacion" TEXT;

-- AddForeignKey
ALTER TABLE "MOVIMIENTO" ADD CONSTRAINT "MOVIMIENTO_FK_Deposito_fkey" FOREIGN KEY ("FK_Deposito") REFERENCES "DEPOSITO"("id_deposito") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STOCK" ADD CONSTRAINT "STOCK_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STOCK" ADD CONSTRAINT "STOCK_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARTICULO" ADD CONSTRAINT "ARTICULO_FK_Marca_fkey" FOREIGN KEY ("FK_Marca") REFERENCES "MARCA"("id_marca") ON DELETE SET NULL ON UPDATE CASCADE;
