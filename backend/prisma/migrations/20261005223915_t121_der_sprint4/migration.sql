/*
  Warnings:

  - You are about to drop the column `FK_publicacion` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `FK_usuario_actualizador` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `anticipo_porcentaje` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `hora_actualizacion` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `margen` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `periodicidad` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `porcentaje_ganancia` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `precio` on the `PLANPAGO` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `PLANPAGO` table. All the data in the column will be lost.
  - The `estado` column on the `PROYECTO` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `FK_plan_pago` on the `VENTA` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_adhesion` on the `VENTA` table. All the data in the column will be lost.
  - The `tipo_plan_congelado` column on the `VENTA` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[FK_plan_pago,numero]` on the table `CUOTA` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[FK_venta]` on the table `PLANPAGO` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `FK_plan_pago` to the `CUOTA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importe_capital` to the `CUOTA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importe_interes` to the `CUOTA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saldo_capital` to the `CUOTA` table without a default value. This is not possible if the table is not empty.
  - Added the required column `FK_venta` to the `PLANPAGO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modalidad` to the `PLANPAGO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precio_venta` to the `PLANPAGO` table without a default value. This is not possible if the table is not empty.
  - Made the column `anticipo_monto` on table `PLANPAGO` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cantidad_unidades_planificadas` on table `PROYECTO` required. This step will fail if there are existing NULL values in that column.
  - Made the column `direccion` on table `PROYECTO` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `FK_usuario_actualizador` to the `VENTA` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ModalidadPago" AS ENUM ('CONTADO', 'FINANCIADO');

-- CreateEnum
CREATE TYPE "TipoImagenProyecto" AS ENUM ('RENDER', 'PLANO');

-- DropForeignKey
ALTER TABLE "PLANPAGO" DROP CONSTRAINT "PLANPAGO_FK_publicacion_fkey";

-- DropForeignKey
ALTER TABLE "PLANPAGO" DROP CONSTRAINT "PLANPAGO_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "VENTA" DROP CONSTRAINT "VENTA_FK_plan_pago_fkey";

-- DropIndex
DROP INDEX "PLANPAGO_FK_publicacion_idx";

-- DropIndex
DROP INDEX "PLANPAGO_estado_idx";

-- DropIndex
DROP INDEX "VENTA_FK_plan_pago_idx";

-- AlterTable
ALTER TABLE "CLIENTE" ADD COLUMN     "FK_usuario_actualizador" INTEGER;

-- AlterTable
ALTER TABLE "CUOTA" ADD COLUMN     "FK_plan_pago" INTEGER NOT NULL,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "importe_capital" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "importe_interes" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "saldo_capital" DECIMAL(14,2) NOT NULL;

-- AlterTable
ALTER TABLE "DECLARACIONPAGO" ADD COLUMN     "comprobante_nombre_archivo" TEXT,
ADD COLUMN     "comprobante_ruta" TEXT,
ADD COLUMN     "comprobante_tipo" TEXT;

-- AlterTable
ALTER TABLE "PLANPAGO" DROP COLUMN "FK_publicacion",
DROP COLUMN "FK_usuario_actualizador",
DROP COLUMN "anticipo_porcentaje",
DROP COLUMN "estado",
DROP COLUMN "hora_actualizacion",
DROP COLUMN "margen",
DROP COLUMN "nombre",
DROP COLUMN "periodicidad",
DROP COLUMN "porcentaje_ganancia",
DROP COLUMN "precio",
DROP COLUMN "tipo",
ADD COLUMN     "FK_plazo_financiacion" INTEGER,
ADD COLUMN     "FK_venta" INTEGER NOT NULL,
ADD COLUMN     "modalidad" "ModalidadPago" NOT NULL,
ADD COLUMN     "precio_venta" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "tasa_nominal_anual" DECIMAL(5,2),
ADD COLUMN     "valor_cuota" DECIMAL(14,2),
ALTER COLUMN "anticipo_monto" SET NOT NULL;

-- AlterTable
ALTER TABLE "PROYECTO" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "estado_obra" "EstadoProyecto" NOT NULL DEFAULT 'EN_PLANIFICACION',
ADD COLUMN     "fecha_inicio" TIMESTAMP(3),
ALTER COLUMN "cantidad_unidades_planificadas" SET NOT NULL,
ALTER COLUMN "direccion" SET NOT NULL,
DROP COLUMN "estado",
ADD COLUMN     "estado" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PUBLICACIONUNIDAD" ADD COLUMN     "margen" DECIMAL(14,2),
ADD COLUMN     "porcentaje_ganancia" DECIMAL(5,2),
ADD COLUMN     "precio_lista" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "VENTA" DROP COLUMN "FK_plan_pago",
DROP COLUMN "fecha_adhesion",
ADD COLUMN     "FK_plan_ejemplo" INTEGER,
ADD COLUMN     "FK_usuario_actualizador" INTEGER NOT NULL,
ADD COLUMN     "fecha_venta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "precio_congelado" DROP NOT NULL,
ALTER COLUMN "anticipo_congelado" DROP NOT NULL,
DROP COLUMN "tipo_plan_congelado",
ADD COLUMN     "tipo_plan_congelado" "ModalidadPago",
ALTER COLUMN "cantidad_cuotas_congelada" DROP NOT NULL;

-- DropEnum
DROP TYPE "TipoPlanPago";

-- CreateTable
CREATE TABLE "IMAGENPROYECTO" (
    "id_imagen_proyecto" SERIAL NOT NULL,
    "FK_proyecto" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" "TipoImagenProyecto" NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IMAGENPROYECTO_pkey" PRIMARY KEY ("id_imagen_proyecto")
);

-- CreateTable
CREATE TABLE "PLAZOFINANCIACION" (
    "id_plazo_financiacion" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "cantidad_cuotas" INTEGER NOT NULL,
    "tasa_nominal_anual" DECIMAL(5,2) NOT NULL,
    "descripcion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "PLAZOFINANCIACION_pkey" PRIMARY KEY ("id_plazo_financiacion")
);

-- CreateTable
CREATE TABLE "PLANEJEMPLO" (
    "id_plan_ejemplo" SERIAL NOT NULL,
    "FK_publicacion" INTEGER NOT NULL,
    "FK_plazo_financiacion" INTEGER,
    "nombre" TEXT NOT NULL,
    "anticipo_porcentaje" DECIMAL(5,2),
    "tipo" "ModalidadPago",
    "precio" DECIMAL(14,2),
    "porcentaje_ganancia" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "margen" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "anticipo_monto" DECIMAL(14,2),
    "cantidad_cuotas" INTEGER,
    "periodicidad" "Periodicidad",
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "PLANEJEMPLO_pkey" PRIMARY KEY ("id_plan_ejemplo")
);

-- CreateIndex
CREATE INDEX "IMAGENPROYECTO_FK_proyecto_idx" ON "IMAGENPROYECTO"("FK_proyecto");

-- CreateIndex
CREATE UNIQUE INDEX "PLAZOFINANCIACION_codigo_key" ON "PLAZOFINANCIACION"("codigo");

-- CreateIndex
CREATE INDEX "PLAZOFINANCIACION_estado_idx" ON "PLAZOFINANCIACION"("estado");

-- CreateIndex
CREATE INDEX "PLANEJEMPLO_FK_publicacion_idx" ON "PLANEJEMPLO"("FK_publicacion");

-- CreateIndex
CREATE INDEX "PLANEJEMPLO_FK_plazo_financiacion_idx" ON "PLANEJEMPLO"("FK_plazo_financiacion");

-- CreateIndex
CREATE INDEX "PLANEJEMPLO_estado_idx" ON "PLANEJEMPLO"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "CUOTA_FK_plan_pago_numero_key" ON "CUOTA"("FK_plan_pago", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "PLANPAGO_FK_venta_key" ON "PLANPAGO"("FK_venta");

-- CreateIndex
CREATE INDEX "PLANPAGO_FK_plazo_financiacion_idx" ON "PLANPAGO"("FK_plazo_financiacion");

-- CreateIndex
CREATE INDEX "PROYECTO_estado_obra_idx" ON "PROYECTO"("estado_obra");

-- CreateIndex
CREATE INDEX "PROYECTO_estado_idx" ON "PROYECTO"("estado");

-- CreateIndex
CREATE INDEX "VENTA_FK_plan_ejemplo_idx" ON "VENTA"("FK_plan_ejemplo");

-- AddForeignKey
ALTER TABLE "IMAGENPROYECTO" ADD CONSTRAINT "IMAGENPROYECTO_FK_proyecto_fkey" FOREIGN KEY ("FK_proyecto") REFERENCES "PROYECTO"("id_proyecto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLAZOFINANCIACION" ADD CONSTRAINT "PLAZOFINANCIACION_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLAZOFINANCIACION" ADD CONSTRAINT "PLAZOFINANCIACION_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANEJEMPLO" ADD CONSTRAINT "PLANEJEMPLO_FK_publicacion_fkey" FOREIGN KEY ("FK_publicacion") REFERENCES "PUBLICACIONUNIDAD"("id_publicacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANEJEMPLO" ADD CONSTRAINT "PLANEJEMPLO_FK_plazo_financiacion_fkey" FOREIGN KEY ("FK_plazo_financiacion") REFERENCES "PLAZOFINANCIACION"("id_plazo_financiacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANEJEMPLO" ADD CONSTRAINT "PLANEJEMPLO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANEJEMPLO" ADD CONSTRAINT "PLANEJEMPLO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VENTA" ADD CONSTRAINT "VENTA_FK_plan_ejemplo_fkey" FOREIGN KEY ("FK_plan_ejemplo") REFERENCES "PLANEJEMPLO"("id_plan_ejemplo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VENTA" ADD CONSTRAINT "VENTA_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANPAGO" ADD CONSTRAINT "PLANPAGO_FK_venta_fkey" FOREIGN KEY ("FK_venta") REFERENCES "VENTA"("id_venta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANPAGO" ADD CONSTRAINT "PLANPAGO_FK_plazo_financiacion_fkey" FOREIGN KEY ("FK_plazo_financiacion") REFERENCES "PLAZOFINANCIACION"("id_plazo_financiacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CUOTA" ADD CONSTRAINT "CUOTA_FK_plan_pago_fkey" FOREIGN KEY ("FK_plan_pago") REFERENCES "PLANPAGO"("id_plan_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CLIENTE" ADD CONSTRAINT "CLIENTE_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
