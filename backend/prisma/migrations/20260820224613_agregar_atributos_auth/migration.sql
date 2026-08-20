/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `USUARIO` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `FK_rol` to the `USUARIO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `USUARIO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `USUARIO` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "USUARIO" ADD COLUMN     "FK_rol" INTEGER NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "refreshTokenHash" TEXT;

-- CreateTable
CREATE TABLE "ROL" (
    "id_rol" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ROL_pkey" PRIMARY KEY ("id_rol")
);

-- CreateIndex
CREATE UNIQUE INDEX "ROL_nombre_key" ON "ROL"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "USUARIO_email_key" ON "USUARIO"("email");

-- AddForeignKey
ALTER TABLE "USUARIO" ADD CONSTRAINT "USUARIO_FK_rol_fkey" FOREIGN KEY ("FK_rol") REFERENCES "ROL"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;
