import Mailjet from "node-mailjet";

export const sendEmail = async (to, subject, message) => {
  try {
    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_FROM_EMAIL,
            Name: "HR Team",
          },
          To: [
            {
              Email: to,
            },
          ],
          Subject: subject,
          HTMLPart: message,
        },
      ],
    });

    console.log("MailJet Email Sent Successfully");
  } catch (error) {
    console.error("MailJet Email Error:", error.message);
    throw new Error("Email sending failed");
  }
};
