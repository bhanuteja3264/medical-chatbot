const twilio = require('twilio');

// Lazy initialization of Twilio client
let client = null;

const getClient = () => {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
      console.warn('⚠️ Twilio credentials not configured - SMS features disabled');
      return null;
    }
    
    client = twilio(accountSid, authToken);
  }
  return client;
};

// Send SMS function
const sendSMS = async ({ to, message }) => {
  try {
    const twilioClient = getClient();
    if (!twilioClient) {
      console.log('SMS skipped (Twilio not configured):', message.substring(0, 50) + '...');
      return { success: false, error: 'Twilio not configured' };
    }
    
    const result = await twilioClient.messages.create({
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
