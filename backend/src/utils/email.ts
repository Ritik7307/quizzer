import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const from = process.env.SMTP_FROM || "Quizzer <noreply@quizzer.dev>";
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  // Option 1: Resend HTTP API
  if (resendApiKey) {
    try {
      console.log(`[Email] Sending email to ${to} using Resend HTTP API...`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify(errorData) || `HTTP status ${response.status}`);
      }

      console.log(`[Email] Resend API success: Email sent to ${to}`);
      return;
    } catch (error) {
      console.error("[Email] Failed to send email via Resend API:", error);
      // Fallback to console if Resend fails
    }
  }

  // Option 2: Nodemailer SMTP
  if (smtpHost) {
    try {
      console.log(`[Email] Sending email to ${to} using Nodemailer SMTP...`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      console.log(`[Email] SMTP success: Email sent to ${to}`);
      return;
    } catch (error) {
      console.error("[Email] Failed to send email via SMTP:", error);
      // Fallback to console if SMTP fails
    }
  }

  // Fallback Option 3: Local Dev Console Logging
  console.log("\n============================================================");
  console.log(`[EMAIL CONSOLE FALLBACK]`);
  console.log(`From:    ${from}`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("------------------------------------------------------------");
  // Clean HTML tag-like structures for console output readability if needed
  console.log(html.replace(/<[^>]*>/g, " ").trim());
  console.log("============================================================\n");
}
