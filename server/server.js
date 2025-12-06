import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socketHandlers.js';
import adminRoutes from './adminRoutes.js';
import { initDatabase } from './db/index.js';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Admin API routes
app.use('/api/admin', adminRoutes);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    setupSocketHandlers(io);
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

