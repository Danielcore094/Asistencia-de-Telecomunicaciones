import jwt from 'jsonwebtoken';

const secreto = process.env.JWT_SECRET;

if (!secreto) {
    throw new Error('JWT_SECRET es requerida para ejecutar esta prueba manual.');
}

const token = jwt.sign(
    { id: '1', email: 'admin@uts.edu.co', name: 'Admin UTS', role: 'ADMIN' },
    secreto,
    { expiresIn: '1h' }
);

fetch('http://localhost:4000/api/materias', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
