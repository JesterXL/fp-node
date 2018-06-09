# Functional Programming Unit Testing in Node

Writing Functional Programming in Node is one challenge, but unit testing it is another. Mainly because many middlewares in Node use the connect middleware approach, and libraries in Node are not written in a pure function way.

This article will go over how to make the unit testing part of easier, some strategies to tackle common impurity problems, and hopefully enable to make 100% test coverge a common part of your job vs. the "not worth the client investment" people commonly associate with it.

# Some Ground Rules

Feel free to skip these and go right to the refactoring. I'll cover each in the refactoring and unit testing of our Node example and will cite which rule I'm covering so you have context.

The pureness level associated with Functional Programming is maleable, ecspecially considering JavaScript is not a primarely functional language, and many libraries are created & contributed to by a wide variety of developers with varying opinions on how pure is pure enough and coveniant for them. So let's define what we consider "pure enough".

## Create Only Pure Functions

Pure functions are same input, same output, no side effects. Not all Node code is like this, nor are the libraries. Sadly, this means the onus is on you to do the work and judge when it's pure enough. If you don't know if it's pure enough, ask yourself, "Do I need mocks?" If you can't use stubs only, it's not pure enough.

## No var or let keywords, Embrace Immutability

Don't use `var` or `let`. Only use `const`. If this is too hard, use `let`, and ensure the function is pure.

## The this keyword and Arrow Functions

The `function` keyword retains scope. Scope is not pure and causes all kinds of side effects. Instead, use arrow functions. While they technically adopt whatever scope they are defined in, we are NOT creating, nor using scope. Avoid using the `this` keyword at all costs.

## No Classes

While newer versions of Node now natively support the `class` keyword, as stated above, avoid scope at all costs. Do not activately create classes. 

## Haskell Level Logging

While there are tricks, we'll assume even your Node logger has to be as pure as Haskell is about including logging as as a side effect. Many believe this is taking things too far. I don't. That said, you can easily opt out. If you see `pino`, the Node logger we're using, included as a function parameter, feel free to "just not test the logger" and assume `pino` is global or part of a higher level function closure.

## Don't Worry About Types For Now

This article won't focus on types. They are useful in solving a ton of errors, but not at runtime. For now, see rules below in "Proper Function Naming of Impurity". This article assumes you're not creating total functions.

## Proper Function Naming of Impurity

Creating unsafe functions and noops (no operation) functions that have no return values is fine as long as you label them as such. If you have a function that calls an Express/Restify/Hapi `next` function and that's it, either return a meaningful value, else leable the function as a noop suffix or prefix (i.e. `sendResponseAndCallNext` or `sendResponseCallNextNoop`).

If you using a library like Lodash or Ramda, and not using a transpiled language like TypeScript/PureScript/Reason, then you probably don't care about types. While I don't like types, I DO like runtime enforcement. My current tactic has been to use Folktale validators on public functions (functions exposed through modules) to ensure the parameters are of the proper type. Sanctuary adds that for you over top a Ramda like interface. The issue I have with it is that it throws exceptions vs. returning validation errors.

Either way, for functions that may fail from types, just label it with an unsafe suffix.

```javascript
const config = require('config')

// config.get will throw if key doesn't exist
const getSecretKeyUnsafe = config => config.get('keys.gateway.secretKey')
```

For functions that may throw an exception, simply wrap them with a try/catch, and return a Folktale `Result`, a normal JavaScript `Promise`, or even just an Object like Go and Elixir do. Conversely, if it's a 3rd party library/function you are wrapping, change it to a suffix of safe to help differentiate.

```javascript
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
```

## Don't Throw

Exceptions are impure, and violate function purity. Instead of same input, same output, you have no output because it exploded. Worse, if you compose it with other pure functions, it can affect their purity by making them all impure because you put a grenade in it.

Don't throw `Error`s. Endeavor to either return `Maybe`'s for possibly missing values, `Result`'s or `Either`'s for errors, or even a `Promise` if you're just starting out. If you can, endeavor to not have promises not have a catch as this implies you know about an error. If you know about it and what can go wrong, instead return a `Promise.resolve` in the `.catch` with a `Maybe`, `Result`, or `Validation` to indicate what actually went wrong. Avoid creating null pointers intetionally.

If you're using Sanctuary, don't use try/catch, and assume those errors be will sussed out in property and integration/functional tests.

## No Mocks

No mocks allowed in your unit tests. Stubs are fine and encouraged. If you can't because it's a third party library that has an API that's too hard to unravel, or you're on a time crunch and the existing API is too challenging to refactor, then this is exactly the nitch that `sinon` fills. As Eric Elliot says, Mocks are a Code Smell. Endeavor to make your functions pure so you only need stubs, and don't have to mock anything.

## No Integration nor Functional Tests

If your unit tests work, then you turn your wireless off, and they fail, those are not unit tests, those are integration tests, or bad unit tests, or both. We are only writing unit tests in this article as integration tests are beyond the scope of this eassy.

## OPTIONAL: Curry all Functions By Default

There are basically 3 strategies for currying functions in JavaScript, some intermingle.

1. Write normal functions that may have more than 1 parameter, and use the `curry` keyword in Lodash/Ramda/Sanctuary.
2. Same as above, but be explicit about artiy using `curryN`.
3. Curry functions yourself by simply having functions return functions, each requiring only 1 argument.

If you're using #3, or Sanctuary, then all functions only take 1 argument, so you can't call a curied function like `doSomething(a, b, c)` whereas in examples #1 and #2 that would work fine. If you're using #3 or Sanctuary, it must be written as `doSomething(a)(b)(c)`.

Whatever you use, ensure all functions that take more than 1 argument are curried by default.

## OPTIONAL: Favor Object and Array Destructuring over Mutation

Instead of creating Object copies manually which you may accidentally mutate something, favor `Object.assign` for Objects out of your control (so it calls getter/setters if need be) and Object destructuring for the ones you do. For Arrays, favor destructuring and using immutable Array methods vs. mutatble ones like `.push`.

## OPTIONAL: Avoid Curly Braces in Functions

The use of curly braces in functions implies you're doing imperative code by defining a function block. This is usually a sign your function can be refactored to something more composable/chainable. Using them in Object definitions, functions that return only an Object, or `matchWith` syntax that defines function callbacks is fine.

## OPTIONAL: Come to Terms with 100% Not Being Good Enough

Understand if you get higher than 100% test coverage, you'll still have bugs. That's ok.

## OPTIONAL: Abandon Connect Middleware

This article will keep it for the sake of showing you how to pragmatically incorporate good practices into existing code bases that may be too big to refactor, or may have dependencies that are out of your control. That said, it's built around the noop `next` function,  

# Refactor Existing Route

We're going to refactor an existing route that is used for uploading & email files. We'll write it in the typical Node imperative way, and slowly refactor each part to pure functions, and test each one to get 100% unit test coverage or more.

The strategy is we'll keep our server working so we can continually re-test it manually as well. This allows you to not be so invasive about your refactoring, and allow you checkpoints to commit your changes into git in case you need to undo or review some steps. God help you if your team demands rebasing vs merging.

## Our Starting Code

```javascript
// code here
```

## Export Something for Basic Test Setup

You can't unit test a module unless it exports something. Typical Hello World examples of Express/Restify/Hapi only show the server importing things and using those libraries, not actually testing the server.js itself. Let's start that now as this'll be a pattern we'll continue to build upon.

Open up your server.js, and let's add some code, doesn't matter where.

```javascript
const howFly = () => 'sooooo fly'
```

Now let's export that function:

```javascript
module.exports = {
    howFly
}
```

Let's create our first unit test file (assuing Mocha + Chai in a `test` folder, using `expect` keyword; I like `should` but I appear to be in the minority):

```javascript
const { expect } = require('chai')

const { howFly } = require('../src/server')

describe('src/server.js', ()=> {
    describe('howFly when called', ()=> {
        it('should return how fly', ()=> {
            expect(howFly()).to.equal('sooooo fly')
        })
    })
})
```

If you don't have a `package.json`, run `npm init -y`. If you haven't installed test stuff, run `npm i mocha chai istanbul --save-dev`.

Open up `package.json`, and let's add 3 scripts to help you out.

```json
"scripts": {
  "test": "mocha './test/**/*.test.js'",
  "coverage": "istanbul cover _mocha './test/**/*.test.js'",
  ...
```

Now you can run `npm test` and it'll show your new unit test.

![alt text](readme-images/tests-pass.png "Tests Pass")


Great, 1 passing test.
