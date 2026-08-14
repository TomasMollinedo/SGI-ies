-- CreateTable
CREATE TABLE "USUARIO" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,

    CONSTRAINT "USUARIO_pkey" PRIMARY KEY ("id_usuario")
);
