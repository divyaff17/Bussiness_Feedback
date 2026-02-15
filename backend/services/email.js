import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

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
//  Brevo (Sendinblue) Transactional Email — HTTP API
//
//  Railway blocks ALL outbound SMTP ports (25, 465, 587, 2525).
//  This uses Brevo's HTTP API over HTTPS (port 443) — never blocked.
//
//  Setup (2 minutes):
//    1. Sign up free at https://brevo.com (300 emails/day free)
//    2. Go to: Settings → SMTP & API → API Keys tab
//    3. Create or copy your API key (starts with "xkeysib-")
//    4. Set env var:  BREVO_API_KEY=xkeysib-xxxxxxx
//    5. Verify sender email at: Settings → Senders & IPs → Add Sender
//       (verify pellohello911@gmail.com so Brevo can send from it)
//
//  Railway env vars needed:
//    BREVO_API_KEY=xkeysib-your-api-key-here
//    SMTP_FROM_EMAIL=pellohello911@gmail.com   (must be verified in Brevo)
//    SMTP_FROM_NAME=ReviewDock                 (optional display name)
// ══════════════════════════════════════════════════════════════════

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@feedback.app';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'ReviewDock';

if (!BREVO_API_KEY) {
    console.error('⚠️  BREVO_API_KEY not set. Email sending will fail.');
    console.error('   Get your free API key at: https://brevo.com → Settings → SMTP & API → API Keys');
} else {
    console.log('✅ Brevo email service configured (HTTP API)');
}

// ── Core email sender via Brevo HTTP API ──
async function sendEmail({ to, subject, html, text }) {
    if (!BREVO_API_KEY) {
        throw new Error(
            'BREVO_API_KEY is not set. ' +
            'Sign up free at https://brevo.com, get your API key from Settings → SMTP & API → API Keys tab, ' +
            'and set BREVO_API_KEY in Railway environment variables.'
        );
    }

    const payload = {
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
    };

    // Retry up to 3 times with backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                const errMsg = data.message || JSON.stringify(data);
                throw new Error(`Brevo API ${response.status}: ${errMsg}`);
            }

            console.log(`✅ Email sent to ${to} (messageId: ${data.messageId})`);
            return { success: true, messageId: data.messageId };
        } catch (error) {
            console.error(`Email attempt ${attempt}/3 failed:`, error.message);
            if (attempt === 3) throw error;
            await new Promise(r => setTimeout(r, 2000 * attempt));
        }
    }
}

// ══════════════════════════════════════════════════════════════════
//  Public API — same exports as before (auth.js works unchanged)
// ══════════════════════════════════════════════════════════════════

/** Generate a cryptographically secure 6-digit OTP */
export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/** Send OTP verification email */
export const sendOTPEmail = async (email, otp, businessName = 'your business') => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Email Verification</title></head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr><td align="center" style="padding:40px 20px;">
                    <table role="presentation" style="width:100%;max-width:480px;border-collapse:collapse;">
                        <tr><td style="padding:30px;background:linear-gradient(135deg,rgba(102,126,234,0.2)0%,rgba(118,75,162,0.2)100%);border-radius:24px 24px 0 0;text-align:center;">
                            <h1 style="margin:0;font-size:28px;color:#fff;">✉️ Email Verification</h1>
                        </td></tr>
                        <tr><td style="padding:40px 30px;background:linear-gradient(135deg,rgba(30,30,40,0.95)0%,rgba(20,20,30,0.95)100%);border:1px solid rgba(255,255,255,0.1);">
                            <p style="margin:0 0 20px;color:rgba(255,255,255,0.8);font-size:16px;line-height:1.6;">Hi there! 👋</p>
                            <p style="margin:0 0 30px;color:rgba(255,255,255,0.8);font-size:16px;line-height:1.6;">
                                You're setting up <strong style="color:#a5b4fc;">${esc(businessName)}</strong> on our Feedback System. 
                                Use this verification code to confirm your email:
                            </p>
                            <div style="text-align:center;margin:30px 0;">
                                <div style="display:inline-block;padding:20px 40px;background:linear-gradient(135deg,rgba(102,126,234,0.3)0%,rgba(118,75,162,0.3)100%);border:2px solid rgba(102,126,234,0.5);border-radius:16px;">
                                    <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#fff;font-family:'Courier New',monospace;">${otp}</span>
                                </div>
                            </div>
                            <p style="margin:30px 0 0;color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;">
                                ⏱️ This code expires in <strong>10 minutes</strong>.<br>
                                🔒 If you didn't request this, please ignore this email.
                            </p>
                        </td></tr>
                        <tr><td style="padding:20px 30px;background:rgba(20,20,30,0.8);border-radius:0 0 24px 24px;text-align:center;border:1px solid rgba(255,255,255,0.05);border-top:none;">
                            <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">© 2025 Feedback System. All rights reserved.</p>
                        </td></tr>
                    </table>
                </td></tr>
            </table>
        </body>
        </html>
    `;

    try {
        const result = await sendEmail({
            to: email,
            subject: 'Verify Your Email - Feedback System',
            html,
            text: `Your verification code for Feedback System is: ${otp}\n\nThis code expires in 10 minutes.\nIf you didn't request this, please ignore this email.`,
        });
        console.log('OTP email sent:', result.messageId);
        return result;
    } catch (error) {
        console.error('Failed to send OTP email:', error.message);
        throw error;
    }
};

/** Send negative feedback alert to business owner */
export const sendNegativeFeedbackAlert = async (email, businessName, feedback) => {
    const html = `
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
            <p style="margin:20px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">💡 <strong>Tip:</strong> Reply quickly to improve customer satisfaction.</p>
        </td></tr>
        <tr><td style="padding:20px 30px;background:rgba(20,20,30,0.8);border-radius:0 0 24px 24px;text-align:center;border:1px solid rgba(255,255,255,0.05);border-top:none;">
            <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">© 2025 Feedback System</p>
        </td></tr></table></td></tr></table></body></html>
    `;
    try {
        return await sendEmail({ to: email, subject: `⚠️ Negative Feedback Alert - ${businessName}`, html, text: `Negative Feedback for ${businessName}\nRating: ${feedback.rating || 1}/5\nMessage: ${feedback.message || 'No message'}` });
    } catch (error) {
        console.error('Failed to send alert:', error.message);
        return { success: false, error: error.message };
    }
};

/** Send reply email to a customer */
export const sendReplyToCustomer = async (customerEmail, businessName, details) => {
    const { originalMessage, originalRating, replyText } = details;
    const stars = '⭐'.repeat(originalRating || 0) + '☆'.repeat(5 - (originalRating || 0));
    const html = `
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
            <p style="margin:24px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">Thank you for sharing your feedback.</p>
        </td></tr>
        <tr><td style="padding:20px 30px;background:rgba(20,20,30,0.8);border-radius:0 0 24px 24px;text-align:center;border:1px solid rgba(255,255,255,0.05);border-top:none;">
            <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">Sent via <strong>ReviewDock</strong></p>
        </td></tr></table></td></tr></table></body></html>
    `;
    try {
        return await sendEmail({ to: customerEmail, subject: `${businessName} responded to your feedback`, html, text: `${businessName} responded\nRating: ${originalRating}/5\n${originalMessage || 'No message'}\n\nReply: ${replyText}` });
    } catch (error) {
        console.error('Failed to send reply:', error.message);
        return { success: false, error: error.message };
    }
};

export default { sendEmail };
