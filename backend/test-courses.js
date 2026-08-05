const jwt = require('jsonwebtoken');
const SECRETO = 'telecom_secret_key_2024';

const token = jwt.sign(
    { id: '1', email: 'admin@uts.edu.co', name: 'Admin UTS', role: 'ADMIN' },
    SECRETO,
    { expiresIn: '1h' }
);

fetch('http://localhost:4000/api/courses', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
