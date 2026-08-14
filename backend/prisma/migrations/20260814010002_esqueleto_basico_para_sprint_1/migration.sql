-- CreateTable
CREATE TABLE "TIPOMOVIMIENTO" (
    "id_tipo_movimiento" SERIAL NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "TIPOMOVIMIENTO_pkey" PRIMARY KEY ("id_tipo_movimiento")
);

-- CreateTable
CREATE TABLE "MOVIMIENTO" (
    "id_movimiento" SERIAL NOT NULL,
    "FK_TipoMovimiento" INTEGER NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "MOVIMIENTO_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "STOCKMOVIMIENTO" (
    "id_stock_movimiento" SERIAL NOT NULL,
    "FK_Movimiento" INTEGER NOT NULL,
    "FK_Stock" INTEGER NOT NULL,

    CONSTRAINT "STOCKMOVIMIENTO_pkey" PRIMARY KEY ("id_stock_movimiento")
);

-- CreateTable
CREATE TABLE "STOCK" (
    "id_stock" SERIAL NOT NULL,
    "FK_deposito" INTEGER NOT NULL,
    "FK_articulo" INTEGER NOT NULL,

    CONSTRAINT "STOCK_pkey" PRIMARY KEY ("id_stock")
);

-- CreateTable
CREATE TABLE "ARTICULO" (
    "id_articulo" SERIAL NOT NULL,
    "FK_Categoria" INTEGER NOT NULL,
    "FK_Marca" INTEGER NOT NULL,
    "FK_UnidadMedida" INTEGER NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "ARTICULO_pkey" PRIMARY KEY ("id_articulo")
);

-- CreateTable
CREATE TABLE "CATEGORIA" (
    "id_categoria" SERIAL NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "CATEGORIA_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "MARCA" (
    "id_marca" SERIAL NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "MARCA_pkey" PRIMARY KEY ("id_marca")
);

-- CreateTable
CREATE TABLE "UNIDADMEDIDA" (
    "id_unidad_medida" SERIAL NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "UNIDADMEDIDA_pkey" PRIMARY KEY ("id_unidad_medida")
);

-- CreateTable
CREATE TABLE "DEPOSITO" (
    "id_deposito" SERIAL NOT NULL,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "DEPOSITO_pkey" PRIMARY KEY ("id_deposito")
);

-- AddForeignKey
ALTER TABLE "TIPOMOVIMIENTO" ADD CONSTRAINT "TIPOMOVIMIENTO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TIPOMOVIMIENTO" ADD CONSTRAINT "TIPOMOVIMIENTO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOVIMIENTO" ADD CONSTRAINT "MOVIMIENTO_FK_TipoMovimiento_fkey" FOREIGN KEY ("FK_TipoMovimiento") REFERENCES "TIPOMOVIMIENTO"("id_tipo_movimiento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOVIMIENTO" ADD CONSTRAINT "MOVIMIENTO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MOVIMIENTO" ADD CONSTRAINT "MOVIMIENTO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STOCKMOVIMIENTO" ADD CONSTRAINT "STOCKMOVIMIENTO_FK_Movimiento_fkey" FOREIGN KEY ("FK_Movimiento") REFERENCES "MOVIMIENTO"("id_movimiento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STOCKMOVIMIENTO" ADD CONSTRAINT "STOCKMOVIMIENTO_FK_Stock_fkey" FOREIGN KEY ("FK_Stock") REFERENCES "STOCK"("id_stock") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STOCK" ADD CONSTRAINT "STOCK_FK_deposito_fkey" FOREIGN KEY ("FK_deposito") REFERENCES "DEPOSITO"("id_deposito") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "STOCK" ADD CONSTRAINT "STOCK_FK_articulo_fkey" FOREIGN KEY ("FK_articulo") REFERENCES "ARTICULO"("id_articulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARTICULO" ADD CONSTRAINT "ARTICULO_FK_Categoria_fkey" FOREIGN KEY ("FK_Categoria") REFERENCES "CATEGORIA"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARTICULO" ADD CONSTRAINT "ARTICULO_FK_Marca_fkey" FOREIGN KEY ("FK_Marca") REFERENCES "MARCA"("id_marca") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARTICULO" ADD CONSTRAINT "ARTICULO_FK_UnidadMedida_fkey" FOREIGN KEY ("FK_UnidadMedida") REFERENCES "UNIDADMEDIDA"("id_unidad_medida") ON DELETE RESTRICT ON UPDATE CASCADE;

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
