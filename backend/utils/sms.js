const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send SMS function
const sendSMS = async ({ to, message }) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    console.log('SMS sent:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS sending error:', error);
    throw new Error('Failed to send SMS');
  }
};

// Send OTP via SMS
const sendOTP = async ({ to, otp }) => {
  const message = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;
  return await sendSMS({ to, message });
};

module.exports = { sendSMS, sendOTP };
