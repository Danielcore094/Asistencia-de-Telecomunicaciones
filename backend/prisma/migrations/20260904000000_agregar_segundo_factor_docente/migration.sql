ALTER TABLE "docentes"
ADD COLUMN "codigo_2fa_hash" TEXT,
ADD COLUMN "codigo_2fa_expira_en" TIMESTAMP(3),
ADD COLUMN "codigo_2fa_intentos" INTEGER NOT NULL DEFAULT 0;