import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers } from '../db/connection.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Register a new business owner
 */
router.post('/signup', authLimiter, async (req, res) => {
    try {
        const { email, password, businessName, category, googleReviewUrl, logoUrl } = req.body;

        // Validation
        if (!email || !password || !businessName || !category || !googleReviewUrl) {
            return res.status(400).json({
                error: 'Missing required fields: email, password, businessName, category, googleReviewUrl'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const existingUser = dbHelpers.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create business first
        const businessId = uuidv4();
        dbHelpers.prepare(`
            INSERT INTO businesses (id, name, category, logo_url, google_review_url)
            VALUES (?, ?, ?, ?, ?)
        `).run(businessId, businessName, category, logoUrl || null, googleReviewUrl);

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        dbHelpers.prepare(`
            INSERT INTO users (id, email, password_hash, business_id)
            VALUES (?, ?, ?, ?)
        `).run(userId, email.toLowerCase(), passwordHash, businessId);

        // Generate token
        const user = { id: userId, email: email.toLowerCase(), business_id: businessId };
        const token = generateToken(user);

        res.status(201).json({
            message: 'Account created successfully',
            token,
            user: {
                id: userId,
                email: email.toLowerCase(),
                businessId,
                businessName
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * POST /api/auth/login
 * Login for business owners
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = dbHelpers.prepare(`
            SELECT u.*, b.name as business_name 
            FROM users u 
            JOIN businesses b ON u.business_id = b.id 
            WHERE u.email = ?
        `).get(email.toLowerCase());

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                businessId: user.business_id,
                businessName: user.business_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info (protected)
 */
router.get('/me', authenticate, (req, res) => {
    try {
        const { userId } = req.user;

        const user = dbHelpers.prepare(`
            SELECT u.id, u.email, u.business_id, b.name as business_name
            FROM users u
            JOIN businesses b ON u.business_id = b.id
            WHERE u.id = ?
        `).get(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            businessId: user.business_id,
            businessName: user.business_name
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

export default router;
