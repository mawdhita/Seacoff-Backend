const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // lo bilang tadi ga pakai password
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
});

db.connect(err => {
    if (err) {
        console.error('Error connect ke database:', err);
    } else {
        console.log('Connected ke MySQL database balen_coffee');
    }
});

module.exports = db;
