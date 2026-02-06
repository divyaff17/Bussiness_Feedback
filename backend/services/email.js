import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter - uses environment variables for configuration
// For production, use services like SendGrid, Mailgun, or AWS SES
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('Email service not configured:', error.message);
        console.log('OTP verification will use console logging in development mode.');
    } else {
        console.log('Email service ready');
    }
});

/**
 * Generate a 6-digit OTP code
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
                                            You're setting up <strong style="color: #a5b4fc;">${businessName}</strong> on our Feedback System. 
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

    // If SMTP is not configured, log to console (development mode)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('='.repeat(50));
        console.log('📧 OTP EMAIL (Development Mode)');
        console.log('='.repeat(50));
        console.log(`To: ${email}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`Expires: 10 minutes`);
        console.log('='.repeat(50));
        return { success: true, messageId: 'dev-mode' };
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Failed to send OTP email:', error);
        throw new Error('Failed to send verification email');
    }
};

export default transporter;
