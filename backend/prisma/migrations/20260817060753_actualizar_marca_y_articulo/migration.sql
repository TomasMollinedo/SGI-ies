-- DropIndex
DROP INDEX "MARCA_nombre_key";

-- AlterTable
ALTER TABLE "ARTICULO" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;
