// Deterministic nick coloring. Mirrors weechat's gui_nick_find_color:
// trim stop chars, lowercase, hash, modulo a palette.
//
// Palette and stop-chars come from settings (look.nick.colors,
// look.nick.color_stop_chars); see vue_client/src/utils/settingsRegistry.js.

function trimForColor(nick, stopChars) {
  let out = '';
  let seenOther = false;
  for (const ch of nick) {
    const isStop = stopChars.includes(ch);
    if (isStop && seenOther) break;
    if (!isStop) seenOther = true;
    out += ch;
  }
  return out;
}

function djb2(str) {
  let h = 5381 >>> 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    const term = (((h << 5) >>> 0) + (h >>> 2) + cp) >>> 0;
    h = (h ^ term) >>> 0;
  }
  return h;
}

export function nickColor(nick, { palette, stopChars }) {
  if (!nick) return null;
  if (!palette || palette.length === 0) return null;
  const normalized = trimForColor(nick, stopChars || '').toLowerCase();
  if (!normalized) return null;
  return palette[djb2(normalized) % palette.length];
}

// Chars that can appear inside an IRC nick (RFC 2812 plus the usual extensions).
// A match against `nickSet` only counts when neither neighbour is one of these,
// so "bob" inside "bobby" won't match.
const NICK_CHAR_CLASS = '[A-Za-z0-9_\\-\\[\\]\\\\^{|}]';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// URL detection. Covers http(s)/ftp(s)/mailto, bare www.* hosts, and bare
// email addresses (turned into mailto: links by urlHref).
// The body of a scheme/www match is "everything that isn't whitespace or an
// HTML-ish bracket"; trimUrlTail then strips trailing sentence punctuation so
// "see https://example.com." doesn't keep the period.
// The email branch requires a real TLD (2+ letters) to avoid linking
// IRC-style host masks like `nick@server`.
const URL_RE = new RegExp(
  '(?:(?:https?|ftps?):\\/\\/|mailto:|www\\.)[^\\s<>`]+' +
    '|\\b[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9][A-Za-z0-9.-]*\\.[A-Za-z]{2,}\\b',
  'gi',
);

// Strip trailing punctuation that's almost certainly part of the surrounding
// sentence rather than the URL. Closing brackets are only stripped when they'd
// be unbalanced inside the URL — `https://en.wikipedia.org/wiki/Foo_(bar)`
// keeps its trailing ')', but `(see https://example.com)` doesn't.
function trimUrlTail(s) {
  const PAIRS = { ')': '(', ']': '[', '}': '{' };
  let end = s.length;
  while (end > 0) {
    const ch = s[end - 1];
    if (".,;:!?'\"".includes(ch)) {
      end--;
      continue;
    }
    if (ch in PAIRS) {
      const opens = PAIRS[ch];
      let oc = 0;
      let cc = 0;
      for (let i = 0; i < end - 1; i++) {
        if (s[i] === opens) oc++;
        else if (s[i] === ch) cc++;
      }
      // The current trailing char would push closes past opens.
      if (cc >= oc) {
        end--;
        continue;
      }
    }
    break;
  }
  return s.slice(0, end);
}

function urlHref(matched) {
  if (/^www\./i.test(matched)) return `http://${matched}`;
  // Bare email: "name@host.tld" with no scheme. The [^:]+@ guard rules out
  // strings that already have a scheme prefix (mailto:, http://user@host).
  if (/^[^:]+@/.test(matched)) return `mailto:${matched}`;
  return matched;
}

// Split text on URL matches, yielding segments tagged with kind so the caller
// can dispatch (URL segments need an <a>; text segments still need a nick pass).
function splitTextByUrls(text) {
  const out = [];
  if (!text) return out;
  const re = new RegExp(URL_RE.source, 'gi');
  let lastIdx = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const matched = trimUrlTail(m[0]);
    if (!matched) {
      // The whole match was punctuation (shouldn't happen given the regex
      // requires a scheme/www prefix, but guard anyway).
      re.lastIndex = start + 1;
      continue;
    }
    re.lastIndex = start + matched.length;
    if (start > lastIdx) out.push({ kind: 'text', text: text.slice(lastIdx, start) });
    out.push({ kind: 'url', text: matched, href: urlHref(matched) });
    lastIdx = start + matched.length;
  }
  if (lastIdx < text.length) out.push({ kind: 'text', text: text.slice(lastIdx) });
  return out;
}

// Color any occurrence of a nick from `nickSet` within `text`. Comparison is
// case-insensitive; the matched casing is preserved in the rendered text.
// `colorFn` is `(nick) => string|null`.
function colorNicksInText(text, nickSet, selfLower, colorFn) {
  if (!text) return [{ text: '' }];
  if (!nickSet || nickSet.size === 0) return [{ text }];

  const nicks = [...nickSet].filter(Boolean);
  if (nicks.length === 0) return [{ text }];
  // Longest first so "alibaba" wins over "ali" in alternation.
  nicks.sort((a, b) => b.length - a.length);
  const alternation = nicks.map(escapeRegex).join('|');
  const pattern = new RegExp(
    `(?<!${NICK_CHAR_CLASS})(?:${alternation})(?!${NICK_CHAR_CLASS})`,
    'gi',
  );

  const out = [];
  let lastIdx = 0;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const matched = m[0];
    const start = m.index;
    if (start > lastIdx) out.push({ text: text.slice(lastIdx, start) });
    const lower = matched.toLowerCase();
    const isSelf = selfLower && lower === selfLower;
    out.push({
      text: matched,
      color: isSelf ? null : (colorFn ? colorFn(matched) : null),
      self: !!isSelf,
    });
    lastIdx = start + matched.length;
  }
  if (lastIdx < text.length) out.push({ text: text.slice(lastIdx) });
  return out;
}

// Split `text` into renderable segments. URL pass runs first so the nick pass
// never sees text inside a URL — without that, "alice" inside
// "mailto:alice@example.com" would get colored as a nick.
//
// Returned segment shapes (callers branch on these in order):
//   { url, text }                       — clickable link
//   { text, color?, self? }             — nick or plain text
export function splitTextByTokens(text, nickSet, selfLower, colorFn) {
  if (!text) return [{ text: '' }];
  const urlSegments = splitTextByUrls(text);
  if (urlSegments.length === 0) {
    return colorNicksInText(text, nickSet, selfLower, colorFn);
  }
  const out = [];
  for (const seg of urlSegments) {
    if (seg.kind === 'url') {
      out.push({ url: seg.href, text: seg.text });
      continue;
    }
    if (!seg.text) continue;
    const nickSegs = colorNicksInText(seg.text, nickSet, selfLower, colorFn);
    for (const ns of nickSegs) {
      if (ns.text) out.push(ns);
    }
  }
  return out.length ? out : [{ text: '' }];
}
