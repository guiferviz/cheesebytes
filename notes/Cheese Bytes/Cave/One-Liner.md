In [[Programming]], a "one-liner" is a single line of code that performs a task concisely. Popular for their brevity and the challenge they present. A good one-liner shines when it does a lot with little.

One-liners are common in languages like Python, Perl, and Ruby, which support compact and functional expressions.

There are even competitions to create the shortest one-liners for complex tasks.

Examples of Python one-liners:
```python
# Sum of squares of even numbers in a list
numbers = [1, 2, 3, 4, 5, 6, 7, 8]
result = sum(x**2 for x in numbers if x % 2 == 0)
```
```python
# Check for palindromes
text = "ana lava lana".replace(" ", "")
is_palindrome = text == text[::-1]
```
```python
# Remove duplicates while maintaining order
original_list = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
unique_list = list(dict.fromkeys(original_list))
```

A complex one:

```python
fibonacci = lambda n:pow(2<<n,n+1,(4<<2*n)-(2<<n)-1)%(2<<n)
assert [fibonacci(i) for i in range(5)] == [0, 1, 1, 2, 3]
# taken from: https://stackoverflow.com/a/37509291
```

> [!warning]
> While one-liners can be elegant and compact, it is important to balance readability and conciseness. In collaborative projects, prioritize code clarity and maintainability.