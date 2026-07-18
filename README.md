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
- Tapping a passage opens it in the NIV on Bible Gateway (new tab). NIV text is
  copyrighted, so this app links out to Bible Gateway rather than reproducing it.
- Progress is saved in your browser's local storage (per device, no account).

## Running locally

Just open `index.html` in a browser, or serve the folder statically:

```
python3 -m http.server 8000
```

## Deploying

This is a static site — GitHub Pages, Netlify, Vercel, or any static host will
work with zero configuration. For GitHub Pages: Settings &rarr; Pages &rarr;
Deploy from branch, and pick the branch/root this app lives on.
