# How Thinktype measures typing

The short version: standard WPM measures transcription. Thinktype measures composition. That requires
two clocks, an explicit idle model, and an honest signal score.

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

The threshold is also used to define "thinking" for the live HUD. If no key has arrived for
`max(1200ms, threshold)`, the HUD switches to `thinking` and the live number drops to zero.

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

A pasted draft, a heavily autocorrected message, or an IME-composed message is still saved, but it is
shown with low signal and excluded from averages when more than half the text was pasted.

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

Sessions with `pasteRatio >= 0.5` or zero words are excluded. This prevents a one-line "thanks" from
moving the average.

## What is deliberately not measured

- **Accuracy vs a target.** There is no target. Correction rate is the substitute.
- **Typing while editing an existing draft.** A session starts only when the composer was empty at
  the first keystroke. Editing a saved draft is a different activity.
- **Thinking before the first keystroke.** The wall clock starts at the first key, not when the page
  loaded. Think of it as "how fast does a thought become text once you start writing it".
- **Speech, dictation, AI autocomplete.** Not typing; paste/dictation paths lower signal.
- **Absolute skill.** These numbers are most useful against your own baseline, on your own topics.

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
