import nodemailer from "nodemailer";
import Mailjet from "node-mailjet";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_MEETING_LINK = "https://meet.google.com/abc-defg-hij";

// ------------------- Gmail/Nodemailer -------------------
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const testTransporter = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log("✅ Gmail transporter is ready");
    return true;
  } catch (error) {
    console.error("❌ Gmail transporter error:", error.message);
    return false;
  }
};

const convertTo12Hour = async (time24) => {
  if (!time24) return "To be confirmed";
  const [hours, minutes] = time24.split(":").map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// ------------------- Mailjet -------------------
let mailjetClient = null;

if (process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET) {
  mailjetClient = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_API_SECRET
  );
}

const sendMailjetEmail = async (toEmail, subject, htmlContent) => {
  if (!mailjetClient) throw new Error("Mailjet not configured");

  const request = mailjetClient.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: process.env.EMAIL_FROM,
          Name: "HR Octopus",
        },
        To: [{ Email: toEmail }],
        Subject: subject,
        HTMLPart: htmlContent,
      },
    ],
  });

  const result = await request;
  console.log("✅ Mailjet email sent:", result.body);
  return result.body;
};

const emailTemplates = {
  "1st Round": (candidate, position, date, time, meetingLink) => {
    const finalMeetingLink = meetingLink || DEFAULT_MEETING_LINK;
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Interview Invitation</h1>
        </div>

        <p>Dear <strong>${candidate}</strong>,</p>

        <p>We are pleased to invite you for the <strong>First Round</strong> interview for the position of <strong>${position}</strong>.</p>

        <div class="content">
            <h3>Interview Details:</h3>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>Date:</strong> ${date || "To be confirmed"}</p>
            <p><strong>Time:</strong> ${time || "To be confirmed"}</p>

            <p>
                <strong>Meeting Link:</strong><br/>
                <a href="${finalMeetingLink}" class="button" style="color:#fff !important;">Join Meeting</a>
            </p>

            <p style="word-break: break-all;">
                <small>Or copy this link: ${finalMeetingLink}</small>
            </p>
        </div>

        <h3>Preparation Guidelines:</h3>
        <ul>
            <li>Please join the meeting 2 minutes before the scheduled time.</li>
            <li>Ensure you have a stable internet connection.</li>
            <li>Keep your resume and required documents ready.</li>
            <li>Choose a quiet and well-lit environment.</li>
        </ul>

        <p>We look forward to speaking with you!</p>

        <div class="footer">
            <p>Best regards,<br>HR Team</p>
        </div>
    </div>
</body>
</html>`;
  },
  "2nd Round": (candidate, position, date, time, meetingLink) => {
    const finalMeetingLink = meetingLink || DEFAULT_MEETING_LINK;
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>Second Round Interview</h1>
        </div>

        <p>Dear <strong>${candidate}</strong>,</p>

        <p>Congratulations! You have been shortlisted for the <strong>Second Round</strong> interview for the role of <strong>${position}</strong>.</p>

        <div class="content">
            <h3>Interview Details:</h3>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>Date:</strong> ${date || "To be confirmed"}</p>
            <p><strong>Time:</strong> ${time || "To be confirmed"}</p>

            <p>
                <strong>Meeting Link:</strong><br/>
                <a href="${finalMeetingLink}" class="button" style="color:#fff !important;">Join Meeting</a>
            </p>

            <p style="word-break: break-all;">
                <small>Or copy this link: ${finalMeetingLink}</small>
            </p>
        </div>

        <h3>Preparation Guidelines:</h3>
        <ul>
            <li>Please join the meeting 5–10 minutes before the scheduled time.</li>
            <li>Be prepared for technical/professional discussions.</li>
            <li>Review the job description and relevant experience.</li>
            <li>Prepare questions you may have about the role.</li>
        </ul>

        <p>Looking forward to our next conversation!</p>

        <div class="footer">
            <p>Best regards,<br>HR Team</p>
        </div>
    </div>
</body>
</html>`;
  },
};

// Reschedule templates
const rescheduleTemplates = {
  "1st Round": (candidate, position, date, time, meetingLink) => {
    const finalMeetingLink = meetingLink || DEFAULT_MEETING_LINK;
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #eab308; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>Rescheduled Interview</h1>
        </div>

        <p>Dear <strong>${candidate}</strong>,</p>
        <p>Your <strong>First Round</strong> interview for the position of <strong>${position}</strong> has been rescheduled.</p>

        <div class="content">
            <h3>Updated Interview Details:</h3>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>New Date:</strong> ${date || "To be confirmed"}</p>
            <p><strong>New Time:</strong> ${time || "To be confirmed"}</p>

            <p>
                <strong>Meeting Link:</strong><br/>
                <a href="${finalMeetingLink}" class="button" style="color:#fff !important;">Join Meeting</a>
            </p>

            <p style="word-break: break-all;">
                <small>Or copy this link: ${finalMeetingLink}</small>
            </p>
        </div>

        <p>Please ensure you're available at the new scheduled time.</p>

        <div class="footer">
            <p>Best regards,<br>HR Team</p>
        </div>
    </div>
</body>
</html>`;
  },
  "2nd Round": (candidate, position, date, time, meetingLink) => {
    const finalMeetingLink = meetingLink || DEFAULT_MEETING_LINK;
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #eab308; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>Rescheduled Interview</h1>
        </div>

        <p>Dear <strong>${candidate}</strong>,</p>

        <p>Your <strong>Second Round</strong> interview for the position of <strong>${position}</strong> has been rescheduled.</p>

        <div class="content">
            <h3>Updated Interview Details:</h3>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>New Date:</strong> ${date || "To be confirmed"}</p>
            <p><strong>New Time:</strong> ${time || "To be confirmed"}</p>

            <p>
                <strong>Meeting Link:</strong><br/>
                <a href="${finalMeetingLink}" class="button" style="color:#fff !important;">Join Meeting</a>
            </p>

            <p style="word-break: break-all;">
                <small>Or copy this link: ${finalMeetingLink}</small>
            </p>
        </div>

        <p>Please be prepared for the updated schedule.</p>

        <div class="footer">
            <p>Best regards,<br>HR Team</p>
        </div>
    </div>
</body>
</html>`;
  },
};

// ------------------- Send Interview Email -------------------
export const sendInterviewEmail = async (
  email,
  candidate,
  position,
  date,
  time,
  meetingLink,
  round,
  method = "gmail" // "gmail" or "mailjet"
) => {
  const template = emailTemplates[round];
  if (!template) throw new Error(`No email template found for round: ${round}`);
  const localTime = await convertTo12Hour(time);
  const subject = `${round} Interview Invitation - ${position}`;
  const html = template(candidate, position, date, localTime, meetingLink);

  if (method === "mailjet") return sendMailjetEmail(email, subject, html);

  // default Gmail
  const transporter = createTransporter();
  const result = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html,
  });

  console.log("✅ Gmail email sent:", result.response);
  return result;
};

// ------------------- Reschedule Interview Email -------------------
export const rescheduleInterviewEmail = async (
  email,
  candidate,
  position,
  date,
  time,
  meetingLink,
  round,
  method = "gmail"
) => {
  const template = rescheduleTemplates[round];
  if (!template)
    throw new Error(`No reschedule template found for round: ${round}`);
  const localTime = await convertTo12Hour(time);
  const subject = `${round} Interview Rescheduled - ${position}`;
  const html = template(candidate, position, date, localTime, meetingLink);

  if (method === "mailjet") return sendMailjetEmail(email, subject, html);

  const transporter = createTransporter();
  const result = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html,
  });

  console.log("✅ Gmail reschedule email sent:", result.response);
  return result;
};

export { testTransporter };
