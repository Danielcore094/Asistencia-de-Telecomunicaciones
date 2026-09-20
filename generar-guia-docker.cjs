const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    ShadingType,
    TextRun,
} = require('docx');
const fs = require('fs');

const archivoSalida = 'GUIA_DESPLIEGUE_DOCKER_HIBRIDO.docx';
const compose = 'docker-compose.servidor-hibrido.yml';
const proyecto = 'asistencia-de-telecomunicaciones';

function titulo(texto, nivel = HeadingLevel.HEADING_1) {
    return new Paragraph({ text: texto, heading: nivel, spacing: { before: 260, after: 120 } });
}

function texto(textoContenido, opciones = {}) {
    return new Paragraph({
        children: [new TextRun({ text: textoContenido, bold: opciones.bold })],
        spacing: { after: 100 },
    });
}

function comando(contenido) {
    return new Paragraph({
        children: [new TextRun({ text: contenido, font: 'Consolas', size: 19 })],
        shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
        spacing: { before: 60, after: 140 },
        indent: { left: 180, right: 180 },
    });
}

function lista(contenido) {
    return new Paragraph({ text: contenido, bullet: { level: 0 }, spacing: { after: 70 } });
}

const contenido = [
    new Paragraph({
        text: 'Guia practica de despliegue Docker',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
    }),
    new Paragraph({
        text: 'Proyecto de Asistencia de Telecomunicaciones - Modo hibrido',
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
    }),
    texto('Esta guia usa Docker Compose en modo hibrido: frontend y backend son contenedores separados dentro del mismo proyecto Compose. La base de datos Supabase, Redis Upstash y Evolution API permanecen como servicios externos.'),
    texto('Archivo Compose utilizado:', { bold: true }),
    comando(compose),
    titulo('1. Requisitos'),
    lista('Docker Desktop en Windows, o Docker Engine y Docker Compose en Linux.'),
    lista('El archivo .env con las variables de produccion.'),
    lista('Las imagenes telecom-backend y telecom-frontend con la etiqueta definida en IMAGE_TAG.'),
    lista('No compartir .env: contiene credenciales y secretos.'),
    titulo('2. Ubicarse en el proyecto'),
    texto('Windows PowerShell:', { bold: true }),
    comando('Set-Location "C:\\ruta\\al\\proyecto"'),
    texto('Linux Bash:', { bold: true }),
    comando('cd /ruta/al/proyecto'),
    titulo('3. Validar configuracion'),
    texto('Ejecutar antes de iniciar o actualizar. Si termina sin errores, Compose pudo leer el .env y el archivo de servicios.'),
    comando(`docker compose -p ${proyecto} -f ${compose} config`),
    titulo('4. Iniciar todo el proyecto'),
    texto('Usar este comando para iniciar frontend y backend en la misma red Docker:'),
    comando(`docker compose -p ${proyecto} -f ${compose} up -d`),
    titulo('5. Ver estado y salud'),
    comando(`docker compose -p ${proyecto} -f ${compose} ps`),
    texto('Windows PowerShell:', { bold: true }),
    comando('Invoke-WebRequest http://localhost:3000/api/salud -UseBasicParsing'),
    texto('Linux Bash:', { bold: true }),
    comando('curl http://localhost:3000/api/salud'),
    texto('La respuesta esperada es: {"estado":"disponible"}'),
    texto('La aplicacion queda disponible en http://localhost:3000.'),
    titulo('6. Aplicar cambios del frontend'),
    texto('Si solo cambiaste React, estilos o imagenes del frontend, reconstruye solo esa imagen y recrea el servicio:'),
    comando(`docker compose -p ${proyecto} -f ${compose} build frontend`),
    comando(`docker compose -p ${proyecto} -f ${compose} up -d --no-deps frontend`),
    texto('Si el contenedor fue creado con otra instalacion y aparece un conflicto de nombre, elimina solo el contenedor, no los datos externos:'),
    comando('docker rm -f telecom_frontend'),
    comando(`docker compose -p ${proyecto} -f ${compose} up -d --no-deps frontend`),
    texto('Despues, actualizar el navegador con Ctrl + F5.'),
    titulo('7. Aplicar cambios del backend'),
    texto('Si cambiaste codigo del backend, carga o construye una nueva imagen con la misma etiqueta definida en IMAGE_TAG y luego recrea el servicio:'),
    comando(`docker compose -p ${proyecto} -f ${compose} up -d --force-recreate backend`),
    titulo('8. Logs y diagnostico'),
    comando(`docker compose -p ${proyecto} -f ${compose} logs --tail=100 backend`),
    comando(`docker compose -p ${proyecto} -f ${compose} logs --tail=100 frontend`),
    comando(`docker compose -p ${proyecto} -f ${compose} logs -f backend`),
    texto('Errores Prisma P1001 indican que el backend no puede alcanzar Supabase. Comprobar el puerto 5432:'),
    texto('Windows PowerShell:', { bold: true }),
    comando('Test-NetConnection HOST_DE_SUPABASE -Port 5432'),
    texto('Linux Bash:', { bold: true }),
    comando('nc -vz HOST_DE_SUPABASE 5432'),
    titulo('9. Reiniciar servicios'),
    texto('Reiniciar solo el frontend:'),
    comando(`docker compose -p ${proyecto} -f ${compose} restart frontend`),
    texto('Reiniciar backend y frontend:'),
    comando(`docker compose -p ${proyecto} -f ${compose} restart`),
    titulo('10. Detener y volver a iniciar'),
    texto('Detener los contenedores sin afectar Supabase, Upstash ni Evolution API:'),
    comando(`docker compose -p ${proyecto} -f ${compose} down`),
    texto('Volver a iniciar:'),
    comando(`docker compose -p ${proyecto} -f ${compose} up -d`),
    texto('No usar docker compose down -v como solucion habitual. En este modo no hay una base local que deba borrarse.'),
    titulo('11. Preparar imagenes para otro equipo'),
    texto('En el equipo donde esta el codigo y Docker:'),
    texto('Windows PowerShell:', { bold: true }),
    comando('$env:IMAGE_TAG = "2026-09-20"'),
    comando(`docker compose -p ${proyecto} -f ${compose} build frontend`),
    comando('docker save -o asistencia-imagenes-hibrido.tar telecom-backend:$env:IMAGE_TAG telecom-frontend:$env:IMAGE_TAG'),
    texto('Linux Bash:', { bold: true }),
    comando('export IMAGE_TAG=2026-09-20'),
    comando(`docker compose -p ${proyecto} -f ${compose} build frontend`),
    comando('docker save -o asistencia-imagenes-hibrido.tar telecom-backend:$IMAGE_TAG telecom-frontend:$IMAGE_TAG'),
    texto('En el equipo de destino:'),
    comando('docker load --input asistencia-imagenes-hibrido.tar'),
    comando(`docker compose -p ${proyecto} -f ${compose} config`),
    comando(`docker compose -p ${proyecto} -f ${compose} up -d`),
    titulo('12. Regla importante'),
    texto('Usar siempre el mismo nombre de proyecto Compose (-p asistencia-de-telecomunicaciones) y el mismo archivo Compose. Asi frontend y backend quedan en la misma red y el proxy puede resolver el servicio backend.'),
];

const documento = new Document({
    creator: 'Asistencia de Telecomunicaciones',
    title: 'Guia practica de despliegue Docker hibrido',
    description: 'Comandos habituales para desplegar y mantener la aplicacion en Docker.',
    sections: [{ properties: {}, children: contenido }],
});

Packer.toBuffer(documento).then((buffer) => {
    fs.writeFileSync(archivoSalida, buffer);
    console.log(`Documento creado: ${archivoSalida}`);
});
