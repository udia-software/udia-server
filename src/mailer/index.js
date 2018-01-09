const nodemailer = require("nodemailer");
const {
  SMTP_USERNAME,
  SMTP_PASSWORD,
  SMTP_HOST,
  SMTP_PORT
} = require("../constants");

let config = {
  pool: false,
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  auth: {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD
  }
};

const transport = nodemailer.createTransport(config);

// https://nodemailer.com/message/
async function _sendMail(mailPayload) {
  await transport.sendMail(mailPayload);
}

