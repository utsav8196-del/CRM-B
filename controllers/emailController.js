import Mailjet from "node-mailjet";
import Interview from "../models/Interview.js";

export const sendInterviewMail = async (req, res) => {
  try {
    const { interviewId, email, candidate, position, date, time, meetingLink, round } = req.body;

    // Basic validation
    if (!email && !interviewId) {
      return res.status(400).json({ success: false, message: "No email or interviewId provided" });
    }

    // If interviewId provided, try to load interview to update status later
    let interview = null;
    if (interviewId) {
      interview = await Interview.findById(interviewId);
      if (!interview) {
        return res.status(404).json({ success: false, message: "Interview not found" });
      }
      // prefer email from interview record if not provided
      if (!email) {
        // eslint-disable-next-line prefer-destructuring
        email = interview.email;
      }
      // If already sent, let the client know (frontend can still choose to resend)
      if (interview.emailSent) {
        return res.status(400).json({ success: false, message: "Email already sent for this interview" });
      }
    }

    // Configurable retries via env vars: EMAIL_RETRIES, EMAIL_RETRY_DELAY_MS
    const DEFAULT_RETRIES = parseInt(process.env.EMAIL_RETRIES, 10) || 3;
    const RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS, 10) || 1000;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const mjSecret = process.env.MAILJET_API_SECRET || process.env.MAILJET_SECRET_KEY || process.env.MAILJET_SECRET;
    const mailjet = Mailjet.apiConnect(process.env.MAILJET_API_KEY, mjSecret);

    const messages = [
      {
        From: {
          Email: process.env.MAILJET_FROM_EMAIL,
          Name: "HR Team",
        },
        To: [
          {
            Email: email,
          },
        ],
        Subject: `Interview Scheduled for ${position || (interview && interview.position) || "the role"}`,
        HTMLPart: `
            <h2>Hello ${candidate || (interview && interview.candidate) || "Candidate"},</h2>
            <p>Your interview has been scheduled.</p>
            <p><b>Date:</b> ${date || (interview && interview.date) || "To be confirmed"}</p>
            <p><b>Time:</b> ${time || (interview && interview.time) || "To be confirmed"}</p>
            <p><b>Meeting Link:</b> <a href="${meetingLink || (interview && interview.meetingLink) || "#"}">${meetingLink || (interview && interview.meetingLink) || "#"}</a></p>
          `,
      },
    ];

    // Send with retries (exponential backoff)
    let attempt = 0;
    let lastError = null;
    while (attempt < DEFAULT_RETRIES) {
      attempt += 1;
      try {
        const request = await mailjet.post("send", { version: "v3.1" }).request({ Messages: messages });
        console.log(`MAILJET SUCCESS on attempt ${attempt}:`, request.body);

        // Update interview record if present
        if (interview) {
          interview.emailSent = true;
          interview.lastEmailRound = round || interview.lastEmailRound || "Manual";
          await interview.save();
        }

        return res.status(200).json({
          success: true,
          message: "Email sent successfully",
          attempts: attempt,
          mailjetResponse: request.body,
          interviewId: interview ? interview._id : undefined,
        });
      } catch (err) {
        lastError = err;
        console.error(`MAILJET ATTEMPT ${attempt} FAILED:`, err?.message || err);
        if (attempt < DEFAULT_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`Retrying email in ${delay}ms (attempt ${attempt + 1} of ${DEFAULT_RETRIES})`);
          // eslint-disable-next-line no-await-in-loop
          await sleep(delay);
        }
      }
    }

    console.error(`MAILJET FAILED after ${attempt} attempts`, lastError?.message || lastError);
    return res.status(500).json({
      success: false,
      message: `Email sending failed after ${attempt} attempts`,
      attempts: attempt,
      error: lastError?.message || String(lastError),
    });
  } catch (err) {
    console.error("MAILJET ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: err.message,
    });
  }
};
