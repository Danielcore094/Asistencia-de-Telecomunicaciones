ALTER TABLE IF EXISTS "_CourseToStudent"
RENAME TO "_CursoToEstudiante";

ALTER TABLE IF EXISTS "_CursoToEstudiante"
RENAME TO "Curso_Estudiante";

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name = 'Curso_Estudiante'
	) AND NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conrelid = '"Curso_Estudiante"'::regclass
			AND contype = 'p'
	) THEN
		ALTER TABLE "Curso_Estudiante"
		ADD CONSTRAINT "Curso_Estudiante_pkey" PRIMARY KEY ("A", "B");
	END IF;
END $$;