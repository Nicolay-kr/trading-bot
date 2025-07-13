
import * as  nodemailer from "nodemailer";
import "dotenv/config";


const email = process.env.EMAIL;
const pass = process.env.EMAIL_PASS;

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: email,
    pass,
  },
});

export const mailOptions = {
  from: email,
  to: [email],
};


export const sendMail = async (text: string, subject: string = 'Signal bot') => {
  try {
    await transporter.sendMail({
      ...mailOptions,
      to: [...mailOptions.to].filter((addr): addr is string => typeof addr === "string"),
      subject,
      text,
    });
    console.log("Email sent successfully");
  } catch (error: any) {
    console.error("Failed to send email:", error.message || error);
  }
};


// const run = async () => {
//   await sendMail('test');
// };

// run();
