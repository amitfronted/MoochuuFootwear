const forgotPasswordTemplate = (name, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your password for your Moochuu account. Use the OTP below to proceed with resetting your password:</p>
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #2c3e50; border-radius: 4px;">
        ${otp}
      </div>
      <p style="margin-top: 15px;">This OTP is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
      <br/>
      <p>Best regards,<br/><strong>Moochuu Team</strong></p>
    </div>
  `;
};

export default forgotPasswordTemplate;
