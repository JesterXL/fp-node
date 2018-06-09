const { expect } = require('chai')

const { howFly, startServerIfCommandline } = require('../src/server')

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
})