import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: join(__dirname, '.env') });

// Import Supabase client (replaces SQLite)
import './db/supabase.js';

// Import routes
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import feedbackRoutes from './routes/feedback.js';
import uploadRoutes from './routes/upload.js';

// Import middleware
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 8081;

// Trust proxy - required for Railway/Vercel reverse proxy (fixes X-Forwarded-For rate limiting)
app.set('trust proxy', 1);

// CORS configuration - allow both local dev and production origins
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8000').replace(/\/+$/, '').split('/').slice(0, 3).join('/');
const allowedOrigins = [
    frontendUrl,
    'http://localhost:8000',
    'https://bussiness-feedback-ap8e.vercel.app'
].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Parse JSON bodies (increased limit for image uploads)
app.use(express.json({ limit: '10mb' }));

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
app.use('/api/upload', uploadRoutes);

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
