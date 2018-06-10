const config = require('config')

// config.get will throw
const getSecretKeyUnsafe = config => config.get('keys.gateway.secretKey')

// return an Object
const getSecretKeySafe = config => {
    try {
        const value = config.get('keys.gateway.secretKey')
        return {ok: true, value}
    } catch (error) {
        return {ok: false, error}
    }
}

const {ok, value, error} = getSecretKeySafe(config)
if(ok) {
    // use value
} else {
    // log/react to error
}

// return a Promise
const getSecretKeySafe = config => {
    try {
        const value = config.get('keys.gateway.secretKey')
        return Promise.resolve(value)
    } catch (error) {
        return Promise.reject(error)
    }
}

// return a Folktale Result
const getSecretKeySafe = config => {
    try {
        const value = config.get('keys.gateway.secretKey')
        return Result.Ok({value})
    } catch (error) {
        return Result.Error(error)
    }
}


const add = (a, b) => a + b


const cow = { name: 'Dat Cow' }
console.log(cow.chicken) // undefined, but ok to do
console.log(undefined.chicken) // throws an Error