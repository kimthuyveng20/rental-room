import nodemailer from 'nodemailer';

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  /**
   * Generates a secure random 6-digit verification code string
   */
  public static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Sends a 6-digit verification code to the target user
   */
  public static async sendVerificationCode(email: string, code: string, name?: string): Promise<boolean> {
    const recipientName = name || 'User';
    const brandName = 'RoomFlow';

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"RoomFlow Auth" <noreply@roomflow.com>',
        to: email.toLowerCase().trim(),
        subject: `Your ${brandName} Verification Code: ${code}`,
        text: `Hello ${recipientName},\n\nYour verification code is ${code}. It will expire in 15 minutes.\n\nBest,\nThe ${brandName} Team`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
            <h2 style="color: #0f172a; text-align: center;">Welcome to ${brandName}!</h2>
            <p style="color: #475569; font-size: 16px;">Hi ${recipientName},</p>
            <p style="color: #475569; font-size: 16px;">Please use the following verification code to complete your registration process:</p>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-radius: 6px; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 4px; color: #2563eb;">${code}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px; text-align: center;">This code will expire in 15 minutes. If you did not request this code, please ignore this email.</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('EmailService Error sending verification code:', error);
      throw new Error('Failed to dispatch registration verification email.');
    }
  }
}