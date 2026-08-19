/*
  Warnings:

  - You are about to drop the `USUARIO` table. If the table is not empty, all the data it contains will be lost.

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

-- DropTable
DROP TABLE "USUARIO";

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "FK_rol" INTEGER NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id_rol" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id_rol")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_FK_rol_fkey" FOREIGN KEY ("FK_rol") REFERENCES "Rol"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TIPOMOVIMIENTO" ADD CONSTRAINT "TIPOMOVIMIENTO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TIPOMOVIMIENTO" ADD CONSTRAINT "TIPOMOVIMIENTO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOVIMIENTO" ADD CONSTRAINT "MOVIMIENTO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOVIMIENTO" ADD CONSTRAINT "MOVIMIENTO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARTICULO" ADD CONSTRAINT "ARTICULO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARTICULO" ADD CONSTRAINT "ARTICULO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CATEGORIA" ADD CONSTRAINT "CATEGORIA_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CATEGORIA" ADD CONSTRAINT "CATEGORIA_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MARCA" ADD CONSTRAINT "MARCA_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MARCA" ADD CONSTRAINT "MARCA_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIDADMEDIDA" ADD CONSTRAINT "UNIDADMEDIDA_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIDADMEDIDA" ADD CONSTRAINT "UNIDADMEDIDA_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DEPOSITO" ADD CONSTRAINT "DEPOSITO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DEPOSITO" ADD CONSTRAINT "DEPOSITO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
