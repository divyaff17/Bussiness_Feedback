import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { generateOTP, sendOTPEmail } from '../services/email.js';
import { isValidEmail, isStrongPassword, truncate } from '../middleware/sanitize.js';

const router = express.Router();

/**
 * POST /api/auth/send-otp
 * Send OTP verification code to email
 */
router.post('/send-otp', authLimiter, async (req, res) => {
    try {
        const { email, businessName } = req.body;

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'A valid email is required' });
        }

        // SECURITY: always respond the same way to prevent email enumeration
        const genericResponse = { 
            message: 'If this email is available, a verification code has been sent',
            expiresIn: 600
        };

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            // Don't reveal that email exists — return same generic message
            return res.json(genericResponse);
        }

        // Invalidate any existing OTPs for this email
        await supabase
            .from('email_verification_otps')
            .update({ verified: true })
            .eq('email', email.toLowerCase())
            .eq('verified', false);

        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        const { error: insertError } = await supabase
            .from('email_verification_otps')
            .insert({
                email: email.toLowerCase(),
                otp_code: otp,
                expires_at: expiresAt.toISOString(),
                verified: false,
                attempts: 0
            });

        if (insertError) {
            console.error('OTP insert error:', insertError);
            return res.status(500).json({ error: 'Failed to generate OTP' });
        }

        // Send OTP email
        await sendOTPEmail(email, otp, businessName);

        res.json({ 
            message: 'Verification code sent to your email',
            expiresIn: 600 // 10 minutes in seconds
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send verification code', debug: error.message, stack: error.stack?.split('\n').slice(0, 3) });
    }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP code
 */
router.post('/verify-otp', authLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        // Find valid OTP
        const { data: otpRecord, error: otpError } = await supabase
            .from('email_verification_otps')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('otp_code', otp)
            .eq('verified', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (otpError || !otpRecord) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Check if expired
        if (new Date(otpRecord.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Verification code has expired' });
        }

        // Check attempts (max 5)
        if (otpRecord.attempts >= 5) {
            return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
        }

        // Increment attempts
        await supabase
            .from('email_verification_otps')
            .update({ attempts: otpRecord.attempts + 1 })
            .eq('id', otpRecord.id);

        // Mark as verified
        await supabase
            .from('email_verification_otps')
            .update({ verified: true })
            .eq('id', otpRecord.id);

        res.json({ 
            verified: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify code' });
    }
});

/**
 * POST /api/auth/signup
 * Register a new business owner
 */
router.post('/signup', authLimiter, async (req, res) => {
    try {
        const { email, password, businessName, category, googleReviewUrl, ownerName, profilePictureUrl, reviewPlatforms, googleId } = req.body;

        // Validation - review platforms are now optional
        const hasReviewPlatforms = Array.isArray(reviewPlatforms) && reviewPlatforms.length > 0;
        const hasLegacyUrl = googleReviewUrl && googleReviewUrl.trim();
        
        // Password is required unless signing up with Google (googleId provided)
        const isGoogleSignup = !!googleId;
        
        if (!email || !businessName || !category) {
            return res.status(400).json({ error: 'Email, business name, and category are required' });
        }

        // Password validation only for non-Google signups
        if (!isGoogleSignup) {
            if (!password) {
                return res.status(400).json({ error: 'Password is required' });
            }
            if (!isStrongPassword(password)) {
                return res.status(400).json({ 
                    error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' 
                });
            }
        }

        // SECURITY: Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // SECURITY: Truncate/validate business name length
        if (businessName.length > 200) {
            return res.status(400).json({ error: 'Business name is too long' });
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

        // Hash password (only if provided)
        let passwordHash = null;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

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
                business_id: businessId,
                owner_name: ownerName || null,
                profile_picture_url: profilePictureUrl || null,
                google_id: googleId || null
            });

        if (userError) {
            console.error('User creation error:', userError);
            // Rollback business creation
            await supabase.from('businesses').delete().eq('id', businessId);
            return res.status(500).json({ error: 'Failed to create user' });
        }

        // Insert review platforms if provided
        if (hasReviewPlatforms) {
            const platformsToInsert = reviewPlatforms.map((p, idx) => ({
                business_id: businessId,
                platform_name: p.platform || 'custom',
                platform_label: p.label || p.platform || 'Review Link',
                url: p.url,
                is_primary: p.isPrimary || idx === 0,
                is_active: true
            }));

            const { error: platformError } = await supabase
                .from('review_platforms')
                .insert(platformsToInsert);

            if (platformError) {
                console.error('Review platforms insert error:', platformError);
                // Don't fail signup, just log the error
            }
        }

        // Generate JWT
        const token = generateToken({ userId, businessId });
        const refreshToken = generateRefreshToken({ userId, businessId });

        res.status(201).json({
            message: 'Account created successfully',
            token,
            refreshToken,
            user: {
                id: userId,
                email: email.toLowerCase(),
                businessId,
                businessName,
                ownerName: ownerName || null,
                profilePictureUrl: profilePictureUrl || null
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
        const refreshToken = generateRefreshToken({ userId: user.id, businessId: user.business_id });

        res.json({
            message: 'Login successful',
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                businessId: user.business_id,
                businessName: user.businesses.name,
                ownerName: user.owner_name || null,
                profilePictureUrl: user.profile_picture_url || null
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * POST /api/auth/google
 * Sign in or sign up via passwordless auth (Supabase Magic Link)
 * Accepts user data from Supabase Auth callback
 */
router.post('/google', authLimiter, async (req, res) => {
    try {
        const { email, name, picture, googleId, businessName, category, googleReviewUrl, reviewPlatforms } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const userName = name || email.split('@')[0];
        const userPicture = picture || null;

        // Check if user already exists
        const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('*, businesses(*)')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            // User exists - log them in
            // Update profile picture if changed
            if (userPicture && userPicture !== existingUser.profile_picture_url) {
                await supabase
                    .from('users')
                    .update({ profile_picture_url: userPicture })
                    .eq('id', existingUser.id);
            }

            // Update google_id if not set
            if (googleId && !existingUser.google_id) {
                await supabase
                    .from('users')
                    .update({ google_id: googleId })
                    .eq('id', existingUser.id);
            }

            const token = generateToken({ userId: existingUser.id, businessId: existingUser.business_id });

            return res.json({
                message: 'Login successful',
                token,
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    businessId: existingUser.business_id,
                    businessName: existingUser.businesses.name,
                    ownerName: existingUser.owner_name || userName,
                    profilePictureUrl: userPicture || existingUser.profile_picture_url
                },
                isNewUser: false
            });
        }

        // New user - check if we have required signup fields
        if (!businessName) {
            // Return that we need more info for signup
            return res.json({
                needsSignup: true,
                email,
                name: userName,
                picture: userPicture,
                googleId,
                message: 'Please complete your business registration'
            });
        }

        // Create new user with Google
        const businessId = uuidv4();
        const userId = uuidv4();

        // Create business
        const { error: businessError } = await supabase
            .from('businesses')
            .insert({
                id: businessId,
                name: businessName,
                category: category || 'Other',
                google_review_url: googleReviewUrl || '',
                subscription_plan: 'free',
                monthly_feedback_limit: 50,
                monthly_feedback_count: 0
            });

        if (businessError) {
            console.error('Business creation error:', businessError);
            return res.status(500).json({ error: 'Failed to create business' });
        }

        // Create user (no password for Google users)
        const { error: userError } = await supabase
            .from('users')
            .insert({
                id: userId,
                email: email.toLowerCase(),
                password_hash: null,
                business_id: businessId,
                owner_name: userName,
                profile_picture_url: userPicture,
                google_id: googleId || null
            });

        if (userError) {
            console.error('User creation error:', userError);
            await supabase.from('businesses').delete().eq('id', businessId);
            return res.status(500).json({ error: 'Failed to create user' });
        }

        // Insert review platforms if provided
        if (Array.isArray(reviewPlatforms) && reviewPlatforms.length > 0) {
            const platformsToInsert = reviewPlatforms.map((p, idx) => ({
                business_id: businessId,
                platform_name: p.platform || 'custom',
                platform_label: p.label || p.platform || 'Review Link',
                url: p.url,
                is_primary: p.isPrimary || idx === 0,
                is_active: true
            }));

            const { error: platformError } = await supabase
                .from('review_platforms')
                .insert(platformsToInsert);

            if (platformError) {
                console.error('Review platforms insert error:', platformError);
            }
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
                businessName,
                ownerName: userName,
                profilePictureUrl: userPicture
            },
            isNewUser: true
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
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
            businessName: user.businesses.name,
            ownerName: user.owner_name || null,
            profilePictureUrl: user.profile_picture_url || null
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset - generates token and returns it
 * In production, this should send an email instead
 */
router.post('/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email.toLowerCase())
            .single();

        if (userError || !user) {
            // Don't reveal if email exists or not for security
            return res.json({ 
                message: 'If an account with that email exists, a password reset link has been generated.',
                // In production, remove the token from response and send via email
            });
        }

        // Invalidate any existing tokens for this user
        await supabase
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('user_id', user.id)
            .eq('used', false);

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Store token in database
        const { error: tokenError } = await supabase
            .from('password_reset_tokens')
            .insert({
                user_id: user.id,
                token: resetToken,
                expires_at: expiresAt.toISOString(),
                used: false
            });

        if (tokenError) {
            console.error('Token creation error:', tokenError);
            return res.status(500).json({ error: 'Failed to create reset token' });
        }

        // SECURITY: Never return the token in response — send via email only
        // TODO: Wire up sendPasswordResetEmail(email, resetToken) when SMTP is configured
        res.json({ 
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', authLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' 
            });
        }

        // Find valid token
        const { data: resetToken, error: tokenError } = await supabase
            .from('password_reset_tokens')
            .select('*')
            .eq('token', token)
            .eq('used', false)
            .single();

        if (tokenError || !resetToken) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Check if token is expired
        if (new Date(resetToken.expires_at) < new Date()) {
            // Mark token as used
            await supabase
                .from('password_reset_tokens')
                .update({ used: true })
                .eq('id', resetToken.id);
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update user password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('id', resetToken.user_id);

        if (updateError) {
            console.error('Password update error:', updateError);
            return res.status(500).json({ error: 'Failed to update password' });
        }

        // Mark token as used
        await supabase
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('id', resetToken.id);

        res.json({ message: 'Password reset successful. You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

/**
 * GET /api/auth/verify-reset-token
 * Verify if a reset token is valid
 */
router.get('/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ valid: false, error: 'Token is required' });
        }

        const { data: resetToken, error } = await supabase
            .from('password_reset_tokens')
            .select('expires_at, used')
            .eq('token', token)
            .single();

        if (error || !resetToken) {
            return res.json({ valid: false, error: 'Invalid token' });
        }

        if (resetToken.used) {
            return res.json({ valid: false, error: 'Token has already been used' });
        }

        if (new Date(resetToken.expires_at) < new Date()) {
            return res.json({ valid: false, error: 'Token has expired' });
        }

        res.json({ valid: true });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ valid: false, error: 'Failed to verify token' });
    }
});

/**
 * POST /api/auth/change-password
 * Change password while logged in (requires current password)
 */
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { userId } = req.user;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ 
                error: 'New password must be at least 8 characters with uppercase, lowercase, and a number' 
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'New password must be different from current password' });
        }

        // Get user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newHash = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: newHash })
            .eq('id', userId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update password' });
        }

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

/**
 * POST /api/auth/refresh-token
 * Exchange a refresh token for a new access token
 */
router.post('/refresh-token', authLimiter, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Verify user still exists
        const { data: user, error } = await supabase
            .from('users')
            .select('id, business_id')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Issue new tokens
        const newAccessToken = generateToken({ userId: user.id, businessId: user.business_id });
        const newRefreshToken = generateRefreshToken({ userId: user.id, businessId: user.business_id });

        res.json({
            token: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error('Refresh token error:', error.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

export default router;
