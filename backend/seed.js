import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { catalogoMaterias } from './datos/catalogoMaterias.js';
import { obtenerErrorContrasena } from './src/lib/politicaContrasena.js';

const prisma = new PrismaClient();

const cargarDocenteInicial = async () => {
    const email = process.env.DOCENTE_INICIAL_EMAIL?.trim().toLowerCase();
    const contrasena = process.env.DOCENTE_INICIAL_CONTRASENA;
    const nombre = process.env.DOCENTE_INICIAL_NOMBRE?.trim();

    if (!email && !contrasena && !nombre) {
        console.log('ℹ Docente inicial omitido: variables DOCENTE_INICIAL_* no configuradas.');
        return;
    }

    if (!email || !contrasena || !nombre) {
        throw new Error('Para crear el docente inicial se requieren DOCENTE_INICIAL_EMAIL, DOCENTE_INICIAL_CONTRASENA y DOCENTE_INICIAL_NOMBRE.');
    }

    const errorContrasena = obtenerErrorContrasena(contrasena);
    if (errorContrasena) {
        throw new Error(`DOCENTE_INICIAL_CONTRASENA no cumple la política: ${errorContrasena}`);
    }

    const existente = await prisma.docente.findUnique({ where: { email } });
    if (existente) {
        console.log(`✓ El profesor '${email}' ya existe, no se creó duplicado.`);
        return;
    }

    const hashContrasena = await bcrypt.hash(contrasena, 10);
    const docente = await prisma.docente.create({
        data: { email, passwordHash: hashContrasena, name: nombre, role: 'ADMIN' }
    });

    console.log('✅ Profesor creado exitosamente:');
    console.log(`   Nombre: ${docente.name}`);
    console.log(`   Email:  ${docente.email}`);
};

const cargarCatalogoMaterias = async () => {
    for (const materia of catalogoMaterias) {
        const datos = {
            nombre: materia.nombre,
            programa: materia.programa,
            semestre: materia.semestre ?? null,
        };

        await prisma.materiaCatalogo.upsert({
            where: {
                codigo_programa: {
                    codigo: materia.codigo,
                    programa: materia.programa,
                },
            },
            update: datos,
            create: {
                codigo: materia.codigo,
                ...datos,
            },
        });
    }

    console.log(`✅ Catálogo actualizado: ${catalogoMaterias.length} materias procesadas.`);
};

const principal = async () => {
    await cargarDocenteInicial();
    await cargarCatalogoMaterias();
};

principal()
    .catch(error => { console.error('Error:', error); process.exit(1); })
    .finally(() => prisma.$disconnect());
