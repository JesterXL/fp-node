const express = require('express')
const virusScan = require('./@jxl/virus-scan-middleware')
const Maybe = require('folktale/maybe')
const { Just, Nothing } = Maybe

function sendEmail(req, res, next) {
  const files = req.files
  if (!Array.isArray(files) || !files.length) {
    return next()
  }

  userModule.getUserEmail(req.cookie.sessionID).then(value => {
    fs.readFile('./templates/email.html', 'utf-8', (err, template) => {
      if (err) {
        console.log(err)
        err.message = 'Cannot read email template'
        err.httpStatusCode = 500
        return next(err)
      }
      let attachments = []
      files.map(file => {
        if (file.scan === 'clean') {
          attachments.push({ filename: file.originalname, path: file.path })
        }
      })

      value.attachments = attachments
      req.attachments = attachments
      let emailBody = Mustache.render(template, value)

      let emailService = config.get('emailService')
      const transporter = nodemailer.createTransport({
        host: emailService.host,
        port: emailService.port,
        secure: false,
      })

      const mailOptions = {
        from: emailService.from,
        to: emailService.to,
        subject: emailService.subject,
        html: emailBody,
        attachments: attachments,
      }

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          err.message = 'Email service unavailable'
          err.httpStatusCode = 500
          return next(err)
        } else {
          return next()
        }
      })
    })
  }, reason => {
    return next(reason)
  })
}

const app = express()
app.post('/upload', virusScan, sendEmail)

if(require.main === module) {

}


const howFly = () => 'sooooo fly'
const mainIsModule = (module, main) => main === module
const startServerIfCommandline = (main, module, app, port) =>
  mainIsModule(main, module)
  ? Just(app.listen(3000, () => console.log('Example app listening on port 3000!')))
  : Nothing()

module.exports = {
  howFly,
  startServerIfCommandline
}

startServerIfCommandline(require.main, module, app, 3000)