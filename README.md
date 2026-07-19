# Bible Reading Plan

A phone-friendly tracker for the *Five Day Bible Reading Program* (2026 Edition,
FiveDayBibleReading.com). Read today's passages in the NIV and check them off —
no build step, no backend, just static HTML/CSS/JS.

## How it works

- The schedule has 260 readings (52 weeks &times; 5 readings/week), transcribed
  from the official PDF into [`data.js`](data.js).
- "Today" always shows your **next unread reading**, not the calendar date. If
  you miss a day, the plan never skips ahead — it just waits for you to catch
  up, matching the program's own "read 5x/week, catch up on weekends" design.
- Tapping a passage opens it on Bible Gateway (new tab) in your chosen
  translation (NIV, ESV, or CSB, set in Settings). Translation text is
  copyrighted, so this app links out to Bible Gateway rather than reproducing it.
- Progress is saved in your browser's local storage (per device, no account).

## iOS Home Screen widget

iOS doesn't let websites register real WidgetKit widgets, so this uses
[Scriptable](https://scriptable.app) (free) instead. See
[`widget/bible-plan-widget.js`](widget/bible-plan-widget.js) — it fetches the
live schedule from this site and shows the calendar-scheduled reading for
today (it can't read the web app's local storage, so it reflects the
calendar, not your actual saved progress). Tapping it opens the app.

Setup: install Scriptable &rarr; New Script &rarr; paste the file's contents
&rarr; run once to confirm it previews correctly &rarr; long-press your Home
Screen &rarr; Add Widget &rarr; Scriptable &rarr; pick a size &rarr; edit the
widget and set its Script to the one you just created.

## Running locally

Just open `index.html` in a browser, or serve the folder statically:

```
python3 -m http.server 8000
```

## Deploying

This is a static site — GitHub Pages, Netlify, Vercel, or any static host will
work with zero configuration. For GitHub Pages: Settings &rarr; Pages &rarr;
Deploy from branch, and pick the branch/root this app lives on.
