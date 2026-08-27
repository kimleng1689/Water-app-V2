const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'AquaPure email service is running' });
});

app.post('/api/send-invoice', async (req, res) => {
  const { to, subject, html, text } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ success: false, message: 'Missing recipient or subject.' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: text || 'Your AquaPure invoice is ready.',
      html: html || `<p>Your AquaPure invoice is ready.</p>`,
    };

    const info = await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: 'Invoice sent successfully.',
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send invoice email.',
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`AquaPure email backend running on http://localhost:${PORT}`);
});
