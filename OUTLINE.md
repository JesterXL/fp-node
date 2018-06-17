# Functional Programming Unit Testing in Node

- Introduction
- Before We Begin
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