import 'dotenv/config';
import express from 'express';
import { Resend } from 'resend';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

app.post('/api/contact', async (req, res) => {
  const body = req.body || {};
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const errors = {};
  if (fullName.length < 2 || fullName.length > 120) errors.fullName = 'Enter a name between 2 and 120 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
  if (phone.length > 40) errors.phone = 'Phone number is too long.';
  if (subject.length < 2 || subject.length > 160) errors.subject = 'Enter a subject between 2 and 160 characters.';
  if (message.length < 10 || message.length > 6000) errors.message = 'Enter a message between 10 and 6000 characters.';
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Please correct the highlighted fields.', errors });
  if (!resend || !process.env.CONTACT_TO_EMAIL || !process.env.CONTACT_FROM_EMAIL) {
    return res.status(503).json({ message: 'The contact service is not configured yet. Please try again later.' });
  }

  try {
    const fields = [
      ['Name', fullName], ['Email', email], ['Phone', phone || 'Not provided'], ['Subject', subject], ['Message', message],
    ];
    const html = `<h2>Website contact enquiry</h2>${fields.map(([label, value]) => `<p><strong>${label}</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('')}`;
    const sent = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL,
      to: process.env.CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `Website enquiry: ${subject}`,
      html,
      text: fields.map(([label, value]) => `${label}: ${value}`).join('\n\n'),
    });
    if (sent.error) {
      console.error('Contact email delivery failed:', sent.error.message);
      return res.status(502).json({ message: 'We saved your enquiry but could not send the email notification. Please try again shortly.' });
    }
    return res.status(201).json({ ok: true, message: 'Your enquiry was sent successfully.' });
  } catch (error) {
    console.error('Contact endpoint failed:', error.message);
    return res.status(503).json({ message: 'We couldn’t send your message right now. Please try again shortly.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(distPath, 'index.html'), (error) => { if (error) next(); });
});

app.listen(port, () => console.log(`Northline server listening on http://localhost:${port}`));
