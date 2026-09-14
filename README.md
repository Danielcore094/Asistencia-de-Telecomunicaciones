# Sistema de control de asistencia - Telecomunicaciones

El presente repositorio corresponde a una solución para la gestión de asistencia, administración de cursos y estudiantes, generación de reportes y envío de notificaciones académicas.

## Arquitectura

- `frontend/`: aplicación cliente desarrollada con React y Vite, que consume la API mediante `VITE_API_URL`.
- `backend/`: API construida con Next.js App Router, Prisma y PostgreSQL.
- `backend/src/jobs/`: procesos programados para notificación semanal y alertas de inasistencia mediante WhatsApp.
- `docker-compose.yml`: servicios locales de PostgreSQL y Evolution API.

## Rutas de la API

La API expone endpoints en español bajo el prefijo `/api`:

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

Las rutas en inglés anteriores, como `/api/courses`, `/api/auth` y `/api/reports`, fueron retiradas y responden con `404`.

## Requisitos

- Node.js 20 o superior.
- PostgreSQL 15 o superior.
- `pg_dump` y `pg_restore` para la creación y restauración de respaldos locales.

## Configuración local

1. Instalación de dependencias:

```bash
npm install
```

2. En caso de utilizar servicios locales de Docker, se debe crear `.env` a partir de `.env.example`, reemplazar los valores y levantar PostgreSQL y Evolution API:

```bash
docker compose up -d
```

Los puertos `5432` y `5000` quedan asociados únicamente a `127.0.0.1`; no resultan accesibles desde otros equipos de la red. Redis de Evolution API no publica puertos: persiste las sesiones en un volumen local y Evolution se reconecta automáticamente sin eliminar una instancia desconectada. No debe subirse el archivo `.env` al repositorio.

Para actualizar Evolution API de forma controlada, se conserva el volumen y se ejecuta:

```bash
docker compose pull evolution_api
docker compose up -d evolution_api
```

Se recomienda evitar cerrar sesión o desvincular el dispositivo desde WhatsApp salvo que sea estrictamente necesario. En caso de volver a vincularlo, se sugiere un único escaneo de QR y la verificación previa del estado de la instancia antes de generar otro código.

3. Se debe crear `backend/.env` a partir de `backend/.env.example` y definir, como mínimo, `DATABASE_URL`, `DIRECT_URL` y `JWT_SECRET`.

4. Se debe crear `frontend/.env` a partir de `frontend/.env.example`. Para el entorno de desarrollo local, se usa:

```env
VITE_API_URL=http://localhost:4000/api
```

Para habilitar el CAPTCHA, se crea un sitio en [Cloudflare Turnstile](https://dash.cloudflare.com/) y se agrega la clave pública en `frontend/.env`:

```env
VITE_TURNSTILE_SITE_KEY=tu_clave_publica_turnstile
```

La clave privada correspondiente se agrega en `backend/.env`:

```env
TURNSTILE_SECRET_KEY=tu_secreto_turnstile
```

En desarrollo local, se registra `localhost` como dominio permitido en Turnstile. La clave privada nunca debe exponerse al frontend ni incluirse en el repositorio.

5. Se genera el cliente Prisma y se aplican las migraciones:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

Para el entorno de desarrollo alojado en Supabase, se configuran en `backend/.env` las dos conexiones del proyecto antes de ejecutar estos comandos:

```env
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...supabase.co:5432/postgres"
```

`DATABASE_URL` se utiliza para la aplicación y `DIRECT_URL` para que Prisma ejecute migraciones directamente contra Supabase. No se usan las URLs de PostgreSQL local o Docker para aplicar la migración del entorno de desarrollo.

6. Se inician los servicios desde la raíz:

```bash
npm run dev
```

El frontend queda disponible en `http://localhost:3000` y el backend en `http://localhost:4000` por defecto.

## Entrega con Docker Compose

La entrega puede ejecutarse sin la instalación de Node.js en el equipo del docente. Requiere Docker Desktop activo.

1. Se copia el archivo de variables de ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Se edita `.env` y se reemplazan `JWT_SECRET`, `VITE_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` con valores reales. En Cloudflare Turnstile se registra el dominio `localhost`.
3. Se levantan los servicios de frontend, backend y PostgreSQL:

```powershell
docker compose up --build
```

4. Se accede a `http://localhost:3000`.

El backend ejecuta `prisma migrate deploy` automáticamente antes de iniciar. El frontend usa Nginx como proxy interno, por lo que el navegador consume `/api` sin necesidad de conocer el puerto del backend. Los datos de PostgreSQL quedan almacenados en el volumen `postgres_data`.

Para detener los servicios conservando los datos, se ejecuta:

```powershell
docker compose down
```

Para borrar también la base de datos local y comenzar de cero:

```powershell
docker compose down -v
```

Evolution API y Redis quedan disponibles en el mismo Compose para una instalación con WhatsApp, pero requieren la configuración de sus variables en `.env`. Para la demostración básica del sistema de asistencia, no resulta necesario activar ese flujo.

## Despliegue en servidor sin acceso al repositorio

El servidor institucional no requiere Git ni acceso a Internet. La construcción y descarga de imágenes se realiza una sola vez en un equipo con Docker y acceso a Internet; al servidor se transporta un archivo `.tar` con las imágenes, `docker-compose.servidor.yml` y `.env`.

### Preparación del paquete

Desde la raíz del proyecto, se configura `.env` con los valores del servidor y una etiqueta única en `IMAGE_TAG`. A continuación, se construyen las imágenes de la aplicación y se descargan las imágenes externas:

```powershell
$env:IMAGE_TAG = "2026-09-03"
docker compose build backend frontend
docker pull postgres:15
docker pull redis:7.4-alpine
docker pull evoapicloud/evolution-api:latest
```

Se exportan todas las imágenes a un único archivo y se copian estos elementos al servidor por el medio autorizado por la institución:

```powershell
docker save -o asistencia-imagenes.tar `
  telecom-backend:$env:IMAGE_TAG `
  telecom-frontend:$env:IMAGE_TAG `
  postgres:15 `
  redis:7.4-alpine `
  evoapicloud/evolution-api:latest
```

Se incluye también `docker-compose.servidor.yml` y `.env`. No deben incluirse credenciales en archivos que vayan a quedar expuestos o almacenados sin protección.

### Instalación y actualización en el servidor

Se instala Docker Engine y el complemento Docker Compose en el servidor una sola vez. Se copia el paquete, se cargan las imágenes y se inicia la aplicación sin ejecutar `build` ni `pull`:

```bash
docker load --input asistencia-imagenes.tar
docker compose -f docker-compose.servidor.yml up -d
docker compose -f docker-compose.servidor.yml ps
docker compose -f docker-compose.servidor.yml logs --tail=100 backend
```

Se comprueba `http://IP_DEL_SERVIDOR:3000` y `http://IP_DEL_SERVIDOR:3000/api/salud`. En este paquete inicial, el esquema actual se sincroniza automáticamente con `prisma db push`; no debe eliminarse el volumen de PostgreSQL después de comenzar a usar el sistema. Para una actualización, se carga primero el nuevo `.tar`, se cambia `IMAGE_TAG` y se ejecuta el mismo `up -d`; los volúmenes de PostgreSQL, Redis y Evolution API se conservan.

WhatsApp y Evolution API son opcionales y no se inician en la instalación básica. Para habilitarlos, se arranca con `docker compose --profile whatsapp -f docker-compose.servidor.yml up -d` después de configurar sus variables. En el firewall institucional, se publica únicamente el puerto del frontend. PostgreSQL, Redis y Evolution API no exponen puertos hacia la red. Se configura HTTPS mediante el proxy inverso institucional y se cambia `PUBLIC_URL` a la URL HTTPS final antes de construir el frontend.

## Entrega contenerizada con servicios externos

Si el despliegue vigente usa Railway, Supabase, Upstash y Evolution API, es posible conservar esos servicios externos y ejecutar frontend y backend en Docker Desktop mediante `docker-compose.servidor-hibrido.yml`. Este archivo no crea otra base de datos, no reemplaza Upstash y no inicia otra instancia de Evolution API. Se usa `.env.servidor-hibrido.example` como plantilla.

1. En el equipo de entrega, se copia `docker-compose.servidor-hibrido.yml` y un `.env` de producción. Se conservan las conexiones actuales de Supabase, Upstash y Evolution API. Se definen `CORS_ALLOWED_ORIGINS` y `FRONTEND_URL` con la URL final donde se abrirá el frontend y se configura `VITE_TURNSTILE_SITE_KEY`.
2. Se carga la imagen y se valida la configuración:

```bash
docker load --input asistencia-imagenes-2026-09-03.tar
docker compose -f docker-compose.servidor-hibrido.yml config
```

3. Se construyen e inician ambos contenedores y se comprueba su salud:

```bash
docker compose -f docker-compose.servidor-hibrido.yml build
docker compose -f docker-compose.servidor-hibrido.yml up -d
docker compose -f docker-compose.servidor-hibrido.yml ps
curl http://localhost:3000/api/salud
```

4. Se accede a `http://localhost:3000` o a la URL/IP del equipo de entrega. El frontend consume `/api` por el mismo origen, por lo que no requiere `VITE_API_URL` apuntando a Vercel ni a `localhost` dentro de una configuración externa.

En esta modalidad no se ejecuta `prisma db push` ni `docker compose down -v`: Supabase conserva los datos y el esquema existentes. Las migraciones deben ejecutarse de forma controlada en Supabase con un respaldo verificado.

## Pruebas y calidad

Las pruebas unitarias emplean el ejecutor nativo de Node.js y no requieren una base de datos.

```bash
node --test backend/tests/*.test.js
```

GitHub Actions ejecuta estas pruebas y compila frontend y backend en cada `push` o `pull request` hacia `main`. La definición se encuentra en `.github/workflows/main.yml`.

## Respaldos

Para crear un respaldo local de PostgreSQL:

```bash
DATABASE_URL="postgresql://usuario:contrasena@host:5432/base" node backend/scripts/respaldarBaseDatos.mjs
```

El archivo se crea en `backups/` con formato personalizado de PostgreSQL. Para restaurarlo en una base de datos vacía:

```bash
pg_restore --clean --if-exists --no-owner --dbname="postgresql://usuario:contrasena@host:5432/base" backups/asistencia-AAAA-MM-DDTHH-MM-SS-SSSZ.dump
```

El flujo `.github/workflows/backup.yml` crea un respaldo diario a las 00:15 de Colombia, lo cifra con AES-256 y lo conserva como artefacto durante 30 días. Se configuran los siguientes secretos del repositorio:

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

Los artefactos de Actions constituyen almacenamiento temporal. Se recomienda descargar los respaldos periódicamente o replicar el archivo cifrado a un almacenamiento institucional para cumplir una política de retención de mayor duración.

## Despliegue

El `Dockerfile` del backend puede desplegarse en Railway, Render o una plataforma equivalente. Las variables de entorno del backend se configuran en el panel del proveedor; no se publican archivos `.env` ni credenciales en el repositorio.

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

3. Inicia las réplicas web con `EJECUTAR_CRON=false`. Inicia exactamente una instancia dedicada con `EJECUTAR_CRON=true`; esta programa las notificaciones a estudiantes los domingos a las 09:00 y los reportes a docentes y administrador los lunes a las 06:00 en `America/Bogota`.
4. Comprueba `/api/salud`, los errores de aplicación y la entrega de notificaciones antes de dirigir tráfico a la nueva versión. Conserva la imagen anterior para rollback.

### Monitoreo y recuperación

- Alerta por respuestas `5xx`, fallos de health check, errores de cron, respaldos fallidos y notificaciones no enviadas.
- Centraliza logs con fecha, nivel y contexto; no almacenes contraseñas, tokens ni datos personales innecesarios.
- Replica cada respaldo cifrado a almacenamiento institucional y realiza pruebas de restauración periódicas. Define formalmente el RPO y RTO institucionales.
- El límite de inicio de sesión se almacena en Redis REST en producción; monitorea sus errores y configura alertas cuando el servicio no esté disponible.
