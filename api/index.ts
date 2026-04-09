import app, { initDb, setupApp } from '../server';

let initializationPromise: Promise<void> | null = null;

export default async (req: any, res: any) => {
  try {
    if (!initializationPromise) {
      console.log('Starting Vercel serverless function initialization...');
      const start = Date.now();
      initializationPromise = Promise.all([
        initDb(),
        setupApp()
      ]).then(() => {
        console.log(`Initialization complete in ${Date.now() - start}ms.`);
      }).catch(err => {
        console.error('Initialization failed:', err);
        initializationPromise = null; // Allow retry on next request
        throw err;
      });
    }
    
    await initializationPromise;
    
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
