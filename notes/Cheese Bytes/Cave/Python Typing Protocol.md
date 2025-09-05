In [[Python]], protocols are a way to specify the expected behaviour of objects without defining a formal interface or base class. This is useful when you do not control the type but know that it implements certain methods or attributes. Protocols help in avoiding linter errors by informing the linter about the expected behaviour of the objects.

In essence, protocols provide an explicit way to achieve [[Duck Typing]] in Python by formalising the expected behaviour that an object should exhibit.

To use protocols in Python, you can leverage the `typing.Protocol` class. The `Protocol` class allows you to define a set of methods or attributes that a class should have to satisfy the protocol. When a class implements all the methods/attributes specified in the protocol, it is considered to satisfy the protocol.

Here's how you can use protocols in Python:

```python
from typing import Protocol


class MyProtocol(Protocol):
    def my_method(self, x: int) -> str:
        ...

# Class implementing the protocol but not extending from it.
class MyClass:
    def my_method(self, x: int) -> str:
		...

def my_function(obj: MyProtocol):
	assert type(obj.my_method(1)) == str)

# Create an instance of MyClass and pass it to some_function.
# No linter errors because MyClass defines `my_method` with the same
# signature as MyProtocol.
# No need to cast or inherit from MyProtocol.
my_function(MyClass())
```