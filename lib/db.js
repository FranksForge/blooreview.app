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

    // Parse connection string to check for Supabase
    const isSupabase = connectionString.includes('supabase.co') || 
                       connectionString.includes('supabase') ||
                       connectionString.includes('sslmode=require');

    // For Supabase and any connection requiring SSL, always enable SSL with rejectUnauthorized: false
    // This handles self-signed certificates
    const sslConfig = isSupabase || connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false;

    console.log('Creating database pool with SSL:', !!sslConfig, 'isSupabase:', isSupabase);

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: 1, // Serverless functions should use 1 connection
      // Additional options for Supabase
      ...(isSupabase && {
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      })
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
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

