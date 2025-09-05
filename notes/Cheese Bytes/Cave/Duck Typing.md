Duck Typing is a programming philosophy that focuses on the behaviour of an object rather than its specific type or class. The object's type itself is not important. Rather, the object should support all methods/attributes called on it.

Duck Typing is closely associated with [[Object Oriented Programming]] but also can be applied to other [[Programming Paradigms]]. It is often more naturally associated with [[Dynamic Typing]] due to its flexibility. Sometimes people are referring to [[Structural Typing]] when they say Duck Typing. Duck Typing is indeed not precise terminology and can mean different things to different people.

> [!question] Why Duck 🐥?
> The term Duck Typing comes from the saying, *If it looks like a duck, swims like a duck, and quacks like a duck, then it probably is a duck*. The origin of the term can be traced back to discussions within the [[Python]] community during the early 2000s.

## Common criticism

Here are the key points of criticism often associated with duck typing:

1. Lack of Explicit Contracts: Duck typing lacks formal type contracts, making code behaviour-focused rather than type-focused.
2. Runtime Errors: Incompatible type issues might only be discovered at runtime, leading to unexpected crashes or behaviour.
3. Documentation Challenges: Duck typing can complicate effective code documentation due to the absence of explicit type information.
4. Tooling Limitations: Traditional code analysis tools and IDEs might struggle to provide accurate suggestions and error detection in duck typing scenarios.
5. Maintenance Difficulty: As codebases grow, maintaining a clear understanding of expected object behaviour becomes more challenging.

> [!warning]
> Essentially, the problem is that "if it walks like a duck and sounds like a duck," it could be a dragon doing the duck. You don't always want to leave dragons in the pond, even if they know how to impersonate ducks.
> 
> ![[DuckDragon.png|300]]

## Duck Typing VS Protocol Class

The [[Python Typing Protocol|Protocol]] class in Python is a way to make Duck Typing more explicit and to provide guidance to both developers and linters. However, it is important to note that the concept of Duck Typing existed before the Protocol class was introduced in Python 3.8. For instance, Python's built-in `sum` function can be employed with any list of objects that implements the `__add__` operation. When using Duck Typing without a Protocol, the responsibility falls on you to understand which types of objects are suitable for a given function's input.