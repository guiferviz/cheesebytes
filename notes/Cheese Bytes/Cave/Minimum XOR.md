Given a list of numbers, identify the pair of numbers that results in the
smallest XOR value.

# Solution 1: Sorting

Finding the pair of numbers with the minimum XOR value can be done in
$n \cdot log(n)$. This can be achieved by first sorting the list of numbers and
then comparing the XOR of each consecutive pair in the sorted list. When numbers
are sorted, consecutive numbers are closer in value compared to non-consecutive
numbers. This closeness often results in a smaller XOR value because XOR tends
to produce smaller results when the binary representations of the numbers are
similar.

## Code

```python pyodide auto-run=once height=520 show-run-button=true
def min_xor_pair(nums):
    if len(nums) < 2:
        return None

    nums = sorted(nums)

    min_xor = float("inf")
    best_pair = None

    for i in range(len(nums) - 1):
        current_xor = nums[i] ^ nums[i + 1]

        if current_xor < min_xor:
            min_xor = current_xor
            best_pair = (nums[i], nums[i + 1])

    return best_pair, min_xor


def run_tests():  # FOLD
    test_cases = [
        ([9, 5, 3], [((3, 5), 6)]),
        ([0, 2, 5, 7], [((0, 2), 2), ((5, 7), 2)]),
        ([10, 15, 5, 2], [((10, 15), 5)]),
        ([1, 2, 3, 4], [((2, 3), 1)]),
        ([8, 8, 10], [((8, 8), 0)]),
        ([42], [None]),
        ([], [None]),
    ]

    failed = False
    print("Test results:\n")

    for nums, expected in test_cases:
        try:
            actual = min_xor_pair(nums)
        except Exception as error:
            actual = None
            print(f"🔴 {nums} FAIL (error: {error})")
            failed = True
            continue

        if actual in expected:
            print(f"🟢 {nums} PASS")
        else:
            print(f"🔴 {nums} FAIL (expected one of {expected}, got {actual})")
            failed = True

    if failed:
        raise AssertionError("Some test cases failed")

    print("\nAll tests passed!")


run_tests()
```

# Solution 2: Trie

Using a trie (prefix tree) is another efficient approach to solve the problem of
finding the pair of numbers with the minimum XOR value. A binary trie can be
constructed where each path from the root to a leaf node represents the binary
representation of a number. By inserting all numbers into the trie, we can then
find the minimum XOR for each number by traversing the trie in a way that tries
to match the same bits first (to minimize the XOR result).

This method can be more efficient than sorting for large datasets, especially
when the range of numbers is limited, as it can achieve a time complexity of
$O(n \cdot b)$, where $b$ is the number of bits required to represent the
numbers.

## Code

```python pyodide auto-run=once height=520 show-run-button=true
class TrieNode:  # FOLD
    def __init__(self):
        self.children = {}


class BinaryTrie:  # FOLD
    def __init__(self):
        self.root = TrieNode()

    def insert(self, num):
        current = self.root

        for bit_index in range(31, -1, -1):
            bit = (num >> bit_index) & 1

            if bit not in current.children:
                current.children[bit] = TrieNode()

            current = current.children[bit]

    def find_min_xor_match(self, num):
        current = self.root
        match = 0

        for bit_index in range(31, -1, -1):
            bit = (num >> bit_index) & 1

            # For minimum XOR, prefer the same bit.
            if bit in current.children:
                next_bit = bit
            else:
                next_bit = 1 - bit

            match = (match << 1) | next_bit
            current = current.children[next_bit]

        return match


def min_xor_pair_trie(nums):
    if len(nums) < 2:
        return None

    trie = BinaryTrie()

    trie.insert(nums[0])

    min_xor = float("inf")
    best_pair = None

    for i in range(1, len(nums)):
        current_num = nums[i]
        matched_num = trie.find_min_xor_match(current_num)
        current_xor = current_num ^ matched_num

        if current_xor < min_xor:
            min_xor = current_xor
            best_pair = (matched_num, current_num)

        trie.insert(current_num)

    return best_pair, min_xor


def run_tests():  # FOLD
    test_cases = [
        ([9, 5, 3], [((5, 3), 6), ((3, 5), 6)]),
        ([0, 2, 5, 7], [((0, 2), 2), ((5, 7), 2)]),
        ([10, 15, 5, 2], [((10, 15), 5), ((15, 10), 5)]),
        ([1, 2, 3, 4], [((2, 3), 1), ((3, 2), 1)]),
        ([8, 8, 10], [((8, 8), 0)]),
        ([42], [None]),
        ([], [None]),
    ]

    failed = False
    print("Test results:\n")

    for nums, expected in test_cases:
        try:
            actual = min_xor_pair_trie(nums)
        except Exception as error:
            actual = None
            print(f"🔴 {nums} FAIL (error: {error})")
            failed = True
            continue

        if actual in expected:
            print(f"🟢 {nums} PASS")
        else:
            print(f"🔴 {nums} FAIL (expected one of {expected}, got {actual})")
            failed = True

    if failed:
        raise AssertionError("Some test cases failed")

    print("\nAll tests passed!")


run_tests()
```
