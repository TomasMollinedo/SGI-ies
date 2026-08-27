/*
  Warnings:

  - Added the required column `clave_deduplicacion` to the `ALERTA` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ALERTA" ADD COLUMN     "clave_deduplicacion" TEXT NOT NULL;
