## 2024-05-18 - Replacing `match` with `Set` lookup for single character checks
**Learning:** Using `Set.has()` to check single characters is significantly faster (~2.2x speedup) than creating inline regex strings with `.match()` on every iteration because it avoids regex compilation and allocation overhead in high-frequency rendering functions. Using a compiled regex with `.test()` provides a 1.6x speedup, but `Set` is still faster.
**Action:** In loops over characters, use a `Set` for known narrow/wide char mapping instead of `string.match(regex)`.
