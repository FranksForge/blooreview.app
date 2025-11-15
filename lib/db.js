import pg from 'pg';

const { Pool } = pg;

// Create a connection pool
let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('POSTGRES_URL environment variable is not set');
    }

    // Determine SSL configuration
    let sslConfig = false;
    if (connectionString.includes('supabase') || connectionString.includes('sslmode=require')) {
      // Supabase requires SSL but may have self-signed certificates
      sslConfig = {
        rejectUnauthorized: false // Allow self-signed certificates for Supabase
      };
    } else if (connectionString.includes('sslmode=')) {
      // Other PostgreSQL connections with SSL
      sslConfig = {
        rejectUnauthorized: true
      };
    }

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: 1, // Serverless functions should use 1 connection
    });
  }

  return pool;
}

/**
 * Execute a SQL query using template literal syntax
 * Usage: sql`SELECT * FROM users WHERE email = ${email}`
 * Returns a Promise that resolves to a result object with .rows property
 */
export async function sql(strings, ...values) {
  const pool = getPool();
  
  // Build the query text with parameter placeholders
  let text = '';
  const queryValues = [];
  
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      const value = values[i];
      if (value !== undefined && value !== null) {
        queryValues.push(value);
        text += `$${queryValues.length}`;
      }
    }
  }
  
  // Execute the query and return result
  const result = await pool.query(text, queryValues);
  return result;
}

/**
 * Close the database connection pool
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

