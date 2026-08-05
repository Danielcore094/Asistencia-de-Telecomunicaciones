# Sistema de Control de Asistencia - Telecomunicaciones

Aplicación para registrar asistencia, administrar cursos y estudiantes, generar reportes y enviar notificaciones académicas.

## Arquitectura

- `frontend/`: cliente React con Vite que consume la API mediante `VITE_API_URL`.
- `backend/`: API con Next.js App Router, Prisma y PostgreSQL.
- `backend/src/jobs/`: trabajos de notificación semanal y de ausencias por WhatsApp.
- `docker-compose.yml`: servicios locales de PostgreSQL y Evolution API.

## Requisitos

- Node.js 20 o superior.
- PostgreSQL 15 o superior.
- `pg_dump` y `pg_restore` para crear o restaurar respaldos locales.

## Configuración local

1. Instala las dependencias:

```bash
npm install
```

2. Crea `backend/.env` desde `backend/.env.example` y define, como mínimo, `DATABASE_URL`, `DIRECT_URL` y `JWT_SECRET`.

3. Crea `frontend/.env` desde `frontend/.env.example`. Para desarrollo local usa:

```env
VITE_API_URL=http://localhost:4000/api
```

4. Genera el cliente Prisma y aplica las migraciones:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

5. Inicia ambos servicios desde la raíz:

```bash
npm run dev
```

El frontend se sirve en `http://localhost:3000` y el backend en `http://localhost:4000` por defecto.

## Pruebas y calidad

Las pruebas unitarias usan el ejecutor nativo de Node.js y no requieren una base de datos.

```bash
node --test backend/tests/*.test.js
```

GitHub Actions ejecuta estas pruebas y compila frontend y backend en cada `push` o `pull request` hacia `main`. La definición está en `.github/workflows/main.yml`.

## Respaldos

Para crear un respaldo local de PostgreSQL:

```bash
DATABASE_URL="postgresql://usuario:contrasena@host:5432/base" node backend/scripts/backupDatabase.mjs
```

El archivo se crea en `backups/` con formato personalizado de PostgreSQL. Para restaurarlo en una base de datos vacía:

```bash
pg_restore --clean --if-exists --no-owner --dbname="postgresql://usuario:contrasena@host:5432/base" backups/asistencia-AAAA-MM-DDTHH-MM-SS-SSSZ.dump
```

El flujo `.github/workflows/backup.yml` crea un respaldo diario a las 00:15 de Colombia, lo cifra con AES-256 y lo conserva como artefacto durante 30 días. Antes de habilitarlo, configura estos secretos del repositorio:

- `DATABASE_URL`: conexión de la base de datos que se respaldará.
- `BACKUP_ENCRYPTION_PASSWORD`: contraseña fuerte guardada fuera de GitHub; es necesaria para descifrar el archivo `.dump.gpg`.

Para descifrar un artefacto descargado:

```bash
gpg --batch --output respaldo.dump --decrypt --passphrase "$BACKUP_ENCRYPTION_PASSWORD" respaldo.dump.gpg
```

Los artefactos de Actions son almacenamiento temporal. Descarga los respaldos periódicamente o replica el archivo cifrado a almacenamiento institucional para cumplir una política de retención de mayor duración.

## Despliegue

El `Dockerfile` del backend puede desplegarse en Railway, Render o una plataforma equivalente. Configura las variables de entorno del backend en el panel del proveedor; nunca publiques archivos `.env` ni credenciales en el repositorio.
