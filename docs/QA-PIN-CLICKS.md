# QA: Pin clicks on work image

- **Target:** https://chilinbpscth.github.io/va-lingo/
- **Login:** 2A / 01
- **When (HKT):** 16/9/2026 07:36:52
- **Overall:** FAIL

## Checks

| Status | Check | Detail |
|--------|-------|--------|
| PASS | page-load | Loaded https://chilinbpscth.github.io/va-lingo/ |
| FAIL | onboarding-skip-via-ISO-timestamp | ISO value did NOT skip gate. Key va-lingo-onboarding-kitten:v1:2A:01="2026-09-15T23:36:45.938Z". Live app requires value === "done". |
| PASS | onboarding-skip-via-done | Gate cleared after setting localStorage to "done" |
| PASS | enter-round | Reached lesson screen |
| PASS | open-reference-question | Reference question screen with markable work-image |
| PASS | pin-click-1-upper-left | Clicked (0.25,0.25) → pinCount=1 texts=[1] expected=[1] |
| FAIL | pin-click-2-center | Clicked (0.5,0.5) → pinCount=1 texts=[1] expected=[1,2] |
| FAIL | pin-click-3-lower-right | Clicked (0.75,0.72) → pinCount=2 texts=[1,2] expected=[1,2,3] |
| FAIL | pin-textContent-is-sequential | pins=2 texts=[1,2] expected=[1,2,3] |
| PASS | clear-pins-取消標記 | After 取消標記, pin count=0 (expected 0) |

## Failures / errors

### onboarding-skip-via-ISO-timestamp

ISO value did NOT skip gate. Key va-lingo-onboarding-kitten:v1:2A:01="2026-09-15T23:36:45.938Z". Live app requires value === "done".

### pin-click-2-center

Clicked (0.5,0.5) → pinCount=1 texts=[1] expected=[1,2]

### pin-click-3-lower-right

Clicked (0.75,0.72) → pinCount=2 texts=[1,2] expected=[1,2,3]

### pin-textContent-is-sequential

pins=2 texts=[1,2] expected=[1,2,3]

## Notes

- As requested, initScript set `va-lingo-onboarding-kitten:v1:2A:01` to ISO `2026-09-15T23:36:45.938Z`; gate still shown (expected vs live code).
- Screenshot: `work/qa-artifacts/01-onboarding-gate-after-iso.png`
- Screenshot: `work/qa-artifacts/02-lesson.png`
- Question step label: "1 / 3・我的發現" → expect pin texts 1,2,3… in click order
- Screenshot: `work/qa-artifacts/03-pins-after-clicks.png`
- Screenshot: `work/qa-artifacts/04-after-clear.png`
- Final URL: https://chilinbpscth.github.io/va-lingo/

## Expected pin behaviour (from live `guided-app.js`)

- On question screen, pins on the **current answer** show sequential **1, 2, 3…** in array/click order (not the step number).
- Notebook/other screens still use per-question index numbering.
- Clicking 「取消標記」 (`data-action="clear-pins"`) clears `answer().pins` and updates pin DOM (in-place when possible).
- Onboarding gate accepts localStorage value **`done` only** (`=== 'done'`); ISO timestamps do **not** skip the kitten gate.
