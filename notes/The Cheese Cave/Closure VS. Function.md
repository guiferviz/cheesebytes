A [[Closure]] is a **programming construct** that combines a function (lambda or not) with its surrounding context, allowing the function to access [[Free Variables]] defined outside of it.

This means that a closure captures the values of these variables, enabling the function to be evaluated even after its original context has finished executing. While often confused with lambdas, a closure specifically refers to the environment that binds these free variables, making the expression self-contained and evaluable.

See more about this comparison in this Stack Overflow question: [What is the difference between a 'closure' and a 'lambda'?](https://stackoverflow.com/questions/220658/what-is-the-difference-between-a-closure-and-a-lambda).