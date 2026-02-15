import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

// SECURITY: HTML-escape function to prevent XSS in email templates
function esc(str) {
    if (typeof str !== 'string') return str || '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

dotenv.config();

// ── Email sending strategy ──
// Priority: RESEND_API_KEY (HTTP, works on Railway) → SMTP (local dev)
const useResend = !!process.env.RESEND_API_KEY;

/**
 * Send email via Resend HTTP API (works on Railway/cloud platforms)
 */
async function sendViaResend(mailOptions) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.RESEND_FROM || 'ReviewDock <onboarding@resend.dev>',
            to: [mailOptions.to],
            subject: mailOptions.subject,
            html: mailOptions.html,
            text: mailOptions.text
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Resend API error: ${err.message || JSON.stringify(err)}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
}

/**
 * Send email via SMTP (Nodemailer) - for local development
 */
async function sendViaSMTP(mailOptions) {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
}

/**
 * Unified email sender - automatically picks the right transport
 */
async function sendEmail(mailOptions) {
    if (useResend) {
        return sendViaResend(mailOptions);
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        // Dev mode fallback
        console.log('='.repeat(50));
        console.log('📧 EMAIL (Development Mode - No email service configured)');
        console.log('='.repeat(50));
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Text: ${mailOptions.text?.substring(0, 200)}`);
        console.log('='.repeat(50));
        return { success: true, messageId: 'dev-mode' };
    }
    return sendViaSMTP(mailOptions);
}

// Create SMTP transporter (only used when RESEND_API_KEY is not set)
let transporter;
if (!useResend) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000
    });

    transporter.verify((error, success) => {
        if (error) {
            console.log('SMTP email service not configured:', error.message);
            console.log('OTP verification will use console logging in development mode.');
        } else {
            console.log('SMTP email service ready');
        }
    });
}

if (useResend) {
    console.log('Email service: Resend (HTTP API) ✅');
}

/**
 * Generate a 6-digit OTP code using cryptographically secure random
 * SECURITY: Uses crypto.randomInt instead of Math.random for unpredictability
 */
export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP verification email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code to send
 * @param {string} businessName - Business name for personalization
 */
export const sendOTPEmail = async (email, otp, businessName = 'your business') => {
    const mailOptions = {
        from: process.env.SMTP_FROM || '"Feedback System" <noreply@feedback.app>',
        to: email,
        subject: 'Verify Your Email - Feedback System',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 30px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%); border-radius: 24px 24px 0 0; text-align: center;">
                                        <h1 style="margin: 0; font-size: 28px; color: #ffffff;">✉️ Email Verification</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px 30px; background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%); border: 1px solid rgba(255, 255, 255, 0.1);">
                                        <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.6;">
                                            Hi there! 👋
                                        </p>
                                        <p style="margin: 0 0 30px; color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.6;">
                                            You're setting up <strong style="color: #a5b4fc;">${esc(businessName)}</strong> on our Feedback System. 
                                            Use this verification code to confirm your email:
                                        </p>
                                        
                                        <!-- OTP Code Box -->
                                        <div style="text-align: center; margin: 30px 0;">
                                            <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%); border: 2px solid rgba(102, 126, 234, 0.5); border-radius: 16px;">
                                                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace;">${otp}</span>
                                            </div>
                                        </div>
                                        
                                        <p style="margin: 30px 0 0; color: rgba(255, 255, 255, 0.5); font-size: 14px; line-height: 1.6;">
                                            ⏱️ This code expires in <strong>10 minutes</strong>.<br>
                                            🔒 If you didn't request this, please ignore this email.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 30px; background: rgba(20, 20, 30, 0.8); border-radius: 0 0 24px 24px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.05); border-top: none;">
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
                                            © 2025 Feedback System. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
        text: `Your verification code for Feedback System is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
    };

    try {
        const result = await sendEmail(mailOptions);
        console.log('OTP email sent:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        throw new Error('Failed to send verification email');
    }
};

export default { sendEmail };

/**
 * Send negative feedback alert to business owner
 * @param {string} email - Business owner email
 * @param {string} businessName - Business name
 * @param {object} feedback - Feedback details { message, rating, sentiment }
 */
export const sendNegativeFeedbackAlert = async (email, businessName, feedback) => {
    const mailOptions = {
        from: process.env.SMTP_FROM || '"Feedback System" <noreply@feedback.app>',
        to: email,
        subject: `⚠️ Negative Feedback Alert - ${businessName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 30px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.25) 100%); border-radius: 24px 24px 0 0; text-align: center;">
                                        <h1 style="margin: 0; font-size: 28px; color: #ffffff;">⚠️ Negative Feedback</h1>
                                        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">Immediate attention recommended</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 30px; background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%); border: 1px solid rgba(255, 255, 255, 0.1);">
                                        <p style="margin: 0 0 15px; color: rgba(255, 255, 255, 0.8); font-size: 16px;">
                                            Hi, <strong style="color: #a5b4fc;">${esc(businessName)}</strong> received a negative review:
                                        </p>
                                        <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; margin: 20px 0;">
                                            <p style="margin: 0 0 8px; color: #fbbf24; font-size: 18px;">${'⭐'.repeat(feedback.rating || 1)}${'☆'.repeat(5 - (feedback.rating || 1))}</p>
                                            <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 15px; line-height: 1.6; font-style: italic;">"${esc(feedback.message) || 'No message provided'}"</p>
                                            ${feedback.sentiment ? `<p style="margin: 10px 0 0; color: #f87171; font-size: 13px;">AI Sentiment: ${esc(feedback.sentiment)}</p>` : ''}
                                        </div>
                                        <p style="margin: 20px 0 0; color: rgba(255, 255, 255, 0.6); font-size: 14px;">
                                            💡 <strong>Tip:</strong> Reply quickly to negative feedback to improve customer satisfaction. Go to your Dashboard to respond.
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 30px; background: rgba(20, 20, 30, 0.8); border-radius: 0 0 24px 24px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.05); border-top: none;">
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 12px;">© 2025 Feedback System. All rights reserved.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
        text: `Negative Feedback Alert for ${businessName}\n\nRating: ${feedback.rating || 1}/5\nMessage: ${feedback.message || 'No message'}\n\nLog in to your Dashboard to respond.`
    };

    try {
        const result = await sendEmail(mailOptions);
        console.log('Negative feedback alert sent:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send negative feedback alert:', error);
        // Don't throw - alert email failure shouldn't block feedback submission
        return { success: false, error: error.message };
    }
};

/**
 * Send reply email to the customer who submitted feedback
 * @param {string} customerEmail - Customer's email address
 * @param {string} businessName - Business name
 * @param {object} details - { originalMessage, originalRating, replyText }
 */
export const sendReplyToCustomer = async (customerEmail, businessName, details) => {
    const { originalMessage, originalRating, replyText } = details;
    const stars = '⭐'.repeat(originalRating || 0) + '☆'.repeat(5 - (originalRating || 0));

    const mailOptions = {
        from: process.env.SMTP_FROM || '"ReviewDock" <noreply@reviewdock.app>',
        to: customerEmail,
        subject: `${businessName} responded to your feedback`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 30px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%); border-radius: 24px 24px 0 0; text-align: center;">
                                        <h1 style="margin: 0; font-size: 26px; color: #ffffff;">💬 You got a response!</h1>
                                        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.7); font-size: 14px;"><strong style="color: #a5b4fc;">${esc(businessName)}</strong> replied to your feedback</p>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 30px; background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%); border: 1px solid rgba(255, 255, 255, 0.1);">
                                        
                                        <!-- Your original feedback -->
                                        <p style="margin: 0 0 10px; color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Feedback</p>
                                        <div style="padding: 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; margin: 0 0 24px;">
                                            <p style="margin: 0 0 8px; color: #fbbf24; font-size: 16px;">${stars}</p>
                                            ${originalMessage ? `<p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 14px; line-height: 1.6; font-style: italic;">"${esc(originalMessage)}"</p>` : '<p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 14px;">No message</p>'}
                                        </div>
                                        
                                        <!-- Business reply -->
                                        <p style="margin: 0 0 10px; color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Response from ${esc(businessName)}</p>
                                        <div style="padding: 16px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px;">
                                            <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 15px; line-height: 1.7;">${esc(replyText)}</p>
                                        </div>
                                        
                                        <p style="margin: 24px 0 0; color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6;">
                                            Thank you for sharing your feedback. Your input helps businesses improve their services.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 30px; background: rgba(20, 20, 30, 0.8); border-radius: 0 0 24px 24px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.05); border-top: none;">
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
                                            Sent via <strong>ReviewDock</strong> &bull; Feedback Management Platform
                                        </p>
                                        <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.3); font-size: 11px;">
                                            This email was sent because you provided your email when submitting feedback.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
        text: `${businessName} responded to your feedback\n\nYour Feedback:\nRating: ${originalRating}/5\n${originalMessage ? `Message: "${originalMessage}"` : 'No message'}\n\nResponse from ${businessName}:\n${replyText}\n\n---\nSent via ReviewDock`
    };

    try {
        const result = await sendEmail(mailOptions);
        console.log('Reply email sent to customer:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send reply to customer:', error);
        return { success: false, error: error.message };
    }
};
