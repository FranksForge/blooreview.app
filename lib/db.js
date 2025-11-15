import pg from 'pg';

const { Pool } = pg;

// Create a connection pool
let pool = null;

function getPool() {
  if (!pool) {
    // Prefer POSTGRES_PRISMA_URL for serverless (better for connection pooling)
    // Fall back to POSTGRES_URL if PRISMA_URL is not available
    const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('POSTGRES_PRISMA_URL or POSTGRES_URL environment variable must be set');
    }

    // Parse connection string to check for Supabase or SSL requirement
    // Supabase connection strings typically contain 'supabase.co' or have sslmode=require
    const isSupabase = connectionString.includes('supabase.co') || 
                       connectionString.includes('.supabase.co') ||
                       connectionString.toLowerCase().includes('supabase');
    
    const requiresSSL = connectionString.includes('sslmode=require') || 
                        connectionString.includes('sslmode=prefer') ||
                        isSupabase;

    // For Supabase connections, always enable SSL with rejectUnauthorized: false
    // This handles self-signed certificates that Supabase uses
    // Remove sslmode from connection string and handle SSL via config instead
    let cleanConnectionString = connectionString;
    if (requiresSSL) {
      // Remove sslmode from connection string to avoid conflicts
      cleanConnectionString = connectionString
        .replace(/[?&]sslmode=[^&]*/g, '')
        .replace(/[?&]pgbouncer=[^&]*/g, '');
      
      // Re-add pgbouncer if it was there (for connection pooling)
      if (connectionString.includes('pgbouncer=true')) {
        cleanConnectionString += (cleanConnectionString.includes('?') ? '&' : '?') + 'pgbouncer=true';
      }
    }

    const sslConfig = requiresSSL
      ? { 
          rejectUnauthorized: false, // Allow self-signed certificates for Supabase
          require: true // Require SSL connection
        }
      : false;

    console.log('Database connection config:', {
      usingPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
      hasSSL: !!sslConfig,
      isSupabase,
      requiresSSL,
      connectionStringPreview: cleanConnectionString.substring(0, 60) + '...'
    });

    pool = new Pool({
      connectionString: cleanConnectionString,
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
      // Always add a placeholder, even for null/undefined
      // PostgreSQL handles null values correctly
      if (value !== undefined) {
        queryValues.push(value);
        text += `$${queryValues.length}`;
      } else {
        // For undefined, use NULL in SQL
        text += 'NULL';
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

