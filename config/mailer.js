const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function sendVerificationCode(to, name, code) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Your Campus Lost & Found verification code",
    text: `Hi ${name}, your verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e6ebf3;border-radius:12px">
        <h2 style="color:#0f1b33;margin:0 0 8px">Verify your email</h2>
        <p style="color:#475569">Hi ${esc(name)}, use this code to finish creating your Campus Lost &amp; Found account:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2563eb;margin:16px 0">${code}</p>
        <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>`,
  });
}

module.exports = { sendVerificationCode, transporter, esc };
