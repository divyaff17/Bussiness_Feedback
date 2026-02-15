import express from 'express';
import { supabase } from '../db/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// SECURITY: Allowed MIME types for avatar uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * POST /api/upload/avatar
 * Upload profile picture - stores as base64 data URL in database
 * Expects base64 encoded image in request body
 */
router.post('/avatar', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;
        const { imageData } = req.body;

        if (!imageData) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        // Validate base64 image format
        const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid image format' });
        }

        // SECURITY: Validate MIME type
        const mimeType = matches[1];
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            return res.status(400).json({ 
                error: `Invalid image type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` 
            });
        }

        // Check image size (limit to 2MB of base64 data)
        const base64Data = matches[2];
        const sizeInBytes = (base64Data.length * 3) / 4;
        if (sizeInBytes > 2 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large. Maximum size is 2MB' });
        }

        // Store the base64 image directly in the database
        const { error: updateError } = await supabase
            .from('users')
            .update({ profile_picture_url: imageData })
            .eq('id', userId);

        if (updateError) {
            console.error('Update error:', updateError);
            return res.status(500).json({ error: 'Failed to update profile' });
        }

        res.json({
            message: 'Avatar uploaded successfully',
            url: imageData
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

/**
 * DELETE /api/upload/avatar
 * Delete profile picture
 */
router.delete('/avatar', authenticate, async (req, res) => {
    try {
        const { userId } = req.user;

        // Clear profile picture URL
        const { error: updateError } = await supabase
            .from('users')
            .update({ profile_picture_url: null })
            .eq('id', userId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update profile' });
        }

        res.json({ message: 'Avatar deleted successfully' });
    } catch (error) {
        console.error('Avatar delete error:', error);
        res.status(500).json({ error: 'Failed to delete avatar' });
    }
});

export default router;
