/*
  Warnings:

  - You are about to drop the `PLANPAGOHISTORIAL` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `FK_usuario_creador` to the `VENTA` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PLANPAGOHISTORIAL" DROP CONSTRAINT "PLANPAGOHISTORIAL_FK_plan_pago_fkey";

-- DropForeignKey
ALTER TABLE "PLANPAGOHISTORIAL" DROP CONSTRAINT "PLANPAGOHISTORIAL_FK_usuario_fkey";

-- AlterTable
ALTER TABLE "CLIENTE" ALTER COLUMN "google_sub" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VENTA" ADD COLUMN     "FK_usuario_creador" INTEGER NOT NULL;

-- DropTable
DROP TABLE "PLANPAGOHISTORIAL";

-- AddForeignKey
ALTER TABLE "VENTA" ADD CONSTRAINT "VENTA_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
