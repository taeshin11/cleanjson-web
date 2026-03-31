/* ============================================================
   CleanJSON — app.js
   Zero-dependency vanilla JS JSON formatter & validator
   ============================================================ */

'use strict';

// ---- Config ----
const WEBHOOK_URL = ''; // TODO: paste Google Apps Script web app URL here
const INDENT = 2;

// ---- DOM refs ----
const jsonInput       = document.getElementById('jsonInput');
const jsonOutputCode  = document.getElementById('jsonOutputCode');
const jsonOutput      = document.getElementById('jsonOutput');
const treeView        = document.getElementById('treeView');
const errorDisplay    = document.getElementById('errorDisplay');
const formatBtn       = document.getElementById('formatBtn');
const validateBtn     = document.getElementById('validateBtn');
const minifyBtn       = document.getElementById('minifyBtn');
const escapeBtn       = document.getElementById('escapeBtn');
const unescapeBtn     = document.getElementById('unescapeBtn');
const downloadBtn     = document.getElementById('downloadBtn');
const shareBtn        = document.getElementById('shareBtn');
const clearBtn        = document.getElementById('clearBtn');
const copyBtn         = document.getElementById('copyBtn');
const treeToggleBtn   = document.getElementById('treeToggleBtn');
const darkModeToggle  = document.getElementById('darkModeToggle');
const lineNumbers     = document.getElementById('lineNumbers');
const tabBtns         = document.querySelectorAll('.tab-btn');
const inputPanel      = document.getElementById('input-panel');
const outputPanel     = document.getElementById('output-panel');
const shortcutsBtn    = document.getElementById('shortcutsBtn');
const shortcutsModal  = document.getElementById('shortcutsModal');
const shortcutsClose  = document.getElementById('shortcutsClose');
const jsonPathDisplay = document.getElementById('jsonPathDisplay');
const jsonPathValue   = document.getElementById('jsonPathValue');
const jsonPathCopy    = document.getElementById('jsonPathCopy');
const autoPasteToggle = document.getElementById('autoPasteToggle');

// ---- State ----
let lastValidJSON = null;
let lastParsed = null;
let isDark = false;
let treeViewActive = false;

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
  lineNumbers.scrollTop = jsonInput.scrollTop;
}

jsonInput.addEventListener('input',  updateLineNumbers);
jsonInput.addEventListener('scroll', () => { lineNumbers.scrollTop = jsonInput.scrollTop; });
updateLineNumbers();

// ============================================================
// Syntax highlighting
// ============================================================
function syntaxHighlight(json) {
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
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
function showStatus(type, title, detail) {
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
// Parse helper
// ============================================================
function tryParse(text) {
  try {
    const parsed = JSON.parse(text);
    return { ok: true, parsed };
  } catch (e) {
    const msg = e.message || 'Invalid JSON';
    let line = null, col = null;

    let m = msg.match(/line (\d+) col(?:umn)? (\d+)/i);
    if (m) { line = parseInt(m[1], 10); col = parseInt(m[2], 10); }

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
    lastParsed = result.parsed;
    showStatus('success', I18N.t('validJson'), I18N.t('formattedOk'));
    enableOutputButtons();
    sendWebhook({ inputLength: text.length, isValid: true, errorType: '' });
  } else {
    clearOutput();
    clearErrorState();
    highlightErrorLine(result.line);
    const loc = result.line ? `${I18N.t('line')} ${result.line}${result.col ? `, ${I18N.t('col')} ${result.col}` : ''}` : '';
    showStatus('error', `${I18N.t('invalidJson')}${loc ? ' — ' + loc : ''}`, result.error);
    disableOutputButtons();
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
    lastParsed = result.parsed;
    showStatus('success', I18N.t('validJson'), I18N.t('noErrors'));
    sendWebhook({ inputLength: text.length, isValid: true, errorType: '' });
  } else {
    highlightErrorLine(result.line);
    const loc = result.line ? `${I18N.t('line')} ${result.line}${result.col ? `, ${I18N.t('col')} ${result.col}` : ''}` : '';
    showStatus('error', `${I18N.t('invalidJson')}${loc ? ' — ' + loc : ''}`, result.error);
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
    lastParsed = result.parsed;
    showStatus('info', I18N.t('minified'), `${minified.length} ${I18N.t('characters')}`);
    enableOutputButtons();
  } else {
    const loc = result.line ? `${I18N.t('line')} ${result.line}` : '';
    showStatus('error', `${I18N.t('cannotMinify')}${loc ? ' (' + loc + ')' : ''}`, result.error);
  }
}

// ============================================================
// Escape / Unescape
// ============================================================
function escapeJSON() {
  const text = jsonInput.value.trim();
  if (!text) return;
  const escaped = JSON.stringify(text);
  setOutput(escaped);
  showStatus('info', I18N.t('escaped'), I18N.t('jsonEscaped'));
  copyBtn.disabled = false;
}

function unescapeJSON() {
  const text = jsonInput.value.trim();
  if (!text) return;
  try {
    const unescaped = JSON.parse(text);
    if (typeof unescaped !== 'string') {
      // If it parsed to a non-string, just format it
      const formatted = JSON.stringify(unescaped, null, INDENT);
      jsonInput.value = formatted;
      updateLineNumbers();
      setOutput(formatted);
      lastValidJSON = formatted;
      lastParsed = unescaped;
      showStatus('success', I18N.t('parsedJson'), I18N.t('inputWasValid'));
      enableOutputButtons();
    } else {
      // It was a JSON string — put unescaped value back in input
      jsonInput.value = unescaped;
      updateLineNumbers();
      // Try to format it if it's valid JSON
      const inner = tryParse(unescaped);
      if (inner.ok) {
        const formatted = JSON.stringify(inner.parsed, null, INDENT);
        jsonInput.value = formatted;
        updateLineNumbers();
        setOutput(formatted);
        lastValidJSON = formatted;
        lastParsed = inner.parsed;
        showStatus('success', I18N.t('unescapedFormatted'), I18N.t('strUnescapedFormatted'));
        enableOutputButtons();
      } else {
        setOutput(unescaped);
        showStatus('info', I18N.t('unescaped'), I18N.t('stringUnescaped'));
        copyBtn.disabled = false;
      }
    }
  } catch (_) {
    showStatus('error', I18N.t('cannotUnescape'), I18N.t('notValidEscaped'));
  }
}

// ============================================================
// Tree view
// ============================================================
function toggleTreeView() {
  treeViewActive = !treeViewActive;
  if (treeViewActive && lastParsed !== null) {
    treeView.innerHTML = '';
    treeView.appendChild(buildTreeNode(lastParsed, ''));
    treeView.style.display = 'block';
    jsonOutput.style.display = 'none';
    treeToggleBtn.innerHTML = I18N.t('codeBtn');
  } else {
    treeView.style.display = 'none';
    jsonOutput.style.display = 'block';
    treeToggleBtn.innerHTML = I18N.t('treeBtn');
    treeViewActive = false;
  }
}

function buildTreeNode(data, path) {
  const frag = document.createDocumentFragment();

  if (data === null) {
    const span = document.createElement('span');
    span.className = 'tree-null';
    span.textContent = 'null';
    span.setAttribute('data-path', path);
    span.addEventListener('click', () => showJsonPath(path));
    frag.appendChild(span);
    return frag;
  }

  if (typeof data !== 'object') {
    const span = document.createElement('span');
    if (typeof data === 'string') {
      span.className = 'tree-str';
      span.textContent = JSON.stringify(data);
    } else if (typeof data === 'boolean') {
      span.className = 'tree-bool';
      span.textContent = String(data);
    } else {
      span.className = 'tree-num';
      span.textContent = String(data);
    }
    span.setAttribute('data-path', path);
    span.addEventListener('click', () => showJsonPath(path));
    frag.appendChild(span);
    return frag;
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);
  const bracket = isArray ? ['[', ']'] : ['{', '}'];

  const container = document.createElement('div');

  // Toggle
  const toggle = document.createElement('span');
  toggle.className = 'tree-toggle';
  toggle.textContent = '▼';
  toggle.setAttribute('role', 'button');
  toggle.setAttribute('aria-label', 'Toggle collapse');
  toggle.tabIndex = 0;

  const openBracket = document.createElement('span');
  openBracket.className = 'tree-bracket';
  openBracket.textContent = bracket[0];

  const count = document.createElement('span');
  count.className = 'tree-count';
  count.textContent = ` ${entries.length} ${isArray ? I18N.t('items') : I18N.t('keys')}`;

  container.appendChild(toggle);
  container.appendChild(openBracket);
  container.appendChild(count);

  const children = document.createElement('div');
  children.className = 'tree-children tree-node';

  entries.forEach(([key, value]) => {
    const row = document.createElement('div');
    const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`;

    if (!isArray) {
      const keySpan = document.createElement('span');
      keySpan.className = 'tree-key';
      keySpan.textContent = `"${key}"`;
      keySpan.setAttribute('data-path', childPath);
      keySpan.addEventListener('click', (e) => { e.stopPropagation(); showJsonPath(childPath); });
      row.appendChild(keySpan);
      row.appendChild(document.createTextNode(': '));
    }

    row.appendChild(buildTreeNode(value, childPath));
    children.appendChild(row);
  });

  const closeBracket = document.createElement('span');
  closeBracket.className = 'tree-bracket';
  closeBracket.textContent = bracket[1];

  container.appendChild(children);
  container.appendChild(closeBracket);

  function toggleCollapse() {
    const collapsed = !children.classList.contains('hidden');
    children.classList.toggle('hidden', collapsed);
    closeBracket.style.display = collapsed ? 'none' : '';
    count.style.display = collapsed ? '' : 'none';
    toggle.classList.toggle('collapsed', collapsed);
    toggle.textContent = collapsed ? '▶' : '▼';
  }

  count.style.display = 'none';
  toggle.addEventListener('click', toggleCollapse);
  toggle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCollapse(); } });

  frag.appendChild(container);
  return frag;
}

// ============================================================
// JSON Path finder
// ============================================================
function showJsonPath(path) {
  const displayPath = path || '$';
  const normalized = '$' + displayPath;
  jsonPathValue.textContent = normalized;
  jsonPathDisplay.style.display = 'flex';
}

jsonPathCopy.addEventListener('click', async () => {
  const text = jsonPathValue.textContent;
  try {
    await navigator.clipboard.writeText(text);
    jsonPathCopy.textContent = '✅';
    setTimeout(() => { jsonPathCopy.textContent = '📋'; }, 1200);
  } catch (_) {}
});

// ============================================================
// Share URL
// ============================================================
function shareJSON() {
  const text = jsonInput.value.trim();
  if (!text) return;
  try {
    const encoded = btoa(unescape(encodeURIComponent(text)));
    const url = window.location.origin + window.location.pathname + '#json=' + encoded;
    navigator.clipboard.writeText(url).then(() => {
      showStatus('success', I18N.t('shareUrlCopied'), I18N.t('pasteAnywhere'));
    }).catch(() => {
      showStatus('info', I18N.t('shareUrl'), url);
    });
  } catch (_) {
    showStatus('error', I18N.t('shareFailed'), I18N.t('couldNotEncode'));
  }
}

// Load JSON from URL hash on page load
(function loadFromHash() {
  try {
    const hash = window.location.hash;
    if (hash.startsWith('#json=')) {
      const encoded = hash.slice(6);
      const decoded = decodeURIComponent(escape(atob(encoded)));
      jsonInput.value = decoded;
      updateLineNumbers();
      setTimeout(formatJSON, 0);
    }
  } catch (_) {}
})();

// ============================================================
// Download JSON file
// ============================================================
function downloadJSON() {
  const text = jsonOutputCode.textContent;
  if (!text) return;
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'formatted.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus('success', I18N.t('downloaded'), I18N.t('fileSaved'));
}

// ============================================================
// Output helpers
// ============================================================
function setOutput(json) {
  jsonOutputCode.innerHTML = syntaxHighlight(json);
  if (treeViewActive && lastParsed !== null) {
    treeView.innerHTML = '';
    treeView.appendChild(buildTreeNode(lastParsed, ''));
  }
}

function clearOutput() {
  jsonOutputCode.innerHTML = '';
  treeView.innerHTML = '';
  lastValidJSON = null;
  lastParsed = null;
  disableOutputButtons();
  jsonPathDisplay.style.display = 'none';
  if (treeViewActive) toggleTreeView();
}

function enableOutputButtons() {
  copyBtn.disabled = false;
  downloadBtn.disabled = false;
  shareBtn.disabled = false;
  treeToggleBtn.disabled = false;
}

function disableOutputButtons() {
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  shareBtn.disabled = true;
  treeToggleBtn.disabled = true;
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
    copyBtn.innerHTML = I18N.t('copied');
    copyBtn.disabled = true;
    setTimeout(() => { copyBtn.innerHTML = orig; copyBtn.disabled = false; }, 1800);
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showStatus('success', I18N.t('copiedClipboard'));
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
escapeBtn.addEventListener('click', escapeJSON);
unescapeBtn.addEventListener('click', unescapeJSON);
downloadBtn.addEventListener('click', downloadJSON);
shareBtn.addEventListener('click', shareJSON);
treeToggleBtn.addEventListener('click', toggleTreeView);

// ============================================================
// Keyboard shortcuts
// ============================================================
document.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.shiftKey) {
    switch (e.key.toUpperCase()) {
      case 'F': e.preventDefault(); formatJSON(); break;
      case 'V': e.preventDefault(); validateJSON(); break;
      case 'M': e.preventDefault(); minifyJSON(); break;
      case 'C': e.preventDefault(); copyBtn.click(); break;
      case 'X': e.preventDefault(); clearBtn.click(); break;
      case 'S': e.preventDefault(); shareJSON(); break;
      case 'D': e.preventDefault(); downloadJSON(); break;
    }
    return;
  }

  // '?' to open shortcuts (when not in input)
  if (e.key === '?' && document.activeElement !== jsonInput) {
    e.preventDefault();
    openShortcutsModal();
  }

  // Escape to close modal
  if (e.key === 'Escape' && shortcutsModal.style.display !== 'none') {
    closeShortcutsModal();
  }
});

// ============================================================
// Shortcuts modal
// ============================================================
function openShortcutsModal() {
  shortcutsModal.style.display = 'flex';
  shortcutsClose.focus();
}

function closeShortcutsModal() {
  shortcutsModal.style.display = 'none';
}

shortcutsBtn.addEventListener('click', openShortcutsModal);
shortcutsClose.addEventListener('click', closeShortcutsModal);
shortcutsModal.addEventListener('click', (e) => {
  if (e.target === shortcutsModal) closeShortcutsModal();
});

// ============================================================
// Auto-format on paste
// ============================================================
jsonInput.addEventListener('paste', () => {
  setTimeout(() => {
    if (autoPasteToggle.checked && jsonInput.value.trim()) formatJSON();
  }, 0);
});

// ============================================================
// File upload
// ============================================================
const fileUpload = document.getElementById('fileUpload');
fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    jsonInput.value = ev.target.result;
    updateLineNumbers();
    formatJSON();
  };
  reader.readAsText(file);
  fileUpload.value = '';
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

activateTab('input');

function maybeShowOutput() {
  if (window.innerWidth <= 680) activateTab('output');
}
formatBtn.addEventListener('click', maybeShowOutput);
minifyBtn.addEventListener('click', maybeShowOutput);

// ============================================================
// Visitor counter (localStorage-based)
// ============================================================
(function initVisitorCounter() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const data  = JSON.parse(localStorage.getItem('cleanjson-visitors') || '{}');
    const total = (data.total || 0) + 1;
    const todayCount = data.lastVisit === today ? (data.todayCount || 0) + 1 : 1;

    const newData = { total, lastVisit: today, todayCount };
    localStorage.setItem('cleanjson-visitors', JSON.stringify(newData));

    document.getElementById('visitorToday').textContent = `${I18N.t('today')}: ${todayCount.toLocaleString()}`;
    document.getElementById('visitorTotal').textContent  = `${I18N.t('total')}: ${total.toLocaleString()}`;
  } catch (_) {
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
  }).catch(() => {});
}
