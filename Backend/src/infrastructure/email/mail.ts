import Mailgen from "mailgen";
import nodemailer from "nodemailer"
import {ApiError} from "../../shared/utility/ApiError.js";
import { env } from "../../config/env.js"
import { User } from "../../shared/types/auth.types.js";
import { emailOption } from "../../shared/types/index.types.js";
 

export const sendEmail = async ( options:emailOption ) => {

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
    host: env.MAILTRAP_SMTP_HOST,
    port: env.MAILTRAP_SMTP_PORT,
    auth: {
      user: env.MAILTRAP_SMTP_USER,
      pass: env.MAILTRAP_SMTP_PASSWORD
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
    const message = error instanceof Error ? error.message : String(error)
    throw new ApiError(500, `Failed to send email. ${message}`);
  }
};

export const verificationMailGenerator = (user:User, verificationUrl : string):Mailgen.Content => {
const emailContent:Mailgen.Content = {
  body: {
    name: user.full_name,
    intro: "Welcome to Your App! Please verify your email address by clicking the button below.",
    action: {
      instructions: "Click the button below to verify your email:",
      button: {
        color: "#22BC66",
        text: "Verify Email",
        link: verificationUrl,
      } ,
    },
    outro: "If you did not create an account, please ignore this email.",
  },
};

  return emailContent;
};

export const passwordResetMailGenerator = (user:User, resetPasswordUrl:string):Mailgen.Content => {
  const emailContent:Mailgen.Content = {
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