const mysql = require('mysql2/promise');
//require('dotenv').config();

module.exports.DATABASE = mysql.createPool({
    "host": 'localhost',
    "user": 'firealram',//root
    "password": 'Indi@12345',
    "database": 'firealarm',
    "timezone": 'Z'
    //"port": process.env.DB_PORT
});
