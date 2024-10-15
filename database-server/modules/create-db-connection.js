const { Pool } = require('pg');
const dotenv = require('dotenv');

// Loads .env file contents into process.env
dotenv.config();
const ENV = process.env;

console.log(ENV.NODE_ENV);

// Create a new client
const connectionPool = new Pool({
  user: ENV.DB_USER,
  host: ENV.DB_HOST,
  database: ENV.NODE_ENV === 'test' ? `test-${ENV.DB_NAME}` : ENV.DB_NAME,
  password: ENV.DB_PASSWORD,
  port: ENV.DB_PORT,
});



process.on('exit', () => {
  console.log('Closing database connection pool...');
  connectionPool.end();
});

module.exports = connectionPool;
