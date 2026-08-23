UPDATE "registro_notificaciones_whatsapp" AS registro
SET "horario" = concat_ws('|',
    NULLIF(concat_ws(':', curso."dia", concat_ws('-', curso."hora_inicio", curso."hora_fin")), ':'),
    NULLIF(concat_ws(':', curso."dia2", concat_ws('-', curso."hora_inicio2", curso."hora_fin2")), ':')
)
FROM "cursos" AS curso
WHERE registro."curso_id" = curso."id"
  AND registro."horario" = '';