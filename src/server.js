const express = require('express')
const virusScan = require('./@jxl/virus-scan-middleware')
const userModule = require('./userModule')
const formidable = require('express-formidable')
const Maybe = require('folktale/maybe')
const { Just, Nothing } = Maybe
const {
  get,
  getOr,
  filter,
  map,
  curry
} = require('lodash/fp')

const legitFiles = files => Array.isArray(files) && files.length > 0
const validFilesOnRequest = req => legitFiles(get('files', req))

const readEmailTemplate = fs =>
  new Promise((success, failure) =>
    fs.readFile('./templates/email.html', 'utf-8', (err, template) =>
      err
      ? failure(err)
      : success(template)))

const getCannotReadEmailTemplateError = () => new Error('Cannot read email template')

const filterCleanFiles = filter(
  file => get('scan', file) === 'clean'
)
const mapFilesToAttachments = map(
  file => ({
    filename: getOr('unknown originalname', 'originalname', file),
    path: getOr('unknown path', 'path', file)
  })
)

const render = curry((renderFunction, template, value) =>
  new Promise( success => success(renderFunction(template, value))))

const getEmailService = config =>
  config.has('emailService')
  ? Just(config.get('emailService'))
  : Nothing()

const createTransport = (host, port) => ({
  host,
  port,
  secure: false,
})

const createMailOptions = (from, to, subject, html, attachments) =>
({
  from,
  to,
  subject,
  html,
  attachments
})

const getEmailServiceUnavailableError = () => new Error('Email service unavailable')

const createTransportMailer = curry((createTransportFunction, transportObject) =>
  createTransportFunction(transportObject))

const sendEmailSafe = curry((sendEmailFunction, mailOptions) =>
  new Promise((success, failure) =>
    sendEmailFunction(mailOptions, (err, info) =>
      err
      ? failure(err)
      : success(info)
    )
  )
)

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
app.use(formidable())
app.post('/upload', virusScan, sendEmail)

const howFly = () => 'sooooo fly'
const mainIsModule = (module, main) => main === module
const startServerIfCommandline = (main, module, app, port) =>
  mainIsModule(main, module)
  ? Just(app.listen(3000, () => console.log('Example app listening on port 3000!')))
  : Nothing()

module.exports = {
  howFly,
  startServerIfCommandline,
  legitFiles,
  validFilesOnRequest,
  readEmailTemplate,
  getCannotReadEmailTemplateError,
  filterCleanFiles,
  mapFilesToAttachments,
  render,
  getEmailService,
  createTransport,
  createMailOptions,
  getEmailServiceUnavailableError,
  createTransportMailer,
  sendEmailSafe
}

startServerIfCommandline(require.main, module, app, 3000)