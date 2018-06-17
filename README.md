# Functional Programming Unit Testing in Node

Writing Functional Programming in Node is one challenge, but unit testing it is another. Mainly because many middlewares in Node use the connect middleware approach, and libraries in Node are not written in a pure function way.

This article will go over how to make the unit testing part of easier, some strategies to tackle common impurity problems, and hopefully enable to make 100% test coverge a common part of your job vs. the "not worth the client investment" people commonly associate with it.

# Contents
Functional Programming Unit Testing in Node

- Some Ground Rules
	- Create Only Pure Functions
	- No var or let keywords, Embrace Immutability
	- The this keyword and Arrow Functions
	- No Classes
	- Haskell Level Logging
	- Don't Worry About Types For Now
	- Proper Function Naming of Impurity
	- Don't Throw
	- No Dots for Property Access
	- No Mocks
	- No Integration nor Functional Tests
	- OPTIONAL: Curry all Functions By Default
	- OPTIONAL: Favor Object and Array Destructuring over Mutation
	- OPTIONAL: Avoid Curly Braces in Functions
	- OPTIONAL: Come to Terms with 100% Not Being Good Enough
	- OPTIONAL: Abandon Connect Middleware
- Refactor Existing Route
	- Our Starting Code
- Export Something for Basic Test Setup
- Server Control
	- Require or Commandline?
- Input Validation
	- Quick History About Middleware
	- File Validation
- Asynchronous Functions
- Factory Errors
- Mutating Arrays & Point Free
- Functional Code Calling Non-Functional Code
	- Clearly Defining Your Dependencies & Higher Order Functions
	- Creating Curried Functions
	- Error Handling
	- Extra Credit
	- has and get vs. get or boom
- Class Wrangling
	- Simple Object Creation First
	- Dem Crazy Classes
- Compose in Dem Rows
	- Peace Out Scope
	- Saferoom
	- Start With A Promise
- Define Your Dependencies
- Currying Options
	- Left: Most Known/Common, Right: Less Known/Dynamic
- Start The Monad Train... Not Yet
	- Ok, NOW Start the Monad Train
	- Dem Gets
- Compose Again
	- Parallelism, Not Concurrency (Who Cares)
	- Synchronous Compose
	- Composing the Promise Way
- Coverage Report
	- Status Quo at This Point
- The Final Battle?
	- Noops
	- My God, It's Full Of Stubs
	- sendEmail Unit Tests
- Class Composition is Hard, Get You Some Integration Tests
	- Pitfalls When Stubbing Class Methods
	- Integration Test
		- Setting Up Mountebank
		- Setting Up Your Imposters
		- Sending the Email
		- Swing and a Miss
		- FP-Fu
- Next is Next
	- Ors (Yes, Tales of Legendia was bad)
	- Pass Through
- Mopping Up
	- sendEmail ... or not
	- There And Back Again
- Should You Unit Test Your Logger!?
- Conclusions
- Code & Help

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

## No Dots for Property Access

Given we have no types, Node frameworks ecspecially adds things onto request objects dynamically, and compounded with the fact we're dealing with a lot of dynamic data. Accessing a non-existent property is ok, but accessing a property on something that doesn't exist results in a null pointer error.

```javascript
const cow = { name: 'Dat Cow' }
console.log(cow.chicken) // undefined, but ok to do
console.log(undefined.chicken) // throws an Error
```

While languages like [Swift](https://docs.swift.org/swift-book/LanguageGuide/BasicOperators.html?utm_campaign=This%2BWeek%2Bin%2BSwift&utm_source=This_Week_in_Swift_4) and [Dart](https://news.dartlang.org/2015/08/dart-112-released-with-null-aware.html) have null aware access, those are operators, not pure functions. Unless your compiler or transpiler has support for infix operators, you should stick with pure functions, unless those operators are used within pure functions. Lodash has support for `get` and `getOr`. That said, in certain predicates where you know it's of a specific type, it's ok to use dot access. For example, if I know something is an Array, I'll access it directly like `theArray.length` vs. `get('length', theArray)`. Just be aware of the risk.

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

This also means you shouldn't be using default values for function parameters as that doesn't really jive with curried functions.

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

The function is an Express middleware that takes files uploaded by the user and emails them. It does a good job of sending validating the files, and sending back errors with context of what went wrong.

```javascript
function sendEmail(req, res, next) {
  const files = req.files
  if (!Array.isArray(files) || !files.length) {
    return next()
  }

  userModule.getUserEmail(req.cookie.sessionID).then(value => {
    fs.readFile('./templates/email.html', 'utf-8', (err, template) => {
      if (err) {
        console.log(err)
        err.message = 'Cannot read email template'
        err.httpStatusCode = 500
        return next(err)
      }
      let attachments = []
      files.map(file => {
        if (file.scan === 'clean') {
          attachments.push({ filename: file.originalname, path: file.path })
        }
      })

      value.attachments = attachments
      req.attachments = attachments
      let emailBody = Mustache.render(template, value)

      let emailService = config.get('emailService')
      const transporter = nodemailer.createTransport({
        host: emailService.host,
        port: emailService.port,
        secure: false,
      })

      const mailOptions = {
        from: emailService.from,
        to: emailService.to,
        subject: emailService.subject,
        html: emailBody,
        attachments: attachments,
      }

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          err.message = 'Email service unavailable'
          err.httpStatusCode = 500
          return next(err)
        } else {
          return next()
        }
      })
    })
  }, reason => {
    return next(reason)
  })
}
```

# Export Something for Basic Test Setup

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

![](http://<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-09-at-3.30.46-PM-300x126.png" alt="" width="300" height="126" class="alignleft size-medium wp-image-5503" />)

Great, 1 passing test.

# Server Control
However, you may have noticed that the unit tests do not complete. That's because as soon as you import anything from `server.js`, it starts a server and keeps it running. Let's encapsulate our server into a function, yet still retain the ability to run it in the file via commandline.

## Require or Commandline?

All the examples to solve this problem look something like this:

```javascript
if (require.main === module) {
    console.log('called directly');
} else {
    console.log('required as a module');
}
```

Basically, if `require.main`, then you used `node server.js`, else you `require`'d the module. If else are fine in functional programming, but imperative code floating in a file is not. Let's wrap with 2 functions. First, are we being called commandline or not?

```javascript
const mainIsModule = (module, main) => main === module
```

Note `module` and `main` are required as inputs; no globals or magical closure variables allowed here. If we didn't include module and main as arguments, the function would require us to mock those values before hand in the unit tests. Given they're run before the unit tests since they're part of how Node works, that's super hard and hurts your brain. If you just make 'em arguments, suddenly things get really easy to unit test, and the function gets more flexible.

Next up, start the server or not:

```javascript
const startServerIfCommandline = (main, module, app, port) =>
  mainIsModule(main, module)
  ? app.listen(3000, () => console.log('Example app listening on port 3000!'))
  : ... uh
```

Great, but... what do we return? It turns out, `app.listen` is not an noop, it actually returns a [net.Server](https://nodejs.org/api/net.html#net_class_net_server) class instance.

Maybe we'll get a server instance back... maybe we won't. Let's return a Maybe then. Install Folktale via `npm install folktale` then import it up top:

```javascript
const Maybe = require('folktale/maybe')
const { Just, Nothing } = Maybe
```

Normally we could do that in 1 line, but let's keep `Maybe` around for now. We'll refactor our function to use `Just` or `Nothing`.

```javascript
const startServerIfCommandline = (main, module, app, port) =>
  mainIsModule(main, module)
  ? Just(app.listen(3000, () => console.log('Example app listening on port 3000!')))
  : Nothing()
```

Finally, call it below `module.exports`:

```javascript
startServerIfCommandline(require.main, module, app, 3000)
```

Test it out via `npm start` (this should map to `"start": "node src/server.js"` in your package.json. You should see your server start.

Now, re-run your unit tests, and they should immediately stop after the test(s) are successful/failed.

Let's unit test those 2 functions. Ensure you export out the main function, and we'll just end up testing the other one through the public interface:

```javascript
module.exports = {
  howFly,
  startServerIfCommandline
}
```

Import into your test file and let's test that it'll give us the net.Server instance if we tell the function we're running via commandline:

```javascript
...
const { howFly, startServerIfCommandline } = require('../src/server')

describe('src/server.js', ()=> {
    ...
    describe('startServerIfCommandline when called', ()=> {
        const mainStub = {}
        const appStub = { listen: () => 'net.Server' }
        it('should return a net.Server if commandline', ()=> {
            const result = startServerIfCommandline(mainStub, mainStub, appStub, 3000).getOrElse('&#x1f42e;')
            expect(result).to.equal('net.Server')
        })
    })
})
```

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-09-at-4.27.28-PM-300x107.png" alt="" width="300" height="107" class="alignleft size-medium wp-image-5505" />

Great, now let's ensure we get nothing back if we're importing the module:

```javascript
it('should return nothing if requiring', ()=> {
            const result = startServerIfCommandline(mainStub, {}, appStub, 3000).getOrElse('&#x1f42e;')
            expect(result).to.not.equal('net.Server')
        })
```

Ballin'. Our server in much better shape to test, yet still continue to run, let's move on to improving the route itself.

# Input Validation

## Quick History About Middleware

A middleware is the name for "a function that takes 2 or 3 arguments, namely req, res, or req, res, and next. In Express, Restify, and Hapi, `req` is a Request, and represents what the client sent to the server in a request (GET, POST, etc). That is where you inspect whatever form data or JSON or XML they sent to your API. The `res` is the Response, and typically what you use to respond back to the client via `res.send`. The `next` function is optional, and it's how the whole [connect middleware](https://github.com/senchalabs/connect) concept works. Before `Promise` chains were commonplace, there was no defined way to connect up a bunch of functions and have an escape hatch for errors. Promises do that now using 50 billion `.then` functions, and 1 `.catch` for errors that happen anywhere in the chain. Instead of calling `.then` or `.catch` like you do in Promises, instead, your function agrees to call `next()` when you're done, or `next(error)` when you have an error, and connect will handle error propagation.

## File Validation

The first thing we have to refactor in `sendEmail` is the validation of the files array being on Request.

```javascript
function sendEmail(req, res, next) {
  const files = req.files
  if (!Array.isArray(files) || !files.length) {
    return next()
  }
	...
```

First, let's add some predicates that are easier to compose (i.e. use together) and easier to unit test indepdently.

```javascript
const legitFiles = files => Array.isArray(files) && files.length > 0
```

A predicate is a function that returns `true` or `false`. This as opposed to one that returns `true`, `false`, `undefined`, `null`, `NaN`, or ''... or even throws an Error. Making true predicates in JavaScript usually requires it to be a total function. Note we check if it's an Array first, and if it is, we can confidently access the `.length` property. Except, you can't. Remember, libraries will still override the `Object.prototype` of various built-in classes, so using `get('length', files)` would be a safer option here.

```javascript
describe('legitFiles when called', ()=> {
    it('should work with an Array of 1', ()=> {
        expect(legitFiles(['cow'])).to.be.true
    })
    it('should fail with an Array of 0', ()=> {
        expect(legitFiles([])).to.be.false
    })
    it('should fail with popcorn', ()=> {
        expect(legitFiles('&#x1f37f;')).to.be.false
    })
})
```

Note this function is a prime candidate for property testing using [jsverify](https://github.com/jsverify/jsverify) for example.

Now that we can verify what a legit files Array looks like, let's ensure the request has them:

```javascript
const validFilesOnRequest = req => legitFiles(get('files', req))
```

And to test, we just give either an Object with an files Array property, or anything else to make it fail:

```javascript
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
        expect(validFilesOnRequest('&#x1f437;')).to.be.false
    })
})
```

Ok, we're well on our way now to building up some quality functions to refactor the beast route.

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-10-at-10.06.36-AM-300x230.png" alt="" width="300" height="230" class="alignleft size-medium wp-image-5509" />

# Asynchronous Functions

With file validation behind us, let's tackle the part in the middle that assembles the email. A lot of imperative code in here requiring various mocks and stubs to ensure that part of the code is covered. Instead, we'll create pure functions for each part, test independently, then wire together later.

We'll hit the `fs.readFile` first. Callbacks are not pure functions; they are noops. Whether you use Node's built in [promisify](https://nodejs.org/api/util.html#util_util_promisify_original) or wrap it yourself is up to you. We'll do it manually to show you how.

```javascript
const readEmailTemplate = fs =>
  new Promise((success, failure) =>
    fs.readFile('./templates/email.html', 'utf-8', (err, template) =>
      err
      ? failure(err)
      : success(template)))
```

The only true impurity was `fs` being a global closure. Now, it's a required function parameter. Given this an asynchronous function, let's install chai-as-promised to give us some nice functions to test promises with via `npm i chai-as-promised --save-dev`.

Let's refactor the top of our unit test a bit to import the new test library:

```javascript
const chai = require('chai')
const { expect } = chai
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
```

Now chai will have new assertion functions we can use to test async functions.

```javascript
describe('readEmailTemplate when called', ()=> {
    const fsStub = {
        readFile: (path, encoding, callback) => callback(undefined, 'email')
    }
    const fsStubBad = {
        readFile: (path, encoding, callback) => callback(new Error('b00mz'))
    }
    it('should read an email template file with good stubs', ()=> {
        return readEmailTemplate(fsStub)
    })
    it('should read an email template called email', ()=> {
        return expect(readEmailTemplate(fsStub)).to.become('email')
    })
    it('should fail if fails to read', ()=> {
        return expect(readEmailTemplate(fsStubBad)).to.be.rejected
    })
})
```

How bangin'? Sttraiiiggghhttt bangin'. Note 2 simple stubs are required; one for an `fs` that successfully reads a file, and `fs` that fails. Note they aren't mocks because we don't care how they were used, what parameters were sent to them, how many times they were called, etc. We just do the bare minimum to get a test to pass.

# Factory Errors

With the exception of `Maybe`, we'll avoid using union types for now, and instead stick with Promises to know if a function worked or not, regardless if it's async or sync. I encourage you to read [Folktale's union type's documentation](http://folktale.origamitower.com/api/v2.1.0/en/folktale.adt.union.union.union.html) on your own time and perhaps [watch my video on Folktale](https://youtu.be/OghJR3BP0Ns?t=26m55s) and skip to 22:55.

If the server fails to read the email template, we have a specific error for that so the client knows what happened. Let's create a factory function for that vs. class constructors and imperative code property setting.

```javascript
describe('getCannotReadEmailTemplateError when called', ()=> {
    it('should give you an error message', ()=> {
        expect(getCannotReadEmailTemplateError().message).to.equal('Cannot read email template')
    })
})
```

# Mutating Arrays & Point Free

The attachments code has a lot of mutation. It also makes the assumption at this point that the virus scan has already run and the files have a `scan` property. Mutation === bad. Assumption around order === imperative thinking === bad. Let's fix both. You're welcome to use `Array`'s native `map` and `filter` methods, I'm just using Lodash's fp because they're curried by default.

First, we need to filter only the files that have been scanned by the virus scanner. It'll have a property on it called `scan`, and if the value does not equal lowercase 'clean', then we'll assume it's unsafe.

```javascript
const filterCleanFiles = filter(
  file => get('scan', file) === 'clean'
)
```

You'll notice we didn't define a function here, we actually made one from calling filter. Lodash, Ramda, and other FP libraries are curried by default. They put the most commonly known ahead of time parameters to the left, and the dynamic ones to the right. If you don't provide all arguments, it'll return a partial application (not to be confused with partial function which I do all the time). It's also known as a "partially applied function". The `filter` function takes 2 arguments, I've only applied 1, so it'll return a function that has my arguments saved inside, and is simply waiting for the last parameter: the list to filter on.

You could write it as:

```javascript
const filterCleanFiles = files => filter(
  file => get('scan', file) === 'clean',
  files
)
```

... but like Jesse Warden's mouth, it's too many, unneeded words. And to test:

```javascript
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
```

Note that the [File object](https://developer.mozilla.org/en-US/docs/Web/API/File) is quite large in terms of number of properties. However, we're just doing the bare minimum stubs to make the tests pass.

For `map`, however, we have a decision to make:

```javascript
const mapFilesToAttachments = map(
  file => ({filename: get('originalname', file), path: get('path', file)})
)
```

If the files are either broken, or we mispelled something, we won't really know. We'll get `undefined`. Instead, we should provide some reasonable defaults to indicate what exactly failed. It isn't perfect, but is throwing our future selves or fellow developers a bone to help clue them in on where to look. So, we'll change to `getOr` instead of `get` to provide defaults:

```javascript
const {
  get,
  getOr,
  filter,
  map
} = require('lodash/fp')
```

And the map:

```javascript
const mapFilesToAttachments = map(
  file => ({
    filename: getOr('unknown originalname', 'originalname', file),
    path: get('unknown path', 'path', file)
  })
)
```

If point free functions (functions that don't mention their arguments, also called "pointless" lol) aren't comfortable for you, feel free to use instead:

```javascript
const mapFilesToAttachments = files => map(
  file => ({
    filename: getOr('unknown originalname', 'originalname', file),
    path: get('unknown path', 'path', file)
  }),
	files
)
```

And the tests for both known, good values, and missing values:

```javascript
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
```

We're on a roll.

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-10-at-11.36.25-AM-259x300.png" alt="" width="259" height="300" class="alignleft size-medium wp-image-5511" />

# Functional Code Calling Non-Functional Code

As soon as you bring something impure into pure code, it's impure. Nowhere is that more common than in JavaScript where most of our code calls 3rd party libraries we install via [npm](https://www.npmjs.com/), the package manager for JavaScript. JavaScript is not a functional language, and although a lot is written in FP style, most is not. Trust no one.

Our email rendering uses an extremely popular templating engine called [Mustache](http://mustache.github.io/). You markup HTML with `{{yourVariableGoesHere}}`, and then call a function with the HTML template string, and your Object that has your variables, and poof, HTML with your data injected pops out. This was the basis for [Backbone](http://backbonejs.org/), and is similiar to how [Angular](https://angular.io/) and [React](https://reactjs.org/) work.

However, it can throw. This can negatively affect the rest of our functions, even if sequester it in a Promise chain to contain the blast radius.

So, good ole' try/catch to the rescue.

```javascript
const render = curry((renderFunction, template, value) => {
  try {
    const result = renderFunction(template, value)
    return Promise.resolve(result)
  } catch(error) {
    return Promise.reject(error)
  }
})
```

## Clearly Defining Your Dependencies & Higher Order Functions

A few things going on here, so let's discuss each. Notice to make the function pure, we have to say where the `render` function is coming from. You can't just import Mustache up top and use it; that's a side effect or "outside thing that could effect" the function. Since JavaScript supports higher order functions (functions can be values, storied in variables, passed as function parameters, and returned from functions), we declare that first. Since everyone and their mom reading this code base knows at runtime in production code, that will be `Mustache.render`. For creating curried functions, you put the "most known/early thing first, dynamic/unknown things to the right".

For unit tests, though, we'll simply provide a stub, a function that just returns a string. We're not in the business of testing 3rd party libraries, and we don't want to have to mock it using [Sinon](http://sinonjs.org/) which requires mutating 3rd party code before and after the tests, of which we didn't want to test anyway.


## Creating Curried Functions

Note it's curried using the Lodash `curry` function. This means I can pass in `Mustache.render` as the first parameter, call it with the second parameter once the `fs` reads the email template string, and finally the 3rd parameter once we know the user's information to email from the async `getUserEmail` call. For unit tests, we supply stubs for all 3 without any requirement for 3rd party libraries/dependencies.

## Error Handling

Note the error handling via try catch and Promises. if we get a result, we can return it, else we return the Error. Note that we're using a Promise to clearly indicate there are only 2 ways this function can go: it worked and here's your email template, or it didn't and here's why. Since it's a Promise, it has the side benefit of being easy to chain with other Promises. This ensures no matter what happens in the render function, whether our fault or it, the function will remain pure from 3rd party libraries causing explosions.

**Note**: This is not foolproof. Nor is using [uncaughtException](https://nodejs.org/api/process.html#process_event_uncaughtexception) for global synchronous error handling, nor using [unhandledrejection](https://nodejs.org/api/process.html#process_event_unhandledrejection) for global asynchronous error handling. Various stream API's and others in Node can cause runtime exceptions that are uncaught and can exit the Node process. Just try your best.

## Extra Credit

You could also utilize the built-in exception handling that promises (both native and most libraries like [Bluebird](http://bluebirdjs.com/docs/getting-started.html)) have:

```javascript
const render = curry((renderFunction, template, value) =>
  new Promise( success => success(renderFunction(template, value))))
```

But the intent isn't very clear form an imperative perspective. Meaning, "if it explodes in the middle of calling success, it'll call failure". So you could rewrite:

```javascript
const render = curry((renderFunction, template, value) =>
  new Promise( success => {
    const result = renderFunction(template, value)
    success(result)
  })
)
```

:: frownie face :: "Your call, rookie."

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Dredd_012-287x300.jpg" alt="" width="287" height="300" class="alignleft size-medium wp-image-5513" />

## has and get vs. get or boom

The [config](https://github.com/lorenwest/node-config) module in Node is an special case. If the `config.get` method fails to find the key in the various places it could be (config.json, environment variables, etc), then it'll throw. They recommend you use `config.has` first. Instead of using 2 functions, in a specific order, to compensate for 1 potentially failing, let's just instead return a `Maybe` because maybe our configs will be there, or they won't, and if they aren't, we'll just use default values.

```javascript
const getEmailService = config =>
  config.has('emailService')
  ? Just(config.get('emailService'))
  : Nothing()
```

And the tests:

```javascript
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
```

Note that for our `has` stubs, we use `stubTrue` and `stubFalse`. Instead of writing `() => true`, you write `stubTrue`. Instead of writing `() => false`, you write `stubFalse`.

# Class Wrangling

The use of [nodemailer](https://nodemailer.com/about/) is tricky. It's a libray that sends emails in Node. However, it uses a lot of classes and instances to do so which makes even just stubbing a pain, but we'll make it work. We'll tackle the Object creation stuff first since factory functions are easier to write and test.

## Simple Object Creation First

For this transport object:

```javascript
const transporter = nodemailer.createTransport({
  host: emailService.host,
  port: emailService.port,
  secure: false,
})
```

We'll take out the Object part, and just create that as a pure factory function:

```javascript
const createTransportObject = (host, port) => ({
  host,
  port,
  secure: false,
})
```

And then test:

```javascript
describe('createTransport when called', ()=> {
    it('should create a host', ()=> {
        expect(createTransportObject('host', 'port').host).to.equal('host')
    })
    it('should crate a port', ()=> {
        expect(createTransportObject('host', 'port').port).to.equal('port')
    })
})
```

Next up, the mailOptions Object:

```javascript
const mailOptions = {
  from: emailService.from,
  to: emailService.to,
  subject: emailService.subject,
  html: emailBody,
  attachments: attachments,
}
```

We'll just convert to a function:

```javascript
const createMailOptions = (from, to, subject, html, attachments) =>
({
  from,
  to,
  subject,
  html,
  attachments
})
```

And do a single test because I'm at the pool with my girls and lazy right meowwww, omg dat sun is amaze:

```javascript
describe('createMailOptions when called', ()=> {
    it('should create an Object with from', ()=> {
        expect(createMailOptions('from', 'to', 'subject', 'html', []).from)
        .to.equal('from')
    })
})
```

Last one is the error. We'll take this:

```javascript
...
if (err) {
  err.message = 'Email service unavailable'
  err.httpStatus
	...
```

And convert to another factory function:

```javascript
const getEmailServiceUnavailableError = () => new Error('Email service unavailable')
```

And the test:

```javascript
describe('getEmailServiceUnavailableError when called', ()=> {
    it('should create an error with a message', ()=> {
        const error = getEmailServiceUnavailableError()
        expect(error.message).to.equal('Email service unavailable')
    })
})
```

Routine by now, right? Give some inputs, test the output, stub if you need to.

## Dem Crazy Classes

Now it's time to wrap the nodemailer class creation. We'll take the `createTransport`:

```javascript
const transporter = nodemailer.createTransport({
  host: emailService.host,
  port: emailService.port,
  secure: false,
})
```

and make it pure (we already took out the transport object creation):

```javascript
const createTransportMailer = curry((createTransportFunction, transportObject) =>
  createTransportFunction(transportObject))
```

And the test:

```javascript
describe('createTransportMailer when called', ()=> {
    it('should work with good stubs', ()=> {
        expect(createTransportMailer(stubTrue, {})).to.equal(true)
    })
})
```

Not so bad. Now let's tackle the actual send email. We'll take the existing callback:

```javascript
transporter.sendMail(mailOptions, (err, info) => {
  if (err) {
    err.message = 'Email service unavailable'
    err.httpStatusCode = 500
    return next(err)
  } else {
    return next()
  }
})
```

And remove the next, and convert to a pure Promise based function:

```javascript
const sendEmailSafe = curry((sendEmailFunction, mailOptions) =>
  new Promise((success, failure) =>
    sendEmailFunction(mailOptions, (err, info) =>
      err
      ? failure(err)
      : success(info)
    )
  )
)
```

As before, you pass the actual function that sends the email and we'll call it. This allows your real code to pass in the nodemailer's `transport.sendEmail`, and unit tests a simple function.

```javascript
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
```

How we lookin'?

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-11-at-7.06.57-PM-173x300.png" alt="" width="173" height="300" class="alignleft size-medium wp-image-5519" />

Supa-fly. Let's keep going.

# Compose in Dem Rows
Now that we have tested functions, we can start composing them together. However, that'd kind of defeat the purpose of "refactoring a moving target" which is what's helpful to more people.

Meaning, often you'll work on codebases that you didn't create, or you did, but you're still struggling to keep all the moving pieces in your head as requirements change. How can you positively affect them without changing too much of the interfaces? It's a skill that's learned with practice.

So let's practice together! We've already looked at the function, identified the pieces that need to be pure, visualized (sort of) how they fit together an an imperative-like order, and unit tested them (mostly) thoroughly.

## Peace Out Scope

Let's tidy the place up first. This:

```javascript
function sendEmail(req, res, next) {
```

to this to ensure no need for `this`:
```javascript
const sendEmail = (req, res, next) => {
```

We'll nuke that `{` into orbit when we're done, for now he can chill.

## Saferoom

The rule for JavaScript is that as soon as something is async; meaning your function/closure uses a callback or Promise, everything is async. The Promise is flexible in that you can return a value or a Promise and the rest of the `.then` and `.catch` will work.

One feature that the FP developers love is that it has built-in `try/catch`.

```javascript
const backup = () => new Promise( success => {
    console.log("hey, about to boom")
    throw new Error('boom')
})

backup()
.then(() => console.log("won't ever log"))
.catch(error => console.log("it boomed:", error))
```

The bad news is that SOMEONE has to `.catch` or you'll get an uncaught exception. In Node that's the [unhandledRejection event](https://nodejs.org/api/process.html#process_event_unhandledrejection), and in the browser the [window.onunhandledrejection event](https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onunhandledrejection). Worse, a lot of `async/await` examples exclude the try/catch, completely ignoring that errors can happen.

Eventually you'll want to look into never allowing a Promise to throw/catch, and instead return an ADT. You can [read more](http://jessewarden.com/2017/11/error-handling-strategies.html) about doing that with a [video example using async/await](https://www.youtube.com/watch?v=0iiZHlT0boc) as well.

## Start With A Promise

We fixed the function to be an [arrow function](https://www.youtube.com/watch?v=oLDRQtFx72M) to remove any care about scope and `this`. The function has inputs. What it is missing is an output. You'll notice they return `next`, but the `next` function is a [noop](https://lodash.com/docs/4.17.10#noop), a method that returns `undefined`. It doesn't return any value and is considered a "no operation", which we also call "something that intentionally creates side effects", similiar to `console.log`. In that case, it shoves text in standard out.

Since it's an async function, let's return a Promise, and gain the error handling benefits as well. We'll change the signature from this:

```javascript
const sendEmail = (req, res, next) => {
  const files = req.files
  ...
```

To this:

```javascript
const sendEmail = (req, res, next) => {
  return new Promise((success, failure) => {
    const files = req.files
		...
```

Don't worry, we'll get rid of the `return` and the second `{` later on. The good news at this point is we could unit test `sendEmail` in a functional way by giving it some inputs, and checking what it outputs. The first test would output a Promise. The second would output to undefined for now because of `next`.

# Define Your Dependencies

However, as you can see we still need a lot of mocks because none of the 4 dependencies like `userModule.getUserEmail`, `fs.readFile`, `config.get`, and `nodemailer.createTransport` are an input to the function. Let's remove the need for mocks right meow.

```javascript
const sendEmail = curry((readFile, config, createTransport, getUserEmail, req, res, next) => 
...
```

Now you know the dark secret of Unix and Functional Programming: "It's someone else' problem to deal with state/supplying dependencies higher up the chain." We're high up the chain, it's our responsibility, and suddenly FP doesn't feel so off the chain, eh?

# Currying Options

Before we talk about how to make this easier to deal with, let's talk about the order of the parameters which is intentional to make currying more useful. This is also my opinion around order, so feel free change the order as you see fit.

You DO NOT have to use curry or use partial applications. It's just useful in functional programming because you'll often have a lot of parameters like this where many of them are known ahead of times, so you just make it a habit. It can also help reduce the verbosity in using pure functions and your unit tests.

## Left: Most Known/Common, Right: Less Known/Dynamic

The overall goal with curried functions is put the most known ahead of time dependencies to the left, and the most unknown things to the right.

Reading files in Node is even more commonly known as it's built into Node. So that's first.

The [config](https://github.com/lorenwest/node-config) library in Node is a common library often at the core of how your app handles different environments and configurations. So that's a tight second.

The nodemailer's `createTransport` function is 3rd since there aren't that many options to send emails in Node, but it's still a library unlike `fs`.

The `getUserEmail` is our function that accesses a 3rd party service that gets the user information so we can get their email address. We snag this from their session ID. This is not a well known library, nor a built in function to Node, it's something we built ourself and could change, so it's 4th.

The `req` is the Express Request object, the `res` if the Express Response object, and the `next` is the connect middleware function.

Hopefully your Spidey Sense is tingling, and you immediately say to yourself, "Wait a minute, this is an Express application, the req/res/next parameters are super well known; why aren't they first, or at least 3rd?" The answer is yes and no.

Yes, this function is currently an Express middleware function, and is expected to have 1 of the 2 signatures: `(req, res, next)` for middleware, and `(err, req, res, next)` for error handlers.

No, in that we'd never give a function to an Express route without concrete implementations. Meaning, we don't expect Express to somehow magically know we need a config, nodemailer, etc. We'll give those, like this:

```javascript
app.post('/upload', sendEmail(fs.readFile, config, nodemailer.createTransport, user.getUserEmail))
```

And now you see why; the Express request, response, and next function are actually the most dynamic parts. We won't know those until the user actually attempts to upload a file, and Express gives us the request, response, and next function. We just supply the first 4 since we know those.

**WARNING**: Beware putting curried functions into middlewares. Express checks the function arity, how many arguments a function takes, to determine which type of middleware it should make: 3 for middleware, 4 for an error handler. They check function arity via `Function.length`. Lodash's curried functions always report 0. Sanctuary always reports 1 because of their "functions should only ever take 1 parameter" enforcement. Ramda is the only one that retains function arity. Since Express only cares about errors, you're safe putting `(req, res, next)` middlewares with a 0 or 1 function arity. For errors, you'll have to supply old school functions, or a wrapper that has default paramteres that default to concrete implementations.

Knowing the limitations, we'll be fine, so let's use Lodash' curry.

# Start The Monad Train... Not Yet

Let's start the Promise chain by validating the files. However, that pesky `next` function adds a wrinkle:

```javascript
const files = req.files
    if (!Array.isArray(files) || !files.length) {
      return next()
    }
```

The entire function needs to be aborted if there are no files to email. Typically Promises, or Eithers, operate in a Left/Right fashion. A Promise says, "If everything's ok, we keep calling thens. If not, we abort all thens and go straight to the catch". An Either works about the same way; "If everything is ok, we return a Right. If not, we return an Left bypassing all Rights we find." This is because like Promises, you can chain Eithers.

However, there's no way to "abort early". If you go back to an `async/await` style function, you can write it imperative style and abort early. We're not in the business of creating imperative code, though. For now, we'll just use a simple ternary if to determine if we should even go down the email route.

```javascript
const sendEmailOrNext = curry((readFile, config, createTransport, getUserEmail, req, res, next) =>
  validFilesOnRequest(req)
    ? sendEmail(readFile, config, createTransport, getUserEmail, req, res, next)
    : next() && Promise.resolve(false))
```

Note 2 important things here. We only run the `sendEmail` function if we even have files to process. Second, since `next` is a noop, we can ensure the `Promise.resolve(false)` will return the resolved Promise with the resolved in it. This allows the next to inform Express that this middleware has completed successfully, AND return a meaningful value; `false` for not sending the email.

## Ok, NOW Start the Monad Train

We can now nuke the Array checking. From this:

```javascript
...
return new Promise((success, failure) => {
    const files = req.files
    if (!Array.isArray(files) || !files.length) {
      return next()
    }
    userModule.getUserEmail(req.cookie.sessionID).then(value => {
...
```

To this:

```javascript
...
return new Promise((success, failure) => {
    return userModule.getUserEmail(req.cookie.sessionID).then(value => {
...
```

Great, but notice we have now a Promise wrapped in a Promise. Let's refactor now that we're clear. From this:

```javascript
const sendEmail = curry(readFile, config, createTransport, getUserEmail, req, res, next) => {
  return new Promise((success, failure) => {
    return userModule.getUserEmail(req.cookie.sessionID).then(value => {
```

To:

```javascript
const sendEmail = curry((readFile, config, createTransport, getUserEmail, req, res, next) =>
    userModule.getUserEmail(req.cookie.sessionID).then(value => {
```

Get Busy Child.

## Dem Gets

One problem, though, with the accessing of the cookie. Express using the cookie middleware plugin is the one who adds the `.cookie` Object to the request object. Even so, the cookie might not have been sent from the client. Worse, it's a "dot dot". Yes, we "know" `req` here is fine, and yes know "know" `req.cookie` is fine because we imported the module and told Express to use the middleware.

That's not the point. We're creating pure functions, and `getUserEmail` is the one whose responsiblity is to validate the cookie value. If you can prevent creating null pointers, you're well on your way.

Hopefully at this point, again, your Spidey Sense is tingling in wondering why don't you first validate the cookie's value before you even run this. You should, and if you did, you'd be well on your way to creating a total function that can handle the variety of types and data, or lack thereof. A `Maybe` would be better because we'd be forced to deal with receiving a `Nothing`. We'll keep this pragmmatic for now, and assume another function will handle informing the client that they are missing a sessionID cookie. However, we're certainly not going to allow that to negatively affect our functions purity. 

For now, just a simple get to make it safe.

```javascript
userModule.getUserEmail(get('cookie.sessionID', req).then(value => {
```

# Compose Again

Assuming `getUserEmail` succeeded, we'll have the user's information so we can send an email. We now need to read the text email template to inject that information into. We'll compose that `readFile` function we wrote. The existing code is imperatively inside the `getUserEmail`'s then:

```javascript
...
userModule.getUserEmail(get('cookie.sessionID', req))
    .then(value => {
      fs.readFile('./templates/email.html', 'utf-8', (err, template) => {
        if (err) {
          console.log(err)
          err.message = 'Cannot read email template'
          err.httpStatusCode = 500
          return next(err)
        }
...
```

Let's fix that and compose them together #connectDemTrax:

```javascript
...
userModule.getUserEmail(get('cookie.sessionID', req))
.then(userInfo => readEmailTemplate(fs)))
.then(template => ...)
...
```

Great! We even removed all the error handling as that's built into our pure `readEmailTemplate` function.

## Parallelism, Not Concurrency (Who Cares)

However, that's one new problem; we need `userInfo` later on once we've gotten all the email info setup and ready. Since it's only in scope for this function it's now gone. One of JavaScript's most powerful and taken for granted features, closures, we just threw out the window to remain "pure" for purity's sake.

We can fix it, though, with one of JavaScript's other features: non-blocking I/O. We can return 3 Promises and wait for all 3 to complete, and use all 3 values in the same function. It doesn't matter if one takes longer than the others; `Promise.all` will wait for all 3 to be done, then give us an Array with all 3 values in order. If even 1 has an error, it'll just pop out the `.catch`. This has 2 bad problems, but we'll tackle that in another article. This also has the benefit of being faster in that we don't have to wait for each in line, they all happen "at the same time Node style" which is not the same as "happening at the same time Erlang/Go style" but that's ok, we can get into the same dance club.

For now, we'll refactor to:

```javascript
...
Promise.all([
      getUserEmail(get('cookie.sessionID', req)),
      readEmailTemplate(readFile),
      mapFilesToAttachments(filterCleanFiles(get('files', req)))
    ])
    .then( ([userEmailAddress, emailTemplate, fileAttachments]) => ...)
...
```

Now we're talking. Loading from an external webservice, reading from a local file, and a synchronous function call all can happen "at the same time", and we don't have to worry about how long each one takes. We use [Array Destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) to get our arguments out. Note they come in the same order we put the functions into the `Promise.all`.

We now have our user's email address, the text template to inject information into, along with the file attachments used for both.

## Synchronous Compose

One thing to nitpick. Sometimes you refactor FP code for readability purposes, not just for the mathematical purity reasons. In this case, check out the 3 levels of nesting:

```javascript
mapFilesToAttachments(filterCleanFiles(get('files', req)))
```

In imperative code, if you see if/then statements nested more than 2 levels deep, that tends raise concern. Developers are sometimes fine with creating that code to ensure they truly understand the different cases in playing with ideas, but once complete, they don't like LEAVING it that way. Nested if statements are hard to read and follow. If you DO follow them, you can sometimes get a rush or high in "figuring it out". That's not the goal, though; nested if's are considered bad practice.

For FP, deeply nested functions like this have the same problem. It's compounded by the fact we attempted to use verbose names for the functions to make what they do more clear vs. short names. This ends up making the problem worse.

For Promises, it's not so bad; you just shove them in the `.then`. But what about synchronous code?

You have 2 options:

1. Simply wrap in them in a Promise; most promises except for a couple of edge cases are fine getting a return value of a `Promise` or a value as long as the value isn't an `Error`.
2. Use Lodash' `flow` function, or Ramda's `compose`.
3. Use the pipeline operator.

Sadly, at the time of this writing, the [pipeline operator](https://github.com/tc39/proposal-pipeline-operator) is only at Stage 1 for JavaScript, meaning it's not even considered a possiblity for inclusion in the ECMA Standard yet. None of this code is asynchronous so we'll use the Lodash `flow`.

Let's put the functions in order, just like we would with a Promise chain:

```javascript
const filterCleanFilesAndMapToAttachments = flow([
  get('files'),
  filterCleanFiles,
  mapFilesToAttachments
])
```

Note the use of `get('files')`. The `get` function takes 2 arguments, but we only supply 1. We know it's curried by default, meaning it'll be a partial application if we just say `get('files')`; it's waiting for the 2nd argument. Once it gets that, it'll search for the 'files' property on it, else give `undefined`. If it DOES find `undefined`, `filterCleanFiles` will just spit out an empty Array, and `mapFilesToAttachments` will spit out an empty Array when you give it an empty Array. Otherwise, they'll get the good Array full of files, and both of those functions will do their thang.

See how we use curried functions that create partial applications to help compose other functions? I know... for you guys, not a good pickup line, but you never know, she me might be a Data Scientist who digs Scala. Or she's lit and you look good and anything you say doesn't really matter at that point. Either way, it's alllll good.

Now to use that composed function, we take what we had:

```javascript
Promise.all([
  getUserEmail(get('cookie.sessionID', req)),
  readEmailTemplate(readFile),
  mapFilesToAttachments(filterCleanFiles(get('files', req)))
])
```

And replace it with our composed function:

```javascript
Promise.all([
  getUserEmail(get('cookie.sessionID', req)),
  readEmailTemplate(readFile),
  filterCleanFilesAndMapToAttachments(req)
])
```

Much better eh? Speaking of lit, I'm feeling that hard rootbeer right now, but I STILL remember we need to unit test our composed function. Let's do that... and with confidence because we already have 3 unit tested pure functions, and we composed them together with a Lodash pure function. DAT CONFIDENCE BUILDING! Also, you MAY have to install config and nodemailer: `npm i config nodemailer` and then require them up top. Also, depending on the order of functions, you may have to move some functions around giving while we're creating pure functions, they're defined IN an imperative way, and so order matters. i.e. you have to create the `const app = express()` first before you can `app.post`.

```javascript
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
```
					
<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-14-at-7.10.46-PM-300x68.png" alt="" width="300" height="68" class="alignleft size-medium wp-image-5524" />

:: chink chunk :: [NIIIIICCCE!](https://www.youtube.com/watch?v=3ATBJGkdYgI)

## Composing the Promise Way

You can also just compose the Promise way, and they'll work for Promise based functions as well as synchronous ones allowing you to use interchangly. Let's first delete all the no-longer-needed imperative code:

```javascript
let attachments = []
files.map(file => {
  if (file.scan === 'clean') {
    attachments.push({ filename: file.originalname, path: file.path })
  }
})

value.attachments = attachments
req.attachments = attachments
```

And we'll take the remaining mix of synchronous and imperative code, and one by one wire together:

```javascript
let emailBody = Mustache.render(template, value)
let emailService = config.get('emailService')
const transporter = nodemailer.createTransport({
  host: emailService.host,
  port: emailService.port,
  secure: false,
})

const mailOptions = {
  from: emailService.from,
  to: emailService.to,
  subject: emailService.subject,
  html: emailBody,
  attachments: attachments,
}

transporter.sendMail(mailOptions, (err, info) => {
  if (err) {
    err.message = 'Email service unavailable'
    err.httpStatusCode = 500
    return next(err)
  } else {
    return next()
  }
})
```

You hopefully are getting trained at this point to start noticing "globals in my function". Note our current line of code is:

```javascript
let emailBody = Mustache.render(template, value)
```

But nowhere in the function arguments do we pass the `render` function to use. Let's quickly modify the ever-growing Express route function signature from:

```javascript
const sendEmail = curry((readFile, config, createTransport, getUserEmail, req, res, next) =>
```

to:

```javascript
const sendEmail = curry((readFile, config, createTransport, getUserEmail, render, req, res, next) =>
```

We're already in a Promise at this point, so we can return a value here, or a Promise and we'll be sure we can add another `.then` if we need to. One trick VSCode has is highlighting variables. Before we shove this rendered email template variable in the Monad train, let's see if anyone down the tracks needs it. We'll select the whole variable, and watch how VSCode will highlight usage of it as well:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-14-at-7.26.52-PM.png" alt="" width="652" height="780" class="alignleft size-full wp-image-5525" />

Crud... it's a ways down, AND it's mixed in with this `emailService` thing. Let's highlight him and see where he's grouped:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-14-at-7.28.56-PM.png" alt="" width="656" height="778" class="alignleft size-full wp-image-5526" />

This'll be tricky. Good news, rendering the email and loading the email service configuration can be done at the same time. Let's keep that INSIDE the Promise now until we feel comfortable we no longer need the `userEmailAddress`, `emailTemplate`, `fileAttachments` in scope. A lot more pragmmatic people would be fine with keeping the code this way, and using JavaScript's built in feature of closures, and move on with life. However, imperative code is harder to test, and results in LONGER code vs. smaller, pure functions that are easier to test. You don't always START there, though. It's fine to write imperative, then write "kind of pure" and keep refactoring your way there. That's part of learning, figuring our the idea of how your code should work, or both.

```javascript
...
.then( ([userEmailAddress, emailTemplate, fileAttachments]) => {
    return Promise.all([
      render(render, template, userEmailAddress),
      getEmailService(config)
    ])
    .then( ([emailBody, emailService]) => ...
...
```

And we'll clean up the code below to use our pure functions first imperatively:

```javascript
...
.then( ([emailBody, emailService]) => {
  const transportObject = createTransportObject(emailService.host, emailBody.port)
  const transport = createTransport(transportObject)
  const sendEmailFunction = transport.sendEmail
  const mailOptions = createMailOptions(
    emailService.from,
    emailService.to,
    emailService.subject,
    emailBody,
    fileAttachments
  )
  return sendEmailSafe(sendEmailFunction, mailOptions)
})
```

... and then refactor to more functional:

```javascript
...
.then( ([emailBody, emailService]) =>
  sendEmailSafe(
    createTransport(
      createTransportObject(emailService.host, emailBody.port)
    ).sendEmail,
    createMailOptions(
      emailService.from,
      emailService.to,
      emailService.subject,
      emailBody,
      fileAttachments
    )
  )
})
...
```

Note the `fileAttachments` comes from the scope higher up. The `sendEmailSafe` function requires a nodemailer `transport`. We create that from our function that creates the Object from the `emailService`. Once created we need that `sendEmail` function to pass it to the `sendEmailSafe` so we just immeidately go `.sendEmail` in the first parameter. The `createMailOptions` is another function that simply creates our Object from the `emailService` object, the rendered via Mustache `emailBody`, and the virus scanned `fileAttachements`. One last touch is to remove the squiggly braces `{}` as we're no longer writing imperative code, and the `return` statement as Arrow functions have an implicit return when you remove the squiggly braces.

This last part is left over from the callback:

```javascript
), reason => {
      return next(reason)
    })
```

Typically you defer `Promise` error handling higher up the call stack; meaning, "let whoever is calling me deal with error handling since Promises that call Promises have their errors propogate up". That's fine, so... we'll delete it.

After all that refactoring, here's what we're left with:

```javascript
const sendEmail = curry((readFile, config, createTransport, getUserEmail, render, req, res, next) =>
    Promise.all([
      getUserEmail(get('cookie.sessionID', req)),
      readEmailTemplate(readFile),
      filterCleanFilesAndMapToAttachments(req)
    ])
    .then( ([userEmailAddress, emailTemplate, fileAttachments]) => 
      Promise.all([
          render(render, template, userEmailAddress),
          getEmailService(config)
        ])
        .then( ([emailBody, emailService]) =>
          sendEmailSafe(
            createTransport(
              createTransportObject(emailService.host, emailBody.port)
            ).sendEmail,
            createMailOptions(
              emailService.from,
              emailService.to,
              emailService.subject,
              emailBody,
              fileAttachments
            )
          )
        )
    ))
```

# Coverage Report

Let's unit test it; it'll be hard because we have a lot of stubs, but we can borrow from the ones we've already created in the other tests. I'm not going to DRY the code at all in the tests as that would require too much brainpower at this point, but when you get a Sprint or time to pay down technical debt, this is one of the stories/tasks you add to that list.

... before we do, let's run a coverage report to see how much work we have cut out for us (we're ignoring my fake npm module and the user stuff for now). Run `npm run coverage && open coverage/lcov-report/index.html`:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-9.26.09-AM-1024x79.png" alt="" width="525" height="41" class="alignleft size-large wp-image-5530" />

And the details around our particular function:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-9.28.27-AM-1024x600.png" alt="" width="525" height="308" class="alignleft size-large wp-image-5531" />

## Status Quo at This Point

Wonderful; the only thing we need to test is the composition of those functions in `Promise.all`. Rather than create 20 billion stubs, and ensure they're setup "just so" so the `sendEmail` unit test passes or fails, we'll continue to our strategy of pulling out tincy pieces, wrapping them in pure functions, testing those, repeat. Let's start with the first `Promise.all`:

```javascript
const getSessionIDFromRequest = get('cookie.sessionID')
const getEmailTemplateAndAttachments = curry((getUserEmail, readFile, req) =>
  Promise.all([
    getUserEmail(getSessionIDFromRequest(req)),
    readEmailTemplate(readFile),
    filterCleanFilesAndMapToAttachments(req)
  ]))
```

Then we'll unit test the `getEmailTemplateAndAttachments` (he'll end up ensuring we've tested the new `getSessionIDFromRequest`):

```javascript
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
```

And we'll then swap it out for the raw `Promise.all`:

```javascript

const sendEmail = curry((readFile, config, createTransport, getUserEmail, render, req, res, next) =>
    getEmailTemplateAndAttachments(getUserEmail, readFile, req)
    .then( ([userEmailAddress, emailTemplate, fileAttachments]) => 
      Promise.all([
          render(render, template, userEmailAddress),
          getEmailService(config)
        ])
        .then( ([emailBody, emailService]) =>
          sendEmailSafe(
            createTransport(
              createTransportObject(emailService.host, emailBody.port)
            ).sendEmail,
            createMailOptions(
              emailService.from,
              emailService.to,
              emailService.subject,
              emailBody,
              fileAttachments
            )
          )
        )
    ))
```

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-9.58.21-AM.png" alt="" width="622" height="184" class="alignleft size-full wp-image-5532" />

... and then re-run coverage. Just run `npm run coverage` and you can refresh the coverage in the browser:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-10.00.31-AM-1024x504.png" alt="" width="525" height="258" class="alignleft size-large wp-image-5533" />

As you can see, coverage isn't going to let us off that easy. That's ok, we can re-use these stubs for the final battle. Let's do the last `Promise.all`.

```javascript
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
```

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-10.20.15-AM.png" alt="" width="572" height="184" class="alignleft size-full wp-image-5534" />

And swap it out:

```javascript
const sendEmail = curry((readFile, config, createTransport, getUserEmail, render, req, res, next) =>
    getEmailTemplateAndAttachments(getUserEmail, readFile, req)
    .then( ([userEmailAddress, emailTemplate, fileAttachments]) => 
      renderEmailAndGetEmailService(config, render, emailTemplate, userEmailAddress)
      .then( ([emailBody, emailService]) =>
        sendEmailSafe(
          createTransport(
            createTransportObject(emailService.host, emailBody.port)
          ).sendEmail,
          createMailOptions(
            emailService.from,
            emailService.to,
            emailService.subject,
            emailBody,
            fileAttachments
          )
        )
      )
    ))
```

# The Final Battle?

At this point, we've shrunk our route as much as we're going to without some serious refactoring. Let's unit test it using (read copy pasta) all the stubs we've already made.

## Noops

Before we proceed, let's explain what a `noop` is. Pronounced "no awp", it's slang for "no operation". It means a function that doesn't return a value so it apparently has no effect because we have no proof it did any operation. That isn't true; we all live and die by `console.log` which always returns `undefined`. If you run in [ECS](https://aws.amazon.com/ecs/), all those `console.log` calls are putting text in standard out and you're probably collecting all those logs for into [ELK](https://www.elastic.co/elk-stack) or [CloudWatch](https://aws.amazon.com/cloudwatch/) or [Splunk](https://www.splunk.com/). That's certainly an "operation with noticeable effect". Functional Programmers call that a "side effect" of the function.

Often you'll stub them in unit tests like `() => undefined` or the less clear, but shorter `() => {}`. Save yourself some typeing and use Lodash' [noop](https://lodash.com/docs/4.17.10#noop), Ramda [always](https://ramdajs.com/docs/#always) if you're a Ramda purist or [noop](https://char0n.github.io/ramda-adjunct/2.7.0/RA.html#.noop) in Ramda Adjunct.  

## My God, It's Full Of Stubs

```javascript
describe('sendEmail when called', ()=> {
    const readFileStub = (path, encoding, callback) => callback(undefined, 'email')
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
})
```

A successful test, but the stubs, while succinct, almost outnumber the lines of code for the test. As you can see, Functional Programming, even when attempted with best effort, doesn't necessarely "solve" your unit tests having to create a lot of "test code". Mocks often get a bad rap for being verbose and hard to maintain. Stubs I believe are included in this, but at least with stubs they're smaller, easier, and "mostly pure". Still, as soon as you refactor your implementation, you'll have to fix your tests, and sometimes your stubs will have to change too.

Trust me, this is much more preferable than to refactoring mocks.

The best thing to do is remember your training of the basics, like DRY: don't repeat yourself, and keep your tests organized with commonly used good and bad stubs within reach (meaning you don't have to scroll too far to read them).

## sendEmail Unit Tests

Let's add the failing which is easy because basically any stub could fail and the whole function fails:

```javascript
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
```

And the most important, what `sendEmail` eventually resolves to. Yes, returning a Promise everytime is important, but let's ensure it resolves to something:

```javascript
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
```

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-11.05.03-AM.png" alt="" width="586" height="178" class="alignleft size-full wp-image-5535" />

And coverage is now:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-11.06.06-AM-1024x438.png" alt="" width="525" height="225" class="alignleft size-large wp-image-5536" />

The feels.

# Class Composition is Hard, Get You Some Integration Tests

Sadly, this is where Functional Programming and Object Oriented Programming stop working together. Our code has a bug that you won't find in unit tests, only integration tests. In languages like JavaScript, Python, and Lua, when you call functions on Classes without the class attached, they'll often lose scope (`this` or `self` will be `undefined`/`nil`). Eric Elliot breaks down the details of a lot of these cases in his article [Why Composition is Harder With Classes](https://medium.com/javascript-scene/why-composition-is-harder-with-classes-c3e627dcd0aa).

Integration tests using [Supertest](https://github.com/visionmedia/supertest) or [Mountebank](http://www.mbtest.org/) is beyond the scope of this article. Suffice to say your unit tests are only as good as the stubs you provide. The stubs you provide basically fake or emulate functionality of the dependencies and are as small and simple as possible.

## Pitfalls When Stubbing Class Methods

Notice none of our stubs use any classes or Object.prototype, and yet, this is exactly how `nodemailer` works. It all comes down to class instances losing their `this` scope. Let's write a basic pure wrapper around nodemailer, unit test it, show it pass, then setup Mountebank so we can show it breaks at runtime when you use the real nodemailer vs. stubs. Given Mountebank is a large topic, I won't cover too much how it works, but the code is included. Just know it'll listen on the email port, act like an email server, and send real email responses so nodemailer believes it truly is sending an email.

Let's create a `sandbox.js` file to play and a `sandbox.test.js` in the tests folder.

```javascript
const nodemailer = require('nodemailer')

const sendEmailSafe = (createTransport, mailOptions, options) =>
    new Promise((success, failure) => {
        const { sendMail } = createTransport({mailOptions})
        sendMail(options, (err, info) =>
            err
            ? failure(err)
            : success(info))
    })

module.exports = sendEmailSafe
```

And the unit test:

```javascript
...
describe.only('sendEmailSafe when called', ()=> {
    it('should work with good stubs', () => {
        const createTransportStub = () => ({
            sendMail: (options, callback) => callback(undefined, 'email sent')
        })
        return sendEmailSafe(createTransportStub, {}, {})
        .then(result => {
            expect(result).to.equal('email sent')
        })
    })
})
...
```

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-12.12.12-PM.png" alt="" width="444" height="174" class="alignleft size-full wp-image-5537" />

## Integration Test

So it passes. Let's try with the integration test that uses a real nodemailer instance vs. our unit test stubs. I've setup mountebank to listen on port 2626 at localhost for emails. If someone sends one with the from equaling "jesterxl@jessewarden.com", it'll respond with an "ok the email was sent, my man". Before we automate this, let's do it manually first.

### Setting Up Mountebank

Run `npm i mountebank --save-dev` first, then once it is complete, open your package.json and add this script:

```json
"scripts": {
    ...
    "mb": "npx mb"
  },
...
```

Now when you run `npm run mb`, it'll run Mountebank.

### Setting Up Your Imposters

An imposter is basically a mock or stub for services. Typically mocks and stubs are used for unit tests and are created in code. In Mountebank, however, you create one by sending it a POST call, typically on localhost:2525. You send it JSON describing what port it's supposed to listen on, what things to look for, and what JSON & headers to respond with. Mountebank will then spawn a service on that port listening for incoming connections. If the request has attributes it recognizes (you do a GET on port 9001 with a path of `/api/health`, you send an email on port 2626 from 'cow@moo.com', etc), it'll respond with whatever stub you tell it too. While stubs typically respond immediately or with Promises, these respond as a REST response.

Check out the import top part of our `setupMountebank.js` that I've placed in the "test-integration" folder:

```javascript
...

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
	...
```
	
As you can see, a simple POST request to tell Mountebank, "Yo, if any dude sends an email on port 2626 and it is from me, respond it worked". Typically Mountebank wants to define that response in the stubs Array, but for emails, you can leave it blank and it'll default to a success response. As long as Mountebank is running, it'll remember to do this unless you delete it, or close Mountebank.
	
Now, to play around, I've run it manually to register. Check the bottom code:

```javascript
if (require.main === module) {
    Promise.all([
        addNodemailerImposter()
    ])
    .then(() => console.log('Mountebank Imposters intiailized successfully.'))
    .catch(error => console.error('Mountebank Imposters failed:', error))
}
```

Open a new terminal, and run `node test-integration/setupMountebank.js`, and you should se the Mountebank terminal light up:

```shell
> npx mb

info: [mb:2525] mountebank v1.14.1 now taking orders - point your browser to http://localhost:2525 for help
info: [mb:2525] POST /imposters
info: [smtp:2626] Open for business...
```

That "Open for business..." line is key; that means Mountebank understood what you want and worked and you can now send emails to port 2626. Let's do that.

### Sending the Email

Open up `sandbox.js` and check the code that'll run if we use Node to run it:

```javascript
if (require.main === module) {
    sendEmailSafe(
        nodemailer.createTransport,
        {
            host: 'localhost',
            port: 2626,
            secure: false
        },
        {
            from: 'jesterxl@jessewarden.com',
            to: 'jesterxl@jessewarden.com',
            subject: 'what you hear, what you hear is not a test',
            body: 'Dat Body Rock'
        }
    )
    .then(result => {
        console.log("result:", result)
    })
    .catch(error => {
        console.log("error:", error)
    })
}
```

### Swing and a Miss

Rad, now try to send an email via `node src/sandbox.js`:

```javascript
error: TypeError: Cannot read property 'getSocket' of undefined
    at sendMail (/Users/jessewarden/Documents/_Projects/fp-node/node_modules/nodemailer/lib/mailer/index.js:143:25)
...
```

Whoa, wat? Let's go into Nodemailer's sourcecode and see what the heck is going on:

```javascript
sendMail(data, callback) {
    ...
		// broken below this comment
    if (typeof this.getSocket === 'function') {
        this.transporter.getSocket = this.getSocket;
        this.getSocket = false;
    }
...
```

It's doing a typecheck to see if `this.getSocket` is a function vs. a Boolean. That's fine, but they should of check for `this` being undefined first.

Or should they? Once you're in class world, and you've been doing OOP for awhile, you shouldn't have to check for `this`; it's just a normal part of how classes work. If it doesn't, something more fundamental is messed up, the most common being forgetting to setup [bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Function/bind) in the constructor for callbacks for example.

We're not going to fix Nodemailer to make it more friendly to FP developers. In fact, this is a common trend in that many libraries you use both in Node and in the Browser (i.e. from node_modules) will be written in all sorts of ways. You need to be flexible.

Instead, we'll assume that we're not allowed to call `sendEmail` alone, and ensure it's always `something.sendEmail`; whatever to the left is the instance, and will retain scope if you call it like that.

### FP-Fu

Let's first fix our implementation to be OOP friendly, and ensure the tests still work, else fix 'em. The old:

```javascript
const { sendEmail } = createTransport({mailOptions})
        sendMail(options, (err, info) =>
```

The new:
```javascript
const transport = createTransport({mailOptions})
        transport.sendMail(options, (err, info) =>
```

Re-run the tests:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-3.38.23-PM.png" alt="" width="476" height="186" class="alignleft size-full wp-image-5539" />

Cool, the original public interface still works and hides the OOPy stuff. Let's test the integration test now with sending a real email with real, concrete implementation vs. stubs:

```shell
result: { accepted: [ 'jesterxl@jessewarden.com' ],
  rejected: [],
  envelopeTime: 3,
  messageTime: 3,
  messageSize: 590,
  response: '250 2.0.0 Ok: queued as f19f95e62da4afeade02',
  envelope:
   { from: 'jesterxl@jessewarden.com',
     to: [ 'jesterxl@jessewarden.com' ] },
  messageId: '<ab0bab09-7628-007b-f497-3d53806704ae@jessewarden.com>' }
```

Whee!!! Let's fix our original implementation now that we've proven we know how to wrangle OOP with FP now. We'll change:

```javascript
...
sendEmailSafe(
  createTransport(
    createTransportObject(emailService.host, emailBody.port)
  ).sendEmail,
...
```

To:

```javascript
...
sendEmailSafe(
  createTransport(
    createTransportObject(emailService.host, emailBody.port)
  ),
...
```

And switch `sendEmailSafe`:

```javascript
const sendEmailSafe = curry((sendEmailFunction, mailOptions) =>
  new Promise((success, failure) =>
    sendEmailFunction(mailOptions, (err, info) =>
      err
      ? failure(err)
      : success(info)
    )
  )
)
```

To the new OOP-friendly version:
```javascript
const sendEmailSafe = curry((transport, mailOptions) =>
  new Promise((success, failure) =>
    transport.sendEmail(mailOptions, (err, info) =>
      err
      ? failure(err)
      : success(info)
    )
  )
)
```

This breaks 1 of the tests because the stub used to be a function; now it needs to be an Object with a function. However... we should be a little more honest and use a true `class` in the unit tests to be 100% sure. We'll take the old 2 tests:

```javascript
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
```

And change 'em to:
```
describe('sendEmailSafe when called', ()=> {
    class TransportStub {
        constructor(mailOptions) {
            this.mailOptions = mailOptions
        }
        sendEmail(options, callback) {
            callback(undefined, 'info')
        }
    }
    class TransportStubBad {
        constructor(mailOptions) {
            this.mailOptions = mailOptions
        }
        sendEmail(options, callback) {
            callback(new Error('dat boom'))
        }
    }
    it('should work with good stubs', ()=> {
        return expect(sendEmailSafe(new TransportStub({}), {})).to.be.fulfilled
    })
    it('should fail with bad stubs', ()=> {
        return expect(sendEmailSafe(new TransportStubBad({}), {})).to.be.rejected
    })
})
```

# Next is Next

The last part is deal with `next`. THIS is where I'd say it's ok to use mocks since it's a `noop`, but you do want to ensure it was called at least once, without an `Error` in the happy path, and with an `Error` in the bad path.

... but you've made it this far which means you are FAR from ok, you're amazing.

Here's the basic's of testing noops. You sometimes KNOW if they did something, or how they can affect things based on their arguments. In `next`'s case, he'll signal everything is ok if passed no arguments, and something went wrong and to stop the current connect middleware chain if an `Error` is passed, much like a `Promise` chain. We also know that `next` always returns `undefined`.

## Ors (Yes, Tales of Legendia was bad)

One simple way is to just inject it into the existing Promise chain we have:

```javascript
.then( info => next() || Promise.resolve(info))
.catch( error => next(error) || Promise.reject(error)))
```

This'll make the connect middleware happy as well as satisfying our unit tests expecting either an email info out, or a rejected promise with error.

## Pass Through

Much like you log `Promise` or other Monad chains, simply make a pass through function.

```javascript
const nextAndResolve = curry((next, info) => next() || Promise.resolve(info))
const nextAndError = curry((next, error) => next(error) || Promise.reject(error))
```

And since we already know what the `next` is, we can just attach 'em to the end of the `Promise` chain, similiar to above:

```javascript
.then(nextAndResolve(next))
.catch(nextAndError(next))
```

"Wat!?" you may be saying, "all you did was wrap that previous example in functions". Yup, they're pure, and you can test those in isolation vs. test that gigantic Promise chain with 20 billion stubs.

```javascript
describe('nextAndResolve when called', ()=> {
    it('should fulfill', () => {
        return expect(nextAndResolve(noop, 'info')).to.be.fulfilled
    })
    it('should resolve', () => {
        return expect(nextAndResolve(noop, 'info')).to.become('info')
    })
})
```

Let's do the same for error:

```javascript
describe('nextAndError when called', ()=> {
    it('should fulfill', () => {
        return expect(nextAndError(noop, new Error('they know what is what'))).to.be.rejected
    })
    it('should resolve', () => {
        const datBoom = new Error('they just strut')
        return expect(nextAndError(noop, datBoom)).to.rejectedWith(datBoom)
    })
})
```

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-7.43.09-PM.png" alt="" width="424" height="236" class="alignleft size-full wp-image-5544" />

If you're spidey sense left over from your Imperative/OOP days is tingling, and you really want to create a mock/[spy](http://sinonjs.org/releases/v6.0.0/spies/), go for it.

# Mopping Up

Only 2 functions to go, and we're up in dem hunneds &#x1f4af;.

## sendEmail ... or not

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-7.51.29-PM-1024x108.png" alt="" width="525" height="55" class="alignleft size-large wp-image-5546" />

The `sendEmailOrNext` is a textbook case of copy-pasta coding. We'll duplicate our previous `sendEmail` unit tests since they have some yum yum stubs:

```javascript
describe('sendEmailOrNext when called', ()=> {
    ...
    const reqStubNoFiles = { cookie: { sessionID: '1' } }
    ...
    it('should work with good stubs', ()=> {
        return expect(
            sendEmailOrNext(
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
    it('should fail with bad stubs', ()=> {
        return expect(
            sendEmailOrNext(
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
    it('should resolve with false if no files', ()=> {
        return expect(
            sendEmailOrNext(
                readFileStub,
                configStub,
                createTransportStub,
                getUserEmailStub,
                renderStub,
                reqStubNoFiles,
                resStub,
                nextStub
            )
        ).to.become(false)
    })
})
```

I've left out all the stubs, save the new one that shows, if we have no files, it just bypasses the entire thing, calls `next` with no value signaling to connect we're good to go and finished, but still returning a useful value of "false" to say we didn't do what we're supposed to since we couldn't find any files.

## There And Back Again

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-7.55.12-PM-1024x117.png" alt="" width="525" height="60" class="alignleft size-large wp-image-5548" />

Oh look, coverage found yet another `noop`, imagine that.

```javascript
const logPort = port => console.log(`Example app listening on port ${port}!`) || true
```

And the 1 test:

```javascript
describe('logPort when called', ()=> {
    it('should be true with a port of 222', ()=> {
        expect(logPort(222)).to.equal(true)
    })
})
```

# Should You Unit Test Your Logger!?

If you really want to create a mock/spy for `console.log`, I admire your tenacity, [Haskell](https://www.haskell.org/) awaits you with open arms in your future. Remember me when you're at the top and you've bested [Mr. Popo](http://dragonball.wikia.com/wiki/Mr._Popo) on the Lookout.

... however, if you're not using `console.log`, and instead using a known Node logger like [Pino](https://github.com/pinojs/pino), well, heh, you SHOULD!

I should point out some well known Clojure guys think I'm going overboard:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-8.04.34-PM-2.png" alt="" width="630" height="601" class="alignleft size-full wp-image-5549" />

If you read [the Twitter thread](https://twitter.com/danielglauser/status/998228883034882049), an Elm guy schools me, and the Haskell cats show me how even there you can trick Haskell, but still acknowledge (kind of?) the purity pain.

# Conclusions
Running coverage, we get:

<img src="http://jessewarden.com/wp-content/uploads/2018/06/Screen-Shot-2018-06-16-at-8.18.29-PM.png" alt="" width="976" height="144" class="alignleft size-full wp-image-5550" />

Welcome to hunneds country. Congratulations on making this far, and not one import of [sinon](http://sinonjs.org/) to be found. Don't worry, deadlines and noops are all over the place in the JavaScript world, and sinon's mock creation ability is not something to be shunned, but embraced as a helpful addition to your toolset.

Hopefully you've seen how creating small, pure functions, makes unit testing with small stubs a lot easier, faster, and leads to more predictable code. You've seen how you can use Functional Programming best practices, yet still co-exist with noops in imperative code, and classes and scope in OOP.

I should also point out that writing imperative or OOP code like this is a great way to learn how to write FP. Sometimes our brains are wired to flesh out ideas in those styles, and that's great. Whatever works to get the ideas down. Functional Programming will still hurt just as much as Imperative or OOP if you've got a not-so-figured out idea on how some problems should be solved and structured. Write it so it feels comfortable, the refactor & test to purity.

You've seen how to compose these functions together synchronously via operands like && and ||, using [flow](https://lodash.com/docs/4.17.10#flow)/[compose](https://ramdajs.com/docs/#compose). You've also seen how to compose them in `Promise` chains and `Promise.all`, curried or not.

You've also seen how 100% unit test coverage in a FP code base still has bugs that are only surfaced with concrete implementations using integration testing, such as with Mountebank.

Node is often used for API's that have little to no state and are just orchestration layers for a variety of XML Soap, JSON, and text. The no mutable state of Functional Programming works nicely with that concept in ensuring those no state to debug. 

Conversely, if you're dealing with a lot of state such as database connections and streaming text files, not only can you see how you can test such challenging areas using pure functions, but also how many of those things can be run at the same time to speed things up with stepping on each other through global varibles.

# Code & Help

The [Code is on Github](https://github.com/JesterXL/fp-node). Got any questions, hit me up on [YouTube](https://www.youtube.com/user/jesterxl), [Twitter](https://twitter.com/jesterxl), [Facebook](https://www.facebook.com/) (I'm Jesse Warden), or [drop me an email](jesterxl@jessewarden.com).