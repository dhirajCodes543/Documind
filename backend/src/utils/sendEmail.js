const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendVerificationEmail = async (to, otp) => {
  await resend.emails.send({
    from: "DocuMind <onboarding@resend.dev>",
    to,
    subject: "Verify your DocuMind account",
    html: `
      <h2>Email Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
    `,
  });
};

exports.sendResetPasswordEmail = async (to, otp) => {
  await resend.emails.send({
    from: "DocuMind <onboarding@resend.dev>",
    to,
    subject: "Reset your DocuMind password",
    html: `
      <h2>Reset Password</h2>
      <p>Your password reset OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in 10 minutes.</p>
    `,
  });
};