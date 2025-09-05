It is hard to believe, but a bit-level operation like bitwise can help us calculate the median in [[Python]]. Here's how:

```python
nums = sorted([4, 3, 5, 6, 2, 1])
mid = len(nums) // 2
res = (nums[mid] + nums[~mid]) / 2
```