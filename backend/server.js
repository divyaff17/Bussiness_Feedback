import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import Supabase client (replaces SQLite)
import './db/supabase.js';

// Import routes
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import feedbackRoutes from './routes/feedback.js';

// Import middleware
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 8080;

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'supabase', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/feedback', feedbackRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server (no database initialization needed - Supabase is cloud-based)
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║     🚀 Feedback System Backend (Supabase)             ║
║                                                        ║
║     Server:    http://localhost:${PORT}                   ║
║     Health:    http://localhost:${PORT}/health             ║
║     Database:  Supabase PostgreSQL (Cloud)            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});
