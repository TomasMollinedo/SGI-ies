/*
  Warnings:

  - You are about to drop the column `codigo` on the `ARTICULO` table. All the data in the column will be lost.
  - Added the required column `fecha_movimiento` to the `MOVIMIENTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stock_anterior` to the `STOCKMOVIMIENTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stock_nuevo` to the `STOCKMOVIMIENTO` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ARTICULO_codigo_key";

-- AlterTable
ALTER TABLE "ARTICULO" DROP COLUMN "codigo";

-- AlterTable
ALTER TABLE "MOVIMIENTO" ADD COLUMN     "fecha_movimiento" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "STOCKMOVIMIENTO" ADD COLUMN     "stock_anterior" INTEGER NOT NULL,
ADD COLUMN     "stock_nuevo" INTEGER NOT NULL;
