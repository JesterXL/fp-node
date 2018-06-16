const chai = require('chai')
const { expect } = chai
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const {
    stubTrue,
    stubFalse,
    noop
} = require('lodash/fp')

const {
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
    sendEmail
} = require('../src/server')

describe('src/server.js', ()=> {
    describe('howFly when called', ()=> {
        it('should return how fly', ()=> {
            expect(howFly()).to.equal('sooooo fly')
        })
    })
    describe('startServerIfCommandline when called', ()=> {
        const mainStub = {}
        const appStub = { listen: () => 'net.Server' }
        it('should return a net.Server if commandline', ()=> {
            const result = startServerIfCommandline(mainStub, mainStub, appStub, 3000).getOrElse('🐮')
            expect(result).to.equal('net.Server')
        })
        it('should return nothing if requiring', ()=> {
            const result = startServerIfCommandline(mainStub, {}, appStub, 3000).getOrElse('🐮')
            expect(result).to.not.equal('net.Server')
        })
    })
    describe('legitFiles when called', ()=> {
        it('should work with an Array of 1', ()=> {
            expect(legitFiles(['cow'])).to.be.true
        })
        it('should fail with an Array of 0', ()=> {
            expect(legitFiles([])).to.be.false
        })
        it('should fail with popcorn', ()=> {
            expect(legitFiles('🍿')).to.be.false
        })
    })
    describe('validFilesOnRequest when called', ()=> {
        it('should work with valid files on request', ()=> {
            expect(validFilesOnRequest({files: ['cow']})).to.be.true
        })
        it('should fail with empty files', ()=> {
            expect(validFilesOnRequest({files: []})).to.be.false
        })
        it('should fail with no files', ()=> {
            expect(validFilesOnRequest({})).to.be.false
        })
        it('should fail with piggy', ()=> {
            expect(validFilesOnRequest('🐷')).to.be.false
        })
    })
    describe('readEmailTemplate when called', ()=> {
        const readFileStub = (path, encoding, callback) => callback(undefined, 'email')
        const readFileStubBad = (path, encoding, callback) => callback(new Error('b00mz'))
        it('should read an email template file with good stubs', ()=> {
            return readEmailTemplate(readFileStub)
        })
        it('should read an email template called email', ()=> {
            return expect(readEmailTemplate(readFileStub)).to.become('email')
        })
        it('should fail if fails to read', ()=> {
            return expect(readEmailTemplate(readFileStubBad)).to.be.rejected
        })
    })
    describe('getCannotReadEmailTemplateError when called', ()=> {
        it('should give you an error message', ()=> {
            expect(getCannotReadEmailTemplateError().message).to.equal('Cannot read email template')
        })
    })
    describe('filterCleanFiles when called', ()=> {
        it('should filter only clean files', ()=> {
            const result = filterCleanFiles([
                {scan: 'clean'},
                {scan: 'unknown'},
                {scan: 'clean'}
            ])
            expect(result.length).to.equal(2)
        })
        it('should be empty if only whack files', () => {
            const result = filterCleanFiles([
                {},
                {},
                {}
            ])
            expect(result.length).to.equal(0)
        })
        it('should be empty no files', () => {
            const result = filterCleanFiles([])
            expect(result.length).to.equal(0)
        })
    })
    describe('mapFilesToAttachments when called', ()=> {
        it('should work with good stubs for filename', ()=> {
            const result = mapFilesToAttachments([
                {originalname: 'cow'}
            ])
            expect(result[0].filename).to.equal('cow')
        })
        it('should work with good stubs for path', ()=> {
            const result = mapFilesToAttachments([
                {path: 'of the righteous man'}
            ])
            expect(result[0].path).to.equal('of the righteous man')
        })
        it('should have reasonable default filename', ()=> {
            const result = mapFilesToAttachments([{}])
            expect(result[0].filename).to.equal('unknown originalname')
        })
        it('should have reasonable default filename', ()=> {
            const result = mapFilesToAttachments([{}])
            expect(result[0].path).to.equal('unknown path')
        })
    })
    describe('renderSafe when called', ()=> {
        it('should work with good stubs', ()=> {
            return expect(renderSafe(()=> 'cow', 'template', {}))
        })
        it('should render a cow', ()=> {
            return expect(renderSafe(()=> 'cow', 'template', {})).to.become('cow')
        })
        it('should fail if rendering blows up', ()=> {
            return expect(renderSafe(
                ()=> {throw new Error('wat')}, 
                'template', 
                {}
            )).to.be.rejected
        })
    })
    describe('getEmailService when called', ()=> {
        const configStub = { has: stubTrue, get: () => 'yup' }
        const configStubBad = { has: stubFalse }
        it('should work if config has defined value found', ()=> {
            expect(getEmailService(configStub).getOrElse('nope')).to.equal('yup')
        })
        it('should work if config has defined value found', ()=> {
            expect(getEmailService(configStubBad).getOrElse('nope')).to.equal('nope')
        })
    })
    describe('createTransportObject when called', ()=> {
        it('should create a host', ()=> {
            expect(createTransportObject('host', 'port').host).to.equal('host')
        })
        it('should crate a port', ()=> {
            expect(createTransportObject('host', 'port').port).to.equal('port')
        })
    })
    describe('createMailOptions when called', ()=> {
        it('should create an Object with from', ()=> {
            expect(createMailOptions('from', 'to', 'subject', 'html', []).from)
            .to.equal('from')
        })
    })
    describe('getEmailServiceUnavailableError when called', ()=> {
        it('should create an error with a message', ()=> {
            const error = getEmailServiceUnavailableError()
            expect(error.message).to.equal('Email service unavailable')
        })
    })
    describe('createTransportMailer when called', ()=> {
        it('should work with good stubs', ()=> {
            expect(createTransportMailer(stubTrue, {})).to.equal(true)
        })
    })
    describe('sendEmailSafe when called', ()=> {
        const sendEmailStub = (options, callback) => callback(undefined, 'info')
        const sendEmailBadStub = (options, callback) => callback(new Error('dat boom'))
        it('should work with good stubs', ()=> {
            return expect(sendEmailSafe(sendEmailStub, {})).to.be.fulfilled
        })
        it('should fail with bad stubs', ()=> {
            return expect(sendEmailSafe(sendEmailBadStub, {})).to.be.rejected
        })
    })
    describe('filterCleanFilesAndMapToAttachments when called', ()=> {
        it('should give an attachment from a request with clean file', ()=>{
            const reqStub = {files: [{scan: 'clean', originalname: 'so fresh', path: '/o/m/g'}]}
            const result = filterCleanFilesAndMapToAttachments(reqStub)
            expect(result[0].filename).to.equal('so fresh')
        })
        it('should give an empty Array with no files', ()=>{
            const reqStub = {files: [{scan: 'dirty south', originalname: 'so fresh', path: '/o/m/g'}]}
            const result = filterCleanFilesAndMapToAttachments(reqStub)
            expect(result).to.be.empty
        })
        it('should give an empty Array with undefined', ()=>{
            const result = filterCleanFilesAndMapToAttachments(undefined)
            expect(result).to.be.empty
        })
    })
    describe('getEmailTemplateAndAttachments when called', ()=> {
        const reqStub = {
            cookie: { sessionID: '1' },
            files: [{scan: 'clean', originalname: 'so fresh', path: '/o/m/g'}]
        }
        const getUserEmailStub = () => 'email'
        const readFileStub = (path, encoding, callback) => callback(undefined, 'email')
        const readFileStubBad = (path, encoding, callback) => callback(new Error('b00mz'))
        it('should succeed with good stubs', ()=> {
            return expect(
                getEmailTemplateAndAttachments(getUserEmailStub, readFileStub, reqStub)
            ).to.be.fulfilled
        })
        it('should succeed resolve to having an email', ()=> {
            return getEmailTemplateAndAttachments(getUserEmailStub, readFileStub, reqStub)
            .then( ([userEmail, emailBody, attachments]) => {
                expect(userEmail).to.equal('email')
            })
        })
        it('should fail if reading file fails', ()=> {
            return expect(
                getEmailTemplateAndAttachments(getUserEmailStub, readFileStubBad, reqStub)
            ).to.be.rejected
        })
    })
    describe('renderEmailAndGetEmailService when called', ()=> {
        const configStub = { has: stubTrue, get: () => 'email service' }
        const renderStub = stubTrue
        const renderStubBad = () => { throw new Error('intentionally failed render')}
        it('should work with good stubs', ()=> {
            return expect(
                renderEmailAndGetEmailService(configStub, renderStub, 'template', 'user email')
            ).to.be.fulfilled
        })
        it('should resolve to an email', ()=> {
            return renderEmailAndGetEmailService(configStub, renderStub, 'template', 'user email')
            .then( ([emailRendered, emailService]) => {
                expect(emailRendered).to.equal(true)
            })
        })
        it('should fail if rendering fails', ()=> {
            return expect(
                renderEmailAndGetEmailService(configStub, renderStubBad, 'template', 'user email')
            ).to.be.rejected
        })
    })
    describe('sendEmail when called', ()=> {
        const readFileStub = (path, encoding, callback) => callback(undefined, 'email')
        const readFileStubBad = (path, encoding, callback) => callback(new Error('read file fail'))
        const configStub = { has: stubTrue, get: () => 'email service' }
        const createTransportStub = () => ({
            sendEmail: (options, callback) => callback(undefined, 'info')
        })
        const getUserEmailStub = () => 'email'
        const renderStub = stubTrue
        const reqStub = {
            cookie: { sessionID: '1' },
            files: [{scan: 'clean', originalname: 'so fresh', path: '/o/m/g'}]
        }
        const resStub = {}
        const nextStub = noop
        it('should work with good stubs', ()=> {
            return expect(
                sendEmail(
                    readFileStub,
                    configStub,
                    createTransportStub,
                    getUserEmailStub,
                    renderStub,
                    reqStub,
                    resStub,
                    nextStub
                )
            ).to.be.fulfilled
        })
        it('should resolve to an email sent', ()=> {
            return sendEmail(
                readFileStub,
                configStub,
                createTransportStub,
                getUserEmailStub,
                renderStub,
                reqStub,
                resStub,
                nextStub
            )
            .then(result => {
                expect(result).to.equal('info')
            })
        })
        it('should fail when reading files fails', ()=> {
            return expect(
                sendEmail(
                    readFileStubBad,
                    configStub,
                    createTransportStub,
                    getUserEmailStub,
                    renderStub,
                    reqStub,
                    resStub,
                    nextStub
                )
            ).to.be.rejected
        })
    })
})


// const sendEmail = curry((readFile, config, createTransport, getUserEmail, render, req, res, next) =>
//     getEmailTemplateAndAttachments(getUserEmail, readFile, req)
//     .then( ([userEmailAddress, emailTemplate, fileAttachments]) => 
//       renderEmailAndGetEmailService(config, render, emailTemplate, userEmailAddress)
//       .then( ([emailBody, emailService]) =>
//         sendEmailSafe(
//           createTransport(
//             createTransportObject(emailService.host, emailBody.port)
//           ).sendEmail,
//           createMailOptions(
//             emailService.from,
//             emailService.to,
//             emailService.subject,
//             emailBody,
//             fileAttachments
//           )
//         )
//       )
//     ))
