import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupSocketHandlers } from './socketHandlers.js';
import adminRoutes from './adminRoutes.js';
import { initDatabase } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Admin API routes - MUST come before static file serving
app.use('/api/admin', adminRoutes);

// Serve static files from client/dist in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const clientDistPath = join(__dirname, '..', 'client', 'dist');
  
  // Serve static files (CSS, JS, images, etc.)
  app.use(express.static(clientDistPath));
  
  // Serve index.html for all non-API routes (SPA routing)
  // This must be last to catch all routes except /api/*
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
      return next();
    }
    res.sendFile(join(clientDistPath, 'index.html'));
  });
}

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database schema
    await initDatabase();
    
    // Setup socket handlers
    setupSocketHandlers(io);
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      if (isProduction) {
        console.log(`Serving production build from client/dist`);
      }
      if (process.env.DATABASE_URL) {
        console.log(`Database connection: Active`);
      } else {
        console.log(`Database connection: Not configured (in-memory mode)`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

