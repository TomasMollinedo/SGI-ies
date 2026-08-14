/*
  Warnings:

  - A unique constraint covering the columns `[nombre]` on the table `CATEGORIA` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre]` on the table `DEPOSITO` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre]` on the table `MARCA` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre]` on the table `TIPOMOVIMIENTO` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nombre]` on the table `UNIDADMEDIDA` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[abreviatura]` on the table `UNIDADMEDIDA` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dni]` on the table `USUARIO` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nombre` to the `CATEGORIA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `DEPOSITO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `MARCA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `indicador_entrada` to the `TIPOMOVIMIENTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `TIPOMOVIMIENTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `abreviatura` to the `UNIDADMEDIDA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `UNIDADMEDIDA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dni` to the `USUARIO` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CATEGORIA" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nombre" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DEPOSITO" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "es_obrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nombre" TEXT NOT NULL,
ADD COLUMN     "ubicacion" TEXT;

-- AlterTable
ALTER TABLE "MARCA" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nombre" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TIPOMOVIMIENTO" ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "indicador_entrada" BOOLEAN NOT NULL,
ADD COLUMN     "nombre" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UNIDADMEDIDA" ADD COLUMN     "abreviatura" TEXT NOT NULL,
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nombre" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "USUARIO" ADD COLUMN     "dni" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CATEGORIA_nombre_key" ON "CATEGORIA"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "DEPOSITO_nombre_key" ON "DEPOSITO"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "MARCA_nombre_key" ON "MARCA"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TIPOMOVIMIENTO_nombre_key" ON "TIPOMOVIMIENTO"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "UNIDADMEDIDA_nombre_key" ON "UNIDADMEDIDA"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "UNIDADMEDIDA_abreviatura_key" ON "UNIDADMEDIDA"("abreviatura");

-- CreateIndex
CREATE UNIQUE INDEX "USUARIO_dni_key" ON "USUARIO"("dni");
