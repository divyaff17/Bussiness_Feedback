import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

// ── SECURITY: HTML-escape function to prevent XSS in email templates ──
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
// Force IPv4 DNS resolution globally
// Many cloud hosts (Railway, Render) have IPv6 routing issues that
// cause SMTP connections to hang/timeout. This forces IPv4 only.
// ══════════════════════════════════════════════════════════════════
dns.setDefaultResultOrder('ipv4first');

// ── Resolve SMTP host to IPv4 address to bypass DNS/IPv6 issues ──
async function resolveSmtpHost(host) {
    return new Promise((resolve) => {
        dns.resolve4(host, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                console.log(`DNS resolve4 failed for ${host}, using hostname directly`);
                resolve(host);
            } else {
                console.log(`Resolved ${host} → ${addresses[0]} (IPv4)`);
                resolve(addresses[0]);
            }
        });
    });
}

// ── Create SMTP transporter ──
// Uses port 465 with direct SSL (more reliable on cloud platforms)
// Port 587 with STARTTLS is often blocked by cloud firewalls
let transporter = null;
let transporterReady = false;

async function getTransporter() {
    if (transporter && transporterReady) return transporter;

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465');
    const smtpSecure = smtpPort === 465 ? true : (process.env.SMTP_SECURE === 'true');

    // Resolve to IPv4 IP address to avoid IPv6 routing issues
    const resolvedHost = await resolveSmtpHost(smtpHost);

    transporter = nodemailer.createTransport({
        host: resolvedHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 30000,   // 30 seconds
        greetingTimeout: 30000,     // 30 seconds
        socketTimeout: 60000,       // 60 seconds
        tls: {
            // Required when connecting by IP instead of hostname
            servername: smtpHost,
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
        },
        logger: process.env.NODE_ENV !== 'production',
        debug: process.env.NODE_ENV !== 'production',
    });

    transporterReady = true;
    return transporter;
}

// Verify SMTP on startup
(async () => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('⚠️  SMTP_USER or SMTP_PASS not set. Email will not work.');
            return;
        }
        const t = await getTransporter();
        await t.verify();
        console.log('✅ SMTP email service ready');
    } catch (error) {
        console.error('⚠️  SMTP verify failed:', error.message);
        console.error('   Will retry on first email send.');
        transporterReady = false;
        transporter = null;
    }
})();

// ── Core sendEmail helper with retry + transporter rebuild ──
async function sendEmail(mailOptions, retries = 2) {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const t = await getTransporter();
            const info = await t.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`Email send attempt ${attempt}/${retries + 1} failed:`, error.message);

            // Reset transporter so next attempt re-resolves DNS and reconnects
            transporter = null;
            transporterReady = false;

            if (attempt > retries) throw error;
            // Exponential backoff: 3s, 6s
            await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
        }
    }
}

// ── Generate a 6-digit OTP ──
export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// ── Send OTP verification email ──
export const sendOTPEmail = async (email, otp, businessName = 'your business') => {
    const mailOptions = {
        from: process.env.SMTP_FROM || `"Feedback System" <${process.env.SMTP_USER}>`,
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
                                        <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.6;">
                                            Hi there! 👋
                                        </p>
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
        throw error;
    }
};

// ── Send negative feedback alert to business owner ──
export const sendNegativeFeedbackAlert = async (email, businessName, feedback) => {
    const mailOptions = {
        from: process.env.SMTP_FROM || `"Feedback System" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `⚠️ Negative Feedback Alert - ${businessName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
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
                                            💡 <strong>Tip:</strong> Reply quickly to negative feedback to improve customer satisfaction.
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
        return { success: false, error: error.message };
    }
};

// ── Send reply email to the customer who submitted feedback ──
export const sendReplyToCustomer = async (customerEmail, businessName, details) => {
    const { originalMessage, originalRating, replyText } = details;
    const stars = '⭐'.repeat(originalRating || 0) + '☆'.repeat(5 - (originalRating || 0));

    const mailOptions = {
        from: process.env.SMTP_FROM || `"ReviewDock" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `${businessName} responded to your feedback`,
        html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" style="width: 100%; max-width: 520px; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 30px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%); border-radius: 24px 24px 0 0; text-align: center;">
                                        <h1 style="margin: 0; font-size: 26px; color: #ffffff;">💬 You got a response!</h1>
                                        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.7); font-size: 14px;"><strong style="color: #a5b4fc;">${esc(businessName)}</strong> replied to your feedback</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 30px; background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%); border: 1px solid rgba(255, 255, 255, 0.1);">
                                        <p style="margin: 0 0 10px; color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Feedback</p>
                                        <div style="padding: 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; margin: 0 0 24px;">
                                            <p style="margin: 0 0 8px; color: #fbbf24; font-size: 16px;">${stars}</p>
                                            ${originalMessage ? `<p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 14px; line-height: 1.6; font-style: italic;">"${esc(originalMessage)}"</p>` : '<p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 14px;">No message</p>'}
                                        </div>
                                        <p style="margin: 0 0 10px; color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Response from ${esc(businessName)}</p>
                                        <div style="padding: 16px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px;">
                                            <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 15px; line-height: 1.7;">${esc(replyText)}</p>
                                        </div>
                                        <p style="margin: 24px 0 0; color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6;">
                                            Thank you for sharing your feedback.
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px 30px; background: rgba(20, 20, 30, 0.8); border-radius: 0 0 24px 24px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.05); border-top: none;">
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
                                            Sent via <strong>ReviewDock</strong> &bull; Feedback Management Platform
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

export default { sendEmail };
