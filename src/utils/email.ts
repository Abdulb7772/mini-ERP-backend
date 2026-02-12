import nodemailer from "nodemailer";
import crypto from "crypto";

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
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
  const transporter = createTransporter();
  
  const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Mini ERP" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email & Login Credentials - Mini ERP",
    html: `
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent successfully to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error("❌ Error sending verification email:");
    console.error("   Recipient:", email);
    console.error("   Error message:", error?.message);
    console.error("   Error code:", error?.code);
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
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Mini ERP" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Account Password - Mini ERP",
    html: `
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
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
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
  const transporter = createTransporter();

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `"Mini ERP" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Order Confirmation - ${orderNumber}`,
    html: `
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
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${email}`);
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    throw new Error("Failed to send order confirmation email");
  }
};
