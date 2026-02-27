import nodemailer from "nodemailer";
import https from "https";
import crypto from "crypto";

const getEmailPassword = () =>
  process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

const getEmailFrom = () =>
  process.env.EMAIL_FROM || process.env.EMAIL_USER;

type EmailTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
};

type OutboundEmailOptions = {
  to: string;
  subject: string;
  html: string;
  name?: string;
};

// Create transporter
const createTransporter = (overrides?: Partial<EmailTransportOptions>) => {
  const emailPassword = getEmailPassword();

  if (!process.env.EMAIL_USER || !emailPassword) {
    throw new Error(
      "Email credentials are missing. Set EMAIL_USER and EMAIL_PASSWORD (or EMAIL_PASS)."
    );
  }

  const basePort = parseInt(process.env.EMAIL_PORT || "587", 10);
  const baseSecure = process.env.EMAIL_SECURE
    ? process.env.EMAIL_SECURE === "true"
    : basePort === 465;

  const transport: EmailTransportOptions = {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: basePort,
    secure: baseSecure,
    ...overrides,
  };

  return nodemailer.createTransport({
    host: transport.host,
    port: transport.port,
    secure: transport.secure,
    connectionTimeout: parseInt(process.env.EMAIL_CONNECTION_TIMEOUT || "10000", 10),
    greetingTimeout: parseInt(process.env.EMAIL_GREETING_TIMEOUT || "10000", 10),
    socketTimeout: parseInt(process.env.EMAIL_SOCKET_TIMEOUT || "15000", 10),
    dnsTimeout: parseInt(process.env.EMAIL_DNS_TIMEOUT || "10000", 10),
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPassword,
    },
  });
};

// Minimal SendGrid HTTP sender (no extra deps)
async function sendViaSendGrid(opts: { to: string; subject: string; html: string; from?: string; name?: string; }) {
  const apiKey = process.env.SENDGRID_API_KEY as string | undefined;
  if (!apiKey) throw new Error("SENDGRID_API_KEY not configured");

  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: opts.to }], subject: opts.subject }],
    from: { email: opts.from || getEmailFrom(), name: opts.name || "Mini ERP" },
    content: [{ type: "text/html", value: opts.html }],
  });

  const requestOptions: https.RequestOptions = {
    hostname: 'api.sendgrid.com',
    path: '/v3/mail/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: parseInt(process.env.EMAIL_CONNECTION_TIMEOUT || '10000', 10),
  };

  await new Promise<void>((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.from(c)));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve();
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 401) {
          reject(new Error("SendGrid authentication failed (401). Check SENDGRID_API_KEY."));
          return;
        }
        reject(new Error(`SendGrid failed: ${res.statusCode} ${body}`));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('SendGrid request timed out'));
    });
    req.write(payload);
    req.end();
  });
}

const sendViaSmtp = async (opts: OutboundEmailOptions) => {
  const mailOptions = {
    from: `"Mini ERP" <${getEmailFrom()}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  };

  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent via SMTP to ${opts.to}`);
    console.log(`   Message ID: ${info.messageId}`);
    return;
  } catch (error: any) {
    const shouldRetryWithSsl =
      error?.code === "ETIMEDOUT" &&
      (process.env.EMAIL_HOST || "smtp.gmail.com") === "smtp.gmail.com" &&
      parseInt(process.env.EMAIL_PORT || "587", 10) === 587;

    if (shouldRetryWithSsl) {
      try {
        console.warn("⚠️ SMTP 587 timeout detected, retrying with SSL on port 465...");
        const fallbackTransporter = createTransporter({ port: 465, secure: true });
        const fallbackInfo = await fallbackTransporter.sendMail(mailOptions);
        console.log(`✅ Email sent via SMTP fallback 465 to ${opts.to}`);
        console.log(`   Message ID: ${fallbackInfo.messageId}`);
        return;
      } catch (fallbackError: any) {
        console.error("❌ Fallback SMTP 465 also failed:", fallbackError?.message);
      }
    }

    console.error("❌ SMTP send failed:");
    console.error("   Recipient:", opts.to);
    console.error("   Error message:", error?.message);
    console.error("   Error code:", error?.code);
    console.error("   SMTP host:", process.env.EMAIL_HOST || "smtp.gmail.com");
    console.error("   SMTP port:", process.env.EMAIL_PORT || "587");
    console.error("   SMTP secure:", process.env.EMAIL_SECURE || "auto");
    throw error;
  }
};

const sendEmail = async (opts: OutboundEmailOptions) => {
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);

  if (hasSendGrid) {
    try {
      await sendViaSendGrid({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        from: getEmailFrom(),
        name: opts.name,
      });
      console.log(`✅ Email sent via SendGrid to ${opts.to}`);
      return;
    } catch (sendGridError: any) {
      console.error("❌ SendGrid send failed:", sendGridError?.message || sendGridError);
      throw sendGridError;
    }
  }

  await sendViaSmtp(opts);
};

// Generate verification token
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string,
  password?: string
) => {
  const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .token-box { background: #fff; border: 2px dashed #667eea; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; font-family: monospace; font-size: 16px; }
            .credentials-box { background: #fff; border: 2px solid #667eea; padding: 20px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Mini ERP! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for joining Mini ERP. Your account has been created successfully!</p>
              
              ${password ? `
              <h3>📧 Your Login Credentials</h3>
              <div class="credentials-box">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${password}</code></p>
              </div>
              
              <p><strong>⚠️ Important Security Information:</strong></p>
              <ul>
                <li>Please change your password after your first login</li>
                <li>Do not share your password with anyone</li>
                <li>Keep this email secure or delete it after changing your password</li>
              </ul>
              ` : ''}
              
              <h3>✅ Verify Your Email</h3>
              <p>To complete your registration and activate your account, please verify your email address:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <div class="token-box">${verificationUrl}</div>
              
              <p><small>This verification link will expire in 24 hours for security reasons.</small></p>
              
              <p>After verification, you can log in at: <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login">${process.env.FRONTEND_URL || "http://localhost:3000"}/login</a></p>
              
              <p>If you didn't create an account with Mini ERP, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Mini ERP. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

  try {
    await sendEmail({
      to: email,
      subject: "Verify Your Email & Login Credentials - Mini ERP",
      html,
      name,
    });
    console.log(`✅ Verification email sent successfully to ${email}`);
    return true;
  } catch (error: any) {
    console.error("❌ Error sending verification email:");
    console.error("   Recipient:", email);
    console.error("   Error message:", error?.message);
    console.error("   Error code:", error?.code);
    console.error("   SMTP host:", process.env.EMAIL_HOST || "smtp.gmail.com");
    console.error("   SMTP port:", process.env.EMAIL_PORT || "587");
    console.error("   SMTP secure:", process.env.EMAIL_SECURE || "auto");
    console.error("   Full error:", error);
    // Re-throw the error so it can be caught and handled by the caller
    throw error;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  password: string
) => {
  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials-box { background: #fff; border: 2px solid #667eea; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Created Successfully! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Your account has been created on Mini ERP. Here are your login credentials:</p>
              
              <div class="credentials-box">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${password}</code></p>
              </div>
              
              <p><strong>⚠️ Important Security Information:</strong></p>
              <ul>
                <li>Please change your password after your first login</li>
                <li>Do not share your password with anyone</li>
                <li>Keep this email secure or delete it after changing your password</li>
              </ul>
              
              <p>You can log in at: <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login">${process.env.FRONTEND_URL || "http://localhost:3000"}/login</a></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Mini ERP. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

  try {
    await sendEmail({
      to: email,
      subject: "Your Account Password - Mini ERP",
      html,
      name,
    });
    console.log(`Password email sent to ${email}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send password email");
  }
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async (
  email: string,
  customerName: string,
  orderNumber: string,
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>,
  totalAmount: number,
  address?: string
) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-box { background: #fff; border: 2px solid #667eea; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #667eea; color: white; padding: 12px; text-align: left; }
            .total-row { background: #f0f0f0; font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmed!</h1>
              <p style="margin: 0; font-size: 18px;">Thank you for your order</p>
            </div>
            <div class="content">
              <h2>Hello ${customerName},</h2>
              <p>Your order has been successfully placed and is being processed. Here are the details:</p>
              
              <div class="order-box">
                <p style="margin: 0 0 10px 0;"><strong>Order Number:</strong> <span style="color: #667eea; font-size: 18px;">${orderNumber}</span></p>
                <p style="margin: 0;"><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${address ? `<p style="margin: 10px 0 0 0;"><strong>Delivery Address:</strong> ${address}</p>` : ''}
              </div>
              
              <h3>📦 Order Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr class="total-row">
                    <td colspan="3" style="padding: 15px; text-align: right;">Total Amount:</td>
                    <td style="padding: 15px; text-align: right; color: #667eea;">$${totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              
              <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0;"><strong>⏳ What's Next?</strong></p>
                <p style="margin: 5px 0 0 0;">Your order is being processed. You will receive another email once your order has been shipped.</p>
              </div>
              
              <p style="margin-top: 20px;">If you have any questions about your order, please contact our support team.</p>
              
              <p>Thank you for choosing Mini ERP!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Mini ERP. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

  try {
    await sendEmail({
      to: email,
      subject: `Order Confirmation - ${orderNumber}`,
      html,
      name: customerName,
    });
    console.log(`Order confirmation email sent to ${email}`);
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    throw new Error("Failed to send order confirmation email");
  }
};
