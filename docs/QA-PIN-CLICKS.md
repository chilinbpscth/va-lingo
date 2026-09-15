# QA: Pin clicks on work image

- **Target:** https://chilinbpscth.github.io/va-lingo/
- **Login:** 2A / 01
- **Script:** `tests/qa-pin-clicks.mjs`
- **Fix note (2026-09-16):** Question-screen pins now show sequential **1, 2, 3…** in array order (not all `S.step+1`). Pin taps update DOM in-place / preserve scroll; `.image-wrap.markable` accepts pointer/touch; landing `overflow-x` + image min-height address tablet overflow and blank-image collapse.

## Expected pin behaviour

- On **question** screen: pin labels are sequential **1, 2, 3…** for the current answer’s pins.
- On **notebook** / other screens: pins keep per-question index numbering (as before).
- 「取消標記」 clears pins; limit remains 8.
- Onboarding gate accepts localStorage value **`done` only**.

Re-run after deploy:

```bash
node tests/qa-pin-clicks.mjs
```

Expect pin texts `['1','2','3']` after three clicks, then 0 after clear.
