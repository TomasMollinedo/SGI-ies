/*
  Warnings:

  - You are about to drop the `Rol` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Usuario` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ARTICULO" DROP CONSTRAINT "ARTICULO_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "ARTICULO" DROP CONSTRAINT "ARTICULO_FK_usuario_creador_fkey";

-- DropForeignKey
ALTER TABLE "CATEGORIA" DROP CONSTRAINT "CATEGORIA_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "CATEGORIA" DROP CONSTRAINT "CATEGORIA_FK_usuario_creador_fkey";

-- DropForeignKey
ALTER TABLE "DEPOSITO" DROP CONSTRAINT "DEPOSITO_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "DEPOSITO" DROP CONSTRAINT "DEPOSITO_FK_usuario_creador_fkey";

-- DropForeignKey
ALTER TABLE "MARCA" DROP CONSTRAINT "MARCA_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "MARCA" DROP CONSTRAINT "MARCA_FK_usuario_creador_fkey";

-- DropForeignKey
ALTER TABLE "MOVIMIENTO" DROP CONSTRAINT "MOVIMIENTO_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "MOVIMIENTO" DROP CONSTRAINT "MOVIMIENTO_FK_usuario_creador_fkey";

-- DropForeignKey
ALTER TABLE "TIPOMOVIMIENTO" DROP CONSTRAINT "TIPOMOVIMIENTO_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "TIPOMOVIMIENTO" DROP CONSTRAINT "TIPOMOVIMIENTO_FK_usuario_creador_fkey";

-- DropForeignKey
ALTER TABLE "UNIDADMEDIDA" DROP CONSTRAINT "UNIDADMEDIDA_FK_usuario_actualizador_fkey";

-- DropForeignKey
ALTER TABLE "UNIDADMEDIDA" DROP CONSTRAINT "UNIDADMEDIDA_FK_usuario_creador_fkey";

-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_FK_rol_fkey";

-- DropTable
DROP TABLE "Rol";

-- DropTable
DROP TABLE "Usuario";

-- CreateTable
CREATE TABLE "USUARIO" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "FK_rol" INTEGER NOT NULL,

    CONSTRAINT "USUARIO_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "ROL" (
    "id_rol" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ROL_pkey" PRIMARY KEY ("id_rol")
);

-- CreateIndex
CREATE UNIQUE INDEX "USUARIO_email_key" ON "USUARIO"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ROL_nombre_key" ON "ROL"("nombre");

-- AddForeignKey
ALTER TABLE "USUARIO" ADD CONSTRAINT "USUARIO_FK_rol_fkey" FOREIGN KEY ("FK_rol") REFERENCES "ROL"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TIPOMOVIMIENTO" ADD CONSTRAINT "TIPOMOVIMIENTO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TIPOMOVIMIENTO" ADD CONSTRAINT "TIPOMOVIMIENTO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOVIMIENTO" ADD CONSTRAINT "MOVIMIENTO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOVIMIENTO" ADD CONSTRAINT "MOVIMIENTO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARTICULO" ADD CONSTRAINT "ARTICULO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARTICULO" ADD CONSTRAINT "ARTICULO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CATEGORIA" ADD CONSTRAINT "CATEGORIA_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CATEGORIA" ADD CONSTRAINT "CATEGORIA_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MARCA" ADD CONSTRAINT "MARCA_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MARCA" ADD CONSTRAINT "MARCA_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIDADMEDIDA" ADD CONSTRAINT "UNIDADMEDIDA_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIDADMEDIDA" ADD CONSTRAINT "UNIDADMEDIDA_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DEPOSITO" ADD CONSTRAINT "DEPOSITO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DEPOSITO" ADD CONSTRAINT "DEPOSITO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
