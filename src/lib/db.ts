import pg from 'pg';

// Force allow self-signed certificates for the entire process
// This is often necessary in environments where the pg library's SSL config 
// might be overridden or not fully respected by underlying native bindings.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is missing! Please set it in Vercel project settings.');
    }
    
    console.log('Initializing database pool...');
    
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      // Serverless optimizations:
      max: process.env.VERCEL === '1' ? 1 : 10, // Limit connections in serverless
      idleTimeoutMillis: 30000, // Keep connections alive longer in serverless to avoid re-connect overhead
      connectionTimeoutMillis: 10000, // Wait up to 10s for a connection
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
    
    console.log('Database pool initialized with SSL bypass (rejectUnauthorized: false)');
  }
  return pool;
}

export const query = async (text: string, params?: any[]) => {
  const p = getPool();
  let retries = 3;
  while (retries > 0) {
    try {
      return await p.query(text, params);
    } catch (err: any) {
      // Retry on connection exhaustion errors
      if (
        err.message.includes('remaining connection slots') || 
        err.message.includes('too many connections') ||
        err.message.includes('connection limit exceeded')
      ) {
        retries--;
        if (retries === 0) throw err;
        console.warn(`Database connection busy, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        continue;
      }
      throw err;
    }
  }
  return p.query(text, params); // Final attempt
};

export default { query, getPool };
