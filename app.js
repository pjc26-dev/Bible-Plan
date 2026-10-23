(function () {
  "use strict";

  var STORAGE_KEY = "bible-plan-progress-v1";
  var VERSION_KEY = "bible-plan-version-v1";
  var VALID_VERSIONS = ["NIV", "ESV", "CSB"];
  var TOTAL = READINGS.length;

  var ICON_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  var ICON_CELEBRATE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>';

  // ---------- storage ----------

  function loadCompleted() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch (e) {
      return new Set();
    }
  }

  function saveCompleted(set) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
    scheduleSync();
  }

  var completed = loadCompleted();

  function loadVersion() {
    var v = localStorage.getItem(VERSION_KEY);
    return VALID_VERSIONS.indexOf(v) !== -1 ? v : "NIV";
  }

  function saveVersion(v) {
    localStorage.setItem(VERSION_KEY, v);
    scheduleSync();
  }

  var currentVersion = loadVersion();

  function isDone(index) {
    return completed.has(index);
  }

  function setDone(index, done) {
    if (done) completed.add(index);
    else completed.delete(index);
    saveCompleted(completed);
  }

  // ---------- derived data ----------

  function nextUnreadIndex() {
    for (var i = 0; i < TOTAL; i++) {
      if (!completed.has(i)) return i;
    }
    return -1; // all done
  }

  function completedCount() {
    return completed.size;
  }

  function weekProgress(weekNum) {
    var items = READINGS.filter(function (r) { return r.w === weekNum; });
    var done = items.filter(function (r) { return completed.has(r.index); }).length;
    return { done: done, total: items.length };
  }

  // attach absolute index to each reading once (READINGS order is already sequential)
  READINGS.forEach(function (r, i) { r.index = i; });

  function bibleGatewayUrl(passages) {
    var query = passages.join("; ");
    return "https://www.biblegateway.com/passage/?search=" +
      encodeURIComponent(query) + "&version=" + currentVersion;
  }

  // ---------- pace calculation ----------

  function parseISODate(s) {
    var parts = s.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function dateForWeekDay(week, day) {
    var start = parseISODate(PLAN_START_DATE);
    var offset = (week - 1) * 7 + (day - 1);
    var d = new Date(start);
    d.setDate(d.getDate() + offset);
    return d;
  }

  function formatShortDate(d) {
    return MONTH_NAMES[d.getMonth()] + " " + d.getDate();
  }

  function formatLongDate(d) {
    return DAY_NAMES[d.getDay()] + ", " + formatShortDate(d);
  }

  function expectedCountByNow() {
    var start = parseISODate(PLAN_START_DATE);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    if (today < start) return 0;
    var count = 0;
    var d = new Date(start);
    while (d <= today) {
      var day = d.getDay(); // 0 Sun .. 6 Sat
      if (day >= 1 && day <= 5) count++;
      d.setDate(d.getDate() + 1);
    }
    return Math.min(count, TOTAL);
  }

  // ---------- rendering: Today ----------

  function renderToday() {
    var card = document.getElementById("today-card");
    var idx = nextUnreadIndex();

    if (idx === -1) {
      card.innerHTML =
        '<div class="all-caught-up">' +
        '<div class="celebrate-icon">' + ICON_CELEBRATE + "</div>" +
        "<h2>You've finished the whole plan!</h2>" +
        '<p class="muted">All 260 readings are marked complete. Visit Settings to reset if you\'d like to start again.</p>' +
        "</div>";
    } else {
      var reading = READINGS[idx];
      var url = bibleGatewayUrl(reading.p);
      var html = "";
      html += '<div class="today-hero">';
      html += '<div class="eyebrow">Week ' + reading.w + " &middot; Reading " + reading.d + " of 5</div>";
      html += '<div class="hero-date">' + formatLongDate(dateForWeekDay(reading.w, reading.d)) + "</div>";
      html += "</div>";
      html += '<ul class="passage-list">';
      reading.p.forEach(function (passage) {
        html += '<li><a class="passage-link" target="_blank" rel="noopener" href="' +
          bibleGatewayUrl([passage]) + '">' + passage + '<span class="chev">' + ICON_CHEVRON + "</span></a></li>";
      });
      html += "</ul>";
      html += '<div class="today-actions">';
      html += '<a class="btn btn-secondary" target="_blank" rel="noopener" href="' + url + '">Open all passages together (' + currentVersion + ")</a>";
      html += '<button class="btn btn-primary" id="mark-done-btn">Mark as read</button>';
      html += "</div>";
      card.innerHTML = html;

      document.getElementById("mark-done-btn").addEventListener("click", function () {
        setDone(idx, true);
        renderAll();
      });
    }
  }

  function renderPace() {
    var card = document.getElementById("pace-card");
    var expected = expectedCountByNow();
    var actual = completedCount();
    var diff = actual - expected;

    var badgeClass = "ontrack";
    var label = "Right on pace";
    if (diff <= -3) {
      badgeClass = "behind";
      label = Math.abs(diff) + " reading" + (Math.abs(diff) === 1 ? "" : "s") + " behind";
    } else if (diff >= 3) {
      badgeClass = "ahead";
      label = diff + " readings ahead";
    }

    card.innerHTML =
      '<span class="pace-label">' + actual + " of " + TOTAL + " readings done</span>" +
      '<span class="pace-badge ' + badgeClass + '">' + label + "</span>";
  }

  // ---------- rendering: Progress ----------

  var RING_RADIUS = 45;
  var RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  function renderProgress() {
    var actual = completedCount();
    var pct = Math.round((actual / TOTAL) * 100);

    document.getElementById("ring-value").textContent = pct + "%";
    document.getElementById("progress-count").textContent = actual + " of " + TOTAL + " readings";

    var ringFill = document.getElementById("ring-fill");
    ringFill.style.strokeDasharray = RING_CIRCUMFERENCE.toFixed(2);
    ringFill.style.strokeDashoffset = (RING_CIRCUMFERENCE * (1 - pct / 100)).toFixed(2);

    var idx = nextUnreadIndex();
    var currentWeek = idx === -1 ? 52 : READINGS[idx].w;

    var grid = document.getElementById("progress-weeks");
    var html = "";
    for (var w = 1; w <= 52; w++) {
      var wp = weekProgress(w);
      var cls = "week-cell";
      if (wp.done === wp.total) cls += " complete";
      if (w === currentWeek) cls += " current";
      var range = formatShortDate(dateForWeekDay(w, 1)) + "–" + formatShortDate(dateForWeekDay(w, 5));
      html += '<div class="' + cls + '" title="Week ' + w + ": " + wp.done + "/" + wp.total + " (" + range + ')"></div>';
    }
    grid.innerHTML = html;
  }

  // ---------- rendering: Full list ----------

  function renderList(scrollToCurrent) {
    var container = document.getElementById("week-list");
    var idx = nextUnreadIndex();
    var currentWeek = idx === -1 ? 52 : READINGS[idx].w;

    var byWeek = {};
    READINGS.forEach(function (r) {
      if (!byWeek[r.w]) byWeek[r.w] = [];
      byWeek[r.w].push(r);
    });

    var html = "";
    for (var w = 1; w <= 52; w++) {
      var items = byWeek[w];
      var wp = weekProgress(w);
      var openAttr = (w === currentWeek) ? " open" : "";
      var range = formatShortDate(dateForWeekDay(w, 1)) + "–" + formatShortDate(dateForWeekDay(w, 5));
      html += '<details class="week-block" id="week-' + w + '"' + openAttr + '>';
      html += '<summary><span class="chevron">' + ICON_CHEVRON + '</span><span class="summary-meta">Week ' + w +
        ' <span class="week-date">(' + range + ')</span></span><span class="week-progress">' + wp.done + "/" + wp.total + "</span></summary>";
      items.forEach(function (r) {
        var done = isDone(r.index);
        var text = r.p.join("; ");
        var dateStr = formatShortDate(dateForWeekDay(r.w, r.d));
        html += '<div class="day-row' + (done ? " done" : "") + '" data-index="' + r.index + '">';
        html += '<span class="day-num">' + r.d + "</span>";
        html += '<button class="day-check" data-index="' + r.index + '">' + ICON_CHECK + "</button>";
        html += '<a class="day-text" target="_blank" rel="noopener" href="' + bibleGatewayUrl(r.p) + '">' + text +
          ' <span class="day-date">(' + dateStr + ')</span></a>';
        html += "</div>";
      });
      html += "</details>";
    }
    container.innerHTML = html;

    container.querySelectorAll(".day-check").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var i = parseInt(btn.getAttribute("data-index"), 10);
        setDone(i, !isDone(i));
        renderAll();
      });
    });

    if (scrollToCurrent) {
      var el = document.getElementById("week-" + currentWeek);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ---------- settings ----------

  document.getElementById("reset-progress").addEventListener("click", function () {
    if (confirm("Reset all reading progress? This can't be undone.")) {
      completed = new Set();
      saveCompleted(completed);
      renderAll();
      switchTab("today");
    }
  });

  // ---------- version picker ----------

  var versionPicker = document.getElementById("version-picker");
  var headerVersionEl = document.getElementById("header-version");

  function syncVersionUI() {
    versionPicker.querySelectorAll(".segment").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-version") === currentVersion);
    });
    headerVersionEl.textContent = currentVersion;
  }

  versionPicker.querySelectorAll(".segment").forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentVersion = btn.getAttribute("data-version");
      saveVersion(currentVersion);
      syncVersionUI();
      renderAll();
    });
  });

  syncVersionUI();

  function currentPlanWeekAndDay() {
    var start = parseISODate(PLAN_START_DATE);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    var daysElapsed = Math.floor((today - start) / 86400000);
    if (daysElapsed < 0) return { week: 1, day: 1 };
    var week = Math.floor(daysElapsed / 7) + 1;
    var dow = daysElapsed % 7; // 0 = Monday .. 6 = Sunday
    var day = Math.min(dow + 1, 5);
    if (week > 52) week = 52;
    return { week: week, day: day };
  }

  var weekSelect = document.getElementById("catchup-week");
  var daySelect = document.getElementById("catchup-day");
  var catchupPreview = document.getElementById("catchup-date-preview");
  var weekOptionsHtml = "";
  for (var w = 1; w <= 52; w++) {
    var wRange = formatShortDate(dateForWeekDay(w, 1)) + "–" + formatShortDate(dateForWeekDay(w, 5));
    weekOptionsHtml += '<option value="' + w + '">Week ' + w + " (" + wRange + ")</option>";
  }
  weekSelect.innerHTML = weekOptionsHtml;

  var planNow = currentPlanWeekAndDay();
  weekSelect.value = String(planNow.week);
  daySelect.value = String(planNow.day);

  function updateCatchupPreview() {
    var week = parseInt(weekSelect.value, 10);
    var day = parseInt(daySelect.value, 10);
    catchupPreview.textContent = "That's " + formatLongDate(dateForWeekDay(week, day)) + ".";
  }

  weekSelect.addEventListener("change", updateCatchupPreview);
  daySelect.addEventListener("change", updateCatchupPreview);
  updateCatchupPreview();

  document.getElementById("catchup-btn").addEventListener("click", function () {
    var week = parseInt(weekSelect.value, 10);
    var day = parseInt(daySelect.value, 10);
    var targetIndex = (week - 1) * 5 + (day - 1);
    var reading = READINGS[targetIndex];
    var count = targetIndex + 1;

    if (!confirm(
      "Mark all " + count + " readings through Week " + week + ", Reading " + day +
      " (" + formatLongDate(dateForWeekDay(week, day)) + " — " + reading.p.join("; ") + ") as read?"
    )) return;

    for (var i = 0; i <= targetIndex; i++) completed.add(i);
    saveCompleted(completed);
    renderAll();
    switchTab("today");
  });

  document.getElementById("jump-to-current").addEventListener("click", function () {
    renderList(true);
  });

  // ---------- tabs ----------

  var tabs = document.querySelectorAll(".tab-btn");
  function switchTab(target) {
    tabs.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-target") === target);
    });
    document.querySelectorAll(".view").forEach(function (view) {
      view.hidden = view.getAttribute("data-view") !== target;
    });
    if (target === "list") renderList(false);
  }

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchTab(btn.getAttribute("data-target"));
    });
  });

  // ---------- render everything ----------

  function renderAll() {
    renderToday();
    renderPace();
    renderProgress();
    var listView = document.getElementById("view-list");
    if (!listView.hidden) renderList(false);
  }

  renderAll();

  // ---------- morning paper sync ----------
  // Writes progress.json to the bibleprogress repo so the morning paper
  // (pjc26-dev/Randomstuff) can print the next unread reading. The token is
  // a fine-grained one that can only write to that repo.

  var SYNC_TOKEN_KEY = "bible-plan-sync-token-v1";
  var SYNC_LAST_KEY = "bible-plan-sync-last-v1";
  var SYNC_URL = "https://api.github.com/repos/pjc26-dev/bibleprogress/contents/progress.json";
  var syncTimer = null;
  var syncTokenInput = document.getElementById("sync-token");
  var syncStatusEl = document.getElementById("sync-status");

  function syncToken() {
    return localStorage.getItem(SYNC_TOKEN_KEY) || "";
  }

  function syncPayload() {
    return JSON.stringify({
      completed: Array.from(completed).sort(function (a, b) { return a - b; }),
      version: currentVersion
    });
  }

  function setSyncStatus(text) {
    syncStatusEl.textContent = text;
  }

  function scheduleSync() {
    if (!syncToken()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncProgress, 1500);
  }

  function githubRequest(method, body) {
    return fetch(SYNC_URL, {
      method: method,
      cache: "no-store",
      headers: {
        "Authorization": "Bearer " + syncToken(),
        "Accept": "application/vnd.github+json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  function syncProgress(force) {
    var payload = syncPayload();
    if (!syncToken() || (!force && payload === localStorage.getItem(SYNC_LAST_KEY))) {
      return Promise.resolve();
    }
    var data = JSON.parse(payload);
    data.updated = new Date().toISOString();
    setSyncStatus("Syncing…");
    return githubRequest("GET").then(function (res) {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(res.status);
      return res.json().then(function (file) { return file.sha; });
    }).then(function (sha) {
      var body = {
        message: "Progress: " + data.completed.length + " readings done",
        content: btoa(JSON.stringify(data, null, 1))
      };
      if (sha) body.sha = sha;
      return githubRequest("PUT", body);
    }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      localStorage.setItem(SYNC_LAST_KEY, payload);
      setSyncStatus("Synced " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) +
        " · " + data.completed.length + (data.completed.length === 1 ? " reading" : " readings") + " done");
    }).catch(function (e) {
      var code = String(e.message);
      setSyncStatus(code === "401" || code === "403" || code === "404"
        ? "Sync failed: the key was rejected (" + code + "). Check it can write to bibleprogress."
        : "Couldn't sync right now. It'll try again next time you open the app.");
    });
  }

  syncTokenInput.value = syncToken();
  document.getElementById("sync-save").addEventListener("click", function () {
    var token = syncTokenInput.value.trim();
    if (token) localStorage.setItem(SYNC_TOKEN_KEY, token);
    else localStorage.removeItem(SYNC_TOKEN_KEY);
    if (!token) { setSyncStatus("Sync turned off."); return; }
    syncProgress(true);
  });

  // Catch up on anything that couldn't sync last time (e.g. offline).
  syncProgress(false);

  // ---------- onboarding: add to home screen ----------

  var ONBOARDING_SEEN_KEY = "bible-plan-onboarding-seen-v1";

  function isRunningStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
  }

  function isIOS() {
    var ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS 13+ reports as Mac but has touch support
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }

  function isAndroid() {
    return /Android/.test(navigator.userAgent || "");
  }

  function onboardingStepsHtml() {
    if (isIOS()) {
      return "<ol>" +
        "<li>Tap the <strong>Share</strong> button (square with an arrow pointing up) in Safari's toolbar</li>" +
        "<li>Scroll down and tap <strong>Add to Home Screen</strong></li>" +
        "<li>Tap <strong>Add</strong> in the top right</li>" +
        "</ol>";
    }
    if (isAndroid()) {
      return "<ol>" +
        "<li>Tap the <strong>&#8942;</strong> menu in Chrome</li>" +
        "<li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>)</li>" +
        "<li>Confirm by tapping <strong>Add</strong> / <strong>Install</strong></li>" +
        "</ol>";
    }
    return "<ol>" +
      "<li>Open your browser's menu</li>" +
      "<li>Look for <strong>Add to Home Screen</strong> or <strong>Install app</strong></li>" +
      "</ol>";
  }

  function maybeShowOnboarding() {
    if (isRunningStandalone()) return; // already installed, no need to nag
    if (localStorage.getItem(ONBOARDING_SEEN_KEY)) return;

    var modal = document.getElementById("onboarding-modal");
    document.getElementById("onboarding-steps").innerHTML = onboardingStepsHtml();
    modal.hidden = false;

    document.getElementById("onboarding-dismiss").addEventListener("click", function () {
      localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
      modal.hidden = true;
    });
  }

  maybeShowOnboarding();
})();
