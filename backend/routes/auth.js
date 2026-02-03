import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Register a new business owner
 */
router.post('/signup', authLimiter, async (req, res) => {
    try {
        const { email, password, businessName, category, googleReviewUrl } = req.body;

        // Validation
        if (!email || !password || !businessName || !category || !googleReviewUrl) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generate IDs
        const businessId = uuidv4();
        const userId = uuidv4();

        // Create business
        const { error: businessError } = await supabase
            .from('businesses')
            .insert({
                id: businessId,
                name: businessName,
                category,
                google_review_url: googleReviewUrl,
                subscription_plan: 'free',
                monthly_feedback_limit: 50,
                monthly_feedback_count: 0
            });

        if (businessError) {
            console.error('Business creation error:', businessError);
            return res.status(500).json({ error: 'Failed to create business' });
        }

        // Create user
        const { error: userError } = await supabase
            .from('users')
            .insert({
                id: userId,
                email: email.toLowerCase(),
                password_hash: passwordHash,
                business_id: businessId
            });

        if (userError) {
            console.error('User creation error:', userError);
            // Rollback business creation
            await supabase.from('businesses').delete().eq('id', businessId);
            return res.status(500).json({ error: 'Failed to create user' });
        }

        // Generate JWT
        const token = generateToken({ userId, businessId });

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
 * Login with email and password
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user with business info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*, businesses(*)')
            .eq('email', email.toLowerCase())
            .single();

        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const token = generateToken({ userId: user.id, businessId: user.business_id });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                businessId: user.business_id,
                businessName: user.businesses.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info (protected)
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;

        const { data: user, error } = await supabase
            .from('users')
            .select('*, businesses(*)')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            businessId: user.business_id,
            businessName: user.businesses.name
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

export default router;
