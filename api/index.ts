import app, { initDb } from '../server.ts';

let isInitialized = false;

export default async (req: any, res: any) => {
  try {
    if (!isInitialized) {
      console.log('Vercel: Initializing database...');
      if (!process.env.DATABASE_URL) {
        console.error('Vercel: DATABASE_URL is missing!');
        return res.status(500).json({ 
          error: 'Configuration Error', 
          message: 'DATABASE_URL environment variable is missing. Please add it to your Vercel project settings.' 
        });
      }
      
      await initDb();
      isInitialized = true;
      console.log('Vercel: Database initialized successfully');
    }
    
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel: Critical Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Server Error',
        message: error.message || 'An unexpected error occurred',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};
