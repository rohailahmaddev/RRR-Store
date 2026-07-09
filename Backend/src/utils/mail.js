import Mailgen from "mailgen";
import nodemailer from "nodemailer";
import ApiError from "./ApiError.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env"
});

export const sendEmail = async (options) => {

  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "3R Store",
      link: "https://3rstore.com"
    }
  })

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)
  const emailHTML = mailGenerator.generate(options.mailgenContent)

  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASSWORD
    }

  });

  try {
    await transporter.sendMail({
      from: "https://3rstore.com",
      to: options.email,
      subject: options.subject,
      text: emailTextual,
      html: emailHTML
    });
  } catch (error) {
    throw new ApiError(500, `Failed to send email. ${error.message}`);
  }
};

export const verificationMailGenerator = (user, verificationUrl) => {
const emailContent = {
  body: {
    name: user.full_name,
    intro: "Welcome to Your App! Please verify your email address by clicking the button below.",
    action: {
      instructions: "Click the button below to verify your email:",
      button: {
        color: "#22BC66",
        text: "Verify Email",
        link: verificationUrl,
      },
    },
    outro: "If you did not create an account, please ignore this email.",
  },
};

  return emailContent;
};

export const passwordResetMailGenerator = (user, resetPasswordUrl) => {
  const emailContent = {
    body: {
      name: user.full_name,
      intro: "You have requested to reset your password. Please click the button below to proceed.",
action: {
      instructions: "Click the button below to reset your password:",
      button: {
        color: "#bc2222",
        text: "Reset Password",
        link: resetPasswordUrl,
      },
    },
      outro: "If you did not request a password reset, please ignore this email."
    }
  };

  return emailContent;

};
