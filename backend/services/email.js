import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

// Force IPv4 to avoid IPv6 routing issues on cloud platforms
dns.setDefaultResultOrder('ipv4first');

// ── SECURITY: HTML-escape to prevent XSS in email templates ──
function esc(str) {
    if (typeof str !== 'string') return str || '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// ══════════════════════════════════════════════════════════════════
//  SMTP Configuration
//
//  Gmail SMTP (smtp.gmail.com:587/465) is BLOCKED by Railway,
//  Vercel, Render, and most cloud/container platforms.
//
//  PRODUCTION SOLUTION: Use Brevo (free 300 emails/day) SMTP relay.
//  Sign up at https://brevo.com → SMTP & API → SMTP tab → get key.
//
//  Railway env vars needed:
//    SMTP_HOST=smtp-relay.brevo.com
//    SMTP_PORT=587
//    SMTP_USER=your-brevo-login-email
//    SMTP_PASS=your-brevo-smtp-key
//    SMTP_FROM="ReviewDock" <your-verified-email@gmail.com>
//
//  If port 587 is also blocked, change SMTP_PORT=2525
// ══════════════════════════════════════════════════════════════════

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || `"Feedback System" <${SMTP_USER}>`;
const SMTP_SECURE = SMTP_PORT === 465;

// Ports to try in order: configured port → 2525 fallback → 465 SSL fallback
const FALLBACK_PORTS = [SMTP_PORT, 2525, 465].filter(
    (port, i, arr) => arr.indexOf(port) === i // deduplicate
);

// ── Create a transporter for a specific port ──
function createTransporter(host, port) {
    const secure = port === 465;
    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
        },
    });
}

// ── Startup: find a working port ──
let activeTransporter = null;
let activePort = null;

async function initTransporter() {
    if (!SMTP_USER || !SMTP_PASS) {
        console.error('⚠️  SMTP_USER or SMTP_PASS not set — email will not work.');
        return null;
    }

    for (const port of FALLBACK_PORTS) {
        const secure = port === 465;
        console.log(`📧 Trying SMTP: ${SMTP_HOST}:${port} (${secure ? 'SSL' : 'STARTTLS'})...`);
        const t = createTransporter(SMTP_HOST, port);
        try {
            await t.verify();
            console.log(`✅ SMTP connected on ${SMTP_HOST}:${port}`);
            activeTransporter = t;
            activePort = port;
            return t;
        } catch (err) {
            console.error(`   ❌ Port ${port} failed: ${err.message}`);
            t.close();
        }
    }

    console.error('⚠️  All SMTP ports failed. Will retry on first email send.');
    return null;
}

// Run on startup (non-blocking)
initTransporter();

// ── Core sendEmail with port-fallback retry ──
async function sendEmail(mailOptions) {
    // If we already have a working transporter, use it
    if (activeTransporter) {
        try {
            const info = await activeTransporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            // If send fails, reset and fall through to retry logic
            console.error(`Send failed on port ${activePort}:`, error.message);
            activeTransporter.close();
            activeTransporter = null;
            activePort = null;
        }
    }

    // Try each port
    for (const port of FALLBACK_PORTS) {
        console.log(`📧 Retrying SMTP on ${SMTP_HOST}:${port}...`);
        const t = createTransporter(SMTP_HOST, port);
        try {
            const info = await t.sendMail(mailOptions);
            // This port works — cache the transporter
            activeTransporter = t;
            activePort = port;
            console.log(`✅ Email sent via port ${port}: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`   ❌ Port ${port}: ${error.message}`);
            t.close();
        }
    }

    throw new Error(
        `All SMTP ports (${FALLBACK_PORTS.join(', ')}) failed for ${SMTP_HOST}. ` +
        `Ensure SMTP_HOST, SMTP_USER, SMTP_PASS are correct in env vars. ` +
        `If using Gmail directly, switch to Brevo (smtp-relay.brevo.com) — see email.js comments.`
    );
}

// ══════════════════════════════════════════════════════════════════
//  Public API (same exports as before — auth.js works unchanged)
// ══════════════════════════════════════════════════════════════════

/** Generate a cryptographically secure 6-digit OTP */
export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/** Send OTP verification email */
export const sendOTPEmail = async (email, otp, businessName = 'your business') => {
    const mailOptions = {
        from: SMTP_FROM,
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
                                <tr>
                                    <td style="padding: 30px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%); border-radius: 24px 24px 0 0; text-align: center;">
                                        <h1 style="margin: 0; font-size: 28px; color: #ffffff;">✉️ Email Verification</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 40px 30px; background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%); border: 1px solid rgba(255, 255, 255, 0.1);">
                                        <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.6;">Hi there! 👋</p>
                                        <p style="margin: 0 0 30px; color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.6;">
                                            You're setting up <strong style="color: #a5b4fc;">${esc(businessName)}</strong> on our Feedback System. 
                                            Use this verification code to confirm your email:
                                        </p>
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
        text: `Your verification code for Feedback System is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
    };

    try {
        const result = await sendEmail(mailOptions);
        console.log('OTP email sent:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send OTP email:', error.message);
        throw error;
    }
};

/** Send negative feedback alert to business owner */
export const sendNegativeFeedbackAlert = async (email, businessName, feedback) => {
    const mailOptions = {
        from: SMTP_FROM,
        to: email,
        subject: `⚠️ Negative Feedback Alert - ${businessName}`,
        html: `
            <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 20px;">
            <table role="presentation" style="width:100%;max-width:480px;border-collapse:collapse;">
            <tr><td style="padding:30px;background:linear-gradient(135deg,rgba(239,68,68,0.25)0%,rgba(220,38,38,0.25)100%);border-radius:24px 24px 0 0;text-align:center;">
                <h1 style="margin:0;font-size:28px;color:#fff;">⚠️ Negative Feedback</h1>
                <p style="margin:10px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Immediate attention recommended</p>
            </td></tr>
            <tr><td style="padding:30px;background:linear-gradient(135deg,rgba(30,30,40,0.95)0%,rgba(20,20,30,0.95)100%);border:1px solid rgba(255,255,255,0.1);">
                <p style="margin:0 0 15px;color:rgba(255,255,255,0.8);font-size:16px;">Hi, <strong style="color:#a5b4fc;">${esc(businessName)}</strong> received a negative review:</p>
                <div style="padding:16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;margin:20px 0;">
                    <p style="margin:0 0 8px;color:#fbbf24;font-size:18px;">${'⭐'.repeat(feedback.rating || 1)}${'☆'.repeat(5 - (feedback.rating || 1))}</p>
                    <p style="margin:0;color:rgba(255,255,255,0.9);font-size:15px;line-height:1.6;font-style:italic;">"${esc(feedback.message) || 'No message provided'}"</p>
                    ${feedback.sentiment ? `<p style="margin:10px 0 0;color:#f87171;font-size:13px;">AI Sentiment: ${esc(feedback.sentiment)}</p>` : ''}
                </div>
                <p style="margin:20px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">💡 <strong>Tip:</strong> Reply quickly to negative feedback to improve customer satisfaction.</p>
            </td></tr>
            <tr><td style="padding:20px 30px;background:rgba(20,20,30,0.8);border-radius:0 0 24px 24px;text-align:center;border:1px solid rgba(255,255,255,0.05);border-top:none;">
                <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">© 2025 Feedback System</p>
            </td></tr></table></td></tr></table></body></html>
        `,
        text: `Negative Feedback Alert for ${businessName}\nRating: ${feedback.rating || 1}/5\nMessage: ${feedback.message || 'No message'}\nLog in to your Dashboard to respond.`
    };
    try {
        const result = await sendEmail(mailOptions);
        console.log('Negative feedback alert sent:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send negative feedback alert:', error.message);
        return { success: false, error: error.message };
    }
};

/** Send reply email to a customer */
export const sendReplyToCustomer = async (customerEmail, businessName, details) => {
    const { originalMessage, originalRating, replyText } = details;
    const stars = '⭐'.repeat(originalRating || 0) + '☆'.repeat(5 - (originalRating || 0));
    const mailOptions = {
        from: SMTP_FROM,
        to: customerEmail,
        subject: `${businessName} responded to your feedback`,
        html: `
            <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:40px 20px;">
            <table role="presentation" style="width:100%;max-width:520px;border-collapse:collapse;">
            <tr><td style="padding:30px;background:linear-gradient(135deg,rgba(99,102,241,0.25)0%,rgba(168,85,247,0.25)100%);border-radius:24px 24px 0 0;text-align:center;">
                <h1 style="margin:0;font-size:26px;color:#fff;">💬 You got a response!</h1>
                <p style="margin:10px 0 0;color:rgba(255,255,255,0.7);font-size:14px;"><strong style="color:#a5b4fc;">${esc(businessName)}</strong> replied to your feedback</p>
            </td></tr>
            <tr><td style="padding:30px;background:linear-gradient(135deg,rgba(30,30,40,0.95)0%,rgba(20,20,30,0.95)100%);border:1px solid rgba(255,255,255,0.1);">
                <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Feedback</p>
                <div style="padding:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;margin:0 0 24px;">
                    <p style="margin:0 0 8px;color:#fbbf24;font-size:16px;">${stars}</p>
                    ${originalMessage ? `<p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px;line-height:1.6;font-style:italic;">"${esc(originalMessage)}"</p>` : '<p style="margin:0;color:rgba(255,255,255,0.4);font-size:14px;">No message</p>'}
                </div>
                <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Response from ${esc(businessName)}</p>
                <div style="padding:16px;background:linear-gradient(135deg,rgba(99,102,241,0.15)0%,rgba(168,85,247,0.1)100%);border:1px solid rgba(99,102,241,0.3);border-radius:12px;">
                    <p style="margin:0;color:rgba(255,255,255,0.95);font-size:15px;line-height:1.7;">${esc(replyText)}</p>
                </div>
                <p style="margin:24px 0 0;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">Thank you for sharing your feedback.</p>
            </td></tr>
            <tr><td style="padding:20px 30px;background:rgba(20,20,30,0.8);border-radius:0 0 24px 24px;text-align:center;border:1px solid rgba(255,255,255,0.05);border-top:none;">
                <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">Sent via <strong>ReviewDock</strong> &bull; Feedback Management</p>
            </td></tr></table></td></tr></table></body></html>
        `,
        text: `${businessName} responded to your feedback\nYour Rating: ${originalRating}/5\n${originalMessage ? `Message: "${originalMessage}"` : 'No message'}\n\nResponse: ${replyText}\n---\nSent via ReviewDock`
    };
    try {
        const result = await sendEmail(mailOptions);
        console.log('Reply email sent to customer:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send reply to customer:', error.message);
        return { success: false, error: error.message };
    }
};

export default { sendEmail };
