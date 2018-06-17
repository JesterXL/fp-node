// const chai = require('chai')
// const { expect } = chai
// const chaiAsPromised = require('chai-as-promised')
// chai.use(chaiAsPromised)

// const sendEmailSafe = require('../src/sandbox')

// describe('src/sandbox.js', ()=> {
//     describe('sendEmailSafe when called', ()=> {
//         it('should work with good stubs', () => {
//             const createTransportStub = () => ({
//                 sendMail: (options, callback) => callback(undefined, 'email sent')
//             })
//             return sendEmailSafe(createTransportStub, {}, {})
//             .then(result => {
//                 expect(result).to.equal('email sent')
//             })
//         })
//     })
// })