import nodemailer from "nodemailer";
import dotenv from "dotenv";

// ⚠️ IMPORTANT: This line allows this file to read your .env variables
dotenv.config(); 

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS, 
    },
  });

  const mailOptions = {
    from: `"FoodWiseConnect" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message, // Plain text fallback
    // Modern HTML styling for a "Proper Website" feel
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #10b981; text-align: center;">FoodWiseConnect</h2>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 16px; color: #4a5568;">Hello,</p>
        <p style="font-size: 16px; color: #4a5568;">${options.message}</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2d3748; background: #f7fafc; padding: 10px 20px; border-radius: 8px; border: 1px dashed #cbd5e0;">
            ${options.subject.includes("Verify") ? options.message.match(/\d+/)[0] : "Check above"}
          </span>
        </div>
        <p style="font-size: 14px; color: #a0aec0; text-align: center;">
          If you did not request this email, please ignore it.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to: ${options.email}`);
  } catch (error) {
    console.error("❌ Nodemailer Error:", error.message);
    throw new Error("Email could not be sent");
  }
};

export default sendEmail;