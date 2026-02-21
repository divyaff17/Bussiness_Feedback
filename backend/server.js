import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: join(__dirname, '.env') });

// ── SECURITY: Fail fast if critical secrets are missing ──
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
    process.exit(1);
}

// Import Supabase client (replaces SQLite)
import './db/supabase.js';

// Import routes
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import feedbackRoutes from './routes/feedback.js';
import uploadRoutes from './routes/upload.js';

// Import middleware
import { apiLimiter } from './middleware/rateLimit.js';
import { sanitizeInputs } from './middleware/sanitize.js';

const app = express();
const PORT = process.env.PORT || 8081;

// Trust proxy - required for Railway/Vercel reverse proxy (fixes X-Forwarded-For rate limiting)
app.set('trust proxy', 1);

// ── SECURITY LAYER 1: HTTP Security Headers (Helmet) ──
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow cross-origin resources (API)
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
}));

// ── SECURITY LAYER 2: HTTP Parameter Pollution Protection ──
app.use(hpp());

// ── SECURITY LAYER 3: CORS configuration ──
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8000').replace(/\/+$/, '').split('/').slice(0, 3).join('/');
const allowedOrigins = [
    frontendUrl,
    'http://localhost:8000',
    'https://bussiness-feedback-ap8e.vercel.app',
    'http://localhost:8001'
].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        // Allow exact matches
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Allow all Vercel preview deployments for this project
        if (/^https:\/\/bussiness-feedback-ap8e.*\.vercel\.app$/.test(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600, // Preflight cache 10 min
}));

// ── SECURITY LAYER 4: Body parsing with strict limits ──
app.use(express.json({ limit: '5mb' })); // Reduced from 10mb
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── SECURITY LAYER 5: Input sanitization (XSS protection) ──
app.use(sanitizeInputs);

// ── SECURITY LAYER 6: Rate limiting ──
app.use('/api', apiLimiter);

// ── SECURITY: Remove fingerprinting headers ──
app.disable('x-powered-by');

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'supabase', timestamp: new Date().toISOString() });
});

// Temporary debug endpoint - REMOVE AFTER FIXING
app.get('/debug-email-config', (req, res) => {
    res.json({
        hasSmtpUser: !!process.env.SMTP_USER,
        hasSmtpPass: !!process.env.SMTP_PASS,
        nodeEnv: process.env.NODE_ENV || 'not set'
    });
});

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling middleware — SECURITY: never leak stack traces
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error('Server error:', isProduction ? err.message : err);
    res.status(err.status || 500).json({ error: 'Internal server error' });
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
