const express = require('express')
const virusScan = require('./@jxl/virus-scan-middleware')
const user = require('./userModule')
const formidable = require('express-formidable')
const Maybe = require('folktale/maybe')
const { Just, Nothing } = Maybe
const {
  get,
  getOr,
  filter,
  map,
  curry,
  flow
} = require('lodash/fp')
const fs = require('fs')
const config = require('config')
const nodemailer = require('nodemailer')

const app = express()

const legitFiles = files => Array.isArray(files) && files.length > 0
const validFilesOnRequest = req => legitFiles(get('files', req))

const readEmailTemplate = readFile =>
  new Promise((success, failure) =>
    readFile('./templates/email.html', 'utf-8', (err, template) =>
      err
      ? failure(getCannotReadEmailTemplateError())
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

const renderSafe = curry((renderFunction, template, value) =>
  new Promise( success => success(renderFunction(template, value))))

const getEmailService = config =>
  config.has('emailService')
  ? Just(config.get('emailService'))
  : Nothing()

const createTransportObject = (host, port) => ({
  host,
  port,
  secure: false
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

const sendEmailSafe = curry((transport, mailOptions) =>
  new Promise((success, failure) =>
    transport.sendEmail(mailOptions, (err, info) =>
      err
      ? failure(err)
      : success(info)
    )
  )
)

const sendEmailOrNext = curry((readFile, config, createTransport, getUserEmail, render, req, res, next) =>
  validFilesOnRequest(req)
    ? sendEmail(readFile, config, createTransport, getUserEmail, render, req, res, next)
    : next() || Promise.resolve(false))

const filterCleanFilesAndMapToAttachments = flow([
  get('files'),
  filterCleanFiles,
  mapFilesToAttachments
])

const getSessionIDFromRequest = get('cookie.sessionID')
const getEmailTemplateAndAttachments = curry((getUserEmail, readFile, req) =>
  Promise.all([
    getUserEmail(getSessionIDFromRequest(req)),
    readEmailTemplate(readFile),
    filterCleanFilesAndMapToAttachments(req)
  ]))

const renderEmailAndGetEmailService = curry((config, render, template, userEmailAddress) =>
  Promise.all([
    renderSafe(render, template, userEmailAddress),
    getEmailService(config)
  ])
)

const nextAndResolve = curry((next, info) => next() || Promise.resolve(info))
const nextAndError = curry((next, error) => next(error) || Promise.reject(error))

const sendEmail = curry((readFile, config, createTransport, getUserEmail, render, req, res, next) =>
    getEmailTemplateAndAttachments(getUserEmail, readFile, req)
    .then( ([userEmailAddress, emailTemplate, fileAttachments]) => 
      renderEmailAndGetEmailService(config, render, emailTemplate, userEmailAddress)
      .then( ([emailBody, emailService]) =>
        sendEmailSafe(
          createTransport(
            createTransportObject(emailService.host, emailBody.port)
          ),
          createMailOptions(
            emailService.from,
            emailService.to,
            emailService.subject,
            emailBody,
            fileAttachments
          )
        )
      )
    )
    .then(nextAndResolve(next))
    .catch(nextAndError(next)))


app.post('/upload', sendEmail(fs.readFile, config, nodemailer.createTransport, user.getUserEmail))

app.use(formidable())
app.post('/upload', virusScan, sendEmail)

const howFly = () => 'sooooo fly'
const mainIsModule = (module, main) => main === module
const logPort = port => console.log(`Example app listening on port ${port}!`) || true
const startServerIfCommandline = (main, module, app, port) =>
  mainIsModule(main, module)
  ? Just(app.listen(3000, logPort))
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
  renderSafe,
  getEmailService,
  createTransportObject,
  createMailOptions,
  getEmailServiceUnavailableError,
  createTransportMailer,
  sendEmailSafe,
  filterCleanFilesAndMapToAttachments,
  getEmailTemplateAndAttachments,
  renderEmailAndGetEmailService,
  sendEmail,
  nextAndResolve,
  nextAndError,
  sendEmailOrNext,
  logPort
}

startServerIfCommandline(require.main, module, app, 3000)
