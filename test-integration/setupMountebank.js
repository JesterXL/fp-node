const request = require('request')
const config = require("config")
const {
    isNumber,
    get,
    inRange
} = require('lodash/fp')

const statusCodeOk = statusCode => isNumber(statusCode) && inRange(200, 300, statusCode)
const responseEitherOkOrError = res =>
    statusCodeOk(get('statusCode', res))
    ? true
    : false
const getResponseError = res => new Error(`statusCode:${res.statusCode}, ${res.statusMessage}
${res.body}`)

const addNodemailerImposter = () =>
    new Promise((success, failure)=>
        request({
            uri: 'http://localhost:2525/imposters',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                protocol: 'smtp',
                port: 2626,
                stubs: [{
                    predicates: [
                        {
                            contains: {
                                from: 'jesterxl@jessewarden.com'
                            }
                        }
                    ]
                }]
            })
        },
        (err, res, body) =>
            err
            ? failure(err)
            : responseEitherOkOrError(res)
                ? success({res, body})
                : failure(getResponseError(res))
            ))

module.exports = {
    addNodemailerImposter
}

if (require.main === module) {
    Promise.all([
        addNodemailerImposter()
    ])
    .then(() => console.log('Mountebank Imposters intiailized successfully.'))
    .catch(error => console.error('Mountebank Imposters failed:', error))
}