const api = window.neotraductor;

let currentConfig = {};
let sourceLang = 'auto';
let targetLang = 'en';
let lastResult = '';

function $(id) { return document.getElementById(id); }

async function init() {
  currentConfig = await api.getConfig();
  sourceLang = currentConfig['source-lang'] || 'auto';
  targetLang = currentConfig['target-lang'] || 'en';

  populateLanguageSelect('sourceLang', sourceLang);
  populateLanguageSelect('targetLang', targetLang);

  const history = await api.getHistory();
  renderHistory(history);

  setupEventListeners();
}

function getLanguages() {
  if (window.LANGUAGES) return window.LANGUAGES;
  const langs = {
    auto: { name: 'Detectar idioma', native: 'Detectar', flag: '🌐' },
    af: { name: 'Afrikaans', native: 'Afrikaans', flag: '🇿🇦' },
    sq: { name: 'Albanian', native: 'Shqip', flag: '🇦🇱' },
    am: { name: 'Amharic', native: 'አማርኛ', flag: '🇪🇹' },
    ar: { name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    hy: { name: 'Armenian', native: 'Հայերեն', flag: '🇦🇲' },
    az: { name: 'Azerbaijani', native: 'Azərbaycan', flag: '🇦🇿' },
    eu: { name: 'Basque', native: 'Euskara', flag: '🇪🇸' },
    be: { name: 'Belarusian', native: 'Беларуская', flag: '🇧🇾' },
    bn: { name: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
    bs: { name: 'Bosnian', native: 'Bosanski', flag: '🇧🇦' },
    bg: { name: 'Bulgarian', native: 'Български', flag: '🇧🇬' },
    ca: { name: 'Catalan', native: 'Català', flag: '🇪🇸' },
    ceb: { name: 'Cebuano', native: 'Cebuano', flag: '🇵🇭' },
    zh: { name: 'Chinese', native: '中文', flag: '🇨🇳' },
    hr: { name: 'Croatian', native: 'Hrvatski', flag: '🇭🇷' },
    cs: { name: 'Czech', native: 'Čeština', flag: '🇨🇿' },
    da: { name: 'Danish', native: 'Dansk', flag: '🇩🇰' },
    nl: { name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
    en: { name: 'English', native: 'English', flag: '🇬🇧' },
    eo: { name: 'Esperanto', native: 'Esperanto', flag: '🌍' },
    et: { name: 'Estonian', native: 'Eesti', flag: '🇪🇪' },
    fi: { name: 'Finnish', native: 'Suomi', flag: '🇫🇮' },
    fr: { name: 'French', native: 'Français', flag: '🇫🇷' },
    de: { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    el: { name: 'Greek', native: 'Ελληνικά', flag: '🇬🇷' },
    he: { name: 'Hebrew', native: 'עברית', flag: '🇮🇱' },
    hi: { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    hu: { name: 'Hungarian', native: 'Magyar', flag: '🇭🇺' },
    id: { name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
    ga: { name: 'Irish', native: 'Gaeilge', flag: '🇮🇪' },
    it: { name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
    ja: { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    ko: { name: 'Korean', native: '한국어', flag: '🇰🇷' },
    la: { name: 'Latin', native: 'Latina', flag: '🇻🇦' },
    lv: { name: 'Latvian', native: 'Latviešu', flag: '🇱🇻' },
    lt: { name: 'Lithuanian', native: 'Lietuvių', flag: '🇱🇹' },
    ms: { name: 'Malay', native: 'Bahasa Melayu', flag: '🇲🇾' },
    no: { name: 'Norwegian', native: 'Norsk', flag: '🇳🇴' },
    pl: { name: 'Polish', native: 'Polski', flag: '🇵🇱' },
    pt: { name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
    ro: { name: 'Romanian', native: 'Română', flag: '🇷🇴' },
    ru: { name: 'Russian', native: 'Русский', flag: '🇷🇺' },
    sr: { name: 'Serbian', native: 'Српски', flag: '🇷🇸' },
    sk: { name: 'Slovak', native: 'Slovenčina', flag: '🇸🇰' },
    sl: { name: 'Slovenian', native: 'Slovenščina', flag: '🇸🇮' },
    es: { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    sv: { name: 'Swedish', native: 'Svenska', flag: '🇸🇪' },
    th: { name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
    tr: { name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
    uk: { name: 'Ukrainian', native: 'Українська', flag: '🇺🇦' },
    vi: { name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' }
  };
  window.LANGUAGES = langs;
  return langs;
}

function populateLanguageSelect(id, selected) {
  const select = $(id);
  const langs = getLanguages();
  for (const [code, info] of Object.entries(langs)) {
    if (id === 'targetLang' && code === 'auto') continue;
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${info.flag} ${info.native}`;
    if (code === selected) opt.selected = true;
    select.appendChild(opt);
  }
}

function setupEventListeners() {
  $('closeBtn').addEventListener('click', () => {
    window.close();
  });

  $('swapBtn').addEventListener('click', swapLanguages);
  $('translateBtn').addEventListener('click', doTranslate);

  $('textInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doTranslate();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      swapLanguages();
    }
  });

  $('copyBtn').addEventListener('click', () => {
    if (lastResult) {
      api.copyToClipboard(lastResult);
      $('copyBtn').textContent = '✅ Copiado';
      setTimeout(() => { $('copyBtn').textContent = '📋 Copiar'; }, 2000);
    }
  });

  $('swapLangBtn').addEventListener('click', swapLanguages);
  $('clearBtn').addEventListener('click', clearAll);

  $('sourceLang').addEventListener('change', () => {
    sourceLang = $('sourceLang').value;
    api.setConfig({ 'source-lang': sourceLang });
  });

  $('targetLang').addEventListener('change', () => {
    targetLang = $('targetLang').value;
    api.setConfig({ 'target-lang': targetLang });
  });

  api.onFocusInput(() => {
    $('textInput').focus();
  });
}

function swapLanguages() {
  const source = $('sourceLang');
  const target = $('targetLang');
  const temp = source.value;
  if (target.value !== 'auto') {
    source.value = target.value;
    target.value = temp === 'auto' ? 'en' : temp;
  }
  sourceLang = source.value;
  targetLang = target.value;
  api.setConfig({ 'source-lang': sourceLang, 'target-lang': targetLang });
  const text = $('textInput').value.trim();
  if (text) doTranslate();
}

async function doTranslate() {
  const text = $('textInput').value.trim();
  if (!text) return;

  const maxLen = currentConfig['max-text-length'] || 5000;
  if (text.length > maxLen) {
    showError(`Texto demasiado largo (máx. ${maxLen} caracteres)`);
    return;
  }

  hideError();
  $('loadingIndicator').classList.remove('hidden');
  $('resultArea').classList.add('hidden');

  const result = await api.translate({
    text,
    source: $('sourceLang').value,
    target: $('targetLang').value
  });

  $('loadingIndicator').classList.add('hidden');

  if (!result.success) {
    showError(result.error || 'Error al traducir');
    return;
  }

  lastResult = result.data;
  if (!lastResult) {
    showError('No se pudo traducir el texto');
    return;
  }

  $('resultText').textContent = lastResult;
  $('resultArea').classList.remove('hidden');

  if (currentConfig['auto-clipboard']) {
    api.copyToClipboard(lastResult);
  }

  api.addHistory({
    source: text,
    target: lastResult,
    sourceLang: $('sourceLang').value,
    targetLang: $('targetLang').value
  });

  const history = await api.getHistory();
  renderHistory(history);
}

function clearAll() {
  $('textInput').value = '';
  lastResult = '';
  $('resultArea').classList.add('hidden');
  $('errorMsg').classList.add('hidden');
  $('textInput').focus();
}

function showError(msg) {
  $('errorMsg').textContent = msg;
  $('errorMsg').classList.remove('hidden');
}

function hideError() {
  $('errorMsg').classList.add('hidden');
}

function renderHistory(history) {
  const container = $('historyList');
  container.innerHTML = '';

  if (!history || history.length === 0) {
    container.innerHTML = '<div class="history-empty">Sin traducciones recientes</div>';
    return;
  }

  for (const entry of history) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span class="hi-lang">${entry.sourceLang || '?'} → ${entry.targetLang || '?'}</span>
      <span class="hi-text">${escapeHtml(entry.source || '')}</span>
    `;
    div.addEventListener('click', () => {
      $('textInput').value = entry.source || '';
      lastResult = entry.target || '';
      $('resultText').textContent = lastResult;
      $('resultArea').classList.remove('hidden');
      hideError();
    });
    container.appendChild(div);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
