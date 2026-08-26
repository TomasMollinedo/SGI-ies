/*
  Warnings:

  - You are about to drop the column `activo` on the `ARTICULO` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "UNIDADMEDIDA_abreviatura_key";

-- DropIndex
DROP INDEX "UNIDADMEDIDA_nombre_key";

-- AlterTable
ALTER TABLE "ARTICULO" DROP COLUMN "activo",
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true;
