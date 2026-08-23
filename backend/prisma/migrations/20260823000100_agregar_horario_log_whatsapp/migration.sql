ALTER TABLE "registro_notificaciones_whatsapp"
ADD COLUMN "horario" TEXT NOT NULL DEFAULT '';

DO $$
DECLARE
    indice RECORD;
BEGIN
    FOR indice IN
        SELECT indexrelid::regclass AS nombre
        FROM pg_index
        WHERE indrelid = 'registro_notificaciones_whatsapp'::regclass
          AND indisunique
          AND indnatts = 3
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %s', indice.nombre);
    END LOOP;
END $$;

CREATE UNIQUE INDEX "registro_notificaciones_whatsapp_estudiante_id_curso_id_fecha_horario_key"
ON "registro_notificaciones_whatsapp" ("estudiante_id", "curso_id", "fecha", "horario");