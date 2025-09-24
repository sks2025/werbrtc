const express = require('express');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const router = express.Router();

// Email configuration using provided credentials
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'aman367787@gmail.com',
    pass: process.env.EMAIL_PASS || 'zhtmlmlatiepjgnc'
  }
};

// Create nodemailer transporter
const createTransporter = () => {
  try {
    return nodemailer.createTransport(emailConfig);
  } catch (error) {
    console.error('Error creating email transporter:', error);
    throw error;
  }
};

// Test email configuration
router.get('/test-config', async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'Email configuration is valid',
      config: {
        service: emailConfig.service,
        user: emailConfig.auth.user,
        passwordSet: !!emailConfig.auth.pass
      }
    });
  } catch (error) {
    console.error('Email configuration test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Email configuration test failed',
      error: error.message
    });
  }
});

// Send meeting link via email
router.post('/send-meeting-link', async (req, res) => {
  try {
    const {
      to,
      doctorName,
      patientName,
      meetingLink,
      appointmentDate,
      appointmentTime,
      roomId,
      customMessage
    } = req.body;

    // Validate required fields
    if (!to || !meetingLink) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and meeting link are required'
      });
    }

    // Create email template
    const emailSubject = `Video Consultation Meeting Link - ${doctorName ? `Dr. ${doctorName}` : 'Medical Consultation'}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Video Consultation Meeting Link</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              margin-bottom: 30px;
            }
            .meeting-details {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .meeting-link {
              background-color: #667eea;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              display: inline-block;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
            }
            .meeting-link:hover {
              background-color: #5a6fd8;
            }
            .important-note {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 12px;
            }
            .room-id {
              background-color: #e9ecef;
              padding: 10px;
              border-radius: 4px;
              font-family: monospace;
              text-align: center;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Video Consultation</h1>
              <p>Your medical consultation meeting is ready</p>
            </div>

            <h2>Hello ${patientName ? patientName : 'Patient'},</h2>
            
            <p>You have been invited to join a video consultation session.</p>

            <div class="meeting-details">
              <h3>📋 Meeting Details:</h3>
              ${doctorName ? `<p><strong>Doctor:</strong> Dr. ${doctorName}</p>` : ''}
              ${patientName ? `<p><strong>Patient:</strong> ${patientName}</p>` : ''}
              ${appointmentDate ? `<p><strong>Date:</strong> ${appointmentDate}</p>` : ''}
              ${appointmentTime ? `<p><strong>Time:</strong> ${appointmentTime}</p>` : ''}
              ${roomId ? `<p><strong>Room ID:</strong></p><div class="room-id">${roomId}</div>` : ''}
            </div>

            ${customMessage ? `<div class="important-note"><strong>Special Instructions:</strong><br>${customMessage}</div>` : ''}

            <div style="text-align: center;">
              <h3>🔗 Join Your Meeting</h3>
              <a href="${meetingLink}" class="meeting-link" target="_blank">
                JOIN VIDEO CONSULTATION
              </a>
            </div>

            <div class="important-note">
              <h4>⚠️ Important Notes:</h4>
              <ul>
                <li>Please ensure you have a stable internet connection</li>
                <li>Make sure your camera and microphone are working</li>
                <li>Join the meeting a few minutes early</li>
                <li>Keep your environment quiet and well-lit</li>
                <li>Have your medical documents ready if needed</li>
              </ul>
            </div>

            <div class="meeting-details">
              <h4>🔧 Technical Support:</h4>
              <p>If you experience any technical issues joining the meeting, please contact our support team.</p>
              <p><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank">${meetingLink}</a></p>
            </div>

            <div class="footer">
              <p>This is an automated message from the Video Consultation System</p>
              <p>Please do not reply to this email</p>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Video Consultation Meeting Link

Hello ${patientName ? patientName : 'Patient'},

You have been invited to join a video consultation session.

Meeting Details:
${doctorName ? `Doctor: Dr. ${doctorName}` : ''}
${patientName ? `Patient: ${patientName}` : ''}
${appointmentDate ? `Date: ${appointmentDate}` : ''}
${appointmentTime ? `Time: ${appointmentTime}` : ''}
${roomId ? `Room ID: ${roomId}` : ''}

${customMessage ? `Special Instructions: ${customMessage}` : ''}

Meeting Link: ${meetingLink}

Important Notes:
- Please ensure you have a stable internet connection
- Make sure your camera and microphone are working
- Join the meeting a few minutes early
- Keep your environment quiet and well-lit
- Have your medical documents ready if needed

This is an automated message from the Video Consultation System.
Generated on: ${new Date().toLocaleString()}
    `;

    // Create transporter and send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Video Consultation System',
        address: emailConfig.auth.user
      },
      to: to,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('Meeting link email sent successfully:', {
      to: to,
      messageId: result.messageId,
      roomId: roomId
    });

    res.json({
      success: true,
      message: 'Meeting link sent successfully',
      data: {
        to: to,
        messageId: result.messageId,
        roomId: roomId,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending meeting link email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send meeting link email',
      error: error.message
    });
  }
});

// Send consultation confirmation email
router.post('/send-confirmation', async (req, res) => {
  try {
    const {
      to,
      doctorName,
      patientName,
      appointmentDate,
      appointmentTime,
      consultationType,
      meetingLink,
      roomId,
      instructions
    } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }

    const emailSubject = `Consultation Confirmed - ${doctorName ? `Dr. ${doctorName}` : 'Medical Appointment'}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
            .details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .status { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0; color: #155724; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Consultation Confirmed</h1>
              <p>Your appointment has been successfully scheduled</p>
            </div>

            <div class="status">
              <h3>🎉 Confirmation Details</h3>
              <p><strong>Status:</strong> Confirmed</p>
              <p><strong>Confirmation Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div class="details">
              <h3>📅 Appointment Information:</h3>
              ${doctorName ? `<p><strong>Doctor:</strong> Dr. ${doctorName}</p>` : ''}
              ${patientName ? `<p><strong>Patient:</strong> ${patientName}</p>` : ''}
              ${consultationType ? `<p><strong>Type:</strong> ${consultationType}</p>` : ''}
              ${appointmentDate ? `<p><strong>Date:</strong> ${appointmentDate}</p>` : ''}
              ${appointmentTime ? `<p><strong>Time:</strong> ${appointmentTime}</p>` : ''}
              ${roomId ? `<p><strong>Room ID:</strong> ${roomId}</p>` : ''}
            </div>

            ${meetingLink ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${meetingLink}" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  JOIN CONSULTATION
                </a>
              </div>
            ` : ''}

            ${instructions ? `
              <div class="details">
                <h3>📝 Special Instructions:</h3>
                <p>${instructions}</p>
              </div>
            ` : ''}

            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
              <p>This is an automated confirmation from the Video Consultation System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Video Consultation System',
        address: emailConfig.auth.user
      },
      to: to,
      subject: emailSubject,
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Confirmation email sent successfully',
      data: {
        to: to,
        messageId: result.messageId,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send confirmation email',
      error: error.message
    });
  }
});

// Send custom email
router.post('/send-custom', async (req, res) => {
  try {
    const {
      to,
      subject,
      message,
      html,
      fromName = 'Video Consultation System'
    } = req.body;

    if (!to || !subject || (!message && !html)) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email, subject, and message/html content are required'
      });
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: fromName,
        address: emailConfig.auth.user
      },
      to: to,
      subject: subject,
      text: message,
      html: html || `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${subject}</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            <p>This message was sent from the Video Consultation System</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        to: to,
        subject: subject,
        messageId: result.messageId,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending custom email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

// Send meeting reminder
router.post('/send-reminder', async (req, res) => {
  try {
    const {
      to,
      doctorName,
      patientName,
      appointmentDate,
      appointmentTime,
      meetingLink,
      roomId,
      reminderType = 'general' // general, 1hour, 15min, etc.
    } = req.body;

    if (!to || !meetingLink) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and meeting link are required'
      });
    }

    const reminderTexts = {
      general: 'You have an upcoming consultation',
      '1hour': 'Your consultation is starting in 1 hour',
      '15min': 'Your consultation is starting in 15 minutes',
      '5min': 'Your consultation is starting in 5 minutes'
    };

    const emailSubject = `Reminder: ${reminderTexts[reminderType]} - ${doctorName ? `Dr. ${doctorName}` : 'Medical Consultation'}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
            .reminder { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
            .meeting-link { background-color: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Consultation Reminder</h1>
              <p>${reminderTexts[reminderType]}</p>
            </div>

            <div class="reminder">
              <h3>📋 Upcoming Consultation:</h3>
              ${doctorName ? `<p><strong>Doctor:</strong> Dr. ${doctorName}</p>` : ''}
              ${patientName ? `<p><strong>Patient:</strong> ${patientName}</p>` : ''}
              ${appointmentDate ? `<p><strong>Date:</strong> ${appointmentDate}</p>` : ''}
              ${appointmentTime ? `<p><strong>Time:</strong> ${appointmentTime}</p>` : ''}
              ${roomId ? `<p><strong>Room ID:</strong> ${roomId}</p>` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetingLink}" class="meeting-link">
                JOIN NOW
              </a>
            </div>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              <h4>💡 Quick Checklist:</h4>
              <ul>
                <li>✅ Camera and microphone ready</li>
                <li>✅ Stable internet connection</li>
                <li>✅ Quiet, well-lit environment</li>
                <li>✅ Medical documents prepared</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `;

    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Video Consultation System',
        address: emailConfig.auth.user
      },
      to: to,
      subject: emailSubject,
      html: emailHtml
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Reminder email sent successfully',
      data: {
        to: to,
        reminderType: reminderType,
        messageId: result.messageId,
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending reminder email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder email',
      error: error.message
    });
  }
});

module.exports = router;
