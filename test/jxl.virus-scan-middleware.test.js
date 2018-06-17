const chai = require('chai')
const { expect } = chai
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const noop = require('lodash/fp/noop')

const middleware = require('../src/@jxl/virus-scan-middleware')

describe('src/@jxl/virus-scan-middleware.js', ()=> {
    describe('middleware when called', ()=> {
        it('should be a noop that does not throw', () => {
            expect(middleware({}, {}, noop)).to.equal(undefined)
        })
    })
})