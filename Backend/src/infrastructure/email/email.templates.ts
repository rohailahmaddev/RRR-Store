import Mailgen from "mailgen";
import { User } from "../../shared/types/index.types.js";

export const verificationMailGenerator = (fullName:string, verificationUrl : string):Mailgen.Content => {
const emailContent:Mailgen.Content = {
  body: {
    name: fullName,
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

export const passwordResetMailGenerator = (fullName:string, resetPasswordUrl:string):Mailgen.Content => {
  const emailContent:Mailgen.Content = {
    body: {
      name: fullName,
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