/*
 * Sambad clickable mock: all behaviour.
 * A small hash router renders three surfaces from window.DATA: the sign-in
 * flows, the employee "ask" app and the admin console. Answers, syncs and
 * saves are faked with timers so the mock feels like the real product with
 * no backend. Charts are hand-drawn SVG so there are no dependencies.
 * State lives in localStorage so a refresh keeps you signed in; the Demo
 * button (bottom right) forces edge states and resets everything.
 */
(() => {
'use strict';

/* ── helpers ──────────────────────────────────── */
const D = window.DATA;
const app = document.getElementById('app');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms * (S.flags.slow ? 2.5 : 1)));
const initials = n => n.replace('.', '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const shortName = n => { const [f, l] = n.split(' '); return l ? `${f} ${l[0]}.` : f; };
const first = n => n.split(' ')[0];
const val = (f, n) => (f.elements.namedItem(n)?.value || '').trim();
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const sum = a => a.reduce((x, y) => x + y, 0);
const fmt = n => Math.round(n).toLocaleString();
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

const P = {
  plus: 'M12 5v14M5 12h14', up: 'M12 19V5M5 12l7-7 7 7', menu: 'M4 7h16M4 12h16M4 17h16', x: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM20 20l-4-4', copy: 'M9 9h10v10H9zM5 15V5h10', check: 'M5 12l5 5L20 7',
  chev: 'M6 9l6 6 6-6', ext: 'M14 5h5v5M19 5l-8 8M18 14v5H5V6h5', out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', back: 'M19 12H5M11 6l-6 6 6 6',
  key: 'M10.5 12.5L20 3M16 7l3 3M8 12a3 3 0 1 0 0 6a3 3 0 1 0 0-6z', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6',
  chat: 'M5 5h14v10H9l-4 4z', refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7', stop: 'M8 8h8v8H8z', upload: 'M12 16V4M6 10l6-6 6 6M5 20h14',
  arrow: 'M5 12h14M13 6l6 6-6 6', sidebar: 'M4 5h16v14H4zM9 5v14', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  gauge: 'M4 15a8 8 0 1 1 16 0M12 15l4-5', clock: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM12 8v4l3 2',
  help: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM9.7 9.5a2.4 2.4 0 1 1 3.3 2.2c-.6.3-1 .8-1 1.5M12 16.5v.3',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z', eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M21 20c0-2.6-1.6-4.8-4-5.6',
  plug: 'M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4', cpu: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  alert: 'M12 9v4M12 16.5v.5M10.3 4.3L2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z',
  thumbUp: 'M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.8 10H19a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7',
  thumbDown: 'M17 13V4h3v9zM17 13l-4 7c-1.5 0-2.5-1-2.2-2.6l.4-3.4H5a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 6.2 4H17',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5', info: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM12 11v5M12 8v.5',
  download: 'M12 4v12M6 10l6 6 6-6M5 20h14', doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
};
const ic = n => `<svg class="svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const MARK = `<svg class="mark" viewBox="0 0 240 260" aria-hidden="true"><polygon points="82,115 10,150 55,205" fill="#12564A"/><polygon points="158,115 230,150 185,205" fill="#12564A"/><polygon points="120,25 158,115 120,230 82,115" fill="#12564A"/><polygon points="120,25 128,45 112,45" fill="#12181A"/><polygon points="120,68 132,80 120,92 108,80" fill="#12181A"/></svg>`;
const SPARK = ic('spark');
const glyph = (src, cls = '') => `<span class="glyph ${cls}">${esc(src[0])}</span>`;
const FRESH4 = '<i></i><i></i><i></i><i></i>';

/* ── state ────────────────────────────────────── */
const KEY = 'sambad-mock-v2';
const fresh = () => ({
  session: null, accounts: {}, passwords: {}, pending: null, prefill: '', workspace: D.workspace, range: '7d', collapsed: false, scope: [],
  threads: D.history.map(h => ({ id: h.id, title: h.title, group: h.group,
    turns: [{ id: h.id + 'a', q: D.scenarios.find(s => s.id === h.sid).q, sid: h.sid, status: 'done' }] })),
  flags: { serviceDown: false, emptyWorkspace: false, slow: false },
  connectors: clone(D.connectors), gaps: clone(D.gaps), run: { ...clone(D.run), skipped: 0 }, model: clone(D.model), reviewed: {},
});
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { S = fresh(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S, (k, v) => k === '_t' ? undefined : v)); } catch { /* private mode: this tab only */ } };

/* ── overlays: toast, confirm, tooltip ────────── */
function toast(msg, undo, kind = 'check') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${ic(kind)}<span>${esc(msg)}</span>${undo ? '<button>Undo</button>' : ''}`;
  $('#toasts').append(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); };
  if (undo) el.querySelector('button').onclick = () => { undo(); close(); };
  setTimeout(close, undo ? 5000 : 2800);
}
function confirmBox({ title, body, ok = 'Continue', danger = false }) {
  return new Promise(res => {
    const o = $('#overlay');
    o.innerHTML = `<div class="scrim"><div class="modal" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><p>${body}</p>
      <div class="acts"><button class="btn" data-x="0">Cancel</button><button class="btn ${danger ? 'danger' : 'pri'}" data-x="1">${esc(ok)}</button></div></div></div>`;
    const key = e => e.key === 'Escape' && done(false);
    const done = v => { o.innerHTML = ''; document.removeEventListener('keydown', key); res(v); };
    document.addEventListener('keydown', key);
    o.firstChild.onclick = e => {
      const b = e.target.closest('[data-x]');
      if (b) done(b.dataset.x === '1'); else if (e.target.classList.contains('scrim')) done(false);
    };
    o.querySelector('[data-x="1"]').focus();
  });
}
const tip = document.createElement('div');
tip.id = 'tip';
document.body.append(tip);
function showTip(html, x, y) {
  tip.innerHTML = html;
  tip.classList.add('on');
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + 'px';
  tip.style.top = (y - h - 10 < 8 ? y + 18 : y - h - 10) + 'px';
}
const hideTip = () => tip.classList.remove('on');
async function busy(btn, ms) { btn?.classList.add('loading'); await sleep(ms); btn?.classList.remove('loading'); }
// Types into a field one character at a time, so autofill looks like a person typing.
function typeInto(el, text, speed = 14) {
  if (!el) return Promise.resolve();
  const tok = el._tok = Symbol();
  el.value = '';
  el.focus({ preventScroll: true });
  return new Promise(res => {
    let i = 0;
    const step = () => {
      if (el._tok !== tok) return res();
      el.value = text.slice(0, ++i);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      i < text.length ? setTimeout(step, speed) : res();
    };
    step();
  });
}
const score = p => p.length < 8 ? (p ? 1 : 0)
  : Math.min(4, 1 + (p.length >= 12) + /\d/.test(p) + (/[A-Z]/.test(p) && /[a-z]/.test(p)) + /[^A-Za-z0-9]/.test(p));
// Segmented control. The thumb slides because the click handler moves --i before the re-render.
const seg = (act, opts, cur, extra = '') => {
  const i = Math.max(0, opts.findIndex(o => o[0] === cur));
  return `<div class="seg" style="--n:${opts.length};--i:${i}" ${extra}>${opts.map(([v, l], j) =>
    `<button class="${j === i ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" data-j="${j}">${esc(l)}</button>`).join('')}</div>`;
};
function slideSeg(el) {
  const s = el.parentElement;
  s.style.setProperty('--i', el.dataset.j);
  $$('button', s).forEach(b => b.classList.toggle('on', b === el));
}

/* ── router ───────────────────────────────────── */
const go = p => { if (location.hash === p) render(); else location.hash = p; };
const home = () => S.session?.role === 'admin' ? '#/admin' : '#/ask';
function parse() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
}
function render() {
  $$('.menu').forEach(m => m.remove());
  hideTip(); hideHC();
  const { parts: [a, b, c], q } = parse();
  const auth = { login: pLogin, sso: pSSO, signup: pSignup, forgot: pForgot, verify: pVerify, reset: pReset, invite: pInvite };
  if (!a) return go(S.session ? home() : '#/login');
  if (auth[a]) return S.session ? go(home()) : auth[a](q);
  if (!S.session) return go('#/login');
  if (a === 'ask') return pAsk(b);
  if (a === 'admin') {
    if (S.session.role !== 'admin') { toast('The admin console is for workspace admins.', null, 'info'); return go('#/ask'); }
    return pAdmin(b, c, q);
  }
  go(home());
}

/* ── event wiring (one delegated listener per event type) ── */
const A = {}, F = {}, I = {};
document.addEventListener('click', e => {
  if (!e.target.closest('.menu,[data-menu]')) $$('.menu').forEach(m => m.remove());
  const el = e.target.closest('[data-act]');
  if (el && A[el.dataset.act]) { e.preventDefault(); hideTip(); A[el.dataset.act](el, e); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  F[f.dataset.form]?.(f, e.submitter || f.querySelector('[type=submit]'));
});
document.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el) I[el.dataset.in]?.(el, e); });
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && S.session) { e.preventDefault(); return A.palette(); }
  if (dr && !$('.pal') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
    dr.i = (dr.i + (e.key === 'ArrowRight' ? 1 : -1) + dr.keys.length) % dr.keys.length;
    return paintDrawer();
  }
  if (e.key !== 'Escape') return;
  $$('.menu').forEach(m => m.remove());
  if ($('.pal')) return closePalette();
  A.dclose(); $('#shell')?.classList.remove('navopen'); $('#demo').innerHTML = '';
});
// Hover: data-tip tooltips, citation hover cards, and source-to-claim linking.
document.addEventListener('mouseover', e => {
  const c = e.target.closest('.cite');
  if (c) return citeEnter(c);
  const tl = e.target.closest('.tile[data-turn]');
  if (tl && tl.dataset.n) linkHighlight(tl.dataset.turn, tl.dataset.n);
  const t = e.target.closest('[data-tip]');
  if (t) { const r = t.getBoundingClientRect(); showTip(t.dataset.tip, r.left + r.width / 2, r.top); }
});
document.addEventListener('mouseout', e => {
  const c = e.target.closest('.cite,.tile[data-turn]');
  if (c && !c.contains(e.relatedTarget)) { linkHighlight(); clearTimeout(hcTimer); hcTimer = setTimeout(hideHC, 80); }
  const t = e.target.closest('[data-tip]');
  if (t && !t.contains(e.relatedTarget)) hideTip();
});
A.goto = el => go(el.dataset.to);
A.nav = () => $('#shell')?.classList.toggle('navopen');
A.eye = el => { const i = el.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; el.textContent = i.type === 'password' ? 'Show' : 'Hide'; };
A.openSrc = el => toast(`This would open the original page in ${el.dataset.src}.`, null, 'ext');

/* ════════════════ AUTH ════════════════ */
function authWrap(title, sub, card, foot = '') {
  app.innerHTML = `<div class="auth"><div class="auth-box"><div class="auth-head">${MARK}<h1>${title}</h1><p>${sub}</p></div>
    <div class="auth-card">${card}</div>${foot ? `<div class="auth-foot">${foot}</div>` : ''}</div></div>`;
}
function fld(label, name, { type = 'text', ph = '', value = '', ac = 'off', right = '', attrs = '' } = {}) {
  const input = `<input class="in" id="f-${name}" name="${name}" type="${type}" placeholder="${ph}" value="${esc(value)}" autocomplete="${ac}" ${attrs}>`;
  return `<div class="field"><div class="flabel"><label for="f-${name}">${label}</label>${right}</div>
    ${type === 'password' ? `<div class="pw">${input}<button type="button" class="eye" data-act="eye">Show</button></div>` : input}</div>`;
}
const meter = () => `<div class="meter" id="meter"><i></i><i></i><i></i><i></i></div>
  <div class="small muted" id="meterTxt" style="margin:7px 0 16px">Use 8 or more characters with a number.</div>`;
const autos = btns => `<div class="auth-demo autos"><span>Autofill</span>${btns}</div>`;
function errMsg(m) {
  const e = $('#err');
  if (e) e.innerHTML = `<div class="err-line">${m}</div>`;
  const c = $('.auth-card');
  if (c) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
}
I.strength = el => {
  const s = score(el.value);
  $('#meter').className = 'meter s' + s;
  $('#meterTxt').textContent = ['Use 8 or more characters with a number.', 'Too short', 'Okay, could be stronger', 'Strong', 'Very strong'][s];
};
const findUser = email => Object.values(D.users).find(u => u.email === email) || S.accounts[email];
function signIn(u, msg, dest) {
  S.session = { name: u.name, short: u.short || shortName(u.name), email: u.email, role: u.role };
  S.pending = null;
  save();
  go(dest || home());
  toast(msg || `Signed in as ${u.name}`);
}

function pLogin() {
  authWrap('Sign in to Sambad', "Answers from your company's documents, with a link back to every source.", `
    <button class="btn pri lg" data-act="sso">${ic('key')} Continue with your work account</button>
    <p class="promise">You'll only ever see documents you already have access to.</p>
    <div class="or">or use email</div>
    <form data-form="login" novalidate><div id="err"></div>
      ${fld('Work email', 'email', { type: 'email', ph: 'you@company.com', value: S.prefill, ac: 'username' })}
      ${fld('Password', 'password', { type: 'password', ph: 'Your password', ac: 'current-password', right: '<a href="#/forgot">Forgot password?</a>' })}
      <button class="btn lg" type="submit">Sign in</button>
    </form>
    ${autos(`<button class="auto" data-act="fillLogin" data-u="priya">${SPARK} Priya, employee</button>
      <button class="auto" data-act="fillLogin" data-u="suman">${SPARK} Suman, admin</button>`)}`,
    'Setting up Sambad for your company? <a href="#/signup">Create a workspace</a><br>Got an invite? <a href="#/invite">Accept it</a>');
  if (S.prefill) { $('#f-password').focus(); S.prefill = ''; save(); }
}
A.fillLogin = async el => {
  const u = D.users[el.dataset.u];
  await typeInto($('#f-email'), u.email);
  await typeInto($('#f-password'), S.passwords[u.email] || D.password);
};
F.login = async (f, btn) => {
  const email = val(f, 'email').toLowerCase(), pw = val(f, 'password');
  if (!isEmail(email)) return errMsg('Enter a valid work email.');
  if (!pw) return errMsg('Enter your password.');
  await busy(btn, 800);
  const u = findUser(email);
  if (!u || pw !== (S.passwords[email] || D.password)) return errMsg("That email and password don't match. Try again or reset your password.");
  signIn(u);
};

A.sso = () => go('#/sso');
const idpWait = msg => `<div class="center" style="padding:28px 0"><div class="spin" style="margin:0 auto 12px;width:22px;height:22px"></div><div class="muted small">${msg}</div></div>`;
function pSSO() {
  app.innerHTML = `<div class="auth"><div class="auth-box"><div class="idp"><div class="idp-top">${ic('key')} ${esc(S.workspace)} single sign-on</div>
    <div class="idp-body" id="idp">${idpWait('Redirecting to your identity provider…')}</div></div>
    <p class="promise">This screen stands in for your company's own login page (Okta, Entra ID, Google Workspace).</p></div></div>`;
  sleep(900).then(() => {
    const b = $('#idp');
    if (!b) return;
    b.innerHTML = `<div style="font-weight:650;font-size:15px">Choose an account</div><div class="muted small" style="margin-bottom:14px">to continue to Sambad</div>
      ${['priya', 'suman'].map(k => { const u = D.users[k]; return `<button class="acct" data-act="ssoPick" data-u="${k}"><span class="av">${initials(u.name)}</span>
        <span class="grow"><b>${u.name}</b><small>${u.email}</small></span>${ic('right')}</button>`; }).join('')}
      <a class="link small" href="#/login">Cancel</a>`;
  });
}
A.ssoPick = async el => { $('#idp').innerHTML = idpWait('Signing you in…'); await sleep(700); signIn(D.users[el.dataset.u]); };

function pSignup() {
  authWrap('Create your workspace', 'For the person setting Sambad up. Everyone else joins by invite or with their work account.', `
    <form data-form="signup" novalidate><div id="err"></div>
      ${fld('Your name', 'name', { ph: 'Full name', ac: 'name' })}
      ${fld('Work email', 'email', { type: 'email', ph: 'you@company.com', ac: 'email' })}
      ${fld('Company', 'company', { ph: 'Company name', ac: 'organization' })}
      ${fld('Password', 'password', { type: 'password', ph: 'At least 8 characters', ac: 'new-password', attrs: 'data-in="strength"' })}
      ${meter()}
      <label class="check" style="margin-bottom:18px"><input type="checkbox" name="terms"> I agree to the terms and privacy notice</label>
      <button class="btn pri lg" type="submit">Create workspace</button>
    </form>
    ${autos(`<button class="auto" data-act="fillSignup">${SPARK} Sample details</button>`)}`,
    'Already have an account? <a href="#/login">Sign in</a>');
}
A.fillSignup = async () => {
  await typeInto($('#f-name'), 'Maya Lin');
  await typeInto($('#f-email'), 'maya@northwind.io');
  await typeInto($('#f-company'), 'Northwind');
  await typeInto($('#f-password'), 'Northwind-2026');
  $('[name=terms]').checked = true;
};
F.signup = async (f, btn) => {
  const name = val(f, 'name'), email = val(f, 'email').toLowerCase(), company = val(f, 'company'), password = val(f, 'password');
  if (!name) return errMsg('Tell us your name.');
  if (!isEmail(email)) return errMsg('Enter a valid work email.');
  if (findUser(email)) return errMsg('That email already has an account. <a class="link" href="#/login">Sign in instead</a>');
  if (!company) return errMsg('Add your company name. It becomes the workspace name.');
  if (score(password) < 2 || !/\d/.test(password)) return errMsg('Use a password with 8 or more characters and a number.');
  if (!f.elements.namedItem('terms').checked) return errMsg('Please accept the terms to continue.');
  await busy(btn, 900);
  S.pending = { flow: 'signup', email, name, company, password };
  save();
  go('#/verify');
};

let resendTimer;
function pVerify() {
  const p = S.pending;
  if (!p || !['signup', 'reset'].includes(p.flow)) return go('#/login');
  const sub = p.flow === 'reset'
    ? `If an account exists for <b>${esc(p.email)}</b>, we sent it a 6-digit code.`
    : `We sent a 6-digit code to <b>${esc(p.email)}</b>. It expires in 10 minutes.`;
  authWrap('Check your email', sub, `
    <form data-form="verify" novalidate><div id="err"></div>
      <div class="otp" id="otp">${[0, 1, 2, 3, 4, 5].map(i => `<input inputmode="numeric" maxlength="1" autocomplete="${i ? 'off' : 'one-time-code'}" aria-label="Digit ${i + 1}">`).join('')}</div>
      <button class="btn pri lg" type="submit">Verify</button>
    </form>
    <div class="row" style="justify-content:space-between;margin-top:14px;font-size:13px">
      <span class="muted" id="resend"></span><span class="muted">Demo code <b class="num" style="color:var(--ink)">${D.otp}</b></span></div>
    ${autos(`<button class="auto" data-act="fillOtp">${SPARK} Paste the code</button>`)}`,
    `Wrong email? <a href="#/${p.flow === 'signup' ? 'signup' : 'forgot'}">Go back</a>`);
  const boxes = $$('#otp input');
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => {
      b.value = b.value.replace(/\D/g, '').slice(-1);
      b.classList.toggle('filled', !!b.value);
      if (b.value && boxes[i + 1]) boxes[i + 1].focus();
      otpMaybeSubmit();
    });
    b.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !b.value && boxes[i - 1]) { boxes[i - 1].value = ''; boxes[i - 1].classList.remove('filled'); boxes[i - 1].focus(); }
      if (e.key === 'ArrowLeft') boxes[i - 1]?.focus();
      if (e.key === 'ArrowRight') boxes[i + 1]?.focus();
    });
    b.addEventListener('paste', e => {
      const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!d) return;
      e.preventDefault();
      boxes.forEach((x, j) => { x.value = d[j] || ''; x.classList.toggle('filled', !!x.value); });
      boxes[Math.min(d.length, 5)].focus();
      otpMaybeSubmit();
    });
  });
  boxes[0].focus();
  startResend();
}
const otpCode = () => $$('#otp input').map(b => b.value).join('');
const otpMaybeSubmit = () => { if (otpCode().length === 6) $('form[data-form=verify]').requestSubmit(); };
function startResend() {
  clearInterval(resendTimer);
  let n = 30;
  const tick = () => {
    const r = $('#resend');
    if (!r) return clearInterval(resendTimer);
    if (n <= 0) { clearInterval(resendTimer); r.innerHTML = '<button class="link" data-act="resend">Resend code</button>'; return; }
    r.textContent = `Resend code in 0:${String(n--).padStart(2, '0')}`;
  };
  tick();
  resendTimer = setInterval(tick, 1000);
}
A.resend = () => { toast(`New code sent to ${S.pending?.email}`); startResend(); };
A.fillOtp = async () => {
  const boxes = $$('#otp input');
  for (let i = 0; i < 6; i++) { boxes[i].value = D.otp[i]; boxes[i].classList.add('filled'); boxes[i].focus(); await sleep(70); }
  otpMaybeSubmit();
};
F.verify = async (f, btn) => {
  if (f.dataset.busy) return;
  if (otpCode().length < 6) return errMsg('Enter all 6 digits.');
  f.dataset.busy = '1';
  await busy(btn, 800);
  delete f.dataset.busy;
  const otp = $('#otp');
  if (!otp) return;
  if (otpCode() !== D.otp) {
    otp.classList.add('bad');
    errMsg("That code doesn't match. Check the latest email from Sambad.");
    setTimeout(() => { otp.classList.remove('bad'); $$('#otp input').forEach(b => { b.value = ''; b.classList.remove('filled'); }); $('#otp input').focus(); }, 600);
    return;
  }
  otp.classList.add('good');
  await sleep(350);
  const p = S.pending;
  if (p.flow === 'reset') { S.pending = { flow: 'newpw', email: p.email }; save(); return go('#/reset'); }
  // A brand new workspace has no sources yet, so the admin lands on "add a source".
  const u = { name: p.name, email: p.email, role: 'admin' };
  S.accounts[p.email] = u;
  S.passwords[p.email] = p.password;
  S.workspace = p.company;
  S.connectors = [];
  S.flags.emptyWorkspace = true;
  signIn(u, `Welcome to Sambad, ${first(p.name)}`, '#/admin/connectors/new?welcome=1');
};

function pForgot() {
  authWrap('Reset your password', "Enter your work email and we'll send you a 6-digit code.", `
    <form data-form="forgot" novalidate><div id="err"></div>
      ${fld('Work email', 'email', { type: 'email', ph: 'you@company.com', ac: 'email' })}
      <button class="btn pri lg" type="submit">Send code</button>
    </form>
    <p class="promise" style="text-align:left;margin-top:14px">Do you sign in with your work account? Then your password is managed by your company, so reset it there.</p>
    ${autos(`<button class="auto" data-act="fillForgot">${SPARK} priya@acme.com</button>`)}`,
    'Remembered it? <a href="#/login">Back to sign in</a>');
}
A.fillForgot = () => typeInto($('#f-email'), D.users.priya.email);
F.forgot = async (f, btn) => {
  const email = val(f, 'email').toLowerCase();
  if (!isEmail(email)) return errMsg('Enter a valid work email.');
  await busy(btn, 900);
  // Same response whether or not the account exists, so the form can't be used to probe for emails.
  S.pending = { flow: 'reset', email };
  save();
  go('#/verify');
};

function pReset() {
  const p = S.pending;
  if (!p || p.flow !== 'newpw') return go('#/forgot');
  authWrap('Set a new password', `For <b>${esc(p.email)}</b>`, `
    <form data-form="reset" novalidate><div id="err"></div>
      ${fld('New password', 'password', { type: 'password', ph: 'At least 8 characters', ac: 'new-password', attrs: 'data-in="pwrules"' })}
      <div class="meter" id="meter" style="margin:-6px 0 16px"><i></i><i></i><i></i><i></i></div>
      ${fld('Confirm password', 'confirm', { type: 'password', ph: 'Type it again', ac: 'new-password', attrs: 'data-in="pwrules"' })}
      <ul class="rules" id="rules">
        <li data-r="len">${ic('check')} 8 or more characters</li><li data-r="num">${ic('check')} A number</li>
        <li data-r="case">${ic('check')} Upper and lower case</li><li data-r="match">${ic('check')} Both match</li></ul>
      <button class="btn pri lg" type="submit" style="margin-top:18px">Update password</button>
    </form>
    ${autos(`<button class="auto" data-act="fillReset">${SPARK} Suggest a strong password</button>`)}`);
}
const pwRules = f => {
  const p = val(f, 'password'), c = val(f, 'confirm');
  return { len: p.length >= 8, num: /\d/.test(p), case: /[a-z]/.test(p) && /[A-Z]/.test(p), match: !!p && p === c };
};
I.pwrules = el => {
  const r = pwRules(el.form);
  $$('#rules li').forEach(li => li.classList.toggle('ok', r[li.dataset.r]));
  $('#meter').className = 'meter s' + score(val(el.form, 'password'));
};
A.fillReset = async () => {
  const pw = 'Lantern-Orbit-42';
  await typeInto($('#f-password'), pw);
  await typeInto($('#f-confirm'), pw);
};
F.reset = async (f, btn) => {
  if (!Object.values(pwRules(f)).every(Boolean)) return errMsg('Your new password needs all four ticks.');
  await busy(btn, 900);
  const email = S.pending.email;
  S.passwords[email] = val(f, 'password');
  S.pending = null;
  S.prefill = email;
  save();
  $('.auth-card').innerHTML = `<div class="center"><div class="success-ico">${ic('check')}</div>
    <h3 style="margin:0 0 4px;font-size:18px">Password updated</h3>
    <p class="muted" style="margin:0 0 18px;font-size:14px">Sign in with your new password. Taking you there now.</p>
    <a class="btn pri lg" href="#/login">Back to sign in</a></div>`;
  setTimeout(() => location.hash === '#/reset' && go('#/login'), 2600);
};

const INVITEE = 'alex@acme.com';
function pInvite() {
  authWrap(`Join ${esc(S.workspace)} on Sambad`, `Suman Pokhrel invited <b>${INVITEE}</b>.`, `
    <button class="btn pri lg" data-act="sso">${ic('key')} Continue with your work account</button>
    <p class="promise">Recommended. Your access follows your company account automatically.</p>
    <div class="or">or set a password</div>
    <form data-form="invite" novalidate><div id="err"></div>
      ${fld('Your name', 'name', { ph: 'Full name', ac: 'name' })}
      ${fld('Password', 'password', { type: 'password', ph: 'At least 8 characters', ac: 'new-password', attrs: 'data-in="strength"' })}
      ${meter()}
      <button class="btn lg" type="submit">Join workspace</button>
    </form>
    ${autos(`<button class="auto" data-act="fillInvite">${SPARK} Alex Rivera</button>`)}`,
    'Not you? <a href="#/login">Sign in with another account</a>');
}
A.fillInvite = async () => { await typeInto($('#f-name'), 'Alex Rivera'); await typeInto($('#f-password'), 'Harbour-Lights-7'); };
F.invite = async (f, btn) => {
  const name = val(f, 'name'), pw = val(f, 'password');
  if (!name) return errMsg('Tell us your name.');
  if (score(pw) < 2 || !/\d/.test(pw)) return errMsg('Use a password with 8 or more characters and a number.');
  await busy(btn, 900);
  const u = { name, email: INVITEE, role: 'employee' };
  S.accounts[INVITEE] = u;
  S.passwords[INVITEE] = pw;
  signIn(u, `Welcome to Sambad, ${first(name)}`);
};

/* shared: signed-in user button and menu */
const meHTML = () => `<button class="me" data-act="userMenu" data-menu><span class="av">${initials(S.session.name)}</span>
  <span class="who hide-c">${esc(S.session.name)}<small>${esc(S.workspace)}, ${S.session.role}</small></span><span class="hide-c">${ic('chev')}</span></button>`;
A.userMenu = el => {
  const open = el.parentElement.querySelector('.menu');
  if (open) return open.remove();
  const inAdmin = location.hash.startsWith('#/admin');
  const sw = S.session.role !== 'admin' ? '' : inAdmin ? `<a href="#/ask">${ic('chat')} Ask Sambad</a>` : `<a href="#/admin">${ic('gauge')} Admin console</a>`;
  el.insertAdjacentHTML('afterend', `<div class="menu">${sw}<button data-act="palette">${ic('search')} Search <span class="kbd" style="margin-left:auto">⌘K</span></button><button data-act="signout">${ic('out')} Sign out</button></div>`);
};
A.signout = () => { S.session = null; save(); go('#/login'); toast('Signed out'); };

/* ── command palette ──────────────────────────── */
let pal = null;
function palItems() {
  const items = [];
  const add = (grp, label, icon, run, hint = '') => items.push({ grp, label, icon, run, hint });
  if (location.hash.startsWith('#/admin')) {
    NAV.forEach(([g, list]) => list.forEach(([k, l, icn]) => add('Pages', l, icn, () => go('#/admin' + (k ? '/' + k : '')), g)));
    D.scatter.filter(d => d.age >= 6).forEach(d => add('Documents', d.t, 'doc', () => go('#/admin/documents/' + d.id), `${Math.round(d.age)} months old`));
    add('Actions', 'Add a source', 'plus', () => go('#/admin/connectors/new'));
    add('Actions', 'Ask Sambad', 'chat', () => go('#/ask'));
  } else {
    add('Actions', 'New question', 'plus', () => go('#/ask'));
    S.threads.forEach(t => add('Your questions', t.title, 'chat', () => go('#/ask/' + t.id), t.group));
    D.scenarios.filter(s => s.id !== 'reseller').forEach(s => add('Try asking', s.q, 'spark', () => { go('#/ask'); setTimeout(() => ask(s.q), 60); }));
    if (S.session.role === 'admin') add('Actions', 'Admin console', 'gauge', () => go('#/admin'));
  }
  add('Actions', 'Sign out', 'out', A.signout);
  return items;
}
A.palette = () => {
  $$('.menu').forEach(m => m.remove());
  pal = { all: palItems(), q: '', sel: 0 };
  $('#overlay').innerHTML = `<div class="scrim pal-scrim" data-act="palClose"><div class="pal" role="dialog" aria-label="Search">
    <div class="pal-in">${ic('search')}<input id="palIn" placeholder="${location.hash.startsWith('#/admin') ? 'Jump to a page or document…' : 'Search your questions or ask something new…'}" data-in="pal" autocomplete="off"><span class="kbd">Esc</span></div>
    <div class="pal-list" id="palList"></div><div class="pal-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> to move</span><span><span class="kbd">Enter</span> to open</span></div></div></div>`;
  paintPalette();
  const inp = $('#palIn');
  inp.focus();
  inp.addEventListener('keydown', e => {
    const n = palFiltered().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); pal.sel = (pal.sel + 1) % Math.max(1, n); paintPalette(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); pal.sel = (pal.sel - 1 + n) % Math.max(1, n); paintPalette(); }
    if (e.key === 'Enter') { e.preventDefault(); runPal(pal.sel); }
  });
};
const palFiltered = () => {
  const q = pal.q.toLowerCase();
  const list = pal.all.filter(i => !q || i.label.toLowerCase().includes(q));
  if (q && !location.hash.startsWith('#/admin')) list.push({ grp: 'Ask', label: `Ask "${pal.q}"`, icon: 'arrow', run: () => { go('#/ask'); setTimeout(() => ask(pal.q), 60); } });
  return list.slice(0, 40);
};
function paintPalette() {
  const list = palFiltered();
  let last = '';
  $('#palList').innerHTML = list.map((it, i) => {
    const head = it.grp !== last ? `<div class="pal-grp">${esc(it.grp)}</div>` : '';
    last = it.grp;
    return `${head}<div class="pal-item ${i === pal.sel ? 'sel' : ''}" data-act="palRun" data-i="${i}">${ic(it.icon)}<span>${esc(it.label)}</span><small>${esc(it.hint)}</small></div>`;
  }).join('') || '<div class="pal-grp">Nothing matches</div>';
  $('.pal-item.sel')?.scrollIntoView({ block: 'nearest' });
}
I.pal = el => { pal.q = el.value; pal.sel = 0; paintPalette(); };
function runPal(i) { const it = palFiltered()[i]; closePalette(); it?.run(); }
A.palRun = el => runPal(+el.dataset.i);
A.palClose = (el, e) => { if (e.target === el) closePalette(); };
function closePalette() { $('#overlay').innerHTML = ''; pal = null; }

/* ════════════════ EMPLOYEE ════════════════ */
const scen = id => D.scenarios.find(s => s.id === id) || D.fallback;
const matchScenario = q => {
  const l = q.toLowerCase();
  return (D.scenarios.find(s => s.q.toLowerCase() === l) || D.scenarios.find(s => s.keys.some(k => l.includes(k))) || D.fallback).id;
};
const findTurn = uid => {
  for (const t of S.threads) { const i = t.turns.findIndex(u => u.id === uid); if (i > -1) return { t, u: t.turns[i], i }; }
  return {};
};
const docStale = d => d.stale && !S.reviewed[d.admin];
const freshLevel = d => S.reviewed[d.admin] ? 4 : d.age < 30 ? 4 : d.age < 120 ? 3 : d.age < 365 ? 2 : 1;
function ago(days) {
  if (days < 1) return 'today';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30.4)} months ago`;
}
const ageText = d => S.reviewed[d.admin] ? 'Checked today' : `Updated ${ago(d.age)}`;
const scopeNames = () => S.connectors.map(c => c.name);
const scopeOn = () => S.scope.length ? S.scope : scopeNames();
const scopeLabel = () => S.scope.length && S.scope.length < scopeNames().length ? S.scope.join(', ') : 'All sources';
const listNames = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
let running = null;   // the answer being generated: { id, stop, snap }
let dr = null;        // the open reader drawer: { keys, i }
let flipFrom = null;  // where the question box was on the home screen, for the glide down

function pAsk(id) {
  const t = id && S.threads.find(x => x.id === id);
  if (id && !t) return go('#/ask');
  dr = null;
  app.innerHTML = `<div class="shell ${S.collapsed ? 'collapsed' : ''}" id="shell"><div class="scrim-side" data-act="nav"></div>
    <aside class="rail">
      <div class="rail-top"><div class="brand">${MARK}<span class="hide-c">Sambad</span></div>
        <button class="btn ghost sm icon hide-m" data-act="collapse" data-tip="${S.collapsed ? 'Expand' : 'Collapse'} sidebar" aria-label="Toggle sidebar">${ic('sidebar')}</button></div>
      <a class="btn new" href="#/ask" ${S.collapsed ? 'data-tip="New question"' : ''}>${ic('plus')}<span class="hide-c">New question</span></a>
      <button class="btn find" data-act="palette" ${S.collapsed ? 'data-tip="Search"' : ''}>${ic('search')}<span class="hide-c">Search</span><span class="kbd hide-c">⌘K</span></button>
      <div class="hist hide-c" id="hist">${histHTML(id)}</div>
      <div class="foot">${meHTML()}</div></aside>
    <div class="main">
      <div class="topbar"><button class="btn ghost sm icon" data-act="nav" aria-label="Open menu">${ic('menu')}</button><div class="brand">${MARK} Sambad</div><button class="btn ghost sm icon" data-act="palette" aria-label="Search">${ic('search')}</button></div>
      <div class="thread" id="thread">${t ? '<div class="col" id="col"></div>' : homeHTML()}</div>
      ${t ? `<div class="composer"><div class="composer-in">${boxHTML(true)}</div></div>` : ''}
      <aside class="drawer" id="drawer" aria-label="Source"></aside>
    </div></div>`;
  S.threads.forEach(x => delete x.isNew);
  if (t) renderThread(t);
  const box = $('#qbox');
  box?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#box').requestSubmit(); } });
  if (flipFrom && $('#box')) {
    // Glide the question box from where it sat on the home screen to its docked spot.
    const to = $('#box').getBoundingClientRect();
    $('#box').animate([{ transform: `translate(${flipFrom.left - to.left}px,${flipFrom.top - to.top}px)` }, { transform: 'none' }],
      { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    flipFrom = null;
  }
  if (innerWidth > 760) box?.focus({ preventScroll: true });
}
const boxHTML = followUp => `<form data-form="ask" class="box ${S.flags.emptyWorkspace ? 'off' : ''}" id="box">
    <textarea id="qbox" rows="1" data-in="qbox" placeholder="${followUp ? 'Ask a follow-up' : "Ask about anything in your company's documents"}" aria-label="Your question"></textarea>
    <div class="box-row"><span class="wrap-menu"><button type="button" class="scope" data-act="scope" data-menu>${ic('layers')}<span id="scopeLbl">${esc(scopeLabel())}</span>${ic('chev')}</button></span>
      <button type="button" class="auto" data-act="example">${SPARK} Try an example</button>
      <button class="send" id="send" type="submit" aria-label="Send" ${running ? 'disabled' : ''}>${ic('up')}</button></div></form>
  <div class="hint hide-m"><span>Sambad only reads documents you can already open.</span><span><span class="kbd">Enter</span> to send, <span class="kbd">Shift</span> + <span class="kbd">Enter</span> for a new line</span></div>`;
function homeHTML() {
  if (S.flags.emptyWorkspace) return `<div class="home"><div class="empty-ws">${glyph('?', 'lg')}<h3>No documents connected yet</h3>
    <p>Sambad can't answer anything until someone connects your team's documents. Your workspace admin can do this.</p>
    <button class="btn" data-act="msgAdmin">Message your admin</button></div>${boxHTML(false)}</div>`;
  const h = new Date().getHours(), hello = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return `<div class="home"><h1 class="hello">${hello}, ${esc(first(S.session.name))}.</h1>
    <p class="hello-sub">Ask anything in ${esc(S.workspace)}'s documents. Every answer links back to the page it came from.</p>
    ${boxHTML(false)}
    <div class="topics">${D.topics.map((tp, i) => `<div class="topic" style="animation-delay:${0.12 + i * 0.06}s"><h4>${tp.name}</h4><p>${tp.blurb}</p>
      ${tp.ids.map(id => `<button class="tq" data-act="chip" data-q="${esc(scen(id).q)}">${esc(scen(id).q)}${ic('arrow')}</button>`).join('')}</div>`).join('')}</div>
    <div class="srcline">${S.connectors.map(c => `<span><i class="dot ${c.status === 'failing' ? 'bad' : ''}"></i><span>${c.name}, ${fmt(c.docs)} documents${c.status === 'failing' ? `, not synced since ${c.synced}` : ''}</span></span>`).join('')}</div></div>`;
}
function histHTML(active, filter = '') {
  if (!S.threads.length) return '<div class="small muted" style="padding:8px 10px">Nothing yet. Your questions show up here.</div>';
  return ['Today', 'Earlier this week', 'Older'].map(g => {
    const items = S.threads.filter(t => t.group === g && (!filter || t.title.toLowerCase().includes(filter)));
    return items.length ? `<div class="hgroup">${g}</div>` + items.map(t =>
      `<a class="hitem ${t.id === active ? 'act' : ''} ${t.isNew ? 'new' : ''}" href="#/ask/${t.id}" title="${esc(t.title)}">${esc(t.title)}</a>`).join('') : '';
  }).join('');
}
A.collapse = () => { S.collapsed = !S.collapsed; save(); $('#shell').classList.toggle('collapsed', S.collapsed); hideTip(); };
I.qbox = el => {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
  $('#send').classList.toggle('ready', !!el.value.trim());
};
A.scope = el => {
  const open = el.parentElement.querySelector('.menu');
  if (open) return open.remove();
  el.insertAdjacentHTML('afterend', `<div class="menu" style="bottom:calc(100% + 6px);top:auto;transform-origin:bottom left"><div class="pal-grp" style="padding-top:4px">Search in</div>
    ${scopeNames().map(n => `<label class="check"><input type="checkbox" data-in="scopePick" value="${esc(n)}" ${scopeOn().includes(n) ? 'checked' : ''}> ${glyph(n)} ${esc(n)}</label>`).join('')}</div>`);
};
I.scopePick = () => {
  const on = $$('[data-in=scopePick]:checked').map(c => c.value);
  S.scope = on.length === scopeNames().length || !on.length ? [] : on;
  save();
  $('#scopeLbl').textContent = scopeLabel();
};
A.msgAdmin = async el => { await busy(el, 800); el.innerHTML = `${ic('check')} Sent`; el.classList.add('on'); toast('Sent to Suman P. They will get an email.'); };
A.chip = el => ask(el.dataset.q);
A.example = () => {
  if (S.flags.emptyWorkspace) return toast('Nothing to ask yet. No documents are connected.', null, 'info');
  const asked = new Set(S.threads.flatMap(t => t.turns.map(u => u.q)));
  const pool = D.scenarios.filter(s => !asked.has(s.q) && s.id !== 'reseller');
  const list = pool.length ? pool : D.scenarios;
  typeInto($('#qbox'), list[Math.floor(Math.random() * list.length)].q, 18);
};
F.ask = () => ask($('#qbox').value);

function ask(q) {
  q = q.trim();
  if (!q || S.flags.emptyWorkspace) return;
  if (running) return toast('Sambad is still answering. Stop it or wait a moment.', null, 'info');
  const turn = { id: 'u' + Date.now(), q, sid: matchScenario(q), status: 'pending' };
  const { parts } = parse();
  let t = parts[0] === 'ask' && parts[1] && S.threads.find(x => x.id === parts[1]);
  const box = $('#qbox');
  if (box) { box.value = ''; I.qbox(box); }
  if (t) { t.turns.push(turn); save(); renderThread(t); return; }
  flipFrom = $('#box')?.getBoundingClientRect() || null;
  t = { id: 't' + Date.now(), title: q.length > 44 ? q.slice(0, 42) + '…' : q, group: 'Today', turns: [turn], isNew: true };
  S.threads.unshift(t);
  save();
  go('#/ask/' + t.id);
}

function renderThread(t) {
  const col = $('#col');
  if (!col) return;
  const last = t.turns.length - 1;
  col.innerHTML = t.turns.map((u, i) => i < last && u.status === 'done'
    ? `<button class="folded" data-act="fold">${ic('chat')}<span>${esc(u.q)}</span>${ic('chev')}</button><div class="foldbody" hidden>${turnHTML(t, u, i)}</div>`
    : turnHTML(t, u, i)).join('');
  const lt = t.turns[last];
  if (lt.status === 'pending' && !running) runTurn(t, lt);
  scrollEnd();
}
const scrollEnd = () => { const th = $('#thread'); if (th) th.scrollTop = th.scrollHeight; };
A.fold = el => { const x = el.nextElementSibling; x.hidden = !x.hidden; el.classList.toggle('open', !x.hidden); };
const turnHTML = (t, u, i) => `<section class="turn"><h2 class="ask">${esc(u.q)}</h2><div id="body-${u.id}">${bodyHTML(t, u, i)}</div></section>`;
const citeBtn = (n, uid) => `<button class="cite" data-act="cite" data-n="${n}" data-turn="${uid}" aria-label="Source ${n}">${n}</button>`;
const answerHTML = (text, uid) => esc(text).replace(/\[(\d)\]([.,;:]?)/g, (_, n, p) => `<span style="white-space:nowrap">${citeBtn(n, uid)}${p}</span>`);
// Wrap each sentence so hovering a citation can light up exactly the claim it supports.
const claimsHTML = (text, uid) => text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s =>
  `<span class="claim" data-c="${[...s.matchAll(/\[(\d)\]/g)].map(m => m[1]).join(' ')}">${answerHTML(s, uid)}</span>`).join(' ');
const tileOrder = sc => [...new Set([...(sc.sources || []), ...(sc.near ? [sc.near] : []), ...(sc.considered || [])])];
function tileHTML(k, { n = '', uid = '', dim = false, delay = 0 } = {}) {
  const d = D.docs[k], stale = docStale(d);
  return `<button class="tile ${n ? 'used' : ''} ${dim ? 'dim' : ''}" data-act="${n ? 'cite' : 'peek'}" data-k="${k}" data-n="${n}" ${uid ? `data-turn="${uid}"` : ''} style="animation-delay:${delay}s">
    ${n ? `<span class="n">${n}</span>` : ''}<span class="tt">${glyph(d.src)}<b>${esc(d.title)}</b></span>
    <span class="tm ${stale ? 'stale' : ''}"><span class="fresh f${freshLevel(d)}">${FRESH4}</span>${esc(ageText(d))}</span></button>`;
}
function tilesHTML(sc, uid, mode) {
  const order = tileOrder(sc), used = sc.kind === 'abstain' ? [] : sc.sources;
  if (mode === 'sk') return `<div class="tiles">${order.map((_, i) => `<div class="tile sk" style="animation-delay:${i * 0.1}s"></div>`).join('')}</div>`;
  return `<div class="tiles ${mode === 'found' ? '' : 'noanim'}">${order.map((k, i) => mode === 'found'
    ? tileHTML(k, { delay: i * 0.12 })
    : tileHTML(k, { n: used.includes(k) ? used.indexOf(k) + 1 : '', uid: used.includes(k) ? uid : '', dim: !used.includes(k) })).join('')}</div>`;
}
const statusHTML = (text, working) => `<div class="status">${working ? '<span class="spin"></span>' : `<span class="ok">${ic('check')}</span>`}<span>${text}</span>
  ${working ? `<button class="btn ghost sm stopb" data-act="stop">${ic('stop')} Stop</button>` : ''}</div>${working ? '<div class="scan"></div>' : ''}`;
function doneText(sc, u) {
  const found = tileOrder(sc).length, used = sc.kind === 'abstain' ? 0 : sc.sources.length;
  const t = used ? `Read ${found} documents and used ${used}` : `Read ${found} documents, none of them cover this`;
  return u.secs ? `${t}, in ${u.secs}s` : t;
}
function coverHTML(sc, u) {
  const parts = sc.parts || ['Your question'];
  const miss = i => sc.kind === 'abstain' || (sc.kind === 'partial' && i === sc.missingPart);
  const got = parts.filter((_, i) => !miss(i)).length, full = got === parts.length;
  return `<div class="cover"><div class="cover-head" ${full ? 'data-act="coverToggle" style="cursor:pointer"' : ''}><b>${full ? 'Fully covered' : `${got} of ${parts.length} parts covered`}</b>
      <span class="hide-m">${full ? 'by your documents' : 'Sambad answered what it could and left the rest blank'}</span>
      <div class="cbar">${parts.map((p, i) => `<i class="${miss(i) ? 'miss' : ''}" style="animation-delay:${i * 0.08}s" data-tip="${esc(p)}: ${miss(i) ? 'not covered' : 'covered'}"></i>`).join('')}</div></div>
    <div class="parts" ${full ? 'hidden' : ''}>${parts.map((p, i) => miss(i)
      ? `<div class="part miss"><span class="pi">${ic('x')}</span><span>${esc(p)} isn't in your documents</span><div class="acts">
          <button class="btn sm" data-act="askPerson" data-p="People Ops">Ask People Ops</button>${flagBtn(u)}</div></div>`
      : `<div class="part"><span class="pi">${ic('check')}</span>${esc(p)}</div>`).join('')}</div></div>`;
}
A.coverToggle = el => { const p = el.nextElementSibling; p.hidden = !p.hidden; };
const flagBtn = u => u.flagged ? `<button class="btn sm on">${ic('check')} Flagged for your admin</button>`
  : `<button class="btn sm" data-act="flag" data-turn="${u.id}">Flag as missing</button>`;
function bodyHTML(t, u, i, animate = false) {
  const sc = scen(u.sid);
  if (u.status === 'pending') return running?.id === u.id ? running.snap : '';
  if (u.status === 'failed') return `<div class="failbox"><b>Sambad can't answer right now.</b><p>The answering service isn't responding. Your question is saved, so try again in a few minutes.</p>
    <div class="acts"><button class="btn sm" data-act="retry" data-turn="${u.id}">${ic('refresh')} Try again</button></div></div>`;
  if (u.status === 'stopped') return `${u.cut ? `<div class="prose">${answerHTML(u.cut, u.id)}…</div>` : ''}
    <div class="nc" style="margin-top:12px"><p style="margin:0">Stopped. Your question is still here if you want Sambad to try again.</p>
    <div class="acts"><button class="btn sm" data-act="retry" data-turn="${u.id}">${ic('refresh')} Ask again</button></div></div>`;
  let h = statusHTML(doneText(sc, u), false) + tilesHTML(sc, u.id, 'final');
  if (sc.kind === 'abstain') {
    h += `<div class="nc"><h3>This isn't covered in your documents.</h3><p>${esc(sc.text)}</p>${sc.near ? tileHTML(sc.near) : ''}
      <div class="acts"><button class="btn brand sm" data-act="askPerson" data-p="${sc.person}">Ask ${sc.person}</button>${flagBtn(u)}</div></div>`;
  } else {
    h += `<div class="prose">${claimsHTML(sc.answer, u.id)}</div>`;
    const stale = sc.sources.map(k => D.docs[k]).filter(docStale);
    if (stale.length) h += `<div class="stale-line">${ic('clock')}<span>${esc(stale[0].title)} hasn't been updated in ${Math.round(stale[0].age / 30.4)} months. Worth double-checking.</span></div>`;
    h += coverHTML(sc, u);
    h += `<div class="tools"><button class="btn ghost sm" data-act="copy" data-turn="${u.id}">${ic('copy')} Copy</button>
      <button class="btn ghost sm icon ${u.fb === 'up' ? 'on' : ''}" data-act="up" data-turn="${u.id}" data-tip="Helpful" aria-label="Helpful">${ic('thumbUp')}</button>
      <button class="btn ghost sm icon ${u.fb && u.fb !== 'up' ? 'on' : ''}" data-act="down" data-turn="${u.id}" data-tip="Not helpful" aria-label="Not helpful">${ic('thumbDown')}</button>
      <span class="grow"></span><button class="btn ghost sm" data-act="cite" data-n="1" data-turn="${u.id}">${ic('book')} Read the sources</button></div>`;
    h += fbHTML(u);
    const done = sc.followUp && t.turns.some(x => x.q === sc.followUp);
    if (sc.followUp && !done && i === t.turns.length - 1) h += `<div class="next"><span>Ask next</span><button class="chip" data-act="chip" data-q="${esc(sc.followUp)}">${esc(sc.followUp)}${ic('arrow')}</button></div>`;
  }
  return animate ? h : `<div class="still">${h}</div>`;
}
const REASONS = ["It's out of date", "It's not what I asked", "It's just wrong"];
function fbHTML(u) {
  if (u.fb === 'sent') return `<div class="done-line">${ic('check')} Thanks. Your admin will see this as "${esc(u.reason)}".</div>`;
  if (u.fb !== 'open') return '';
  return `<div class="fb"><b>What went wrong?</b><div class="chipset">${REASONS.map(r => `<button class="chip ${u.reason === r ? 'on' : ''}" data-act="reason" data-r="${esc(r)}" data-turn="${u.id}">${esc(r)}</button>`).join('')}</div>
    <textarea class="in" id="fbnote-${u.id}" placeholder="Anything else? (optional)" rows="2">${esc(u.note || '')}</textarea>
    <div class="acts"><button class="btn pri sm" data-act="sendFb" data-turn="${u.id}" ${u.reason ? '' : 'disabled'}>Send feedback</button>
      <button class="btn ghost sm" data-act="cancelFb" data-turn="${u.id}">Cancel</button>
      <button class="auto" data-act="fillFb" data-turn="${u.id}">${SPARK} Example note</button></div></div>`;
}
function refreshBody(uid) {
  const { t, u, i } = findTurn(uid);
  const b = $('#body-' + uid);
  if (b && u) b.innerHTML = bodyHTML(t, u, i);
}

/* the answer animation: search, found sources, pick the useful ones, then write */
async function runTurn(t, u) {
  const r = running = { id: u.id, stop: false, snap: '' };
  const send = $('#send');
  if (send) send.disabled = true;
  const sc = scen(u.sid), found = tileOrder(sc).length;
  const body = () => $('#body-' + u.id);
  const paint = html => { r.snap = html; const b = body(); if (b) { b.innerHTML = html; scrollEnd(); } };
  const finish = status => {
    u.status = status;
    running = null;
    save();
    const s = $('#send');
    if (s) s.disabled = false;
    const b = body();
    if (b) { b.innerHTML = bodyHTML(t, u, t.turns.indexOf(u), true); scrollEnd(); }
  };
  const t0 = performance.now();
  paint(statusHTML(`Searching ${listNames(scopeOn())}`, true) + tilesHTML(sc, u.id, 'sk'));
  await sleep(rand(700, 950));
  if (r.stop) return finish('stopped');
  if (S.flags.serviceDown) return finish('failed');
  paint(statusHTML(`Found ${found} possible matches`, true) + tilesHTML(sc, u.id, 'found'));
  await sleep(rand(900, 1150));
  if (r.stop) return finish('stopped');
  paint(statusHTML(sc.kind === 'abstain' ? 'Checking whether any of them answer this' : 'Reading the most relevant passages', true) + tilesHTML(sc, u.id, 'read'));
  await sleep(rand(800, 1000));
  if (r.stop) return finish('stopped');
  u.secs = ((performance.now() - t0) / 1000).toFixed(1);
  if (sc.kind === 'abstain') return finish('done');
  const head = statusHTML('Writing the answer', true) + tilesHTML(sc, u.id, 'read');
  paint(`${head}<div class="prose" id="stream-${u.id}"></div>`);
  const words = sc.answer.split(' ');
  for (let n = 1; n <= words.length; n++) {
    if (r.stop) { u.cut = words.slice(0, n - 1).join(' '); return finish('stopped'); }
    const html = `${answerHTML(words.slice(0, n).join(' '), u.id)}<span class="caret"></span>`;
    r.snap = `${head}<div class="prose" id="stream-${u.id}">${html}</div>`;
    const s = $('#stream-' + u.id);
    if (s) { s.innerHTML = html; scrollEnd(); }
    await sleep(rand(18, 46));
  }
  finish('done');
}
A.stop = () => { if (running) running.stop = true; };
A.retry = el => {
  const { t, u, i } = findTurn(el.dataset.turn);
  if (!u) return;
  if (running) return toast('Sambad is still answering. Stop it or wait a moment.', null, 'info');
  if (i !== t.turns.length - 1) return ask(u.q);
  u.status = 'pending';
  delete u.cut;
  save();
  renderThread(t);
};

/* citation hover card and claim linking */
let hcTimer;
const hc = document.createElement('div');
function hideHC() { hc.remove(); }
function linkHighlight(uid, n) {
  $$('.claim.hot,.tile.hot,.cite.on').forEach(x => x.classList.remove('hot', 'on'));
  if (!uid) return;
  const b = $('#body-' + uid);
  if (!b) return;
  $$('.claim', b).forEach(c => c.dataset.c.split(' ').includes(n) && c.classList.add('hot'));
  $$(`.tile[data-n="${n}"]`, b).forEach(x => x.classList.add('hot'));
  $$(`.cite[data-n="${n}"]`, b).forEach(x => x.classList.add('on'));
}
function citeEnter(c) {
  if (!c.dataset.turn) return;
  linkHighlight(c.dataset.turn, c.dataset.n);
  clearTimeout(hcTimer);
  hcTimer = setTimeout(() => {
    const { u } = findTurn(c.dataset.turn);
    if (!u || !c.isConnected) return;
    const d = D.docs[scen(u.sid).sources[+c.dataset.n - 1]];
    if (!d) return;
    hc.className = 'hc';
    hc.style.pointerEvents = 'none';
    hc.innerHTML = `<div class="hct">${glyph(d.src)}<div class="grow"><b>${esc(d.title)}</b><span class="small ${docStale(d) ? 'stale' : 'muted'}" style="${docStale(d) ? 'color:var(--warn)' : ''}">${d.src}, ${esc(ageText(d).toLowerCase())}</span></div><span class="fresh f${freshLevel(d)}">${FRESH4}</span></div>
      <q>${esc(d.passage)}</q><div class="hcf"><span>Click to read it in context</span><span>Source ${c.dataset.n}</span></div>`;
    document.body.append(hc);
    const r = c.getBoundingClientRect();
    hc.style.left = Math.max(8, Math.min(innerWidth - 340, r.left - 20)) + 'px';
    hc.style.top = (r.bottom + hc.offsetHeight + 10 > innerHeight ? r.top - hc.offsetHeight - 8 : r.bottom + 8) + 'px';
  }, 160);
}

/* answer actions */
A.copy = async el => {
  const { u } = findTurn(el.dataset.turn);
  try { await navigator.clipboard.writeText(scen(u.sid).answer.replace(/\s?\[\d\]/g, '')); } catch { /* blocked on file://, still confirm */ }
  el.innerHTML = `${ic('check')} Copied`;
  el.classList.add('on');
  setTimeout(() => { el.innerHTML = `${ic('copy')} Copy`; el.classList.remove('on'); }, 1600);
};
A.up = el => { const { u } = findTurn(el.dataset.turn); u.fb = 'up'; save(); refreshBody(u.id); toast('Thanks. Marked as helpful.'); };
A.down = el => { const { u } = findTurn(el.dataset.turn); if (u.fb === 'sent') return; u.fb = 'open'; save(); refreshBody(u.id); };
A.reason = el => { const { u } = findTurn(el.dataset.turn); u.reason = el.dataset.r; u.note = $('#fbnote-' + u.id)?.value; refreshBody(u.id); };
A.cancelFb = el => { const { u } = findTurn(el.dataset.turn); u.fb = null; u.reason = null; save(); refreshBody(u.id); };
A.fillFb = el => {
  const { u } = findTurn(el.dataset.turn);
  if (!u.reason) { u.reason = REASONS[0]; refreshBody(u.id); }
  typeInto($('#fbnote-' + u.id), 'The refund window changed to 14 days last month, I think.');
};
A.sendFb = async el => {
  const { u } = findTurn(el.dataset.turn);
  u.note = $('#fbnote-' + u.id)?.value;
  await busy(el, 700);
  u.fb = 'sent';
  save();
  refreshBody(u.id);
  toast('Feedback sent. Your admin will see it.');
};
A.askPerson = async el => {
  await busy(el, 800);
  el.innerHTML = `${ic('check')} Sent to ${el.dataset.p}`;
  el.className = 'btn sm on';
  el.removeAttribute('data-act');
  toast(`Sent your question to ${el.dataset.p}. They'll reply by email.`);
};
const GAP_FOR = { sick: 'g1', vendor: 'g2', notice: 'g3' };
A.flag = el => {
  const { u } = findTurn(el.dataset.turn);
  u.flagged = true;
  const g = S.gaps.find(x => x.id === GAP_FOR[u.sid]);
  if (g) { g.asks++; g.status = 'open'; g.trend[g.trend.length - 1]++; }
  else S.gaps.unshift({ id: 'g' + Date.now(), title: u.q, people: 1, asks: 1, status: 'open', ex: [u.q], fresh: true, who: [S.session.short], trend: Array(13).fill(0).concat(1) });
  save();
  refreshBody(u.id);
  toast("Flagged. It now shows up in your admin's knowledge gaps.");
};

/* reader drawer */
A.cite = el => {
  const { u } = findTurn(el.dataset.turn);
  if (!u) return;
  hideHC();
  dr = { keys: scen(u.sid).sources, i: +el.dataset.n - 1 };
  paintDrawer();
};
A.peek = el => { hideHC(); dr = { keys: [el.dataset.k], i: 0 }; paintDrawer(); };
A.dsel = el => { slideSeg(el); dr.i = +el.dataset.j; paintDrawer(true); };
A.dclose = () => { $('#drawer')?.classList.remove('open'); dr = null; };
A.copyQuote = () => { try { navigator.clipboard.writeText(D.docs[dr.keys[dr.i]].passage); } catch { /* file:// */ } toast('Passage copied'); };
function paintDrawer(keepHead) {
  const p = $('#drawer');
  if (!p || !dr) return;
  const d = D.docs[dr.keys[dr.i]], stale = docStale(d), n = dr.keys.length;
  const body = `<div class="db"><div class="crumbs">${glyph(d.src)}<span>${d.src}</span>${ic('right')}<span>${esc(d.space)}</span></div><h3>${esc(d.title)}</h3>
      <div class="meta"><div class="${stale ? 'stale' : ''}">Last changed<b><span class="fresh f${freshLevel(d)}">${FRESH4}</span>${esc(ageText(d))}</b></div>
        <div>Changed by<b><span class="av sm soft">${initials(d.editor)}</span>${esc(d.editor)}</b></div></div>
      ${stale ? `<div class="note warn" style="margin-bottom:16px">${ic('clock')}<div><b>Nobody has updated this page in a while.</b>It may still be right, it just hasn't been checked recently.</div></div>` : ''}
      <div class="doctext"><p>${esc(d.before)}</p><mark>${esc(d.passage)}</mark><p>${esc(d.after)}</p></div></div>
    <div class="df"><button class="btn" data-act="openSrc" data-src="${d.src}">Open in ${d.src} ${ic('ext')}</button><button class="btn ghost" data-act="copyQuote">${ic('copy')} Copy passage</button></div>`;
  if (keepHead && $('.dh', p)) { $('.db', p).remove(); $('.df', p).remove(); p.insertAdjacentHTML('beforeend', body); return; }
  p.innerHTML = `<div class="dh">${n > 1 ? seg('dsel', dr.keys.map((k, j) => [String(j), `Source ${j + 1}`]), String(dr.i)) : '<span class="grow small muted">Closest match</span>'}
    <button class="btn ghost sm icon" data-act="dclose" aria-label="Close">${ic('x')}</button></div>${body}`;
  p.classList.add('open');
}

/* ════════════════ ADMIN ════════════════ */
const STALE_TOTAL = 18;
const staleCount = () => STALE_TOTAL - Object.keys(S.reviewed).length;
const openGaps = () => S.gaps.filter(g => g.status === 'open');
const NAV = [
  ['Monitor', [['', 'Overview', 'gauge'], ['freshness', 'Sync & freshness', 'clock', staleCount], ['gaps', 'Knowledge gaps', 'help', () => openGaps().length]]],
  ['Security', [['audit', 'Access audit', 'shield'], ['inspector', 'Access inspector', 'eye'], ['people', 'People & groups', 'users']]],
  ['Setup', [['connectors', 'Connectors', 'plug'], ['model', 'Model', 'cpu']]],
];
let ctx = {}, navTok = 0;
let tmp = {};   // per-page scratch state that should not survive a reload

function pAdmin(b = '', c, q) {
  const key = b === 'connectors' && c === 'new' ? 'newsource' : b === 'documents' ? 'doc' : b === 'runs' ? 'run' : (b || 'overview');
  const page = ADMIN[key];
  if (!page) return go('#/admin');
  const navKey = { doc: 'freshness', run: 'connectors', newsource: 'connectors', overview: '' }[key] ?? key;
  app.innerHTML = `<div class="shell adm" id="shell"><div class="scrim-side" data-act="nav"></div>
    <aside class="rail"><div class="ws">${glyph(S.workspace)}<div><b>${esc(S.workspace)}</b><small>Admin console</small></div></div>
      ${NAV.map(([g, items]) => `<div class="navgrp">${g}</div>` + items.map(([k, l, icn, badge]) =>
        `<a class="nitem ${k === navKey ? 'act' : ''}" href="#/admin${k ? '/' + k : ''}">${ic(icn)}${l}${badge ? `<span class="count" data-badge="${k}">${S.flags.emptyWorkspace ? 0 : badge()}</span>` : ''}</a>`).join('')).join('')}
      <div style="flex:1"></div>
      <a class="nitem" href="#/ask">${ic('chat')} Ask Sambad</a>
      <div class="foot">${meHTML()}</div></aside>
    <div class="main">
      <div class="topbar"><button class="btn ghost sm icon" data-act="nav" aria-label="Open menu">${ic('menu')}</button><div class="brand">${MARK} Sambad</div><button class="btn ghost sm icon" data-act="palette" aria-label="Search">${ic('search')}</button></div>
      <div class="abar"><div class="crumb" id="crumb"></div><button class="btn find" data-act="palette">${ic('search')}<span>Jump to</span><span class="kbd">⌘K</span></button></div>
      <div class="abody" id="abody"></div></div></div>`;
  if (ctx.key !== key || ctx.c !== c) tmp = {};
  ctx = { key, page, c, q, group: NAV.find(([, it]) => it.some(x => x[0] === navKey))?.[0] || 'Monitor', navTitle: NAV.flatMap(x => x[1]).find(x => x[0] === navKey)?.[1] };
  page.init?.();
  paintAdmin(true);
}
function paintAdmin(skel) {
  const { page } = ctx, tok = ++navTok, body = $('#abody');
  if (!body) return;
  const sub = page.crumb?.();
  $('#crumb').innerHTML = `<span>${ctx.group}</span>${ic('right')}${sub ? `<a href="${sub[0]}">${ctx.navTitle}</a>${ic('right')}<b>${esc(sub[1])}</b>` : `<b>${ctx.navTitle}</b>`}`;
  if (S.flags.emptyWorkspace && page.needsData) {
    body.innerHTML = `<div class="page"><div class="empty-ws">${glyph('?', 'lg')}<h3>Nothing indexed yet</h3>
      <p>This page fills in once Sambad has read your first source. Connecting one takes about a minute.</p>
      <a class="btn brand" href="#/admin/connectors/new">${ic('plus')} Connect a source</a></div></div>`;
    return;
  }
  const fill = () => {
    const keepScroll = body.scrollTop;
    body.innerHTML = `<div class="page">${page.body()}</div>`;
    if (!skel) body.scrollTop = keepScroll;
    page.mount?.(!skel);
  };
  if (!skel) return fill();
  body.innerHTML = `<div class="page"><div class="sk" style="height:34px;width:240px;margin-bottom:12px"></div><div class="sk" style="height:20px;width:420px;margin-bottom:28px"></div>
    <div class="sk" style="height:104px;margin-bottom:16px"></div><div class="grid-main"><div class="sk" style="height:300px"></div><div class="sk" style="height:300px"></div></div></div>`;
  sleep(rand(240, 420)).then(() => tok === navTok && body.isConnected && fill());
}
const refresh = () => paintAdmin(false);
const onPage = k => ctx.key === k && location.hash.startsWith('#/admin') && $('#abody');
function updateBadges() {
  NAV.flatMap(([, items]) => items).filter(x => x[3]).forEach(([k, , , fn]) => {
    const b = $(`[data-badge="${k}"]`);
    if (!b) return;
    const v = String(S.flags.emptyWorkspace ? 0 : fn());
    if (b.textContent !== v) { b.textContent = v; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  });
}
const phead = (title, sub, right = '') => `<div class="phead"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="row" style="flex-wrap:wrap">${right}</div>` : ''}</div>`;
const secH = (title, sub = '', right = '') => `<div class="sec-h"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${right}</div>`;
const statusBadge = s => ({ healthy: '<span class="badge ok"><span class="dot"></span>Healthy</span>', failing: '<span class="badge bad"><span class="dot"></span>Failing</span>',
  indexing: '<span class="badge brand live"><span class="dot"></span>Indexing</span>', syncing: '<span class="badge brand live"><span class="dot"></span>Catching up</span>' }[s]);
const connSub = c => c.status === 'failing' ? `${fmt(c.docs)} documents. Last successful sync ${c.synced}.`
  : c.status === 'indexing' ? 'Reading documents for the first time' : `${fmt(c.docs)} documents. Synced ${c.synced}${c.paused ? ', paused' : ''}.`;
const beatsHTML = c => `<div class="beats hide-m">${(c.beats || '').split('').map((b, i, a) => `<i class="${b === 'x' ? 'x' : ''}" data-tip="${a.length - i === 1 ? 'Latest sync' : `${a.length - i} syncs ago`}: ${b === 'x' ? 'failed' : 'succeeded'}"></i>`).join('')}</div>`;
function countUp(scope = document) {
  $$('[data-count]', scope).forEach(el => {
    const to = +el.dataset.count, suf = el.dataset.suf || '', t0 = performance.now();
    if (RM) { el.textContent = fmt(to) + suf; return; }
    const f = now => {
      const p = Math.max(0, Math.min(1, (now - t0) / 700));   // frame timestamps can predate t0
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))) + suf;
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
const fillBars = () => setTimeout(() => $$('.inbar i[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; }), 40);
const inbar = (pct, cls = '') => `<div class="inbar ${cls}"><i data-w="${Math.max(3, pct)}"></i></div>`;

/* ── charts (hand-drawn SVG) ── */
// Round tick step (1, 1.5, 2, 2.5, 3, 4 or 5 times a power of ten) so axis labels read cleanly.
const niceStep = raw => { const p = 10 ** Math.floor(Math.log10(raw || 1)); return [1, 1.5, 2, 2.5, 3, 4, 5, 10].map(m => m * p).find(v => v >= raw); };
const niceMax = m => niceStep(Math.max(m, 1) / 4) * 4;
// Smooth line through points without overshooting between them.
function curve(pts) {
  return pts.map((p, i) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p3 = pts[i + 1] || p;
    const lo = Math.min(p1[1], p[1]), hi = Math.max(p1[1], p[1]), cl = y => Math.max(lo, Math.min(hi, y));
    return `C${p1[0] + (p[0] - p0[0]) / 6},${cl(p1[1] + (p[1] - p0[1]) / 6)} ${p[0] - (p3[0] - p1[0]) / 6},${cl(p[1] - (p3[1] - p1[1]) / 6)} ${p[0]},${p[1]}`;
  }).join('');
}
const reveal = (id, W, H) => RM ? `<clipPath id="${id}"><rect x="0" y="-10" width="${W}" height="${H + 20}"/></clipPath>` : `<clipPath id="${id}"><rect x="0" y="-10" width="0" height="${H + 20}"><animate attributeName="width" from="0" to="${W}" dur=".9s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".2 .8 .2 1"/></rect></clipPath>`;
function areaChart(el, s, still) {
  const W = el.clientWidth || 600, H = 300, Pd = { l: 34, r: 10, t: 12, b: 26 }, n = s.labels.length;
  const tot = s.answered.map((v, i) => v + s.missed[i]), max = niceMax(Math.max(...tot));
  const X = i => Pd.l + i * (W - Pd.l - Pd.r) / (n - 1), Y = v => H - Pd.b - v / max * (H - Pd.t - Pd.b);
  const top = tot.map((v, i) => [X(i), Y(v)]), mid = s.answered.map((v, i) => [X(i), Y(v)]);
  const aPath = curve(mid) + `L${X(n - 1)},${Y(0)}L${X(0)},${Y(0)}Z`;
  const bPath = curve(top) + curve(mid.slice().reverse()).replace(/^M/, 'L') + 'Z';
  const step = Math.ceil(n / 7);
  el.innerHTML = `<svg class="chart" width="${W}" height="${H}">
    <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12564a" stop-opacity=".28"/><stop offset="1" stop-color="#12564a" stop-opacity=".02"/></linearGradient>${still ? '' : reveal('cq', W, H)}</defs>
    ${[0, 1, 2, 3, 4].map(k => `<line class="grid" x1="${Pd.l}" x2="${W - Pd.r}" y1="${Y(max * k / 4)}" y2="${Y(max * k / 4)}"/><text x="${Pd.l - 8}" y="${Y(max * k / 4) + 4}" text-anchor="end">${fmt(max * k / 4)}</text>`).join('')}
    ${s.labels.map((l, i) => i % step === 0 || i === n - 1 ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${l}</text>` : '').join('')}
    <g ${still ? '' : 'clip-path="url(#cq)"'}><path d="${bPath}" fill="#faf5e4"/><path d="${curve(top)}" fill="none" stroke="#8a6d1f" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="${aPath}" fill="url(#ga)"/><path d="${curve(mid)}" fill="none" stroke="#12564a" stroke-width="2.2"/></g>
    <line class="cross" y1="${Pd.t}" y2="${H - Pd.b}"/><circle class="pt" r="4.5" fill="#fff" stroke="#8a6d1f" stroke-width="2"/><circle class="pt" r="4.5" fill="#fff" stroke="#12564a" stroke-width="2.2"/>
    <rect class="hit" x="${Pd.l}" y="0" width="${W - Pd.l - Pd.r}" height="${H}"/></svg>`;
  const svg = $('svg', el), [cross] = $$('.cross', svg), [pTop, pMid] = $$('.pt', svg);
  $('.hit', svg).onmousemove = e => {
    const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - Pd.l) / (W - Pd.l - Pd.r) * (n - 1))));
    svg.classList.add('hover');
    cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i));
    pTop.setAttribute('cx', X(i)); pTop.setAttribute('cy', Y(tot[i]));
    pMid.setAttribute('cx', X(i)); pMid.setAttribute('cy', Y(s.answered[i]));
    showTip(`<b>${s.labels[i]}</b><div class="tl"><span><i style="background:#6aa797"></i>Answered</span><b>${s.answered[i]}</b></div><div class="tl"><span><i style="background:#e9dcae"></i>Not covered</span><b>${s.missed[i]}</b></div>`, r.left + X(i), r.top + Y(tot[i]));
  };
  $('.hit', svg).onmouseleave = () => { svg.classList.remove('hover'); hideTip(); };
}
const spark = (vals, color = '#12564a') => {
  const max = Math.max(...vals), min = Math.min(...vals), n = vals.length;
  const pts = vals.map((v, i) => [i * 84 / (n - 1), 28 - (max === min ? 14 : (v - min) / (max - min) * 24)]);
  return `<svg class="spark" viewBox="0 0 84 30"><path d="${curve(pts)}L84,30L0,30Z" fill="${color}" opacity=".08"/><path d="${curve(pts)}" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="${pts[n - 1][0]}" cy="${pts[n - 1][1]}" r="2.6" fill="${color}"/></svg>`;
};
// Squarified treemap: keeps cells close to square so labels stay readable.
function squarify(items, x, y, w, h) {
  const total = sum(items.map(d => d.v)), scale = w * h / total, out = [];
  let row = [];
  const rest = items.map(d => ({ ...d, a: d.v * scale }));
  const worst = (r, side) => { const s = sum(r.map(d => d.a)); return Math.max(...r.map(d => Math.max(side * side * d.a / (s * s), s * s / (side * side * d.a)))); };
  const lay = r => {
    const s = sum(r.map(d => d.a));
    if (w >= h) { const rw = s / h; let yy = y; r.forEach(d => { out.push({ ...d, x, y: yy, w: rw, h: d.a / rw }); yy += d.a / rw; }); x += rw; w -= rw; }
    else { const rh = s / w; let xx = x; r.forEach(d => { out.push({ ...d, x: xx, y, w: d.a / rh, h: rh }); xx += d.a / rh; }); y += rh; h -= rh; }
  };
  for (const d of rest) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, d], side) <= worst(row, side)) row.push(d); else { lay(row); row = [d]; }
  }
  if (row.length) lay(row);
  return out;
}
function treemap(el) {
  const W = el.clientWidth, H = el.clientHeight;
  const srcs = [...new Set(D.spaces.map(s => s.src))].map(src => ({ src, v: sum(D.spaces.filter(s => s.src === src).map(s => s.docs)) }));
  let html = '';
  squarify(srcs, 0, 0, W, H).forEach(g => {
    html += `<span class="tmsrc" style="left:${g.x + 8}px;top:${g.y + 4}px;max-width:${g.w - 12}px">${g.src}</span>`;
    squarify(D.spaces.filter(s => s.src === g.src).map(s => ({ ...s, v: s.docs })), g.x, g.y + 22, g.w, g.h - 22).forEach((c, i) => {
      const lvl = c.fresh >= 0.75 ? 3 : c.fresh >= 0.55 ? 2 : 1, small = c.w < 76 || c.h < 44;
      html += `<div class="tmc f${lvl}" data-act="goto" data-to="#/admin/freshness" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;animation-delay:${i * 0.05}s"
        data-tip="<b>${c.src}, ${c.name}</b><br>${c.docs} documents, ${Math.round(c.fresh * 100)}% changed in the last 6 months">${small ? '' : `<b>${c.name}</b><small>${c.docs} docs</small>`}</div>`;
    });
  });
  el.innerHTML = html;
}
function scatter(el, still) {
  const W = el.clientWidth || 600, H = 300, Pd = { l: 38, r: 14, t: 14, b: 38 };
  const X = m => Pd.l + m / 24 * (W - Pd.l - Pd.r), Y = c => H - Pd.b - c / 25 * (H - Pd.t - Pd.b);
  const named = ['vendor-runbook', 'it-setup', 'travel-2024'];
  const isStale = d => d.age >= 11 && d.cites >= 4 && !S.reviewed[d.id];
  el.innerHTML = `<svg class="chart scatter" width="${W}" height="${H}"><defs>${still ? '' : reveal('cs', W, H)}</defs>
    <rect class="q" x="${X(11)}" y="${Pd.t}" width="${X(24) - X(11)}" height="${Y(4) - Pd.t}" rx="10"/><text class="ql" x="${X(24) - 10}" y="${Pd.t + 18}" text-anchor="end">Fix first</text>
    ${[0, 6, 12, 18, 24].map(m => `<line class="grid" x1="${X(m)}" x2="${X(m)}" y1="${Pd.t}" y2="${H - Pd.b}"/><text x="${X(m)}" y="${H - Pd.b + 16}" text-anchor="middle">${m}</text>`).join('')}
    ${[0, 5, 10, 15, 20, 25].map(c => `<text x="${Pd.l - 8}" y="${Y(c) + 4}" text-anchor="end">${c}</text>`).join('')}
    <text x="${(W + Pd.l) / 2}" y="${H - 4}" text-anchor="middle">Months since the document last changed</text>
    <g ${still ? '' : 'clip-path="url(#cs)"'}>${D.scatter.map(d => `<circle cx="${X(d.age)}" cy="${Y(d.cites)}" r="${named.includes(d.id) ? 6.5 : 5}" fill="${isStale(d) ? '#8a6d1f' : '#12564a'}" fill-opacity="${isStale(d) ? .85 : .55}"
      stroke="#fff" stroke-width="1.5" data-act="goto" data-to="#/admin/documents/${d.id}" data-tip="<b>${esc(d.t)}</b><br>${d.age < 1 ? 'Changed this month' : `Last changed ${Math.round(d.age)} months ago`}<br>Cited ${d.cites} times this week"/>`).join('')}
    ${D.scatter.filter(d => named.includes(d.id)).map(d => `<text class="lab" x="${X(d.age) - 10}" y="${Y(d.cites) + 4}" text-anchor="end">${esc(d.t)}</text>`).join('')}</g></svg>`;
}
function icicle(el) {
  const W = el.clientWidth, H = el.clientHeight, cols = 3, gap = 6, cw = (W - gap * (cols - 1)) / cols;
  const lvl = id => { let l = 0, p = D.groupParent[id]; while (p) { l++; p = D.groupParent[p]; } return l; };
  const roots = D.groups.filter(g => !D.groupParent[g.id]), total = sum(roots.map(g => g.n)) , unit = (H - gap * (roots.length - 1) - 30) / total;
  let html = '';
  const place = (g, y) => {
    const h = Math.max(30, g.n * unit), l = lvl(g.id);
    html += `<button class="ice ${g.id === 'contractors' ? 'deny' : ''} ${g.id === tmp.group ? 'sel' : ''}" data-act="pickGroup" data-g="${g.id}" style="left:${l * (cw + gap)}px;top:${y}px;width:${cw}px;height:${h - 2}px;animation-delay:${l * 0.12}s">
      <b>${g.id}</b><small>${g.n} people</small></button>`;
    let cy = y;
    D.groups.filter(x => D.groupParent[x.id] === g.id).forEach(ch => { cy += place(ch, cy) + 4; });
    return h;
  };
  let y = 0;
  roots.forEach(r => { y += place(r, y) + gap; });
  el.innerHTML = html;
}

/* ── document info, detailed for three and generated for the rest ── */
const FILLER = ['Background and who this page is for.', 'Step-by-step process for the common case.', 'Exceptions and who to ask about them.', 'Templates and links to related pages.', 'Contacts and escalation paths.', 'History of changes to this process.'];
function docInfo(id) {
  if (D.documents[id]) return D.documents[id];
  const s = D.scatter.find(d => d.id === id);
  if (!s) return null;
  return { title: s.t, src: 'Confluence', space: 'Shared space', changed: s.age < 1 ? 'this month' : `${Math.round(s.age)} mo`, cited: s.cites, chunks: 10, restricted: 0, generated: true,
    rules: [['allow', 'all-staff', '312 people', 'Whole document']], rows: [] };
}
function chunksOf(d) {
  const deny = d.rules.find(r => r[0] === 'deny'), denied = deny ? rangesOf(deny[3], d.chunks) : [];
  return Array.from({ length: d.chunks }, (_, i) => {
    const n = i + 1, row = d.rows.find(r => r[0] === n);
    return { n, text: row ? row[1] : FILLER[i % FILLER.length], r: denied.includes(n), cites: row ? row[3] : (n * 7) % 6 };
  });
}
function rangesOf(scope, total) {
  if (/whole/i.test(scope)) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [];
  for (const [, a, b] of scope.matchAll(/(\d+) to (\d+)/g)) for (let k = +a; k <= +b; k++) out.push(k);
  return out;
}

const ADMIN = {
  /* ── overview ── */
  overview: {
    needsData: true,
    body: () => {
      const s = D.series[S.range], tot = s.answered.map((v, i) => v + s.missed[i]), asked = sum(tot), ans = Math.round(sum(s.answered) / asked * 100);
      const failing = S.connectors.filter(c => c.status === 'failing'), sc = staleCount(), og = openGaps().sort((a, b) => b.asks - a.asks);
      const issues = [sc && `<a href="#/admin/freshness">${sc} stale documents are still being cited</a>`, ...failing.map(c => `<a class="bad" href="#/admin/connectors">${c.name} has stopped syncing</a>`)].filter(Boolean);
      const headline = !issues.length ? 'Everything is current and answering well. Nothing needs you right now.'
        : `${issues.length === 1 ? 'One thing needs' : issues.length === 2 ? 'Two things need' : 'A few things need'} you: ${listNames(issues)}.`;
      const maxAsk = Math.max(1, ...og.map(g => g.asks));
      const docs = sum(S.connectors.map(c => c.docs));
      return `${phead('Overview', '', seg('range', [['24h', '24 hours'], ['7d', '7 days'], ['30d', '30 days']], S.range))}
        <p class="headline" style="margin:-10px 0 24px">${headline}</p>
        <div class="metrics">
          <div class="metric click" data-act="goto" data-to="#/admin/connectors"><div class="k">Documents indexed</div><div class="v num" data-count="${docs}">0</div><div class="d">across ${S.connectors.length} sources</div>${spark([1201, 1220, 1238, 1250, 1262, 1270, docs])}</div>
          <div class="metric"><div class="k">Questions asked</div><div class="v num" data-count="${asked}">0</div><div class="d up">${D.kpis[S.range].delta}</div>${spark(tot)}</div>
          <div class="metric"><div class="k">Answered</div><div class="v num" data-count="${ans}" data-suf="%">0</div><div class="d">${100 - ans}% said "not covered"</div>${spark(s.answered.map((v, i) => tot[i] ? v / tot[i] : 1))}</div>
          <div class="metric click" data-act="goto" data-to="#/admin/freshness"><div class="k">Stale but cited</div><div class="v num" data-count="${sc}">0</div><div class="d down">documents over a year old</div>${spark([24, 23, 22, 21, 20, 19, sc], '#8a6d1f')}</div>
        </div>
        <div class="grid-main sec">
          <div class="panel">${secH('Questions', 'Answered against "not covered"', '<div class="legend"><span><i style="background:#6aa797"></i>Answered</span><span><i style="background:#e9dcae"></i>Not covered</span></div>')}<div id="qchart"></div></div>
          <div class="panel">${secH('Where your documents live', 'Size is document count. Colour is how recently they changed.')}
            <div class="tmap" id="tmap"></div><div class="legend" style="margin-top:12px"><span><i style="background:#a8cdc3"></i>Mostly current</span><span><i style="background:#eef5f3;box-shadow:inset 0 0 0 1px #d6e8e3"></i>Mixed</span><span><i style="background:#faf5e4;box-shadow:inset 0 0 0 1px #e9dcae"></i>Going stale</span></div></div>
        </div>
        <div class="grid2 sec">
          <div class="panel">${secH('Most asked, least answered', 'Where your documentation is thinnest', '<a class="btn ghost sm" href="#/admin/gaps">All gaps</a>')}
            ${og.slice(0, 4).map(g => `<div class="listrow click" data-act="goto" data-to="#/admin/gaps"><span class="grow"><b>${esc(g.title)}</b></span><span style="width:110px">${inbar(g.asks / maxAsk * 100, 'warn')}</span><span class="num muted" style="width:56px;text-align:right">${g.asks} asks</span></div>`).join('') || '<p class="muted">No open gaps right now.</p>'}</div>
          <div class="panel">${secH('Needs attention')}
            ${sc ? `<div class="listrow click" data-act="goto" data-to="#/admin/freshness"><span class="sev warn">${ic('clock')}</span><span class="grow"><b>${sc} stale documents</b> were cited 43 times this week</span>${ic('right')}</div>` : ''}
            ${failing.map(c => `<div class="listrow click" data-act="goto" data-to="#/admin/connectors"><span class="sev bad">${ic('alert')}</span><span class="grow"><b>${c.name}</b> sync failed 3 times. The sign-in may have expired.</span>${ic('right')}</div>`).join('')}
            ${S.run.failures.length ? `<div class="listrow click" data-act="goto" data-to="#/admin/runs/${S.run.id}"><span class="sev bad">${ic('doc')}</span><span class="grow"><b>${S.run.failures.length} documents</b> didn't make it into the index</span>${ic('right')}</div>` : ''}
            ${og[0] ? `<div class="listrow click" data-act="goto" data-to="#/admin/gaps"><span class="sev warn">${ic('help')}</span><span class="grow"><b>${og[0].people} people</b> asked about ${esc(og[0].title.toLowerCase())}</span>${ic('right')}</div>` : ''}
            ${!sc && !failing.length ? `<div class="listrow"><span class="sev ok">${ic('check')}</span><span class="grow">All clear</span></div>` : ''}</div>
        </div>`;
    },
    mount: still => { countUp(); areaChart($('#qchart'), D.series[S.range], still); treemap($('#tmap')); fillBars(); },
  },

  /* ── freshness ── */
  freshness: {
    needsData: true,
    body: () => `${phead('Sync &amp; freshness', 'How current the documents behind answers are, and whether each source is still syncing.',
        `<button class="btn pri" data-act="reindexAll" ${tmp.reidx ? 'disabled' : ''}>${ic('refresh')} Re-index everything</button>`)}
      ${tmp.reidx ? `<div class="panel" style="margin-bottom:16px"><div class="row"><div class="grow"><b>Re-indexing everything</b><div class="small muted" id="reidxTxt">Starting…</div></div><span class="badge brand live"><span class="dot"></span>Running</span></div><div class="progress"><i id="reidxBar"></i></div></div>` : ''}
      <div class="panel">${S.connectors.map(c => `<div class="listrow"><div class="conn grow">${glyph(c.src || c.name, 'lg')}<div><b>${c.name}</b><div class="small muted">${connSub(c)}</div></div></div>${beatsHTML(c)}${statusBadge(c.status)}</div>`).join('')}</div>
      <div class="sec panel">${secH('Age against use', 'Each dot is a document. Top right means old and still being cited, so fix those first.', '<span class="small muted">Citations this week, up the side</span>')}<div id="scat"></div></div>
      <div class="sec">${secH('Stale and still in use', 'Old documents that answered questions this week')}
        <div class="panel" style="padding:6px 8px"><div class="tscroll"><table><thead><tr><th>Document</th><th class="hide-m">Source</th><th>Last changed</th><th>Cited this week</th><th></th></tr></thead>
        ${D.staleDocs.map(d => `<tr class="click" data-act="goto" data-to="#/admin/documents/${d.id}"><td><b>${d.title}</b></td><td class="hide-m">${d.src}</td>
          <td>${S.reviewed[d.id] ? '<span class="badge ok">Checked today</span>' : `<span style="color:var(--warn)">${d.age}</span>`}</td>
          <td><div class="row"><span style="width:90px">${inbar(d.cited / 20 * 100, S.reviewed[d.id] ? '' : 'warn')}</span><span class="num">${d.cited}</span></div></td><td class="tr">${ic('right')}</td></tr>`).join('')}
        <tr><td colspan="5" class="small muted">15 more stale documents are cited less often.</td></tr></table></div></div></div>`,
    mount: still => { scatter($('#scat'), still); fillBars(); },
  },

  /* ── document detail ── */
  doc: {
    needsData: true,
    crumb: () => ['#/admin/freshness', docInfo(ctx.c)?.title || 'Document'],
    init: () => { tmp.chunk ??= null; },
    body: () => {
      const d = docInfo(ctx.c);
      if (!d) return phead('Document not found', 'That document is no longer in the index.');
      const ok = S.reviewed[ctx.c], staleDoc = !d.generated || /mo/.test(d.changed) && parseInt(d.changed) >= 11, ch = chunksOf(d), maxC = Math.max(1, ...ch.map(c => c.cites));
      const sel = ch.find(c => c.n === tmp.chunk);
      return `${phead(esc(d.title), `${d.src}, ${d.space}`, `<button class="btn" data-act="openSrc" data-src="${d.src}">Open in ${d.src} ${ic('ext')}</button><button class="btn pri" data-act="reindexDoc">${ic('refresh')} Re-index</button>`)}
        <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
          <div class="metric"><div class="k">Last changed</div><div class="v">${d.changed.replace(' mo', ' months')}</div><div class="d ${ok || !staleDoc ? '' : 'down'}">${ok ? 'Checked by you today' : staleDoc ? 'Flagged stale' : 'Current'}</div></div>
          <div class="metric"><div class="k">Cited this week</div><div class="v num">${d.cited}</div><div class="d">times in answers</div></div>
          <div class="metric"><div class="k">Pieces Sambad searches</div><div class="v num">${d.chunks}</div><div class="d">${d.restricted ? `${d.restricted} restricted` : 'none restricted'}</div></div></div>
        ${ok || !staleDoc ? '' : `<div class="note warn sec">${ic('clock')}<div class="grow"><b>Nobody has changed this in ${d.changed.replace(' mo', ' months')}.</b>It was cited ${d.cited} times this week. If it's still right, mark it checked and Sambad stops warning people about it for 6 months.
          <div class="acts"><button class="btn pri sm" data-act="markReviewed">Mark as still accurate</button><button class="btn sm" data-act="nudgeOwner">Ask the owner to update it</button></div></div></div>`}
        <div class="sec panel">${secH('Chunk map', 'Every piece of this document that search can return. Darker means cited more, hatched means restricted.',
          '<div class="legend"><span><i style="background:#6aa797"></i>Everyone</span><span><i style="background:var(--hatch-bad)"></i>Restricted</span></div>')}
          <div class="chunks">${ch.map((c, i) => `<button class="chunk ${c.r ? 'r' : ''} ${c.n === tmp.chunk ? 'sel' : ''}" data-act="pickChunk" data-n="${c.n}" style="background:rgba(18,86,74,${0.1 + c.cites / maxC * 0.55});animation-delay:${i * 0.015}s"
            data-tip="Piece ${c.n}${c.r ? ', restricted' : ''}<br>Cited ${c.cites} times"><span>${c.n}</span></button>`).join('')}</div>
          ${sel ? `<div class="chunkd"><div class="row"><b>Piece ${sel.n}</b>${sel.r ? '<span class="badge bad">Finance team only</span>' : '<span class="badge ok">Everyone</span>'}<span class="small muted" style="margin-left:auto">Cited ${sel.cites} times</span></div><q>${esc(sel.text)}</q>
            <div class="small muted">${sel.r ? 'Contractors are denied this piece. They are never shown it and never told it exists.' : 'Anyone in all-staff can get this piece in an answer.'}</div></div>` : '<p class="small muted" style="margin:12px 0 0">Click a piece to read it and see who can get it.</p>'}</div>
        <div class="sec panel">${secH('Who can see which part', `Mirrored from ${d.src} at the last sync, 4 minutes ago`)}
          <div class="layers">${d.rules.map(([r, g, n, sc]) => { const on = rangesOf(sc, d.chunks); return `<div class="layer"><div><b>${r === 'deny' ? 'Deny' : 'Allow'} ${g}</b><small>${n}, ${sc.toLowerCase()}</small></div>
            <div class="track" style="grid-template-columns:repeat(${d.chunks},1fr)">${ch.map(c => `<i class="${on.includes(c.n) ? (r === 'deny' ? 'd' : 'a') : ''}"></i>`).join('')}</div></div>`; }).join('')}</div></div>`;
    },
  },

  /* ── run detail ── */
  run: {
    needsData: true,
    crumb: () => ['#/admin/connectors', `${S.run.source} sync`],
    body: () => {
      const r = S.run, f = r.failures.length, total = r.unchanged + r.reindexed + r.skipped + f, pct = v => v / total * 100;
      return `${phead(`${r.source} sync`, `Started 2 days ago. ${f ? `Finished with ${f} error${f === 1 ? '' : 's'}.` : 'Everything synced.'}`,
          `<button class="btn pri" data-act="retryAll" ${r.failures.some(x => x.retry === 'ok') ? '' : 'disabled'}>${ic('refresh')} Retry failed</button>`)}
        <div class="panel">${secH('What happened to each document', `${total} checked`)}
          <div class="flow"><div style="width:${pct(r.unchanged)}%" data-tip="Same content hash as last time, so skipped">${r.unchanged} unchanged</div>
            <div class="re" style="width:${Math.max(pct(r.reindexed), 4)}%;animation-delay:.1s" data-tip="Changed since last run">${r.reindexed}</div>
            ${r.skipped ? `<div style="width:${Math.max(pct(r.skipped), 2)}%;background:var(--fill2);color:var(--mid);animation-delay:.15s" data-tip="Skipped by you">${r.skipped}</div>` : ''}
            ${f ? `<div class="fail" style="width:${Math.max(pct(f), 4)}%;animation-delay:.2s" data-tip="Didn't make it into the index">${f}</div>` : ''}</div>
          <div class="flowlab"><span><b>${r.unchanged}</b>unchanged</span><span><b>${r.reindexed}</b>re-indexed</span>${r.skipped ? `<span><b>${r.skipped}</b>skipped</span>` : ''}<span style="color:var(--bad)"><b style="color:var(--bad)">${f}</b>failed</span></div></div>
        <div class="sec">${secH('Failures', "Documents that didn't make it into the index, and why")}
          ${f ? `<div class="panel" style="padding:6px 14px">${r.failures.map((x, i) => `<div class="listrow"><span class="sev bad">${ic('doc')}</span><div class="grow"><b>${esc(x.doc)}</b><div class="small muted">${esc(x.reason)}. Tried ${x.attempts} time${x.attempts === 1 ? '' : 's'}.</div></div>
            <button class="btn sm" data-act="retryRow" data-i="${i}">Retry</button><button class="btn ghost sm" data-act="skipRow" data-i="${i}">Skip</button></div>`).join('')}</div>`
            : `<div class="note good">${ic('check')}<div><b>Nothing left to fix.</b>Every document from this run is either indexed or deliberately skipped.</div></div>`}</div>`;
    },
  },

  /* ── access audit ── */
  audit: {
    needsData: true,
    init: () => { tmp.person ??= ''; tmp.range ??= '24h'; tmp.open ??= { 1: true }; },
    body: () => {
      const rows = auditRows(), people = [...new Set(D.audit.map(a => a.person))];
      return `${phead('Access audit', 'Every question, which pieces of documents went into the answer, and which were withheld by permissions.', `<button class="btn" data-act="exportCsv">${ic('download')} Export CSV</button>`)}
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:12px">
          <div class="people"><button class="person ${!tmp.person ? 'on' : ''}" data-act="auditPerson" data-p="" style="padding-left:14px">Everyone</button>
            ${people.map(p => `<button class="person ${tmp.person === p ? 'on' : ''}" data-act="auditPerson" data-p="${p}"><span class="av sm soft">${initials(p)}</span>${p}</button>`).join('')}</div>
          ${seg('auditRange', [['24h', 'Last 24 hours'], ['7d', 'Last 7 days']], tmp.range)}</div>
        <div class="panel" style="padding:8px">${rows.map(({ a, i }) => `<div class="arow ${tmp.open[i] ? 'open' : ''}" data-act="auditRow" data-i="${i}"><span class="t num">${a.time}</span><span class="av sm soft">${initials(a.person)}</span>
            <span class="q">${esc(a.q)}<small>${a.person}</small></span>
            <span class="dots" data-tip="${a.used.length} used, ${a.withheld.length} withheld">${a.used.map(() => '<i></i>').join('')}${a.withheld.map(() => '<i class="w"></i>').join('')}${!a.used.length && !a.withheld.length ? '<i class="none"></i>' : ''}</span>
            <span class="chev">${ic('chev')}</span></div>${tmp.open[i] ? `<div class="adetail">${auditDetail(a)}</div>` : ''}`).join('')
          || '<p class="muted" style="padding:12px">No questions match these filters.</p>'}</div>
        <div class="legend" style="margin:10px 4px 0"><span><i style="background:#6aa797;border-radius:50%"></i>Used in the answer</span><span><i style="background:var(--hatch-warn);box-shadow:inset 0 0 0 1px var(--warn);border-radius:50%"></i>Withheld by a permission rule</span></div>
        <div class="note brand sec">${ic('shield')}<div><b>Withheld isn't the same as a denied person.</b>Each entry records the rule that fired. That is the evidence that permission filtering happened inside the search, not after it.</div></div>`;
    },
  },

  /* ── access inspector ── */
  inspector: {
    needsData: true,
    init: () => { tmp.who ??= 'Dev K.'; },
    body: () => {
      const p = D.people[tmp.who], total = 1284, C = 2 * Math.PI * 60;
      const segs = [['Can see', p.see, '#6aa797'], ['Partial', p.partial, '#8a6d1f'], ['No access', p.none, '#e9e9ed']];
      let off = 0;
      return `${phead('Access inspector', "Pick a person to see what Sambad will and won't show them, after nested groups and deny rules.")}
        <div class="people" style="margin-bottom:18px">${Object.keys(D.people).map(n => `<button class="person ${n === tmp.who ? 'on' : ''}" data-act="inspWho" data-p="${n}"><span class="av sm soft">${initials(n)}</span>${n}</button>`).join('')}</div>
        <div class="grid2">
          <div class="panel">${secH('Groups', 'Including groups inherited through nesting')}<div class="tree">
            ${p.groups.map(([g, l, k]) => `<div class="tn ${l ? 'l' + l : ''} ${k === 'deny source' ? 'deny' : k === 'inherited' ? 'inh' : ''}"><span class="gd"></span><b>${g}</b>
              <span class="badge ${k === 'deny source' ? 'bad' : k === 'inherited' ? '' : 'brand'}">${k === 'deny source' ? 'Deny rules' : k === 'inherited' ? 'Inherited' : 'Direct'}</span></div>`).join('')}</div></div>
          <div class="panel">${secH('Effective access', `Out of ${fmt(total)} documents`)}
            <div class="donutwrap"><div class="donut"><svg viewBox="0 0 150 150">${segs.map(([l, v, c], i) => { const len = v / total * C, s = `<circle cx="75" cy="75" r="60" stroke="${c}" stroke-dasharray="0 ${C}" data-len="${len}" stroke-dashoffset="${-off}" data-i="${i}" data-tip="${l}: ${fmt(v)} documents" style="transition:stroke-dasharray .9s var(--ease) ${i * 0.15}s"/>`; off += len; return s; }).join('')}</svg>
              <div class="mid"><b class="num">${Math.round(p.see / total * 100)}%</b><small>fully visible</small></div></div>
              <div class="dlist">${segs.map(([l, v, c], i) => `<div data-i="${i}"><i style="background:${c}"></i>${l}<b class="num">${fmt(v)}</b></div>`).join('')}</div></div>
            <form data-form="checkDoc" class="row" style="margin-top:16px"><input class="in" name="doc" id="checkDocIn" list="docList" placeholder="Check a specific document…"><button class="btn" type="submit">Check</button></form>
            <datalist id="docList">${['Vendor Payment Runbook', 'Compensation Bands', 'Regional Pricing 2026', 'Board Minutes 2026', 'Employee Handbook: Leave'].map(d => `<option value="${d}">`).join('')}</datalist>
            <div class="autos" style="margin-top:8px"><button class="auto" data-act="fillCheck">${SPARK} Vendor Payment Runbook</button></div><div id="checkRes"></div></div></div>
        <div class="sec">${secH('Partial access', 'Documents where some pieces are hidden from this person')}
          <div class="panel" style="padding:6px 8px"><div class="tscroll"><table><thead><tr><th>Document</th><th>Visible and hidden pieces</th><th>Why</th></tr></thead>
            ${p.docs.map(([d, v, h, r]) => `<tr><td><b>${d}</b></td><td><div class="row"><div class="stack" style="width:160px"><i style="flex:${v || 0.001}"></i><i class="h" style="flex:${h}"></i></div><span class="small muted num">${v} of ${v + h}</span></div></td><td>${r}</td></tr>`).join('')}</table></div></div></div>`;
    },
    mount: () => {
      setTimeout(() => $$('.donut circle').forEach(c => c.setAttribute('stroke-dasharray', `${c.dataset.len} ${2 * Math.PI * 60}`)), 40);
      $$('.donut circle').forEach(c => {
        c.onmouseenter = () => $(`.dlist div[data-i="${c.dataset.i}"]`)?.classList.add('hot');
        c.onmouseleave = () => $$('.dlist div').forEach(x => x.classList.remove('hot'));
      });
    },
  },

  /* ── knowledge gaps ── */
  gaps: {
    needsData: true,
    init: () => { tmp.tab ??= 'open'; },
    body: () => {
      const list = S.gaps.filter(g => g.status !== 'dismissed' && (tmp.tab === 'all' || g.status === tmp.tab)).sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || b.asks - a.asks);
      const card = g => {
        const tr = g.trend || [], recent = sum(tr.slice(7)), before = sum(tr.slice(0, 7)), max = Math.max(1, ...tr);
        const label = g.status === 'resolved' ? 'Quiet since written' : recent > before ? 'Rising' : recent === 0 ? 'Quiet' : 'Steady';
        const right = `<div class="trend"><div class="tlabel ${label === 'Rising' ? 'up' : ''}">${label}</div><div class="bars">${tr.map((v, i) => `<i class="${i === tr.length - 1 ? 'last' : ''}" style="height:${Math.max(4, v / max * 100)}%;animation-delay:${i * 0.025}s" data-tip="${14 - i === 1 ? 'Today' : `${14 - i} days ago`}: ${v} ask${v === 1 ? '' : 's'}"></i>`).join('')}</div><small><span>2 weeks ago</span><span>Today</span></small></div>`;
        if (g.status === 'resolved') return `<div class="gap done"><div><h3>${esc(g.title)}</h3><div class="gmeta">${ic('check')} ${esc(g.note)}</div></div>${right}</div>`;
        return `<div class="gap" data-gap="${g.id}"><div><h3>${esc(g.title)} ${g.fresh ? '<span class="badge warn">New</span>' : ''}</h3>
          <div class="gmeta"><span class="avs">${(g.who || []).slice(0, 4).map(p => `<span class="av sm soft">${initials(p)}</span>`).join('')}</span><span>${g.people} ${g.people === 1 ? 'person' : 'people'}, ${g.asks} asks</span>${g.owner ? `<span class="badge brand">Assigned to ${g.owner}</span>` : ''}</div>
          ${g.ex.map(x => `<q>${esc(x)}</q>`).join('')}
          <div class="acts"><button class="btn pri sm" data-act="gapDone" data-id="${g.id}">Mark as written</button>
            <span class="wrap-menu"><button class="btn sm" data-act="gapAssign" data-id="${g.id}" data-menu>${g.owner ? 'Reassign' : 'Assign'} ${ic('chev')}</button></span>
            <button class="btn ghost sm" data-act="gapDismiss" data-id="${g.id}">Not a gap</button></div></div>${right}</div>`;
      };
      return `${phead('Knowledge gaps', "Questions your documents couldn't answer, grouped by topic, busiest first.", seg('gapTab', [['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']], tmp.tab))}
        ${list.map(card).join('') || `<div class="empty-ws">${glyph('✓', 'lg')}<h3>No open gaps</h3><p>Your documents cover what people are asking.</p></div>`}
        <div class="note brand sec">${ic('info')}<div><b>The distinction this screen has to get right.</b>A question can go unanswered because the content doesn't exist, or because search missed content that does. Only the first is a gap. "Not a gap" sends the question to search quality checks instead.</div></div>`;
    },
  },

  /* ── connectors ── */
  connectors: {
    body: () => `${phead('Connectors', 'Where Sambad reads documents from. Permissions come across with every sync.', `<a class="btn brand" href="#/admin/connectors/new">${ic('plus')} Add a source</a>`)}
      ${S.connectors.length ? S.connectors.map(c => `<div class="panel" style="margin-bottom:12px"><div class="conn" style="flex-wrap:wrap">${glyph(c.src || c.name, 'lg')}
          <div class="grow"><b style="font-size:15px">${c.name}</b><div class="small muted">${connSub(c)}${c.status === 'healthy' ? ` Checks ${c.freq.toLowerCase()}.` : ''}</div></div>
          ${beatsHTML(c)}${statusBadge(c.status)}<button class="btn sm" data-act="connSettings" data-id="${c.id}">${tmp.settings === c.id ? 'Close' : 'Settings'}</button></div>
        ${c.status === 'failing' ? `<div class="note bad" style="margin-top:14px">${ic('alert')}<div class="grow"><b>Sambad can't reach ${c.name}.</b>The access token was revoked or has expired. Reconnecting resumes syncing from where it stopped.
          <div class="acts"><button class="btn pri sm" data-act="reconnect" data-id="${c.id}">Reconnect</button><a class="btn sm" href="#/admin/runs/${S.run.id}">See the last run</a></div></div></div>` : ''}
        ${c.status === 'indexing' || c.status === 'syncing' ? `<div class="progress"><i id="prog-${c.id}" style="width:${(c.progress || 0) / c.total * 100}%"></i></div><div class="small muted" style="margin-top:6px" id="ptxt-${c.id}">Starting…</div>` : ''}
        ${tmp.settings === c.id ? `<div class="sep"></div><div class="grid2"><div><div class="label">How often to check for changes</div>
            ${seg('connFreq', [['Every 15 minutes', '15 min'], ['Every hour', 'Hourly'], ['Every 6 hours', '6 hours'], ['Once a day', 'Daily']], tmp.freq || c.freq)}</div>
          <div><div class="label">Syncing</div><div class="row" style="height:34px"><button class="switch ${c.paused ? '' : 'on'}" data-act="switch" id="sw-${c.id}" aria-label="Syncing on"></button><span class="small mid">${c.paused ? 'Paused' : 'On'}</span></div></div></div>
          <div class="acts"><button class="btn pri sm" data-act="connSave" data-id="${c.id}">Save</button><button class="btn sm" data-act="syncNow" data-id="${c.id}">${ic('refresh')} Sync now</button>
            <span class="grow"></span><button class="btn ghost sm danger" data-act="disconnect" data-id="${c.id}">Disconnect</button></div>` : ''}</div>`).join('')
      : `<div class="empty-ws">${glyph('+', 'lg')}<h3>No sources yet</h3><p>Connect where your team keeps its documents.</p><a class="btn brand" href="#/admin/connectors/new">${ic('plus')} Add a source</a></div>`}`,
  },

  /* ── add a source: four short steps ── */
  newsource: {
    crumb: () => ['#/admin/connectors', 'Add a source'],
    init: () => { tmp.step ??= 0; tmp.type ??= null; tmp.connected ??= false; tmp.files ??= []; tmp.spaces ??= null; tmp.freq ??= 'Every 15 minutes'; },
    body: () => {
      const taken = S.connectors.map(c => c.name), up = tmp.type === 'Upload files', steps = ['Choose a source', up ? 'Add files' : 'Connect', 'Choose what to include', 'Review'];
      const welcome = ctx.q.get('welcome') && S.flags.emptyWorkspace
        ? `<div class="note good" style="margin-bottom:22px">${ic('check')}<div><b>Welcome to Sambad, ${esc(first(S.session.name))}. ${esc(S.workspace)} is ready.</b>Connect the place your team keeps its documents. Everything else in the admin console fills in from here.</div></div>` : '';
      const can = [!!tmp.type, up ? tmp.files.length > 0 : tmp.connected, up || (tmp.spaces?.length ?? 1) > 0, true][tmp.step];
      const spaces = D.sourceTypes[tmp.type] || [], picked = tmp.spaces ?? spaces;
      const views = [
        `<div class="srcgrid">${Object.keys(D.sourceTypes).map(t => `<button class="srcopt ${tmp.type === t ? 'on' : ''}" data-act="srcPick" data-t="${t}" ${taken.includes(t) ? 'disabled' : ''}>${glyph(t, 'lg')}<span><b>${t}</b><small>${taken.includes(t) ? 'Already connected' : D.sourceBlurb[t]}</small></span></button>`).join('')}</div>`,
        up ? `<div class="drop" data-act="pickFiles" id="drop">${ic('upload')}<div style="margin-top:6px">Drop files here or <b>browse</b></div><div class="small muted">PDF, Word, Markdown. Up to 50 MB each.</div></div>
              <input type="file" id="fileIn" multiple hidden>${tmp.files.map(f => `<div class="file"><span>${esc(f.name)}</span><span class="muted">${f.size}</span></div>`).join('')}
              <div class="autos" style="margin-top:10px"><button class="auto" type="button" data-act="sampleFiles">${SPARK} Add sample files</button></div>`
          : tmp.connected ? `<div class="note good">${ic('check')}<div><b>Connected as ${esc(S.session.email)}</b>Sambad can read ${tmp.type}. It never writes anything back.</div></div>`
          : `<div class="panel flat center" style="padding:30px">${glyph(tmp.type || '?', 'lg')}<p class="mid" style="margin:12px auto 16px;max-width:40ch">Sambad reads documents and their permissions. It never writes anything back.</p>
              <button class="btn pri" data-act="srcConnect">Sign in to ${tmp.type}</button></div>`,
        up ? `<div class="note">${ic('info')}<div>Uploaded files have no permissions of their own, so everyone in the workspace can get answers from them.</div></div>`
          : `<div class="label">Spaces</div><div class="spaces">${spaces.map(s => `<button class="chip ${picked.includes(s) ? 'on' : ''}" data-act="spaceToggle" data-s="${esc(s)}">${picked.includes(s) ? ic('check') : ''}${esc(s)}</button>`).join('')}</div>
            <div class="label" style="margin-top:20px">How often to check for changes</div>${seg('srcFreq', [['Every 15 minutes', '15 min'], ['Every hour', 'Hourly'], ['Every 6 hours', '6 hours'], ['Once a day', 'Daily']], tmp.freq)}`,
        `<div class="review"><div><span>Source</span><b>${tmp.type}</b></div>${up ? `<div><span>Files</span><b>${tmp.files.length}</b></div>` : `<div><span>Signed in as</span><b>${esc(S.session.email)}</b></div><div><span>Spaces</span><b>${picked.length === spaces.length ? 'All of them' : esc(picked.join(', '))}</b></div><div><span>Checks for changes</span><b>${tmp.freq}</b></div>`}</div>
          <div class="note brand" style="margin-top:16px">${ic('shield')}<div><b>${up ? 'Sambad keeps the only copy, on your own server.' : 'Permissions come across too.'}</b>${up ? 'Use a connected source for anything that needs restricted access.' : `Everyone sees only what they can already open in ${tmp.type}. Sambad never widens access, and if someone loses access there, they lose it here at the next sync.`}</div></div>`,
      ];
      return `${phead('Add a source', 'Four short steps. You can change any of this later.', `<button class="auto" data-act="fillSource">${SPARK} Fill for me</button>`)}
        <div style="max-width:720px">${welcome}<div class="steps">${steps.map((s, i) => `<div class="stp ${i < tmp.step ? 'done' : i === tmp.step ? 'now' : ''}"><i></i>${s}</div>`).join('')}</div>
          <div class="panel" style="padding:22px">${views[tmp.step]}</div>
          <div class="stepnav"><button class="btn ghost" data-act="stepBack" ${tmp.step ? '' : 'style="visibility:hidden"'}>${ic('back')} Back</button>
            ${tmp.step < 3 ? `<button class="btn pri" data-act="stepNext" ${can ? '' : 'disabled'}>Continue</button>` : `<button class="btn brand" data-act="addSource">Add source and start indexing</button>`}</div></div>`;
    },
    mount: () => {
      const drop = $('#drop'), fin = $('#fileIn');
      if (!drop) return;
      const add = files => { tmp.files.push(...[...files].map(f => ({ name: f.name, size: f.size > 1e6 ? (f.size / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(f.size / 1e3)) + ' KB' }))); refresh(); };
      fin.onchange = () => add(fin.files);
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = e => { e.preventDefault(); add(e.dataTransfer.files); };
    },
  },

  /* ── people & groups ── */
  people: {
    needsData: true,
    init: () => { tmp.group ??= 'backend-guild'; },
    body: () => {
      const g = D.groups.find(x => x.id === tmp.group), parent = D.groupParent[g.id];
      return `${phead('People &amp; groups', 'A read-only mirror of your identity provider. Edit groups where they live; this shows what Sambad believes.',
          `<span class="small muted" id="peopleSync">${tmp.synced ? 'Synced just now' : 'Synced 4 minutes ago'}</span><button class="btn" data-act="resync">${ic('refresh')} Re-sync</button>`)}
        <div class="grid-main"><div class="panel">${secH('Groups', 'Left to right is nesting depth. Height is how many people are in each.')}<div class="icicle" id="ice"></div></div>
          <div class="panel">${secH(g.id, `${g.n} people, ${parent ? `nested inside ${parent}` : 'top-level group'}`)}
            ${g.members.map(([p, v, a]) => `<div class="listrow"><span class="av sm soft">${initials(p)}</span><span class="grow"><b>${p}</b><div class="small muted">${v === 'direct' ? 'Direct member' : `Through ${v}`}</div></span><span class="small muted num">${a} questions</span></div>`).join('')}
            <div class="small muted" style="padding-top:10px">and ${g.n - g.members.length} more</div>
            ${g.id === 'contractors' ? `<div class="note bad" style="margin-top:12px">${ic('shield')}<div>Members of this group are denied the bank-details pieces of the Vendor Payment Runbook.</div></div>` : ''}</div></div>`;
    },
    mount: () => icicle($('#ice')),
  },

  /* ── model ── */
  model: {
    init: () => { tmp.md ??= clone(S.model); },
    body: () => {
      const m = tmp.md, conf = D.confidence, tot = sum(conf), dec = declined(m.threshold);
      return `${phead('Model', 'Where answers are generated, and how sure Sambad must be before it answers.', `<button class="btn pri" data-act="modelSave" id="modelSave" ${dirty() ? '' : 'disabled'}>Save changes</button>`)}
        <div class="grid2">
          <button class="opt ${m.mode === 'local' ? 'on' : ''}" data-act="mode" data-m="local"><span class="o"></span><span class="glyph lg">${ic('cpu')}</span><span><b>On this server</b><small>Ollama with ${m.answering}. Nothing leaves your infrastructure.</small></span></button>
          <button class="opt ${m.mode === 'hosted' ? 'on' : ''}" data-act="mode" data-m="hosted"><span class="o"></span><span class="glyph lg">${ic('plug')}</span><span><b>Hosted endpoint</b><small>Your own private endpoint and API key.</small></span></button></div>
        ${m.mode === 'hosted' ? `<div class="panel sec" style="animation:rise .3s var(--ease)"><div class="grid2"><div class="field"><label>Endpoint URL</label><input class="in" id="mEndpoint" data-in="mField" data-k="endpoint" placeholder="https://llm.internal.example.com/v1" value="${esc(m.endpoint)}"></div>
          <div class="field"><label>API key</label><input class="in" id="mKey" type="password" data-in="mField" data-k="key" placeholder="sk-…" value="${esc(m.key)}"></div></div>
          <div class="autos"><button class="auto" data-act="fillEndpoint">${SPARK} Sample endpoint</button></div>
          <div class="note warn" style="margin-top:14px">${ic('alert')}<div><b>Questions will leave this server.</b>Each question and the passages used to answer it are sent to this endpoint. Permission filtering still happens here first.</div></div></div>` : ''}
        <div class="grid2 sec">
          <div>${secH('Answering model', 'Writes the answer from the passages it is given')}<div class="opts">${D.answeringModels.map(x => optHTML('answering', x, m.answering)).join('')}</div></div>
          <div>${secH('Search model', 'Finds the passages. Changing it re-indexes everything.')}<div class="opts">${D.searchModels.map(x => optHTML('search', x, m.search)).join('')}</div>
            ${m.search !== S.model.search ? `<div class="note warn" style="margin-top:10px">${ic('clock')}<div>Saving re-indexes all 1,284 documents. It takes about 40 minutes.</div></div>` : ''}</div></div>
        <div class="sec panel">${secH('When to say "I don\'t know"', 'Each bar is last week\'s questions at that confidence. Drag the line: everything left of it gets "not covered" instead of a guess.')}
          <div class="thresh"><div class="hbars">${conf.map((v, i) => `<i class="${(i + 0.5) * 5 < m.threshold ? 'off' : ''}" style="height:${v / Math.max(...conf) * 100}%;animation-delay:${i * 0.02}s"></i>`).join('')}</div>
            <div class="tline" id="tline" style="left:${m.threshold}%" data-l="${m.threshold}% sure"></div>
            <input type="range" min="0" max="100" value="${m.threshold}" data-in="thresh" aria-label="Answer threshold">
            <div class="haxis"><span>Less sure</span><span>More sure</span></div></div>
          <div class="split"><div class="y"><b id="ansPct">${100 - dec}%</b><small>would be answered</small></div><div><b id="decPct">${dec}%</b><small>would get "not covered"</small></div><div><b class="num" id="decN">${Math.round(tot * dec / 100)}</b><small>questions last week would change</small></div></div></div>
        <div class="sec panel"><div class="row"><span class="sev ok" id="connIco">${ic('check')}</span><div class="grow"><b>Connection</b><div class="small muted" id="connTxt">Last checked 2 minutes ago, 340ms</div></div>
          <span id="connPill"><span class="badge ok"><span class="dot"></span>Reachable</span></span><button class="btn sm" data-act="testConn">Test</button></div></div>`;
    },
  },
};
const optHTML = (k, x, cur) => `<button class="opt ${x === cur ? 'on' : ''}" data-act="pickModel" data-k="${k}" data-v="${x}"><span class="o"></span><span><b>${x}</b><small>${D.modelInfo[x][1]}</small></span><span class="badge">${D.modelInfo[x][0]}</span></button>`;

/* admin actions */
A.range = el => { slideSeg(el); S.range = el.dataset.v; save(); setTimeout(refresh, 200); };
A.reindexAll = async el => {
  if (!await confirmBox({ title: 'Re-index everything?', body: 'Sambad re-reads all 1,284 documents. Anything whose content hasn\'t changed is skipped, so this is quick unless a lot changed. People can keep asking while it runs.', ok: 'Re-index' })) return;
  el.disabled = true;
  tmp.reidx = { done: 0 };
  refresh();
  const total = 1284;
  const t = setInterval(() => {
    const r = tmp.reidx;
    if (!r) return clearInterval(t);
    r.done = Math.min(total, r.done + Math.round(rand(40, 110)));
    const bar = $('#reidxBar'), txt = $('#reidxTxt');
    if (bar) bar.style.width = (r.done / total * 100) + '%';
    if (txt) txt.textContent = `${fmt(r.done)} of ${fmt(total)} documents checked`;
    if (r.done < total) return;
    clearInterval(t);
    tmp.reidx = null;
    if (onPage('freshness')) refresh();
    toast('Re-index finished. 1,261 unchanged, 23 re-indexed, none failed.');
  }, 120);
};
A.reindexDoc = async el => { await busy(el, 1400); toast("Re-indexed. The content hadn't changed, so nothing new was embedded."); };
A.markReviewed = () => { S.reviewed[ctx.c] = true; save(); refresh(); updateBadges(); toast("Marked as checked. Employees won't see a staleness warning for this page."); };
A.nudgeOwner = async el => { await busy(el, 800); el.innerHTML = `${ic('check')} Reminder sent`; el.className = 'btn sm on'; el.removeAttribute('data-act'); toast('Sent a reminder to the page owner, Tom B.'); };
A.pickChunk = el => { tmp.chunk = tmp.chunk === +el.dataset.n ? null : +el.dataset.n; refresh(); };

A.retryRow = async el => {
  const f = S.run.failures[+el.dataset.i];
  await busy(el, 1200);
  if (f.retry === 'ok') { S.run.failures.splice(+el.dataset.i, 1); S.run.reindexed++; toast(`${f.doc} is in the index now.`); }
  else { f.attempts++; toast(`Still failing: ${f.reason}`, null, 'alert'); }
  save(); refresh();
};
A.skipRow = el => {
  const i = +el.dataset.i, [f] = S.run.failures.splice(i, 1);
  S.run.skipped++;
  save(); refresh();
  toast(`Skipped ${f.doc}. It won't be retried.`, () => { S.run.failures.splice(i, 0, f); S.run.skipped--; save(); if (onPage('run')) refresh(); });
};
A.retryAll = async el => {
  await busy(el, 1800);
  const ok = S.run.failures.filter(f => f.retry === 'ok');
  S.run.failures = S.run.failures.filter(f => f.retry !== 'ok');
  S.run.failures.forEach(f => f.attempts++);
  S.run.reindexed += ok.length;
  save(); refresh();
  toast(`${ok.length} fixed, ${S.run.failures.length} still failing.`);
};

const auditRows = () => D.audit.map((a, i) => ({ a, i })).filter(({ a }) => (!tmp.person || a.person === tmp.person) && (tmp.range === '7d' || a.day === 0));
function auditDetail(a) {
  const used = a.used.length ? `<h4>Used in the answer</h4>${a.used.map(u => `<div class="wrow"><i></i>${esc(u)}</div>`).join('')}`
    : '<div class="small muted">Nothing matched closely enough, so Sambad said this isn\'t covered.</div>';
  if (!a.withheld.length) return used;
  return `<h4>Withheld from this answer</h4>${a.withheld.map(([c, why, rule]) => `<div class="wrow"><i class="w"></i><span><b>${esc(c)}</b><br><span class="small muted">${esc(why)}</span></span><span class="badge ${rule === 'deny rule' ? 'bad' : ''}">${rule === 'deny rule' ? 'Deny rule' : 'No allow rule'}</span></div>`).join('')}
    <p class="small" style="margin:10px 0 14px;color:var(--brand)">${a.person} was never shown these pieces and was not told they exist.</p>${used}`;
}
A.auditPerson = el => { tmp.person = el.dataset.p; refresh(); };
A.auditRange = el => { slideSeg(el); tmp.range = el.dataset.v; setTimeout(refresh, 200); };
A.auditRow = el => { const i = el.dataset.i; tmp.open[i] = !tmp.open[i]; refresh(); };
A.exportCsv = () => {
  const rows = auditRows(), q = s => `"${String(s).replace(/"/g, '""')}"`;
  const csv = ['time,person,question,chunks_used,chunks_withheld,withheld_detail',
    ...rows.map(({ a }) => [a.time, a.person, a.q, a.used.length, a.withheld.length, a.withheld.map(w => `${w[0]} (${w[2]})`).join('; ')].map(q).join(','))].join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = 'sambad-access-audit.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast(`Exported ${rows.length} rows to sambad-access-audit.csv`);
};

A.inspWho = el => { tmp.who = el.dataset.p; refresh(); };
A.fillCheck = () => typeInto($('#checkDocIn'), 'Vendor Payment Runbook');
F.checkDoc = async (f, btn) => {
  const name = val(f, 'doc');
  if (!name) return;
  await busy(btn, 600);
  const p = D.people[tmp.who], hit = p.docs.find(d => d[0].toLowerCase() === name.toLowerCase());
  const res = !hit ? `<div class="note good">${ic('check')}<div><b>${tmp.who} can see all of ${esc(name)}.</b>No rule hides any part of it.</div></div>`
    : hit[1] === 0 ? `<div class="note bad">${ic('shield')}<div><b>${tmp.who} can't see ${esc(hit[0])} at all.</b>Reason: ${hit[3]}. It never appears in their answers.</div></div>`
    : `<div class="note warn">${ic('shield')}<div><b>${tmp.who} can see ${hit[1]} of ${hit[1] + hit[2]} pieces of ${esc(hit[0])}.</b>The other ${hit[2]} are hidden by: ${hit[3]}.</div></div>`;
  $('#checkRes').innerHTML = `<div style="margin-top:12px;animation:rise .25s var(--ease)">${res}</div>`;
};

A.gapTab = el => { slideSeg(el); tmp.tab = el.dataset.v; setTimeout(refresh, 200); };
const gapById = id => S.gaps.find(g => g.id === id);
async function gapOut(id) { const c = $(`[data-gap="${id}"]`); if (c) { c.classList.add('out'); await sleep(280); } }
A.gapDone = async el => {
  const g = gapById(el.dataset.id);
  await gapOut(g.id);
  g.status = 'resolved';
  g.note = 'Marked written just now. Sambad is watching for new asks.';
  save(); refresh(); updateBadges();
  toast('Marked as written. Sambad will tell you if people keep asking.');
};
A.gapAssign = el => {
  const open = el.parentElement.querySelector('.menu');
  if (open) return open.remove();
  el.insertAdjacentHTML('afterend', `<div class="menu">${D.owners.map(o => `<button data-act="gapOwner" data-id="${el.dataset.id}" data-o="${o}">${ic('users')} ${o}</button>`).join('')}</div>`);
};
A.gapOwner = el => { gapById(el.dataset.id).owner = el.dataset.o; save(); refresh(); toast(`Assigned to ${el.dataset.o}. They'll get an email with the example questions.`); };
A.gapDismiss = async el => {
  const g = gapById(el.dataset.id);
  await gapOut(g.id);
  g.status = 'dismissed';
  save(); refresh(); updateBadges();
  toast('Removed. Logged as a search miss for quality checks.', () => { g.status = 'open'; save(); if (onPage('gaps')) refresh(); updateBadges(); });
};

const conn = id => S.connectors.find(c => c.id === id);
A.connSettings = el => { tmp.settings = tmp.settings === el.dataset.id ? null : el.dataset.id; tmp.freq = null; refresh(); };
A.connFreq = el => { slideSeg(el); tmp.freq = el.dataset.v; };
A.switch = el => { el.classList.toggle('on'); el.nextElementSibling.textContent = el.classList.contains('on') ? 'On' : 'Paused'; };
A.connSave = async el => {
  const c = conn(el.dataset.id);
  c.freq = tmp.freq || c.freq;
  c.paused = !$('#sw-' + c.id).classList.contains('on');
  await busy(el, 600);
  tmp.settings = null;
  save(); refresh();
  toast(`${c.name} settings saved`);
};
A.syncNow = async el => { const c = conn(el.dataset.id); await busy(el, 1500); c.synced = 'just now'; c.beats = (c.beats || '').slice(1) + 'o'; save(); refresh(); toast(`${c.name} synced. 3 changed documents re-indexed, the rest skipped.`); };
A.disconnect = async el => {
  const c = conn(el.dataset.id), i = S.connectors.indexOf(c);
  if (!await confirmBox({ title: `Disconnect ${c.name}?`, body: `Sambad removes its ${fmt(c.docs)} documents from the index. People won't get answers from them until you reconnect.`, ok: 'Disconnect', danger: true })) return;
  S.connectors.splice(i, 1);
  tmp.settings = null;
  save(); refresh();
  toast(`${c.name} disconnected`, () => { S.connectors.splice(i, 0, c); save(); if (onPage('connectors')) refresh(); });
};
A.reconnect = async el => {
  const c = conn(el.dataset.id);
  el.classList.add('loading');
  toast(`Opening ${c.name} sign-in…`);
  await sleep(1500);
  Object.assign(c, { status: 'syncing', total: 14, progress: 0 });
  save(); refresh();
  tickConn(c);
};
// Progress for indexing and catching up survives re-renders because it reads state, not DOM.
function tickConn(c) {
  if (c._t) return;
  const total = c.total, ms = c.status === 'indexing' ? 6000 : 3200, stepN = Math.max(1, Math.ceil(total / (ms / 140)));
  c._t = setInterval(() => {
    c.progress = Math.min(total, (c.progress || 0) + Math.ceil(stepN * rand(0.6, 1.4)));
    const bar = $('#prog-' + c.id), txt = $('#ptxt-' + c.id);
    if (bar) bar.style.width = (c.progress / total * 100) + '%';
    if (txt) txt.textContent = `${fmt(c.progress)} of ${fmt(total)} ${c.status === 'indexing' ? 'documents read' : 'changed documents caught up'}`;
    if (c.progress < total) return;
    clearInterval(c._t);
    delete c._t;
    const wasIndexing = c.status === 'indexing', wasEmpty = S.flags.emptyWorkspace;
    if (wasIndexing) { c.docs = total; S.flags.emptyWorkspace = false; }
    Object.assign(c, { status: 'healthy', synced: 'just now', progress: 0, beats: ((c.beats || '').slice(-23) + 'o') });
    save();
    if (onPage('connectors') || onPage('freshness') || onPage('overview')) refresh();
    updateBadges();
    toast(wasIndexing ? `${c.name} is ready. ${fmt(total)} documents indexed.${wasEmpty ? ' Your team can start asking.' : ''}` : `${c.name} is back. ${total} changed documents caught up.`);
  }, 140);
}

A.srcPick = el => { if (tmp.type !== el.dataset.t) Object.assign(tmp, { type: el.dataset.t, connected: false, files: [], spaces: null }); refresh(); };
A.stepNext = () => { tmp.step = Math.min(3, tmp.step + 1); refresh(); };
A.stepBack = () => { tmp.step = Math.max(0, tmp.step - 1); refresh(); };
A.spaceToggle = el => {
  const all = D.sourceTypes[tmp.type], cur = new Set(tmp.spaces ?? all), s = el.dataset.s;
  cur.has(s) ? cur.delete(s) : cur.add(s);
  tmp.spaces = all.filter(x => cur.has(x));
  refresh();
};
A.srcFreq = el => { slideSeg(el); tmp.freq = el.dataset.v; };
async function connectSource(el) { await busy(el, 1300); tmp.connected = true; refresh(); toast(`Connected to ${tmp.type}`); }
A.srcConnect = el => connectSource(el);
A.pickFiles = () => $('#fileIn')?.click();
A.sampleFiles = () => { tmp.files.push(...D.sampleFiles); refresh(); };
A.fillSource = async () => {
  const taken = S.connectors.map(c => c.name);
  Object.assign(tmp, { type: Object.keys(D.sourceTypes).find(t => !taken.includes(t) && t !== 'Upload files') || 'Upload files', connected: false, files: [], spaces: null, step: 0 });
  refresh();
  await sleep(350);
  tmp.step = 1; refresh();
  await sleep(250);
  if (tmp.type === 'Upload files') A.sampleFiles();
  else { const b = $('[data-act=srcConnect]'); if (b) await connectSource(b); }
  await sleep(450);
  tmp.step = 2; refresh();
  await sleep(500);
  tmp.step = 3; refresh();
};
A.addSource = async el => {
  const up = tmp.type === 'Upload files';
  await busy(el, 900);
  const picked = up ? 0 : (tmp.spaces ?? D.sourceTypes[tmp.type]).length;
  const c = { id: 'c' + Date.now(), name: up ? 'Uploaded files' : tmp.type, src: tmp.type, docs: 0, total: up ? tmp.files.length : picked * 68,
    status: 'indexing', synced: 'just now', freq: tmp.freq, progress: 0, beats: '' };
  S.connectors.push(c);
  save();
  tmp = {};
  go('#/admin/connectors');
  toast(`Indexing ${c.name}. You can leave this page.`);
  tickConn(c);
};

A.pickGroup = el => { tmp.group = el.dataset.g; refresh(); };
A.resync = async el => { await busy(el, 1200); tmp.synced = true; $('#peopleSync').textContent = 'Synced just now'; toast('Groups re-synced. No changes since last time.'); };

const declined = t => { const c = D.confidence, per = 5; let s = 0; c.forEach((v, i) => { s += v * Math.max(0, Math.min(1, (t - i * per) / per)); }); return Math.round(s / sum(c) * 100); };
const dirty = () => tmp.md && JSON.stringify(tmp.md) !== JSON.stringify(S.model);
const markDirty = () => { const b = $('#modelSave'); if (b) b.disabled = !dirty(); };
A.mode = el => { tmp.md.mode = el.dataset.m; refresh(); };
A.pickModel = el => { tmp.md[el.dataset.k] = el.dataset.v; refresh(); };
I.mField = el => { tmp.md[el.dataset.k] = el.value; markDirty(); };
I.thresh = el => {
  const t = Math.max(10, Math.min(95, +el.value)), dec = declined(t);
  tmp.md.threshold = t;
  const line = $('#tline');
  line.style.left = t + '%';
  line.dataset.l = `${t}% sure`;
  $$('.hbars i').forEach((b, i) => b.classList.toggle('off', (i + 0.5) * 5 < t));
  $('#ansPct').textContent = (100 - dec) + '%';
  $('#decPct').textContent = dec + '%';
  $('#decN').textContent = Math.round(sum(D.confidence) * dec / 100);
  markDirty();
};
A.fillEndpoint = async () => { await typeInto($('#mEndpoint'), 'https://llm.acme.internal/v1'); await typeInto($('#mKey'), 'sk-acme-7f3a91c2e4b8'); };
A.testConn = async el => {
  await busy(el, 1100);
  const m = tmp.md, bad = m.mode === 'hosted' && !m.endpoint;
  $('#connPill').innerHTML = bad ? '<span class="badge bad"><span class="dot"></span>Unreachable</span>' : '<span class="badge ok"><span class="dot"></span>Reachable</span>';
  $('#connIco').className = 'sev ' + (bad ? 'bad' : 'ok');
  $('#connIco').innerHTML = ic(bad ? 'alert' : 'check');
  $('#connTxt').textContent = bad ? 'Add an endpoint URL first' : `Checked just now, ${Math.round(rand(240, 420))}ms`;
};
A.modelSave = async el => {
  const m = tmp.md;
  if (m.mode === 'hosted' && (!m.endpoint || !m.key)) return toast('Add the endpoint URL and API key first.', null, 'info');
  if (m.search !== S.model.search && !await confirmBox({ title: 'Switch search model?', body: `All 1,284 documents will be re-read with <b>${esc(m.search)}</b>. It takes about 40 minutes, and Sambad keeps answering from the current index until it finishes.`, ok: 'Save and re-index' })) return;
  await busy(el, 900);
  S.model = clone(m);
  save();
  refresh();
  toast('Model settings saved');
};

/* ════════════════ DEMO PANEL ════════════════ */
const FLAGS = [['serviceDown', 'Answering service is down'], ['emptyWorkspace', 'Workspace has no documents'], ['slow', 'Slow network']];
function paintDemo() {
  $('#demo').innerHTML = `<div class="demo" data-menu><h6>Demo controls</h6><p class="small muted" style="margin:0 0 8px">Force states you can't reach by clicking around.</p>
    ${FLAGS.map(([k, l]) => `<div class="row"><span>${l}</span><button class="switch ${S.flags[k] ? 'on' : ''}" data-act="demoFlag" data-k="${k}" aria-label="${l}"></button></div>`).join('')}
    <div class="sep" style="margin:10px 0"></div><div class="label">Sign in as</div>
    <div class="row" style="padding-top:0"><button class="btn sm" data-act="demoUser" data-u="priya">Priya, employee</button><button class="btn sm" data-act="demoUser" data-u="suman">Suman, admin</button></div>
    <div class="label" style="margin-top:10px">Jump to</div>
    <div class="autos"><button class="auto" data-act="demoJump" data-to="#/signup">Sign up</button><button class="auto" data-act="demoJump" data-to="#/verify">Code</button>
      <button class="auto" data-act="demoJump" data-to="#/forgot">Forgot</button><button class="auto" data-act="demoJump" data-to="#/invite">Invite</button></div>
    <div class="sep" style="margin:12px 0 10px"></div><button class="btn sm danger" data-act="demoReset">Reset demo</button></div>`;
}
A.demo = () => { if ($('#demo').innerHTML) $('#demo').innerHTML = ''; else paintDemo(); };
A.demoFlag = el => {
  const k = el.dataset.k;
  S.flags[k] = !S.flags[k];
  save();
  paintDemo();
  if (k === 'emptyWorkspace' && S.session) render();
  toast(`${FLAGS.find(f => f[0] === k)[1]}: ${S.flags[k] ? 'on' : 'off'}`);
};
A.demoUser = el => { $('#demo').innerHTML = ''; signIn(D.users[el.dataset.u]); };
A.demoJump = el => {
  $('#demo').innerHTML = '';
  S.session = null;
  if (el.dataset.to === '#/verify') S.pending = { flow: 'signup', email: 'maya@northwind.io', name: 'Maya Lin', company: 'Northwind', password: 'Northwind-2026' };
  save();
  go(el.dataset.to);
};
A.demoReset = async () => {
  if (!await confirmBox({ title: 'Reset the demo?', body: 'Clears every question, setting and account you created and signs you out.', ok: 'Reset', danger: true })) return;
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
  location.hash = '';
  location.reload();
};

/* ── boot ─────────────────────────────────────── */
S.connectors.forEach(c => { if (c.status === 'indexing' || c.status === 'syncing') tickConn(c); });
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (location.hash.startsWith('#/admin') && ctx.page?.mount) ctx.page.mount(true); }, 200); });
window.addEventListener('hashchange', render);
render();
})();
