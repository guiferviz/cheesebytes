In [[Python]], you can determine the total size of a string in bytes by first encoding the string to [[Unicode Transformation Format 8-bit (UTF-8)]] and then using the `len` function. This is necessary because, by default, strings in Python 3 are Unicode, where a character can occupy more than one byte.

```python
>>> len('你')
1
>>> len('你'.encode('utf-8'))
3
```