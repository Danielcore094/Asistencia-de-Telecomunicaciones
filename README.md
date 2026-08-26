# Sistema de Control de Asistencia - Telecomunicaciones

Aplicación para registrar asistencia, administrar cursos y estudiantes, generar reportes y enviar notificaciones académicas.

## Arquitectura

- `frontend/`: cliente React con Vite que consume la API mediante `VITE_API_URL`.
- `backend/`: API con Next.js App Router, Prisma y PostgreSQL.
- `backend/src/jobs/`: trabajos de notificación semanal y de ausencias por WhatsApp.
- `docker-compose.yml`: servicios locales de PostgreSQL y Evolution API.

## Rutas de API

La API usa rutas en español bajo el prefijo `/api`:

| Recurso | Ruta |
| --- | --- |
| Autenticación | `/api/autenticacion` |
| Materias | `/api/materias` |
| Estudiantes | `/api/estudiantes` |
| Docentes | `/api/docentes` |
| Asistencia | `/api/asistencia` |
| Reportes | `/api/reportes` |
| Auditoría | `/api/auditoria` |
| Notificaciones | `/api/notificaciones` |
| Salud | `/api/salud` |

Las rutas anteriores en inglés, como `/api/courses`, `/api/auth` y `/api/reports`, fueron retiradas y responden `404`.

## Requisitos

- Node.js 20 o superior.
- PostgreSQL 15 o superior.
- `pg_dump` y `pg_restore` para crear o restaurar respaldos locales.

## Configuración local

1. Instala las dependencias:

```bash
npm install
```

2. Si usarás los servicios locales de Docker, crea `.env` desde `.env.example`, reemplaza sus valores y arranca PostgreSQL y Evolution API:

```bash
docker compose up -d
```

Los puertos `5432` y `5000` quedan asociados únicamente a `127.0.0.1`; no quedan accesibles desde otros equipos de la red. Redis de Evolution API no publica ningún puerto: persiste las sesiones en un volumen local y Evolution se reconecta automáticamente sin eliminar una instancia desconectada. No subas el archivo `.env` al repositorio.

Para actualizar Evolution API de forma controlada, conserva los volúmenes y ejecuta:

```bash
docker compose pull evolution_api
docker compose up -d evolution_api
```

Evita cerrar sesión o desvincular el dispositivo desde WhatsApp salvo que sea necesario. Si debes volver a vincularlo, realiza un único escaneo de QR y verifica primero el estado de la instancia antes de generar otro código.

3. Crea `backend/.env` desde `backend/.env.example` y define, como mínimo, `DATABASE_URL`, `DIRECT_URL` y `JWT_SECRET`.

4. Crea `frontend/.env` desde `frontend/.env.example`. Para desarrollo local usa:

```env
VITE_API_URL=http://localhost:4000/api
```

Para habilitar el CAPTCHA, crea un sitio en [Cloudflare Turnstile](https://dash.cloudflare.com/) y agrega la clave pública en `frontend/.env`:

```env
VITE_TURNSTILE_SITE_KEY=tu_clave_publica_turnstile
```

Agrega la clave privada correspondiente en `backend/.env`:

```env
TURNSTILE_SECRET_KEY=tu_secreto_turnstile
```

En desarrollo local registra `localhost` como dominio permitido en Turnstile. La clave privada nunca debe exponerse al frontend ni subirse al repositorio.

5. Genera el cliente Prisma y aplica las migraciones:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

6. Inicia ambos servicios desde la raíz:

```bash
npm run dev
```

El frontend se sirve en `http://localhost:3000` y el backend en `http://localhost:4000` por defecto.

## Entrega con Docker Compose

La entrega puede ejecutarse sin Node.js instalado en el equipo del docente. Requiere Docker Desktop activo.

1. Copia el archivo de variables de ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Edita `.env` y reemplaza `JWT_SECRET`, `VITE_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` con valores reales. En Cloudflare Turnstile registra el dominio `localhost`.
3. Levanta frontend, backend y PostgreSQL:

```powershell
docker compose up --build
```

4. Abre `http://localhost:3000`.

El backend ejecuta `prisma migrate deploy` automáticamente antes de iniciar. El frontend usa Nginx como proxy interno, por lo que el navegador consume `/api` sin necesitar conocer el puerto del backend. Los datos de PostgreSQL quedan guardados en el volumen `postgres_data`.

Para detener los servicios conserva los datos con:

```powershell
docker compose down
```

Para borrar también la base de datos local y comenzar de cero:

```powershell
docker compose down -v
```

Evolution API y Redis se mantienen disponibles en el mismo Compose para una instalación con WhatsApp, pero requieren configurar sus variables en `.env`. Para la demostración básica del sistema de asistencia no es necesario activar ese flujo.

## Pruebas y calidad

Las pruebas unitarias usan el ejecutor nativo de Node.js y no requieren una base de datos.

```bash
node --test backend/tests/*.test.js
```

GitHub Actions ejecuta estas pruebas y compila frontend y backend en cada `push` o `pull request` hacia `main`. La definición está en `.github/workflows/main.yml`.

## Respaldos

Para crear un respaldo local de PostgreSQL:

```bash
DATABASE_URL="postgresql://usuario:contrasena@host:5432/base" node backend/scripts/respaldarBaseDatos.mjs
```

El archivo se crea en `backups/` con formato personalizado de PostgreSQL. Para restaurarlo en una base de datos vacía:

```bash
pg_restore --clean --if-exists --no-owner --dbname="postgresql://usuario:contrasena@host:5432/base" backups/asistencia-AAAA-MM-DDTHH-MM-SS-SSSZ.dump
```

El flujo `.github/workflows/backup.yml` crea un respaldo diario a las 00:15 de Colombia, detecta la versión mayor del servidor PostgreSQL para instalar un `pg_dump` compatible, cifra el respaldo con AES-256 y lo conserva como artefacto durante 30 días. Configura estos secretos del repositorio:

- `DATABASE_URL`: conexión de la base de datos que se respaldará.
- `BACKUP_ENCRYPTION_PASSWORD`: contraseña fuerte guardada fuera de GitHub; es necesaria para descifrar el archivo `.dump.gpg`.

El paso `Crear respaldo cifrado` usa estos secretos directamente:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  BACKUP_ENCRYPTION_PASSWORD: ${{ secrets.BACKUP_ENCRYPTION_PASSWORD }}
```

Para descifrar un artefacto descargado:

```bash
gpg --batch --output respaldo.dump --decrypt --passphrase "$BACKUP_ENCRYPTION_PASSWORD" respaldo.dump.gpg
```

Los artefactos de Actions son almacenamiento temporal. Descarga los respaldos periódicamente o replica el archivo cifrado a almacenamiento institucional para cumplir una política de retención de mayor duración.

## Despliegue

El `Dockerfile` del backend puede desplegarse en Railway, Render o una plataforma equivalente. Configura las variables de entorno del backend en el panel del proveedor; nunca publiques archivos `.env` ni credenciales en el repositorio.

### Configuración de producción

El backend no inicia en producción si faltan `JWT_SECRET` o `CORS_ALLOWED_ORIGINS`. Configura además `DATABASE_URL`, `DIRECT_URL`, `FRONTEND_URL` y las credenciales de correo y WhatsApp que correspondan. `CORS_ALLOWED_ORIGINS` contiene una lista separada por comas de orígenes exactos, por ejemplo:

```env
CORS_ALLOWED_ORIGINS=https://asistencia.institucion.edu.co
FRONTEND_URL=https://asistencia.institucion.edu.co
EJECUTAR_CRON=false
```

En desarrollo, si no se define `CORS_ALLOWED_ORIGINS`, se autoriza únicamente `http://localhost:3000`. El secreto JWT temporal de desarrollo solo evita bloquear el entorno local; configura siempre `JWT_SECRET` antes de desplegar.

El límite de intentos de inicio de sesión usa memoria solo durante el desarrollo local. En producción son obligatorias `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`, para que el límite sea compartido entre todas las réplicas del backend.

El proxy o plataforma debe terminar TLS, redirigir HTTP a HTTPS y enviar `X-Forwarded-For` únicamente desde proxies confiables. La API expone `GET /api/salud`, que comprueba la conexión a PostgreSQL y sirve para health checks del proveedor.

### Flujo de despliegue

1. Ejecuta las migraciones una sola vez por versión antes de iniciar nuevas réplicas:

```bash
docker build --target compilacion --tag telecom-backend:migraciones backend
docker run --rm --env-file backend/.env telecom-backend:migraciones npx prisma migrate deploy
```

2. Construye y publica la imagen de producción:

```bash
docker build --tag registro-asistencia-backend:VERSION backend
```

3. Inicia las réplicas web con `EJECUTAR_CRON=false`. Inicia exactamente una instancia dedicada con `EJECUTAR_CRON=true`; esta programa las notificaciones los domingos a las 09:00 en `America/Bogota`.
4. Comprueba `/api/salud`, los errores de aplicación y la entrega de notificaciones antes de dirigir tráfico a la nueva versión. Conserva la imagen anterior para rollback.

### Monitoreo y recuperación

- Alerta por respuestas `5xx`, fallos de health check, errores de cron, respaldos fallidos y notificaciones no enviadas.
- Centraliza logs con fecha, nivel y contexto; no almacenes contraseñas, tokens ni datos personales innecesarios.
- Replica cada respaldo cifrado a almacenamiento institucional y realiza pruebas de restauración periódicas. Define formalmente el RPO y RTO institucionales.
- El límite de inicio de sesión se almacena en Redis REST en producción; monitorea sus errores y configura alertas cuando el servicio no esté disponible.
