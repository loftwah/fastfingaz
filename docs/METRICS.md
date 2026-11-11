# How Thinktype measures typing

The short version: standard WPM measures transcription. Thinktype measures composition. That requires
two clocks, an explicit idle model, and an honest signal score.

> v0.2 adds durable history and eligibility rules. The formulas below are the ones the extension
> actually runs; `shared/metrics.ts` is the source of truth and `tests/metrics.test.ts` covers them.

## Two clocks

Every sent prompt produces one session with two WPM numbers.

### Think WPM — finished thought

```text
thinkWpm = (finalCharacters / 5) / (wallMs / 60000)
```

- `finalCharacters` is the length of the text that was actually sent.
- `wallMs` runs from the first editing keystroke in an empty composer to the send action.
- This includes every pause, every re-read, every "what am I actually trying to say".

This is the number that does not exist anywhere else. It is slower than your hands, by design.

### Flow WPM — hands-only cadence

```text
flowWpm = (insertedCharacters / 5) / (activeMs / 60000)
```

- `insertedCharacters` counts every character inserted, including ones later deleted.
- `activeMs` is wall time with long gaps clamped (see below).
- This is close to what a typing test measures, except the text is yours.

### Live WPM — the big number

The big number while typing is a live flow reading, not think:

```text
liveWpm = typing intervals / 5 / (last 8s of active typing / 60000)
```

- It uses the last 8 seconds of **actual typing**. A gap longer than the idle threshold is not
  typing time, so it is skipped; that is what lets the reading hold across a think pause. The
  session's FLOW score still clamps that gap, so the receipt pays for thinking.
- Before the run is 8 seconds old, the denominator is the typing span it actually used, not a
  full eight seconds. A three-second burst is not diluted by five seconds that never happened.
- An explicit manual pause is removed from the window entirely.
- The number is recomputed only when a new key lands. It holds through a think gap and
  never bleeds down just because the clock advanced.
- This is composition cadence, not transcription speed. It will sit below a Monkeytype
  sprint if you pause between words to decide what to say, and it is not the session's
  THINK score.

Five characters per word is the conventional definition used by Monkeytype and most typing tools.
Spaces count. A separate word count is shown for humans, but all WPM math uses the five-character
word so the numbers are comparable across tools.

## Active time and the thinking threshold

A naive "time between first and last key" makes a thoughtful writer look slow. Ignoring pauses
entirely makes a distracted session look fast. Thinktype clamps each gap instead:

```text
for every gap between editing keys (and the final gap to send):
  activeMs += min(gap, idleThresholdMs)
```

Default threshold: **2000 ms**. A 30-second pause contributes 2 seconds of active time. You can set
it from 1 to 5 seconds in settings.

Why clamp rather than drop? Dropping makes a session with many pauses artificially fast, because the
pauses vanish from the denominator. Clamping treats a pause as a short reset — you still pay for it,
but it does not swallow the whole session.

### A pause is not a reset

The threshold also defines "thinking" for the live HUD. If no key has arrived for
`max(1800ms, threshold)`, the HUD switches to **THINKING**. The live WPM reading is held at its last
measured value; it does not drop to zero and it does not decay with the clock. The run is still alive,
the timer and word count keep moving, and the final sent prompt is measured as one run.

The idle HUD (no active run) shows the last eligible session's **think** WPM, labelled `LAST THINK`,
plus the best think WPM and the rolling average. Before the first reading it shows dashes, never zero.

### Manual pause

The pause button in the HUD header (or **Alt+Shift+P**) freezes the run explicitly. The display shows
`PAUSED`, the big number holds, and the wall and active clocks stop. The paused duration is excluded
from `wallMs` and from the clamped `activeMs`; typing resumes automatically. This is different from
the automatic THINKING state, where the pause is still counted as part of the run. A manual pause is
a declared break, not a failed run, and it never creates a receipt on its own.

## Peak

The best 5-second window, measured against the real span of that window:

```text
peak = max over i of (keys in [t_i, t_i + 5000] / 5) / (actualSpan / 60000)
```

A window needs at least 1.5 seconds of real span and 5 keys to count, so a 2-key session cannot
produce a fake 300 WPM peak. Peak is a "what were you capable of for a moment" number, not an average.

## Consistency

Coefficient of variation of inter-key intervals inside the idle threshold:

```text
intervals = [t_i - t_{i-1}] where 0 < interval <= idleThreshold
cv        = stdev(intervals) / mean(intervals)
consistency = clamp(100 * (1 - cv), 0, 100)
```

This is deliberately the Monkeytype definition. A perfectly even rhythm scores 100. Real prose scores
lower than a typing test because spaces, punctuation and capital letters change interval lengths.
Treat it as a relative signal across your own sessions, not an absolute grade.

Sessions with fewer than 5 intervals report 0 rather than a misleading score.

Peak and consistency are computed from editing-key timings, which include Backspace/Delete. A burst
of corrections can therefore nudge peak up slightly; the character-based WPM numbers are unaffected.

## Correction rate

```text
correctionRate = deletedCharacters / (insertedCharacters + deletedCharacters) * 100
```

There is no target text, so accuracy cannot be measured. Correction rate is the honest proxy: how
much of your editing was spent removing things. Backspacing a whole clause is a normal part of
thinking in text; it is not "wrong".

## Signal quality

The percentage you see on a receipt and card answers: *how much of this final text can we attribute
to keys we actually observed?*

```text
netTyped = max(0, inserted - deleted - pasted)
base     = clamp(netTyped / finalCharacters, 0, 1)

if pasted > 0:        base *= 0.55
if ime:               base *= 0.75
if undoCount > 0:     base *= 0.92
if replacements > 0:  base *= 0.97

signal = clamp(base, 0.05, 1)
```

A pasted draft, a heavily autocorrected message, or an IME-composed message is not hidden. But a
session needs at least **50% signal** to be recorded at all, and paste-dominated runs are rejected
before they reach history.

## History and eligibility

Only sent prompts are measured. Drafts and abandoned runs are never written to history.

A run must clear every gate before it is recorded:

| Gate | Rule |
| --- | --- |
| Sent prompt | The composer cleared after Enter or the send button. |
| Minimum wall time | 3 seconds. |
| Minimum characters | Your setting, with a hard floor of 16. |
| Signal | At least 50%. |
| Paste | Less than 50% of the final text. |
| Resumed draft | Recorded in the draft bucket; excluded from best and averages. |
| IME | Counts toward averages above 50% signal; excluded from best below 85%. |

The durable summary lives in `chrome.storage.local`:

- **best think, best flow, best peak** — merged by maximum, so a lower run can never overwrite a
  higher best. A best that falls out of the retained session list is still remembered.
- **last** — the most recent eligible sent prompt, small enough to show in the idle HUD.
- **rolling** — the last 20 eligible sessions, weighted.
- **all time** — every eligible session retained locally (up to 500).
- **totals** — recorded sessions and the draft bucket.

A resumed draft (text already in the composer when tracking began) is kept for the record and shown
with a `DRAFT` badge, but its wall clock only covers the tail of the message, so it cannot move the
baseline.

### In-progress snapshots

The content script writes a text-free snapshot of the current run to `chrome.storage.session` about
once per second. If the tab reloads, the HUD shows those numbers as **PAUSED / NOT RECORDED** until
you start typing again. The snapshot contains the held live WPM, think/flow/peak, words, time, status
and the cadence series — never prompt text — and it is never saved as history. The popup reads the
same snapshot to show a **LIVE RUN** panel while you are typing.

## Pauses

Every gap over the threshold is a pause, including the final gap between the last keystroke and
send. The card and popup report the count and median; the popup also reports the longest.

## Aggregation

Averages are weighted by the underlying time and characters, not by taking a mean of per-session
WPMs:

```text
averageThinkWpm = sum(finalChars) / 5 / (sum(wallMs) / 60000)
averageFlowWpm  = sum(insertedChars) / 5 / (sum(activeMs) / 60000)
```

The rolling average uses the last 20 eligible sessions. The all-time average uses every eligible
session retained locally. Drafts, paste-dominated runs and low-signal runs are excluded. This
prevents a one-line "thanks" from moving the average.

## What is deliberately not measured

- **Accuracy vs a target.** There is no target. Correction rate is the substitute.
- **Typing while editing an existing draft as a normal run.** A resumed draft is recorded in the
  draft bucket and excluded from best and averages.
- **Thinking before the first keystroke.** The wall clock starts at the first key, not when the page
  loaded. Think of it as "how fast does a thought become text once you start writing it".
- **Speech, dictation, AI autocomplete.** Not typing; paste/dictation paths lower signal.
- **Absolute skill.** These numbers are most useful against your own baseline, on your own topics.

## Comparing with Monkeytype

Monkeytype gives you the words and a short timer, so its WPM is sustained transcription.
Thinktype gives you a blank composer, so the numbers answer a different question:

- **FLOW** is the fair comparison: characters over active typing time.
- **PEAK** is the closest thing to a typing sprint: your best five seconds.
- **THINK** is deliberately lower: it includes every pause, re-read and rewrite.
- **LIVE** is your current composition cadence, held through think gaps.

A 130 WPM Monkeytype score with 100 WPM FLOW is not a contradiction. It is the cost of
choosing the words. Use PEAK to see the hands, FLOW to see the writing session, and THINK
to see the finished thought.

## Validation plan

The first version is a measurement instrument, and instruments need calibration:

1. **Baseline against a known test.** Type a 60-second Monkeytype run and a Thinktype prompt of
   similar length. Flow WPM should land in the same neighbourhood; a large gap means the idle model
   or character accounting needs work.
2. **Threshold sweep.** Run the same three prompts at 1s, 2s and 3s thresholds. Pick the threshold
   that best matches when *you* feel you stopped typing versus stopped thinking.
3. **Repeated prompts.** Write the same explanation three times on different days. The spread is
   your noise floor; any "improvement" smaller than that is not real.
4. **Paste and autocorrect probes.** Confirm that a pasted prompt and an autocorrected prompt both
   report low signal, and that a normal prompt reports high signal.
5. **UI drift probes.** ChatGPT ships composer changes regularly. The selector fallbacks should keep
   attaching; add a case whenever a new composer shape appears.

If you collect a week of real sessions, the useful next features are a personal baseline band and a
weekly recap, not more decimal places.
