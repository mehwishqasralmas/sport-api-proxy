const nodemailer = require("nodemailer");

module.exports = async function ({from, to, subject, text, html}) {

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "inenma.227@gmail.com", // generated ethereal user
      pass: "niuztesmrfzquvfx", // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: from || '"Sports" <qasr@sports.com>', // sender address
    to, // list of receivers
    subject, // Subject line
    text, // plain text body
    html // html body
  });

  console.log("Message sent: %s", info.messageId);
}