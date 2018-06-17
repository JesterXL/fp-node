const chai = require('chai')
const { expect } = chai
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)

const { getUserEmail } = require('../src/userModule')

describe('src/userModule.js', ()=> {
    describe('getUserEmail when called', ()=> {
        it('should work with good stubs', () => {
            return expect(getUserEmail('some id')).to.be.fulfilled
        })
        it('should resolve to a user email address', () => {
            return expect(getUserEmail('some id')).to.become({
                firstName: 'Jesse',
                lastName: 'Warden',
                age: 39,
                email: 'jesterxl@jessewarden.com'
            })
        })
    })
})