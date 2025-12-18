const nodemailer = require('nodemailer');

// Lazy initialization of transporter
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const emailHost = process.env.EMAIL_HOST;
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    
    if (!emailHost || !emailUser || !emailPassword || emailUser === 'your-email@gmail.com') {
      console.warn('⚠️ Email not configured - email features disabled');
      return null;
    }
    
    transporter = nodemailer.createTransport({
      host: emailHost,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  }
  return transporter;
};

// Send email function
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      console.log('Email skipped (not configured):', subject);
      return { success: false, error: 'Email not configured' };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html: html || text
    };

    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't throw, just return failure
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
