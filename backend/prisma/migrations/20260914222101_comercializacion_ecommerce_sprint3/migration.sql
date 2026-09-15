/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `PROYECTO` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `FK_usuario_actualizador` to the `PROYECTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `FK_usuario_creador` to the `PROYECTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigo` to the `PROYECTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localidad` to the `PROYECTO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `PROYECTO` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('EN_PLANIFICACION', 'EN_EJECUCION', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipologiaUnidad" AS ENUM ('MONOAMBIENTE', 'UN_DORMITORIO', 'DOS_DORMITORIOS', 'TRES_DORMITORIOS', 'LOCAL_COMERCIAL', 'COCHERA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoComercial" AS ENUM ('EN_PREPARACION', 'DISPONIBLE', 'EN_PLAN_DE_PAGO', 'VENDIDA');

-- CreateEnum
CREATE TYPE "TipoPlanPago" AS ENUM ('CONTADO', 'FINANCIADO');

-- CreateEnum
CREATE TYPE "Periodicidad" AS ENUM ('MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('VIGENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoConsulta" AS ENUM ('PENDIENTE', 'RESPONDIDA');

-- CreateEnum
CREATE TYPE "EstadoDeclaracionPago" AS ENUM ('PENDIENTE', 'VALIDADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "OrigenCobro" AS ENUM ('PRESENCIAL', 'ECOMMERCE');

-- CreateEnum
CREATE TYPE "EstadoCobro" AS ENUM ('BORRADOR', 'CONFIRMADO', 'ANULADO');

-- AlterTable
ALTER TABLE "FORMAPAGO" ADD COLUMN     "habilitada_autogestion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PROYECTO" ADD COLUMN     "FK_usuario_actualizador" INTEGER NOT NULL,
ADD COLUMN     "FK_usuario_creador" INTEGER NOT NULL,
ADD COLUMN     "cantidad_unidades_planificadas" INTEGER,
ADD COLUMN     "codigo" TEXT NOT NULL,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "estado" "EstadoProyecto" NOT NULL DEFAULT 'EN_PLANIFICACION',
ADD COLUMN     "fecha_fin_estimada" TIMESTAMP(3),
ADD COLUMN     "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "imagen_portada_url" TEXT,
ADD COLUMN     "localidad" TEXT NOT NULL,
ADD COLUMN     "nombre" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "UNIDADFUNCIONAL" (
    "id_unidad_funcional" SERIAL NOT NULL,
    "FK_proyecto" INTEGER NOT NULL,
    "identificador" TEXT NOT NULL,
    "tipologia" "TipologiaUnidad" NOT NULL,
    "superficie_cubierta" DECIMAL(10,2) NOT NULL,
    "superficie_descubierta" DECIMAL(10,2),
    "piso" TEXT,
    "comodidades" TEXT,
    "observaciones" TEXT,
    "costo" DECIMAL(14,2) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "UNIDADFUNCIONAL_pkey" PRIMARY KEY ("id_unidad_funcional")
);

-- CreateTable
CREATE TABLE "IMAGENUNIDAD" (
    "id_imagen_unidad" SERIAL NOT NULL,
    "FK_unidad_funcional" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IMAGENUNIDAD_pkey" PRIMARY KEY ("id_imagen_unidad")
);

-- CreateTable
CREATE TABLE "PUBLICACIONUNIDAD" (
    "id_publicacion" SERIAL NOT NULL,
    "FK_unidad_funcional" INTEGER NOT NULL,
    "estado_comercial" "EstadoComercial" NOT NULL DEFAULT 'EN_PREPARACION',
    "fecha_publicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "fecha_despublicacion" TIMESTAMP(3),
    "motivo_despublicacion" TEXT,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "PUBLICACIONUNIDAD_pkey" PRIMARY KEY ("id_publicacion")
);

-- CreateTable
CREATE TABLE "PLANPAGO" (
    "id_plan_pago" SERIAL NOT NULL,
    "FK_publicacion" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoPlanPago" NOT NULL,
    "precio" DECIMAL(14,2) NOT NULL,
    "porcentaje_ganancia" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "margen" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "anticipo_porcentaje" DECIMAL(5,2),
    "anticipo_monto" DECIMAL(14,2),
    "cantidad_cuotas" INTEGER,
    "periodicidad" "Periodicidad",
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "PLANPAGO_pkey" PRIMARY KEY ("id_plan_pago")
);

-- CreateTable
CREATE TABLE "PLANPAGOHISTORIAL" (
    "id_historial" SERIAL NOT NULL,
    "FK_plan_pago" INTEGER NOT NULL,
    "precio_anterior" DECIMAL(14,2) NOT NULL,
    "precio_nuevo" DECIMAL(14,2) NOT NULL,
    "porcentaje_ganancia_anterior" DECIMAL(5,2) NOT NULL,
    "porcentaje_ganancia_nuevo" DECIMAL(5,2) NOT NULL,
    "margen_anterior" DECIMAL(14,2) NOT NULL,
    "margen_nuevo" DECIMAL(14,2) NOT NULL,
    "estado_anterior" BOOLEAN NOT NULL,
    "estado_nuevo" BOOLEAN NOT NULL,
    "FK_usuario" INTEGER NOT NULL,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PLANPAGOHISTORIAL_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "VENTA" (
    "id_venta" SERIAL NOT NULL,
    "FK_cliente" INTEGER NOT NULL,
    "FK_publicacion" INTEGER NOT NULL,
    "FK_plan_pago" INTEGER NOT NULL,
    "fecha_adhesion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precio_congelado" DECIMAL(14,2) NOT NULL,
    "anticipo_congelado" DECIMAL(14,2) NOT NULL,
    "tipo_plan_congelado" "TipoPlanPago" NOT NULL,
    "cantidad_cuotas_congelada" INTEGER NOT NULL,
    "periodicidad_congelada" "Periodicidad",
    "estado" "EstadoVenta" NOT NULL DEFAULT 'VIGENTE',
    "motivo_cancelacion" TEXT,
    "fecha_cancelacion" TIMESTAMP(3),
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VENTA_pkey" PRIMARY KEY ("id_venta")
);

-- CreateTable
CREATE TABLE "CUOTA" (
    "id_cuota" SERIAL NOT NULL,
    "FK_venta" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "importe" DECIMAL(14,2) NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "saldo_pendiente" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "CUOTA_pkey" PRIMARY KEY ("id_cuota")
);

-- CreateTable
CREATE TABLE "CONSULTAUNIDAD" (
    "id_consulta" SERIAL NOT NULL,
    "FK_cliente" INTEGER NOT NULL,
    "FK_publicacion" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "estado" "EstadoConsulta" NOT NULL DEFAULT 'PENDIENTE',
    "respuesta" TEXT,
    "fecha_respuesta" TIMESTAMP(3),
    "FK_usuario_respuesta" INTEGER,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CONSULTAUNIDAD_pkey" PRIMARY KEY ("id_consulta")
);

-- CreateTable
CREATE TABLE "CLIENTE" (
    "id_cliente" SERIAL NOT NULL,
    "google_sub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "dni_cuil" TEXT,
    "telefono" TEXT,
    "refreshTokenHash" TEXT,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CLIENTE_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "COBRO" (
    "id_cobro" SERIAL NOT NULL,
    "fecha_cobro" TIMESTAMP(3) NOT NULL,
    "FK_cliente" INTEGER NOT NULL,
    "FK_forma_pago" INTEGER NOT NULL,
    "numero_referencia" TEXT,
    "importe_total" DECIMAL(14,2) NOT NULL,
    "observaciones" TEXT,
    "origen" "OrigenCobro" NOT NULL,
    "estado" "EstadoCobro" NOT NULL DEFAULT 'BORRADOR',
    "motivo_anulacion" TEXT,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hora_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "FK_usuario_creador" INTEGER NOT NULL,
    "FK_usuario_actualizador" INTEGER NOT NULL,

    CONSTRAINT "COBRO_pkey" PRIMARY KEY ("id_cobro")
);

-- CreateTable
CREATE TABLE "DETALLECOBRO" (
    "id_detalle_cobro" SERIAL NOT NULL,
    "FK_cobro" INTEGER NOT NULL,
    "FK_cuota" INTEGER NOT NULL,
    "importe_imputado" DECIMAL(14,2) NOT NULL,
    "saldo_anterior" DECIMAL(14,2) NOT NULL,
    "saldo_posterior" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "DETALLECOBRO_pkey" PRIMARY KEY ("id_detalle_cobro")
);

-- CreateTable
CREATE TABLE "DECLARACIONPAGO" (
    "id_declaracion_pago" SERIAL NOT NULL,
    "FK_cliente" INTEGER NOT NULL,
    "FK_cuota" INTEGER NOT NULL,
    "FK_forma_pago" INTEGER NOT NULL,
    "importe" DECIMAL(14,2) NOT NULL,
    "numero_referencia" TEXT,
    "estado" "EstadoDeclaracionPago" NOT NULL DEFAULT 'PENDIENTE',
    "motivo_rechazo" TEXT,
    "fecha_resolucion" TIMESTAMP(3),
    "FK_usuario_validador" INTEGER,
    "FK_cobro" INTEGER,
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DECLARACIONPAGO_pkey" PRIMARY KEY ("id_declaracion_pago")
);

-- CreateIndex
CREATE INDEX "UNIDADFUNCIONAL_FK_proyecto_idx" ON "UNIDADFUNCIONAL"("FK_proyecto");

-- CreateIndex
CREATE INDEX "UNIDADFUNCIONAL_estado_idx" ON "UNIDADFUNCIONAL"("estado");

-- CreateIndex
CREATE INDEX "IMAGENUNIDAD_FK_unidad_funcional_idx" ON "IMAGENUNIDAD"("FK_unidad_funcional");

-- CreateIndex
CREATE INDEX "PUBLICACIONUNIDAD_FK_unidad_funcional_idx" ON "PUBLICACIONUNIDAD"("FK_unidad_funcional");

-- CreateIndex
CREATE INDEX "PUBLICACIONUNIDAD_vigente_estado_comercial_idx" ON "PUBLICACIONUNIDAD"("vigente", "estado_comercial");

-- CreateIndex
CREATE INDEX "PLANPAGO_FK_publicacion_idx" ON "PLANPAGO"("FK_publicacion");

-- CreateIndex
CREATE INDEX "PLANPAGO_estado_idx" ON "PLANPAGO"("estado");

-- CreateIndex
CREATE INDEX "PLANPAGOHISTORIAL_FK_plan_pago_idx" ON "PLANPAGOHISTORIAL"("FK_plan_pago");

-- CreateIndex
CREATE INDEX "VENTA_FK_cliente_idx" ON "VENTA"("FK_cliente");

-- CreateIndex
CREATE INDEX "VENTA_FK_publicacion_idx" ON "VENTA"("FK_publicacion");

-- CreateIndex
CREATE INDEX "VENTA_FK_plan_pago_idx" ON "VENTA"("FK_plan_pago");

-- CreateIndex
CREATE INDEX "VENTA_estado_idx" ON "VENTA"("estado");

-- CreateIndex
CREATE INDEX "CUOTA_fecha_vencimiento_estado_idx" ON "CUOTA"("fecha_vencimiento", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "CUOTA_FK_venta_numero_key" ON "CUOTA"("FK_venta", "numero");

-- CreateIndex
CREATE INDEX "CONSULTAUNIDAD_FK_publicacion_idx" ON "CONSULTAUNIDAD"("FK_publicacion");

-- CreateIndex
CREATE INDEX "CONSULTAUNIDAD_FK_cliente_idx" ON "CONSULTAUNIDAD"("FK_cliente");

-- CreateIndex
CREATE INDEX "CONSULTAUNIDAD_estado_idx" ON "CONSULTAUNIDAD"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "CLIENTE_google_sub_key" ON "CLIENTE"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "CLIENTE_email_key" ON "CLIENTE"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CLIENTE_dni_cuil_key" ON "CLIENTE"("dni_cuil");

-- CreateIndex
CREATE INDEX "COBRO_FK_cliente_idx" ON "COBRO"("FK_cliente");

-- CreateIndex
CREATE INDEX "COBRO_FK_forma_pago_idx" ON "COBRO"("FK_forma_pago");

-- CreateIndex
CREATE INDEX "COBRO_estado_idx" ON "COBRO"("estado");

-- CreateIndex
CREATE INDEX "COBRO_fecha_cobro_idx" ON "COBRO"("fecha_cobro");

-- CreateIndex
CREATE UNIQUE INDEX "DETALLECOBRO_FK_cobro_FK_cuota_key" ON "DETALLECOBRO"("FK_cobro", "FK_cuota");

-- CreateIndex
CREATE UNIQUE INDEX "DECLARACIONPAGO_FK_cobro_key" ON "DECLARACIONPAGO"("FK_cobro");

-- CreateIndex
CREATE INDEX "DECLARACIONPAGO_FK_cliente_idx" ON "DECLARACIONPAGO"("FK_cliente");

-- CreateIndex
CREATE INDEX "DECLARACIONPAGO_FK_cuota_idx" ON "DECLARACIONPAGO"("FK_cuota");

-- CreateIndex
CREATE INDEX "DECLARACIONPAGO_estado_idx" ON "DECLARACIONPAGO"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "PROYECTO_codigo_key" ON "PROYECTO"("codigo");

-- CreateIndex
CREATE INDEX "PROYECTO_estado_idx" ON "PROYECTO"("estado");

-- AddForeignKey
ALTER TABLE "PROYECTO" ADD CONSTRAINT "PROYECTO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PROYECTO" ADD CONSTRAINT "PROYECTO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIDADFUNCIONAL" ADD CONSTRAINT "UNIDADFUNCIONAL_FK_proyecto_fkey" FOREIGN KEY ("FK_proyecto") REFERENCES "PROYECTO"("id_proyecto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIDADFUNCIONAL" ADD CONSTRAINT "UNIDADFUNCIONAL_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UNIDADFUNCIONAL" ADD CONSTRAINT "UNIDADFUNCIONAL_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMAGENUNIDAD" ADD CONSTRAINT "IMAGENUNIDAD_FK_unidad_funcional_fkey" FOREIGN KEY ("FK_unidad_funcional") REFERENCES "UNIDADFUNCIONAL"("id_unidad_funcional") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PUBLICACIONUNIDAD" ADD CONSTRAINT "PUBLICACIONUNIDAD_FK_unidad_funcional_fkey" FOREIGN KEY ("FK_unidad_funcional") REFERENCES "UNIDADFUNCIONAL"("id_unidad_funcional") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PUBLICACIONUNIDAD" ADD CONSTRAINT "PUBLICACIONUNIDAD_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PUBLICACIONUNIDAD" ADD CONSTRAINT "PUBLICACIONUNIDAD_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANPAGO" ADD CONSTRAINT "PLANPAGO_FK_publicacion_fkey" FOREIGN KEY ("FK_publicacion") REFERENCES "PUBLICACIONUNIDAD"("id_publicacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANPAGO" ADD CONSTRAINT "PLANPAGO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANPAGO" ADD CONSTRAINT "PLANPAGO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANPAGOHISTORIAL" ADD CONSTRAINT "PLANPAGOHISTORIAL_FK_plan_pago_fkey" FOREIGN KEY ("FK_plan_pago") REFERENCES "PLANPAGO"("id_plan_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PLANPAGOHISTORIAL" ADD CONSTRAINT "PLANPAGOHISTORIAL_FK_usuario_fkey" FOREIGN KEY ("FK_usuario") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VENTA" ADD CONSTRAINT "VENTA_FK_cliente_fkey" FOREIGN KEY ("FK_cliente") REFERENCES "CLIENTE"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VENTA" ADD CONSTRAINT "VENTA_FK_publicacion_fkey" FOREIGN KEY ("FK_publicacion") REFERENCES "PUBLICACIONUNIDAD"("id_publicacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VENTA" ADD CONSTRAINT "VENTA_FK_plan_pago_fkey" FOREIGN KEY ("FK_plan_pago") REFERENCES "PLANPAGO"("id_plan_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CUOTA" ADD CONSTRAINT "CUOTA_FK_venta_fkey" FOREIGN KEY ("FK_venta") REFERENCES "VENTA"("id_venta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CONSULTAUNIDAD" ADD CONSTRAINT "CONSULTAUNIDAD_FK_cliente_fkey" FOREIGN KEY ("FK_cliente") REFERENCES "CLIENTE"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CONSULTAUNIDAD" ADD CONSTRAINT "CONSULTAUNIDAD_FK_publicacion_fkey" FOREIGN KEY ("FK_publicacion") REFERENCES "PUBLICACIONUNIDAD"("id_publicacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CONSULTAUNIDAD" ADD CONSTRAINT "CONSULTAUNIDAD_FK_usuario_respuesta_fkey" FOREIGN KEY ("FK_usuario_respuesta") REFERENCES "USUARIO"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COBRO" ADD CONSTRAINT "COBRO_FK_cliente_fkey" FOREIGN KEY ("FK_cliente") REFERENCES "CLIENTE"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COBRO" ADD CONSTRAINT "COBRO_FK_forma_pago_fkey" FOREIGN KEY ("FK_forma_pago") REFERENCES "FORMAPAGO"("id_forma_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COBRO" ADD CONSTRAINT "COBRO_FK_usuario_creador_fkey" FOREIGN KEY ("FK_usuario_creador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "COBRO" ADD CONSTRAINT "COBRO_FK_usuario_actualizador_fkey" FOREIGN KEY ("FK_usuario_actualizador") REFERENCES "USUARIO"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLECOBRO" ADD CONSTRAINT "DETALLECOBRO_FK_cobro_fkey" FOREIGN KEY ("FK_cobro") REFERENCES "COBRO"("id_cobro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DETALLECOBRO" ADD CONSTRAINT "DETALLECOBRO_FK_cuota_fkey" FOREIGN KEY ("FK_cuota") REFERENCES "CUOTA"("id_cuota") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DECLARACIONPAGO" ADD CONSTRAINT "DECLARACIONPAGO_FK_cliente_fkey" FOREIGN KEY ("FK_cliente") REFERENCES "CLIENTE"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DECLARACIONPAGO" ADD CONSTRAINT "DECLARACIONPAGO_FK_cuota_fkey" FOREIGN KEY ("FK_cuota") REFERENCES "CUOTA"("id_cuota") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DECLARACIONPAGO" ADD CONSTRAINT "DECLARACIONPAGO_FK_forma_pago_fkey" FOREIGN KEY ("FK_forma_pago") REFERENCES "FORMAPAGO"("id_forma_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DECLARACIONPAGO" ADD CONSTRAINT "DECLARACIONPAGO_FK_usuario_validador_fkey" FOREIGN KEY ("FK_usuario_validador") REFERENCES "USUARIO"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DECLARACIONPAGO" ADD CONSTRAINT "DECLARACIONPAGO_FK_cobro_fkey" FOREIGN KEY ("FK_cobro") REFERENCES "COBRO"("id_cobro") ON DELETE SET NULL ON UPDATE CASCADE;
