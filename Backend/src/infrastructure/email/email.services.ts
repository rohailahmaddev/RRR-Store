import Mailgen from "mailgen";
import type { Request } from "express";
import { emailOption } from "../../shared/types/index.types.js";
import { verificationMailGenerator } from "./email.templates.js"
import { transporter } from "./email.config.js";
import { ApiError } from "../../shared/utility/ApiError.js";
import { sendMailUser } from "./email.types.js";


const sendEmail = async ( options:emailOption ) => {

  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "3R Store",
      link: "https://3rstore.com"
    }
  })

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)
  const emailHTML = mailGenerator.generate(options.mailgenContent)



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


export const sendVerificationEmail = async (user:sendMailUser, req:Request, unHashedToken:string) => {
    try {
      await sendEmail({
        email: user?.email,
        subject: "Please verify your email",
        mailgenContent: verificationMailGenerator(
          user?.full_name,
          `${req.protocol}://${req.get("host")}/api/user/verify-email/${unHashedToken}`
        ),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message: String(error)
      throw new ApiError(500, `Failed to send verification email. ${message}`)
    }
}