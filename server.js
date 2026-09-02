const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Dara Pichmony email service is running' });
});

// ── Telegram helper ──────────────────────────────────────────────────────────
// Custom agent to bypass self-signed SSL certs on corporate/proxy networks
const telegramAgent = new https.Agent({ rejectUnauthorized: false });

function sendTelegramMessage(message) {
  return new Promise((resolve, reject) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return reject(new Error('Telegram credentials not configured'));
    }

    const body = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      agent: telegramAgent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) resolve(parsed);
          else reject(new Error(parsed.description || 'Telegram API error'));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Send Invoice Route ───────────────────────────────────────────────────────
app.post('/api/send-invoice', async (req, res) => {
  const { to, subject, html, text, telegramMessage, sendTelegram } = req.body;

  const results = { email: null, telegram: null };
  const errors = [];

  // ── Email ──────────────────────────────────────────────────────────────────
  if (to && subject) {
    try {
      const useSSL = process.env.SMTP_USE_SSL === 'true' || process.env.SMTP_SECURE === 'true';
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: useSSL,           // true = port 465 (SSL), false = STARTTLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false  // allow self-signed certs on network
        }
      });

      const mailOptions = {
        from: `"Dara Pichmony Water Station" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        text: text || 'Your Dara Pichmony invoice is ready.',
        html: html || `<p>Your Dara Pichmony invoice is ready.</p>`,
      };

      const info = await transporter.sendMail(mailOptions);
      results.email = { success: true, messageId: info.messageId };
      console.log(`✅ Email sent to ${to} (${info.messageId})`);
    } catch (err) {
      console.error('❌ Email error:', err.message);
      errors.push(`Email: ${err.message}`);
      results.email = { success: false, error: err.message };
    }
  }

  // ── Telegram ───────────────────────────────────────────────────────────────
  if (sendTelegram !== false && telegramMessage) {
    try {
      await sendTelegramMessage(telegramMessage);
      results.telegram = { success: true };
      console.log('✅ Telegram notification sent');
    } catch (err) {
      console.error('❌ Telegram error:', err.message);
      errors.push(`Telegram: ${err.message}`);
      results.telegram = { success: false, error: err.message };
    }
  }

  // ── Response ───────────────────────────────────────────────────────────────
  const emailOk = !results.email || results.email.success;
  const telegramOk = !results.telegram || results.telegram.success;

  if (emailOk && telegramOk) {
    return res.json({ success: true, message: 'Invoice sent successfully.', results });
  }

  if (!emailOk && !telegramOk) {
    return res.status(500).json({ success: false, message: 'Both email and Telegram failed.', errors, results });
  }

  // Partial success — at least one worked
  return res.json({
    success: true,
    message: 'Invoice sent with partial success.',
    errors,
    results
  });
});

app.listen(PORT, () => {
  console.log(`Dara Pichmony email backend running on http://localhost:${PORT}`);
  console.log(`  SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (SSL=${process.env.SMTP_USE_SSL})`);
  console.log(`  Telegram: bot=${process.env.TELEGRAM_BOT_TOKEN ? '✅ configured' : '❌ missing'}, chat=${process.env.TELEGRAM_CHAT_ID || '❌ missing'}`);
});
