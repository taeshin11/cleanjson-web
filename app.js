/* ============================================================
   CleanJSON — app.js
   Zero-dependency vanilla JS JSON formatter & validator
   ============================================================ */

'use strict';

// ---- Config ----
const WEBHOOK_URL = ''; // TODO: paste Google Apps Script web app URL here
const INDENT = 2;

// ---- DOM refs ----
const jsonInput      = document.getElementById('jsonInput');
const jsonOutputCode = document.getElementById('jsonOutputCode');
const jsonOutput     = document.getElementById('jsonOutput');
const errorDisplay   = document.getElementById('errorDisplay');
const formatBtn      = document.getElementById('formatBtn');
const validateBtn    = document.getElementById('validateBtn');
const minifyBtn      = document.getElementById('minifyBtn');
const clearBtn       = document.getElementById('clearBtn');
const copyBtn        = document.getElementById('copyBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const lineNumbers    = document.getElementById('lineNumbers');
const tabBtns        = document.querySelectorAll('.tab-btn');
const inputPanel     = document.getElementById('input-panel');
const outputPanel    = document.getElementById('output-panel');

// ---- State ----
let lastValidJSON = null;
let isDark = false;

// ============================================================
// Dark mode
// ============================================================
function applyTheme(dark) {
  isDark = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.querySelector('.icon-sun').style.display  = dark ? 'none'   : '';
  document.querySelector('.icon-moon').style.display = dark ? ''       : 'none';
  try { localStorage.setItem('cleanjson-theme', dark ? 'dark' : 'light'); } catch (_) {}
}

darkModeToggle.addEventListener('click', () => applyTheme(!isDark));

// Restore saved theme
(function () {
  try {
    const saved = localStorage.getItem('cleanjson-theme');
    if (saved === 'dark') applyTheme(true);
    else if (saved === 'light') applyTheme(false);
    else applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (_) { applyTheme(false); }
})();

// ============================================================
// Line numbers
// ============================================================
function updateLineNumbers() {
  const lines = jsonInput.value.split('\n').length;
  let nums = '';
  for (let i = 1; i <= lines; i++) nums += i + '\n';
  lineNumbers.textContent = nums;
  // Sync scroll
  lineNumbers.scrollTop = jsonInput.scrollTop;
}

jsonInput.addEventListener('input',  updateLineNumbers);
jsonInput.addEventListener('scroll', () => { lineNumbers.scrollTop = jsonInput.scrollTop; });
updateLineNumbers();

// ============================================================
// Syntax highlighting
// ============================================================
function syntaxHighlight(json) {
  // Escape HTML first
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // Key: strip quotes and colon for display, then re-wrap
          return `<span class="syn-key">${match.slice(0, -1)}</span>:`;
        }
        return `<span class="syn-str">${match}</span>`;
      }
      if (/true|false/.test(match)) return `<span class="syn-bool">${match}</span>`;
      if (/null/.test(match))       return `<span class="syn-null">${match}</span>`;
      return `<span class="syn-num">${match}</span>`;
    }
  );
}

// ============================================================
// Status messages
// ============================================================
function showStatus(type, title, detail = '') {
  const icons = { error: '❌', success: '✅', info: 'ℹ️' };
  errorDisplay.innerHTML = `
    <div class="status-msg status-msg--${type}" role="alert">
      <span class="status-icon" aria-hidden="true">${icons[type]}</span>
      <div class="status-body">
        <div class="status-title">${title}</div>
        ${detail ? `<div class="status-detail">${escapeHTML(detail)}</div>` : ''}
      </div>
    </div>`;
}

function clearStatus() {
  errorDisplay.innerHTML = '';
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// Parse helper — returns { ok, parsed, error, line, col }
// ============================================================
function tryParse(text) {
  try {
    const parsed = JSON.parse(text);
    return { ok: true, parsed };
  } catch (e) {
    const msg = e.message || 'Invalid JSON';
    // Extract line/col from error message (Chrome: "at position N", Firefox: "line N col M")
    let line = null, col = null;

    // "JSON.parse: ... at line N column M of the JSON data" (Firefox)
    let m = msg.match(/line (\d+) col(?:umn)? (\d+)/i);
    if (m) { line = parseInt(m[1], 10); col = parseInt(m[2], 10); }

    // "Unexpected token ... at position N" (Chrome/V8)
    if (!m) {
      m = msg.match(/at position (\d+)/i);
      if (m) {
        const pos = parseInt(m[1], 10);
        const before = text.slice(0, pos);
        line = (before.match(/\n/g) || []).length + 1;
        col  = pos - before.lastIndexOf('\n');
      }
    }

    return { ok: false, error: msg, line, col };
  }
}

// ============================================================
// Highlight error line in textarea
// ============================================================
function highlightErrorLine(lineNum) {
  jsonInput.classList.add('error-state');
  if (!lineNum) return;

  // Scroll textarea to show the error line
  const lines = jsonInput.value.split('\n');
  let charPos = 0;
  for (let i = 0; i < lineNum - 1 && i < lines.length; i++) {
    charPos += lines[i].length + 1;
  }
  jsonInput.setSelectionRange(charPos, charPos + (lines[lineNum - 1] || '').length);
  jsonInput.focus();
}

function clearErrorState() {
  jsonInput.classList.remove('error-state');
}

// ============================================================
// Format
// ============================================================
function formatJSON() {
  const text = jsonInput.value.trim();
  if (!text) { clearStatus(); clearOutput(); return; }

  const result = tryParse(text);

  if (result.ok) {
    const formatted = JSON.stringify(result.parsed, null, INDENT);
    jsonInput.value = formatted;
    updateLineNumbers();
    setOutput(formatted);
    clearErrorState();
    lastValidJSON = formatted;
    showStatus('success', 'Valid JSON', `Formatted successfully.`);
    copyBtn.disabled = false;
    sendWebhook({ inputLength: text.length, isValid: true, errorType: '' });
  } else {
    clearOutput();
    clearErrorState();
    highlightErrorLine(result.line);
    const loc = result.line ? `Line ${result.line}${result.col ? `, col ${result.col}` : ''}` : '';
    showStatus('error', `Invalid JSON${loc ? ' — ' + loc : ''}`, result.error);
    copyBtn.disabled = true;
    sendWebhook({ inputLength: text.length, isValid: false, errorType: result.error });
  }
}

// ============================================================
// Validate (without reformatting)
// ============================================================
function validateJSON() {
  const text = jsonInput.value.trim();
  if (!text) { clearStatus(); return; }

  const result = tryParse(text);

  if (result.ok) {
    clearErrorState();
    lastValidJSON = JSON.stringify(result.parsed, null, INDENT);
    showStatus('success', 'Valid JSON', 'No errors found.');
    sendWebhook({ inputLength: text.length, isValid: true, errorType: '' });
  } else {
    highlightErrorLine(result.line);
    const loc = result.line ? `Line ${result.line}${result.col ? `, col ${result.col}` : ''}` : '';
    showStatus('error', `Invalid JSON${loc ? ' — ' + loc : ''}`, result.error);
    sendWebhook({ inputLength: text.length, isValid: false, errorType: result.error });
  }
}

// ============================================================
// Minify
// ============================================================
function minifyJSON() {
  const text = jsonInput.value.trim();
  if (!text) return;

  const result = tryParse(text);
  if (result.ok) {
    const minified = JSON.stringify(result.parsed);
    setOutput(minified);
    clearErrorState();
    lastValidJSON = minified;
    showStatus('info', 'Minified', `${minified.length} characters`);
    copyBtn.disabled = false;
  } else {
    const loc = result.line ? `Line ${result.line}` : '';
    showStatus('error', `Cannot minify — Invalid JSON${loc ? ' (' + loc + ')' : ''}`, result.error);
  }
}

// ============================================================
// Output helpers
// ============================================================
function setOutput(json) {
  jsonOutputCode.innerHTML = syntaxHighlight(json);
}

function clearOutput() {
  jsonOutputCode.innerHTML = '';
  lastValidJSON = null;
  copyBtn.disabled = true;
}

// ============================================================
// Copy to clipboard
// ============================================================
copyBtn.addEventListener('click', async () => {
  const text = jsonOutputCode.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const orig = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span aria-hidden="true">✅</span> Copied!';
    copyBtn.disabled = true;
    setTimeout(() => { copyBtn.innerHTML = orig; copyBtn.disabled = false; }, 1800);
  } catch (_) {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showStatus('success', 'Copied to clipboard!');
  }
});

// ============================================================
// Clear
// ============================================================
clearBtn.addEventListener('click', () => {
  jsonInput.value = '';
  clearOutput();
  clearStatus();
  clearErrorState();
  updateLineNumbers();
  jsonInput.focus();
});

// ============================================================
// Button event listeners
// ============================================================
formatBtn.addEventListener('click', formatJSON);
validateBtn.addEventListener('click', validateJSON);
minifyBtn.addEventListener('click', minifyJSON);

// ============================================================
// Keyboard shortcut: Ctrl+Shift+F (or Cmd+Shift+F on Mac)
// ============================================================
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    formatJSON();
  }
});

// ============================================================
// Auto-format on paste
// ============================================================
jsonInput.addEventListener('paste', () => {
  // Give the paste event time to populate the textarea
  setTimeout(() => {
    if (jsonInput.value.trim()) {
      formatJSON();
    }
  }, 0);
});

// ============================================================
// Drag and drop
// ============================================================
jsonInput.addEventListener('dragover', (e) => {
  e.preventDefault();
  jsonInput.classList.add('drag-over');
});
jsonInput.addEventListener('dragleave', () => {
  jsonInput.classList.remove('drag-over');
});
jsonInput.addEventListener('drop', (e) => {
  e.preventDefault();
  jsonInput.classList.remove('drag-over');
  const text = e.dataTransfer.getData('text');
  if (text) {
    jsonInput.value = text;
    updateLineNumbers();
    formatJSON();
    return;
  }
  const file = e.dataTransfer.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      jsonInput.value = ev.target.result;
      updateLineNumbers();
      formatJSON();
    };
    reader.readAsText(file);
  }
});

// ============================================================
// Mobile tab switcher
// ============================================================
function activateTab(tabName) {
  tabBtns.forEach(btn => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('tab-btn--active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  inputPanel.classList.toggle('tab-active', tabName === 'input');
  outputPanel.classList.toggle('tab-active', tabName === 'output');
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// Initialize — input tab active by default
activateTab('input');

// Auto-switch to output tab when formatting on mobile
function maybeShowOutput() {
  if (window.innerWidth <= 680) activateTab('output');
}
formatBtn.addEventListener('click', maybeShowOutput);
minifyBtn.addEventListener('click', maybeShowOutput);

// ============================================================
// Visitor counter (localStorage-based, no backend needed for MVP)
// ============================================================
(function initVisitorCounter() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const data  = JSON.parse(localStorage.getItem('cleanjson-visitors') || '{}');
    const total = (data.total || 0) + (data.lastVisit === today ? 0 : 1);
    const todayCount = data.lastVisit === today
      ? (data.todayCount || 1)
      : 1;

    const newData = { total, lastVisit: today, todayCount };
    localStorage.setItem('cleanjson-visitors', JSON.stringify(newData));

    document.getElementById('visitorToday').textContent = `Today: ${todayCount.toLocaleString()}`;
    document.getElementById('visitorTotal').textContent  = `Total: ${total.toLocaleString()}`;
  } catch (_) {
    // If localStorage is blocked, just hide the counter
    const counter = document.getElementById('visitorCounter');
    if (counter) counter.style.display = 'none';
  }
})();

// ============================================================
// Google Sheets webhook (fire-and-forget)
// ============================================================
function sendWebhook(payload) {
  if (!WEBHOOK_URL) return;
  fetch(WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp:   new Date().toISOString(),
      inputLength: payload.inputLength,
      isValid:     payload.isValid,
      errorType:   payload.errorType || '',
      userAgent:   navigator.userAgent
    })
  }).catch(() => {}); // silent fail
}
