const mysql = require('mysql2/promise');
//require('dotenv').config();

module.exports.DATABASE = mysql.createPool({
    "host": 'b8hdltuyfxz4qrzs6cif-mysql.services.clever-cloud.com'//'localhost',
    "user": 'u5iyfpvqpdz8px8q'//'firealram',//root
    "password":'0nYJTEGc2Dg2XZluGhMx' //'Indi@12345',
    "database": 'b8hdltuyfxz4qrzs6cif'//'firealarm',
    //"timezone": //'Z',
    "port": 3306//process.env.DB_PORT
});

