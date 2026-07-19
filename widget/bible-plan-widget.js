// Bible Reading Plan — Scriptable Home Screen widget
// Shows today's scheduled reading (by calendar date) from the live
// Bible-Plan site. Tapping the widget opens the app so you can check
// off your actual progress there — this widget can't read the app's
// local storage, so it always reflects the calendar schedule, not
// necessarily what you've actually marked done.

const SITE_URL = "https://pjc26-dev.github.io/Bible-Plan/";
const DATA_URL = SITE_URL + "data.js";

const COLORS = {
  bg: "#211c16",
  card: "#2a2419",
  text: "#efe8db",
  muted: "#a99e8c",
  accent: "#d3a45f"
};

function parseISODate(s) {
  const parts = s.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatShortDate(d) {
  return MONTH_NAMES[d.getMonth()] + " " + d.getDate();
}

const BOOK_ABBR = {
  "Genesis": "Gen", "Exodus": "Ex", "Leviticus": "Lev", "Numbers": "Num", "Deuteronomy": "Deut",
  "Joshua": "Josh", "Judges": "Judg", "Ruth": "Ruth", "1 Samuel": "1 Sam", "2 Samuel": "2 Sam",
  "1 Kings": "1 Kin", "2 Kings": "2 Kin", "1 Chronicles": "1 Chr", "2 Chronicles": "2 Chr",
  "Ezra": "Ezra", "Nehemiah": "Neh", "Esther": "Esth", "Job": "Job", "Psalm": "Ps",
  "Proverbs": "Prov", "Ecclesiastes": "Eccl", "Song of Solomon": "Song", "Isaiah": "Isa",
  "Jeremiah": "Jer", "Lamentations": "Lam", "Ezekiel": "Ezek", "Daniel": "Dan", "Hosea": "Hos",
  "Joel": "Joel", "Amos": "Amos", "Obadiah": "Obad", "Jonah": "Jonah", "Micah": "Mic",
  "Nahum": "Nah", "Habakkuk": "Hab", "Zephaniah": "Zeph", "Haggai": "Hag", "Zechariah": "Zech",
  "Malachi": "Mal", "Matthew": "Matt", "Mark": "Mark", "Luke": "Luke", "John": "John",
  "Acts": "Acts", "Romans": "Rom", "1 Corinthians": "1 Cor", "2 Corinthians": "2 Cor",
  "Galatians": "Gal", "Ephesians": "Eph", "Philippians": "Phil", "Colossians": "Col",
  "1 Thessalonians": "1 Thess", "2 Thessalonians": "2 Thess", "1 Timothy": "1 Tim",
  "2 Timothy": "2 Tim", "Titus": "Titus", "Philemon": "Phlm", "Hebrews": "Heb",
  "James": "Jas", "1 Peter": "1 Pet", "2 Peter": "2 Pet", "1 John": "1 John", "2 John": "2 John",
  "3 John": "3 John", "Jude": "Jude", "Revelation": "Rev"
};
const BOOK_NAMES_BY_LENGTH = Object.keys(BOOK_ABBR).sort((a, b) => b.length - a.length);

function shortenPassage(p) {
  for (const name of BOOK_NAMES_BY_LENGTH) {
    if (p === name || p.startsWith(name + " ")) {
      return BOOK_ABBR[name] + p.slice(name.length);
    }
  }
  return p;
}

function planWeekAndDay(startDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  let daysElapsed = Math.floor((today - start) / 86400000);
  if (daysElapsed < 0) daysElapsed = 0;
  const dow = daysElapsed % 7; // 0 = Mon .. 6 = Sun
  const isWeekend = dow >= 5;

  // On weekends, point at the coming Monday's reading instead of capping at Friday.
  const targetDaysElapsed = isWeekend ? daysElapsed + (7 - dow) : daysElapsed;
  let week = Math.floor(targetDaysElapsed / 7) + 1;
  if (week > 52) week = 52;
  const targetDow = targetDaysElapsed % 7;
  const day = Math.min(targetDow + 1, 5);
  return { week, day, isWeekend, daysElapsed: targetDaysElapsed };
}

async function loadPlanData() {
  const req = new Request(DATA_URL);
  const text = await req.loadString();
  const startMatch = text.match(/const PLAN_START_DATE = "([^"]+)"/);
  const dataMatch = text.match(/const READINGS = (\[[\s\S]*?\]);/);
  if (!startMatch || !dataMatch) throw new Error("Could not parse plan data");
  return {
    startDate: parseISODate(startMatch[1]),
    readings: JSON.parse(dataMatch[1])
  };
}

function buildWidget(state) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color(COLORS.bg);
  widget.url = SITE_URL;
  widget.setPadding(14, 14, 14, 14);

  const family = config.widgetFamily || "medium";

  const eyebrow = widget.addText(state.eyebrow.toUpperCase());
  eyebrow.font = Font.boldSystemFont(11);
  eyebrow.textColor = new Color(COLORS.accent);
  widget.addSpacer(3);

  const heading = widget.addText(state.heading);
  heading.font = Font.boldSystemFont(family === "small" ? 15 : 18);
  heading.textColor = new Color(COLORS.text);
  widget.addSpacer(6);

  const maxLines = family === "small" ? 3 : family === "medium" ? 4 : 8;
  const shown = state.passages.slice(0, maxLines);
  shown.forEach((p) => {
    const line = widget.addText("• " + shortenPassage(p));
    line.font = Font.systemFont(family === "small" ? 12 : 14);
    line.textColor = new Color(COLORS.text);
    line.minimumScaleFactor = 0.7;
    widget.addSpacer(2);
  });
  if (state.passages.length > shown.length) {
    const more = widget.addText("+" + (state.passages.length - shown.length) + " more");
    more.font = Font.systemFont(12);
    more.textColor = new Color(COLORS.muted);
  }

  widget.addSpacer();
  const footer = widget.addText(state.footer);
  footer.font = Font.systemFont(10);
  footer.textColor = new Color(COLORS.muted);

  return widget;
}

async function run() {
  let widget;
  try {
    const { startDate, readings } = await loadPlanData();
    const { week, day, isWeekend, daysElapsed } = planWeekAndDay(startDate);

    const reading = readings.find((r) => r.w === week && r.d === day);
    const readingDate = new Date(startDate);
    readingDate.setDate(readingDate.getDate() + daysElapsed);

    widget = buildWidget({
      eyebrow: (isWeekend ? "Up next · " : "") + "Week " + week + " · Reading " + day + " of 5",
      heading: formatShortDate(readingDate),
      passages: reading ? reading.p : [],
      footer: isWeekend ? "Next reading — tap to open Bible Plan" : "Tap to open Bible Plan"
    });
  } catch (e) {
    widget = new ListWidget();
    widget.backgroundColor = new Color(COLORS.bg);
    widget.url = SITE_URL;
    const t = widget.addText("Couldn't load today's reading. Tap to open the app.");
    t.font = Font.systemFont(13);
    t.textColor = new Color(COLORS.text);
  }

  const midnight = new Date();
  midnight.setHours(24, 0, 5, 0);
  widget.refreshAfterDate = midnight;

  Script.setWidget(widget);
  if (!config.runsInWidget) {
    const family = config.widgetFamily || "medium";
    if (family === "small") await widget.presentSmall();
    else if (family === "large") await widget.presentLarge();
    else await widget.presentMedium();
  }
  Script.complete();
}

await run();
