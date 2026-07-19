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

function planWeekAndDay(startDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  let daysElapsed = Math.floor((today - start) / 86400000);
  if (daysElapsed < 0) daysElapsed = 0;
  let week = Math.floor(daysElapsed / 7) + 1;
  if (week > 52) week = 52;
  const dow = daysElapsed % 7; // 0 = Mon .. 6 = Sun
  const isWeekend = dow >= 5;
  const day = Math.min(dow + 1, 5);
  return { week, day, isWeekend };
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
    const line = widget.addText("• " + p);
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
    const { week, day, isWeekend } = planWeekAndDay(startDate);

    if (isWeekend) {
      const weekReadings = readings.filter((r) => r.w === week);
      const allPassages = [].concat(...weekReadings.map((r) => r.p));
      widget = buildWidget({
        eyebrow: "Weekend catch-up",
        heading: "Week " + week,
        passages: allPassages,
        footer: "Catch up on anything you missed this week"
      });
    } else {
      const reading = readings.find((r) => r.w === week && r.d === day);
      const dateOffset = (week - 1) * 7 + (day - 1);
      const readingDate = new Date(startDate);
      readingDate.setDate(readingDate.getDate() + dateOffset);
      widget = buildWidget({
        eyebrow: "Week " + week + " · Reading " + day + " of 5",
        heading: formatShortDate(readingDate),
        passages: reading ? reading.p : [],
        footer: "Tap to open Bible Plan"
      });
    }
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
