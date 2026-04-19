import nodemailer from 'nodemailer';

const getTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

export const sendOtpEmail = async (toEmail: string, otp: string) => {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"UniLife DPU" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'รหัส OTP สำหรับสมัครสมาชิก UniLife',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; border-radius: 16px; border: 1px solid #e5e7eb;">
        <h2 style="color: #7C3AED; margin-bottom: 8px;">UniLife DPU</h2>
        <p style="color: #374151;">รหัส OTP สำหรับยืนยันการสมัครสมาชิกของคุณ:</p>
        <div style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #7C3AED; text-align: center; padding: 24px 0;">
          ${otp}
        </div>
        <p style="color: #6B7280; font-size: 13px;">รหัสนี้จะหมดอายุใน <strong>10 นาที</strong> กรุณาอย่าเปิดเผยรหัสนี้กับผู้อื่น</p>
      </div>
    `,
  });
};
