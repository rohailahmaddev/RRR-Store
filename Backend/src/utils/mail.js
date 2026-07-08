import Mailgen from "mailgen";

export const verificationMailGenerator = (user, verificationUrl) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "RRR Store",
      link: "#"
    }
  });

  const emailContent = {
    body: {
      name: user.full_name,
      intro: "Welcome to Your App! Please verify your email address by clicking the button below.",
      button: {
        color: "green",
        text: "Verify Email",
        link: verificationUrl
      },
      outro: "If you did not create an account, please ignore this email."
    }
  };

  return mailGenerator.generate(emailContent);
};

export const passwordResetMailGenerator = (user, resetUrl) => {
  const mailGenerator = new Mailgen({
    theme: "default", 
    product: {
      name: "RRR Store",
      link: "#"
    }
  });  
  const emailContent = {
    body: {
      name: user.full_name,
      intro: "You have requested to reset your password. Please click the button below to proceed.",
      button: {
        color: "red",
        text: "Reset Password",
        link: resetUrl
      },
      outro: "If you did not request a password reset, please ignore this email."
    }
  };
}