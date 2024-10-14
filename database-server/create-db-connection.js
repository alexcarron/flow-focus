const { Pool } = require('pg');
const dotenv = require('dotenv');

// Loads .env file contents into process.env
dotenv.config();
const ENV = process.env;

// Create a new client
const connectionPool = new Pool({
  user: ENV.DB_USER,
  host: ENV.DB_HOST,
  database: ENV.DB_NAME,
  password: ENV.DB_PASSWORD,
  port: ENV.DB_PORT,
});

process.on('exit', () => {
  console.log('Closing database connection pool...');
  connectionPool.end();
});

module.exports = connectionPool;
