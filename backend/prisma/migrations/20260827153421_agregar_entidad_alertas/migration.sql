-- CreateTable
CREATE TABLE "TIPOALERTA" (
    "id_tipo_alerta" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "TIPOALERTA_pkey" PRIMARY KEY ("id_tipo_alerta")
);

-- CreateTable
CREATE TABLE "ALERTA" (
    "id_alerta" SERIAL NOT NULL,
    "FK_tipo_alerta" INTEGER NOT NULL,
    "mensaje" TEXT NOT NULL,
    "datos" JSONB,
    "FK_rol_destinatario" INTEGER NOT NULL,
    "atendida" BOOLEAN NOT NULL DEFAULT false,
    "FK_usuario_atencion" INTEGER,
    "fecha_atencion" TIMESTAMP(3),
    "hora_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ALERTA_pkey" PRIMARY KEY ("id_alerta")
);

-- CreateIndex
CREATE UNIQUE INDEX "TIPOALERTA_nombre_key" ON "TIPOALERTA"("nombre");

-- AddForeignKey
ALTER TABLE "ALERTA" ADD CONSTRAINT "ALERTA_FK_tipo_alerta_fkey" FOREIGN KEY ("FK_tipo_alerta") REFERENCES "TIPOALERTA"("id_tipo_alerta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ALERTA" ADD CONSTRAINT "ALERTA_FK_rol_destinatario_fkey" FOREIGN KEY ("FK_rol_destinatario") REFERENCES "ROL"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ALERTA" ADD CONSTRAINT "ALERTA_FK_usuario_atencion_fkey" FOREIGN KEY ("FK_usuario_atencion") REFERENCES "USUARIO"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
