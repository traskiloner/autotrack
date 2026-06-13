import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || `"AutoTrack" <noreply@autotrack.local>`;

const isMock = !host || !user || !pass;

let transporter: nodemailer.Transporter | null = null;

if (!isMock) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
  console.log(`[EMAIL SERVICE] Configured to use SMTP: ${host}:${port} (${user})`);
} else {
  console.log('[EMAIL SERVICE] SMTP not configured. Running in MOCK MODE (logging to console)');
}

async function sendMail(to: string, subject: string, html: string) {
  if (isMock || !transporter) {
    console.log('\n======================================================');
    console.log(`[EMAIL MOCK] Sending email:`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)}...`);
    console.log('======================================================\n');
    return;
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`[EMAIL SERVICE] Error sending email to ${to}:`, err);
  }
}

const themeColor = '#3b82f6';
const baseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #0d0d11;
      color: #e4e4e7;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #16161e;
      border: 1px solid #272730;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, ${themeColor}, #1d4ed8);
      padding: 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
      color: #d1d5db;
    }
    .content p {
      margin: 0 0 16px;
    }
    .highlight-box {
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 16px;
      margin: 20px 0;
    }
    .footer {
      background-color: #0f0f15;
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #272730;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} AutoTrack. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
`;

export async function sendWelcomeEmail(email: string, username: string) {
  const title = '¡Bienvenido a AutoTrack!';
  const content = `
    <p>Hola <strong>${username}</strong>,</p>
    <p>Gracias por registrarte en <strong>AutoTrack</strong>, la plataforma premium de seguimiento de mantenimiento para tus vehículos.</p>
    <p>A partir de ahora podrás:</p>
    <ul>
      <li>Llevar un registro minucioso del mantenimiento de tus vehículos.</li>
      <li>Controlar los gastos de combustible y eficiencia del motor.</li>
      <li>Recibir alertas predictivas automatizadas antes de que sea tarde.</li>
      <li>Compartir de forma segura el acceso a tus coches con otros usuarios o mecánicos de confianza.</li>
    </ul>
    <p>¡Disfruta de la experiencia AutoTrack!</p>
  `;
  await sendMail(email, title, baseTemplate(title, content));
}

export async function sendCarSharedEmail(email: string, username: string, ownerName: string, carDetails: string) {
  const title = 'Vehículo Compartido Contigo';
  const content = `
    <p>Hola <strong>${username}</strong>,</p>
    <p>El usuario <strong>${ownerName}</strong> ha compartido contigo el acceso a su vehículo:</p>
    <div class="highlight-box">
      <strong>Vehículo:</strong> ${carDetails}
    </div>
    <p>Ahora puedes ver e introducir registros de repostaje, alertas y mantenimientos para este coche desde tu panel de AutoTrack.</p>
  `;
  await sendMail(email, title, baseTemplate(title, content));
}

export async function sendCarUnsharedEmail(email: string, username: string, ownerName: string, carDetails: string) {
  const title = 'Acceso a Vehículo Revocado';
  const content = `
    <p>Hola <strong>${username}</strong>,</p>
    <p>El usuario <strong>${ownerName}</strong> ha dejado de compartir contigo el acceso a su vehículo:</p>
    <div class="highlight-box">
      <strong>Vehículo:</strong> ${carDetails}
    </div>
    <p>Ya no dispondrás de acceso a las alertas, consumos ni mantenimientos de este coche.</p>
  `;
  await sendMail(email, title, baseTemplate(title, content));
}

export async function sendNewAlertEmail(email: string, username: string, carDetails: string, alertDetails: string) {
  const title = 'Nueva Alerta de Mantenimiento';
  const content = `
    <p>Hola <strong>${username}</strong>,</p>
    <p>Se ha registrado un nuevo aviso/recordatorio para tu vehículo:</p>
    <div class="highlight-box">
      <strong>Vehículo:</strong> ${carDetails}<br/>
      <strong>Alerta:</strong> ${alertDetails}
    </div>
    <p>Recibirás recordatorios automáticos de AutoTrack conforme se acerque el objetivo establecido.</p>
  `;
  await sendMail(email, title, baseTemplate(title, content));
}
