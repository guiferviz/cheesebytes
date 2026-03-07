/** Compute Lehmer code for a permutation array of indices. */
export function toLehmer(perm: number[]): number[] {
  const n = perm.length;
  const code: number[] = [];
  for (let i = 0; i < n; i++) {
    let count = 0;
    for (let j = i + 1; j < n; j++) {
      if (perm[j] < perm[i]) count++;
    }
    code.push(count);
  }
  return code;
}

/** Lehmer code → factoriadic index. */
export function lehmerToIndex(lehmer: number[]): number {
  const n = lehmer.length;
  let result = 0;
  let fact = 1;
  for (let i = n - 1; i >= 0; i--) {
    result += lehmer[i] * fact;
    fact *= n - i;
  }
  return result;
}

/** Factorial. */
export function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Convert a factoriadic index to a Lehmer code of length n. */
export function indexToLehmer(index: number, n: number): number[] {
  const lehmer: number[] = [];
  let remainder = index;
  for (let i = 0; i < n; i++) {
    const fact = factorial(n - 1 - i);
    const digit = fact > 0 ? Math.floor(remainder / fact) : 0;
    lehmer.push(digit);
    remainder = fact > 0 ? remainder % fact : 0;
  }
  return lehmer;
}

/** Convert a Lehmer code to a permutation by picking from a shrinking pool. */
export function lehmerToPerm(lehmer: number[]): number[] {
  const n = lehmer.length;
  const pool = Array.from({ length: n }, (_, i) => i);
  const perm: number[] = [];
  for (const digit of lehmer) {
    const safeDigit = Math.min(digit, pool.length - 1);
    perm.push(pool[safeDigit]);
    pool.splice(safeDigit, 1);
  }
  return perm;
}

/** All permutations of [0..n-1] in lexicographic order. */
export function allPermutations(n: number): number[][] {
  const result: number[][] = [];
  const arr = Array.from({ length: n }, (_, i) => i);
  function permute(start: number) {
    if (start === n) {
      result.push([...arr]);
      return;
    }
    for (let i = start; i < n; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  }
  permute(0);
  result.sort((a, b) => {
    for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  return result;
}
