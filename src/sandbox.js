// // class Transport {
// //     constructor(mailOptions) {
// //         this.mailOptions = mailOptions
// //     }
// //     sendEmail(options, callback) {
// //         if(options.succeed === true) {
// //             callback(undefined, 'email succeeded')
// //         } else {
// //             callback(new Error('email failed'))
// //         }
// //     }
// // }

// // const createTransport = options => new Transport(options)
// // const nodemailer = {
// //     createTransport
// // }

// // module.exports = nodemailer

// const nodemailer = require('nodemailer')

// const sendEmailSafe = (createTransport, mailOptions, options) =>
//     new Promise((success, failure) => {
//         const transport = createTransport(mailOptions)
//         transport.sendMail(options, (err, info) => {
//             console.log("err:", err)
//             console.log("info:", info)
//             return err
//             ? failure(err)
//             : success(info)
//         })
//     })

// module.exports = sendEmailSafe

// if (require.main === module) {
//     sendEmailSafe(
//         nodemailer.createTransport,
//         {
//             host: 'localhost',
//             port: 2626,
//             secure: false,
//             ignoreTLS: true
//         },
//         {
//             from: 'jesterxl@jessewarden.com',
//             to: 'jesterxl@jessewarden.com',
//             subject: 'what you hear, what you hear is not a test',
//             text: 'Dat Body Rock',
//             html: '<b>Dat Body Rock</b>'
//         }
//     )
//     .then(result => {
//         console.log("result:", result)
//     })
//     .catch(error => {
//         console.log("error:", error)
//     })
// }