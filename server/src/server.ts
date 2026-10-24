import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { initDatabase } from './database/db.js';

dotenv.config();

// Initialize Relational Database & Seed Data
try {
  initDatabase();
} catch (err) {
  console.error('⚠️ Database initialization error:', err);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

// Enterprise Auth Middleware
app.use(authMiddleware);

// API Routes
app.use('/api', apiRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 HotelManagementOS Backend running at http://localhost:${PORT}`);
  console.log(`📊 Reports API: http://localhost:${PORT}/api/reports/overview/metrics`);
  console.log(`🏨 Rooms API: http://localhost:${PORT}/api/rooms`);
  console.log(`📑 Bookings API: http://localhost:${PORT}/api/bookings`);
});
