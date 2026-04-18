UTF-8 is a [[Unicode]] character encoding that maps each symbol to one, two,
three, or four bytes.

For example, the Euro sign, €, corresponds to the three
bytes `11100010 10000010 10101100`. The rules for mapping characters are as
follows:

- For a single-byte character, the first bit must be zero.
- For an `n`-byte character, the first byte starts with `n` ones and a zero. The
  other `n - 1` bytes all start with `10`.

Visually, this can be represented as follows.

```
 Bytes   |           Byte format
-----------------------------------------------
   1     | 0xxxxxxx
   2     | 110xxxxx 10xxxxxx
   3     | 1110xxxx 10xxxxxx 10xxxxxx
   4     | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
```
