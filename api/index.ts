import app, { initDb } from '../server.js';

let initializationPromise: Promise<void> | null = null;

export default async (req: any, res: any) => {
  try {
    if (!initializationPromise) {
      console.log('Starting Vercel serverless function initialization...');
      const start = Date.now();
      initializationPromise = initDb().then(() => {
        console.log(`Initialization complete in ${Date.now() - start}ms.`);
      }).catch(err => {
        console.error('Initialization failed:', err);
        initializationPromise = null; // Allow retry on next request
        throw err;
      });
    }
    
    await initializationPromise;
    
    // Vercel's proxy handles the /api prefix, but our express app expects it too
    // if the routes are defined with /api.
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel Function Error:', error);
    res.status(500).json({
      error: 'Internal Server Error during initialization',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
