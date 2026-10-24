"use strict";
(function () {
  const NS_ = "http://www.w3.org/2000/svg";
  const O = "#2b1a12";
  const st = `stroke="${O}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"`;
  const line = (d, col, w = 2.2) => `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="${O}" stroke-width="${w + 2.4}"/><path d="${d}" stroke="${col}" stroke-width="${w}"/></g>`;
  const face = (inner) => `<circle cx="16" cy="16" r="12.6" fill="#ffcc42" ${st}/><path d="M8.2 11.2c1-2.8 3-4.4 5.8-4.8" fill="none" stroke="#fff3b0" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>${inner}`;
  const dot = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="2.1" fill="${O}"/>`;
  const heart = (fill) => `<path d="M16 27.2C5.8 20.2 4.2 13.8 7.4 10.2c2.7-3 6.6-2.2 8.6.9 2-3.1 5.9-3.9 8.6-.9 3.2 3.6 1.6 10-8.6 17z" fill="${fill}" ${st}/><path d="M9.2 11.6c.8-1.3 2.2-1.7 3.2-1.2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`;

  const G = {
    heart: heart("#ff5468"),
    yheart: heart("#ffc531"),
    pheart: heart("#ff7eb6"),
    flame: `<g transform="translate(1 .6) scale(1.25)"><path d="M12.4 2.2c.3 2.7-.9 4.1-2.4 5.7C8.2 9.8 6 11.9 6.3 15.4c.3 3.5 3 6.2 6.2 6.2 3.5 0 6-2.7 5.8-6.3-.1-2.3-1.1-3.6-1.9-4.9-.4 1.2-1 1.9-1.9 2.3.4-3.6-.3-6.9-1.9-10.5z" fill="url(#gFlame)" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/><path d="M12.3 21.2c-2 0-3.4-1.5-3.3-3.3.1-1.6 1.3-2.4 2-3.7.8 1 1.3 1.3 2.1 1.8.5-.5.8-.9 1-1.6.9 1 1.3 2 1.2 3.2-.1 1.8-1.5 3.6-3 3.6z" fill="#ffe27a"/></g>`,
    laugh: face(`<path d="M8.8 13.2c1.2-2.2 3.4-2.2 4.6 0M18.6 13.2c1.2-2.2 3.4-2.2 4.6 0" fill="none" ${st}/><path d="M8.6 17.6h14.8c0 5-3.2 7.6-7.4 7.6s-7.4-2.6-7.4-7.6z" fill="#7b2417" ${st}/><path d="M11.8 22.8c1.2-1.4 2.8-1.7 4.2-1.7s3 .3 4.2 1.7c-1.1 1.2-2.6 1.7-4.2 1.7s-3.1-.5-4.2-1.7z" fill="#ff8a8a"/><path d="M5 13.4c-2.4.4-3.3 2-2.5 3.2 1.4.6 2.8-.6 2.5-3.2zM27 13.4c2.4.4 3.3 2 2.5 3.2-1.4.6-2.8-.6-2.5-3.2z" fill="#5cc8ff" stroke="${O}" stroke-width="1.1"/>`),
    wow: face(`<path d="M8.5 9.8c1.4-1.2 3.2-1.2 4.6-.2M18.9 9.6c1.4-1 3.2-1 4.6.2" fill="none" ${st}/>${dot(11.5, 14.2)}${dot(20.5, 14.2)}<ellipse cx="16" cy="21.8" rx="3" ry="3.8" fill="#7b2417" ${st}/>`),
    cry: face(`<path d="M8 11.6l5-1.6M24 11.6l-5-1.6" fill="none" ${st}/><path d="M8.8 15c1.2-1.6 3.4-1.6 4.6 0M18.6 15c1.2-1.6 3.4-1.6 4.6 0" fill="none" ${st}/><path d="M10.8 17.4c-1.6 2.6-1.8 4.4-.6 5.8 1.3-.4 2-2.2.6-5.8zM21.2 17.4c1.6 2.6 1.8 4.4.6 5.8-1.3-.4-2-2.2-.6-5.8z" fill="#5cc8ff" stroke="${O}" stroke-width="1.1"/><path d="M12 24.6c1.4-2 6.6-2 8 0" fill="none" ${st}/>`),
    plead: face(`<path d="M7.6 10.6c1.4-1.4 3.2-1.6 4.8-1M24.4 10.6c-1.4-1.4-3.2-1.6-4.8-1" fill="none" ${st}/><circle cx="11.4" cy="14.6" r="3.6" fill="#fff" ${st}/><circle cx="20.6" cy="14.6" r="3.6" fill="#fff" ${st}/><circle cx="11.6" cy="15.2" r="2.1" fill="#3a1d10"/><circle cx="20.4" cy="15.2" r="2.1" fill="#3a1d10"/><circle cx="12.2" cy="14.4" r=".8" fill="#fff"/><circle cx="21" cy="14.4" r=".8" fill="#fff"/><path d="M13 23c1.8-1.5 4.2-1.5 6 0" fill="none" ${st}/>`),
    cool: face(`<path d="M5.8 12.2h20.4v3.4c0 2.4-1.8 4-4.2 4-2.5 0-3.8-1.6-4.3-3.2h-3.4c-.5 1.6-1.8 3.2-4.3 3.2-2.4 0-4.2-1.6-4.2-4z" fill="${O}" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 14l2.4-.4M20 14l2.4-.4" stroke="#7a8fa6" stroke-width="1.2" stroke-linecap="round"/><path d="M10.5 23c3 2.4 8 2.4 11 0" fill="none" ${st}/>`),
    like: `<path d="M4.8 14.4h5.4v13H4.8z" fill="#5cb6f0" ${st}/><path d="M10.2 15c3.1-2.1 4.2-5.4 4.7-9.4 2.4-.4 4 1.2 3.4 4.1l-.9 3.5h7.6c2 0 3.3 1.6 2.9 3.5l-1.7 7.4c-.4 1.7-1.8 2.9-3.5 2.9h-12.5z" fill="#ffcc42" ${st}/>`,
    sparkle: `<path d="M14 3.6l2.6 7.8 7.8 2.6-7.8 2.6-2.6 7.8-2.6-7.8-7.8-2.6 7.8-2.6z" fill="#ffd23f" ${st}/><path d="M25.4 18.6l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1z" fill="#fff0a0" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>`,
    coffee: `<path d="M10 8.6c-1-1.4 1-2.4 0-4M14.4 8.6c-1-1.4 1-2.4 0-4M18.8 8.6c-1-1.4 1-2.4 0-4" fill="none" stroke="${O}" stroke-width="1.5" stroke-linecap="round"/><path d="M21.6 14h2.2a3.3 3.3 0 0 1 0 6.6h-2.8" fill="none" ${st}/><path d="M6.4 11.6h15.2v8c0 4.2-3 6.6-7.6 6.6s-7.6-2.4-7.6-6.6z" fill="#fff8ec" ${st}/><path d="M6.4 11.6h15.2v2.6c-2 1.2-4 1.2-7.6 1.2s-5.6 0-7.6-1.2z" fill="#9a5528" stroke="${O}" stroke-width="1.4" stroke-linejoin="round"/><path d="M4 28h20" stroke="${O}" stroke-width="1.7" stroke-linecap="round"/>`,
    sunrise: `<path d="M6.4 22a9.6 9.6 0 0 1 19.2 0z" fill="#ff9a3c" ${st}/>${line("M16 5.6v3M6.8 10.4l2.1 2.1M25.2 10.4l-2.1 2.1M3.4 17.6h3M25.6 17.6h3", "#ffd23f", 1.8)}<path d="M3.6 26c2.4-1.6 4.4-1.6 6.8 0s4.4 1.6 6.8 0 4.4-1.6 6.8 0 3 .8 4.4.2" fill="none" stroke="#3fa7e0" stroke-width="2.2" stroke-linecap="round"/>`,
    headphones: `<path d="M6.6 20v-3.6a9.4 9.4 0 0 1 18.8 0V20" fill="none" stroke="${O}" stroke-width="4.4" stroke-linecap="round"/><path d="M6.6 20v-3.6a9.4 9.4 0 0 1 18.8 0V20" fill="none" stroke="#e8e0d0" stroke-width="2" stroke-linecap="round"/><rect x="4.4" y="18.4" width="6.4" height="9.4" rx="2.6" fill="#ff6b6b" ${st}/><rect x="21.2" y="18.4" width="6.4" height="9.4" rx="2.6" fill="#ff6b6b" ${st}/>`,
    pin: `<path d="M16 28.4c-5.2-6.6-8.2-10.4-8.2-14.4a8.2 8.2 0 0 1 16.4 0c0 4-3 7.8-8.2 14.4z" fill="#ff5a4d" ${st}/><circle cx="16" cy="14" r="3.2" fill="#fff" ${st}/>`,
    noodles: `<path d="M19.4 4.4l6.6 9.4M23.6 3.4l5 7.4" fill="none" ${st}/><path d="M4.6 16.4h22.8c0 6.6-4.8 10.6-11.4 10.6S4.6 23 4.6 16.4z" fill="#ff9d5c" ${st}/><path d="M8 16c.8-4.2 3.4-4.2 4.2 0s3.4 4.2 4.2 0 3.4-4.2 4.2 0 3.4 4.2 4.2 0" fill="none" stroke="#f3c968" stroke-width="2.5" stroke-linecap="round"/>`,
    rain: `<path d="M9.2 17.8a5.2 5.2 0 0 1-.5-10.4 7 7 0 0 1 13.4 1.6 4.4 4.4 0 0 1 .2 8.8z" fill="#d5dded" ${st}/>${line("M10 21.4l-1.6 4.2M16 21.4l-1.6 4.2M22 21.4l-1.6 4.2", "#3fa7e0", 1.9)}`,
    cake: `<path d="M16 3.2c1.7 1.7 1.9 3.2 0 4.7-1.9-1.5-1.7-3-0-4.7z" fill="#ffb02e" stroke="${O}" stroke-width="1.3" stroke-linejoin="round"/><rect x="14.8" y="8.4" width="2.4" height="7.8" fill="#6ec1ff" stroke="${O}" stroke-width="1.3"/><rect x="5.4" y="16" width="21.2" height="10.4" rx="2.8" fill="#ffb6c8" ${st}/><path d="M5.6 19.6c2.6 2 4.4 2 6.6 0s4.4 2 6.6 0 4.4 2 7.6 0" fill="none" ${st}/>`,
    thought: `<path d="M9 19.6a5.2 5.2 0 0 1-.6-10.4A6.6 6.6 0 0 1 21 8a5 5 0 0 1 3.6 8.8 5 5 0 0 1-3.6 2.8z" fill="#fff" ${st}/><circle cx="9.4" cy="24.2" r="2.3" fill="#fff" ${st}/><circle cx="5" cy="28" r="1.4" fill="#fff" stroke="${O}" stroke-width="1.2"/>`,
    snow: `${line("M16 4v24M5.6 10l20.8 12M26.4 10L5.6 22", "#8fd8ff", 2.2)}${line("M12.8 6.4L16 9.6l3.2-3.2M12.8 25.6L16 22.4l3.2 3.2", "#8fd8ff", 1.8)}`,
    leaf: `<path d="M5.6 26.4C5.6 14 12.2 6 26.4 5.6c0 13.4-7 20.8-17.4 20.8-1.4 0-2.6-.1-3.4-.4z" fill="#f08a3c" ${st}/><path d="M6.2 26c5-6 9-10 15-14" fill="none" stroke="${O}" stroke-width="1.4" stroke-linecap="round"/>`,
    party: `<path d="M4.6 28l5.6-16 10.4 10.4z" fill="#ffb22e" ${st}/><path d="M8.2 20.4l3.6 3.6M10.6 14.8l6.6 6.6" fill="none" stroke="${O}" stroke-width="1.3" stroke-linecap="round"/>${line("M18.2 6.6l1.4 2.6M24.6 11.2l2.8-.8M22.4 4.2l.4 3M26 17.2l2.6 1.4", "#ff4f7b", 1.8)}<circle cx="14.6" cy="7.2" r="1.5" fill="#4fc3ff" stroke="${O}" stroke-width="1"/>`,
    star: `<path d="M16 3.8l3.7 7.7 8.4 1.2-6.1 5.9 1.5 8.4L16 22.9l-7.5 4.1 1.5-8.4-6.1-5.9 8.4-1.2z" fill="#ffd23f" ${st}/>`,
    note: `<path d="M12 22.6V7.6l11-2.6v15" fill="none" stroke="${O}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="9.2" cy="23" rx="3.9" ry="3.1" transform="rotate(-18 9.2 23)" fill="#34d2a4" ${st}/><ellipse cx="20.2" cy="20.4" rx="3.9" ry="3.1" transform="rotate(-18 20.2 20.4)" fill="#34d2a4" ${st}/>`,
    fnone: `<rect x="6" y="6" width="20" height="20" rx="4.4" fill="none" stroke="#a49b8c" stroke-width="1.9" stroke-dasharray="3.2 3"/>`,
    fgold: `<circle cx="16" cy="16" r="11.6" fill="url(#gGold)" ${st}/><circle cx="16" cy="16" r="6.6" fill="#fff4cf" stroke="${O}" stroke-width="1.4"/>`,
    fpolaroid: `<rect x="5.6" y="4.6" width="20.8" height="23" rx="2" fill="#fff8e8" ${st}/><rect x="8.6" y="7.6" width="14.8" height="12" fill="#6bb6e8" stroke="${O}" stroke-width="1.3"/><path d="M8.6 19.6l4.6-4.6 3.4 3.4 2.6-2.6 4.2 3.8z" fill="#4a9a58" stroke="${O}" stroke-width="1.1" stroke-linejoin="round"/>`,
    fcircle: `<circle cx="16" cy="16" r="11.6" fill="#fff" ${st}/><circle cx="16" cy="16" r="6.6" fill="#f0a93c" ${st}/>`,
    ffilm: `<rect x="5.4" y="6.4" width="21.2" height="19.2" rx="2.4" fill="#4a3a30" ${st}/><rect x="11.4" y="9.4" width="9.2" height="13.2" rx="1.4" fill="#ffd9a0"/><path d="M8.4 9.4v2M8.4 14.6v2M8.4 19.8v2M23.6 9.4v2M23.6 14.6v2M23.6 19.8v2" stroke="#fff8e8" stroke-width="1.8" stroke-linecap="round"/>`,
    fglass: `<circle cx="16" cy="16" r="11.6" fill="#bfe8ff" fill-opacity=".8" ${st}/><path d="M9.4 12.6c1.2-2.4 3.4-3.8 6-4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/><circle cx="21.4" cy="21.2" r="1.8" fill="#fff" opacity=".85"/>`,
  };
  const MAP = {
    "❤": "heart", "💛": "yheart", "💗": "pheart", "🔥": "flame", "😂": "laugh", "😮": "wow", "😢": "cry", "🥹": "plead", "😎": "cool",
    "👍": "like", "✨": "sparkle", "☕": "coffee", "🌅": "sunrise", "🎧": "headphones", "📍": "pin", "🍜": "noodles", "🌧": "rain",
    "🎂": "cake", "💭": "thought", "❄": "snow", "🍂": "leaf", "🎉": "party", "⭐": "star", "🎵": "note",
    "▢": "fnone", "🟡": "fgold", "🖼": "fpolaroid", "⚪": "fcircle", "🎞": "ffilm", "🫧": "fglass",
  };

  const sprite = document.createElementNS(NS_, "svg");
  sprite.setAttribute("width", "0"); sprite.setAttribute("height", "0"); sprite.setAttribute("aria-hidden", "true");
  sprite.style.position = "absolute";
  sprite.innerHTML = `<defs>
    <linearGradient id="gFlame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd24a"/><stop offset=".55" stop-color="#ff8a2a"/><stop offset="1" stop-color="#ee4d2d"/></linearGradient>
    <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe3a0"/><stop offset=".55" stop-color="#e2b04a"/><stop offset="1" stop-color="#b9822a"/></linearGradient>
    ${Object.entries(G).map(([k, v]) => `<symbol id="g-${k}" viewBox="0 0 32 32">${v}</symbol>`).join("")}
  </defs>`;
  document.body.prepend(sprite);

  window.gl = function (e, cls = "") {
    const raw = String(e == null ? "" : e);
    const name = MAP[raw.replace(/\uFE0F/g, "")];
    if (!name) return document.createTextNode(raw);
    const s = document.createElementNS(NS_, "svg");
    s.setAttribute("class", ("gl " + cls).trim());
    s.setAttribute("viewBox", "0 0 32 32");
    s.setAttribute("aria-hidden", "true");
    const u = document.createElementNS(NS_, "use");
    u.setAttribute("href", "#g-" + name);
    s.append(u);
    return s;
  };
})();
