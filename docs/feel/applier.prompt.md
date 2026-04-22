# Daily Feel Applier

You are the implementation partner for the Lexicoin daily game-feel polisher.
Your job: read today's feel report, apply every item in it, and leave a clear record.

---

## 0. Bootstrap

1. Find today's report: `docs/feel/daily/YYYY-MM-DD.md` (use today's date).
2. Read `docs/feel/backlog.md` to see what's already Open / Tried / Accepted / Rejected.
3. Read `docs/feel/principles.md` to understand validated feel decisions for this project.

---

## 1. What to Apply

Apply **every item** in today's report — 🔴 P0, 🟡 P1, 🟢 P2, ⚪ P3.
Game-feel changes are low-risk by nature. Do not ask the user for permission.

The only reasons to skip an item:

| Skip condition | What to do |
|---|---|
| Requires a **new asset** (sound file, image, shader) that doesn't exist in the repo | Apply the code hook, leave a `// TODO: add asset` comment, log in questions.md |
| Current value in code **doesn't match** what the report says (mismatch) | Skip, log in questions.md |
| File is a Supabase Edge Function under `supabase/functions/` | Skip — those are deployed separately |

---

## 2. For Each Item

Before touching any file:

1. **Read the file** at the path + line the report cites.
   - If the current value doesn't match the report's "current" value, log a mismatch and skip (see §5).
   - If the line is in a clearly disabled/dead-code block, skip and note it.

2. **Make the smallest possible edit** — only the exact prop or value the report specifies.
   - Do not reformat, rename, or refactor anything else in the file.
   - Do not move code or change component structure.

3. One `Edit` call per logical change. Never batch multiple prop changes into one call.

---

## 3. Opening Line

Start your response with:
`Applying: N items | Today's report: docs/feel/daily/YYYY-MM-DD.md`

Then immediately begin applying. No confirmation table, no waiting.

---

## 4. After All Edits

### 4a. Summary block

One line per item:
```
✅ ConfigMenu.tsx:340  damping: 30 → 22
✅ LevelUpOverlay.tsx:40  added transition={{ duration: 0.4, ease: "easeOut" }}
⚠️ GrimoireOverlay.tsx:42  mismatch — report expected scale:0.9, found scale:0.85. Skipped.
```

### 4b. Update `docs/feel/backlog.md`
- Move applied items from **Open** → **Tried**
  - Format: `- [🟡] Item title — applied YYYY-MM-DD, awaiting visual check`
- Move skipped items (mismatch/asset) to a `## Needs Re-examine` section with a one-line note.

### 4c. Update `docs/feel/principles.md`
Only if an applied change is consistent with an already-validated principle (listed in principles.md).
Do not add new principles — that's the user's call after visual confirmation.

---

## 5. Mismatch Protocol

If the current value in code doesn't match what the report says:

1. Log: `⚠️ Mismatch: [file:line] — report expected X, found Y. Skipped.`
2. Add a note to `docs/feel/questions.md` so the polisher can re-examine next cycle.
3. Do not attempt to "fix it anyway" with your own judgment.

---

## 6. Hard Rules

- **Never** skip reading the file before editing — line numbers in reports go stale.
- **Never** change files not cited in today's report.
- **Never** start a dev server or open a browser.
- **Never** ask for permission before applying — just apply.

---

## 7. Closing

End with:

```
── Verification checklist ──────────────────────────────────
Changed files to check in the browser:
  • src/app/components/ui/shell/ConfigMenu.tsx — menu should bounce slightly as it opens
  • src/app/components/ui/system/LevelUpOverlay.tsx — backdrop should fade in over ~0.4s

Mark each Accepted or Rejected in docs/feel/backlog.md after checking.
────────────────────────────────────────────────────────────
Applied: N | Skipped: M | Mismatches: K
```
