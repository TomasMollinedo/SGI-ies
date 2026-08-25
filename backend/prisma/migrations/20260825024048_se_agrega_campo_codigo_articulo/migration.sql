/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `ARTICULO` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codigo` to the `ARTICULO` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ARTICULO" ADD COLUMN     "codigo" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ARTICULO_codigo_key" ON "ARTICULO"("codigo");
