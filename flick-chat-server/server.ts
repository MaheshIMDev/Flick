import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import friendsRoutes from './routes/friends';
import groupsRoutes from './routes/groups';
import messagesRoutes from './routes/messages';
import { initializeSocketIO } from './socket/socketServer';
import conversationsRoutes from './routes/conversations';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 4000;

// ✅ CORS - Allow frontend
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/friends', friendsRoutes);
app.use('/groups', groupsRoutes);
app.use('/messages', messagesRoutes);
app.use('/conversations', conversationsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize Socket.IO
let io: any;
if (process.env.NODE_ENV !== 'test') {
  io = initializeSocketIO(httpServer);
}

// Start server
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(port, () => {
    console.log('╔══════════════════════════════════════╗');
    console.log(`║  🚀 Server running on port ${port}      ║`);
    console.log(`║  📡 Socket.io enabled                ║`);
    console.log(`║  🔴 Redis connected                  ║`);
    console.log(`║  💚 PostgreSQL connected             ║`);
    console.log('╚══════════════════════════════════════╝');
    console.log(`\n📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Health check: http://localhost:${port}/health\n`);
  });
}

// Export for testing
export default app;
export { io };
