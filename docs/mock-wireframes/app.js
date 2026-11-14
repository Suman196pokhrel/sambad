/*
 * Sambad clickable mock: all behaviour.
 * A small hash router renders three surfaces from window.DATA: the sign-in
 * flows, the employee "ask" app and the admin console. Answers, syncs and
 * saves are faked with timers so the mock feels like the real product with
 * no backend. State lives in localStorage so a refresh keeps you signed in;
 * the Demo button (bottom right) forces edge states and resets everything.
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
const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const shortName = n => { const [f, l] = n.split(' '); return l ? `${f} ${l[0]}.` : f; };
const first = n => n.split(' ')[0];
const val = (f, n) => (f.elements.namedItem(n)?.value || '').trim();
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const P = {
  plus: 'M12 5v14M5 12h14', up: 'M12 19V5M5 12l7-7 7 7', menu: 'M4 7h16M4 12h16M4 17h16', x: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM20 20l-4-4', copy: 'M9 9h10v10H9zM5 15V5h10', check: 'M5 12l5 5L20 7',
  chev: 'M6 9l6 6 6-6', ext: 'M14 5h5v5M19 5l-8 8M18 14v5H5V6h5', out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', back: 'M19 12H5M11 6l-6 6 6 6',
  key: 'M10.5 12.5L20 3M16 7l3 3M8 12a3 3 0 1 0 0 6a3 3 0 1 0 0-6z', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', chat: 'M5 5h14v10H9l-4 4z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7', stop: 'M8 8h8v8H8z', upload: 'M12 16V4M6 10l6-6 6 6M5 20h14',
};
const ic = n => `<svg class="svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const MARK = `<svg class="mark" viewBox="0 0 240 260" aria-hidden="true"><polygon points="82,115 10,150 55,205" fill="#12564A"/><polygon points="158,115 230,150 185,205" fill="#12564A"/><polygon points="120,25 158,115 120,230 82,115" fill="#12564A"/><polygon points="120,25 128,45 112,45" fill="#12181A"/><polygon points="120,68 132,80 120,92 108,80" fill="#12181A"/></svg>`;
const SPARK = ic('spark');

/* ── state ────────────────────────────────────── */
const KEY = 'sambad-mock-v1';
const fresh = () => ({
  session: null, accounts: {}, passwords: {}, pending: null, prefill: '', workspace: D.workspace, range: '7d',
  threads: D.history.map(h => ({ id: h.id, title: h.title, group: h.group,
    turns: [{ id: h.id + 'a', q: D.scenarios.find(s => s.id === h.sid).q, sid: h.sid, status: 'done' }] })),
  flags: { serviceDown: false, emptyWorkspace: false, slow: false },
  connectors: clone(D.connectors), gaps: clone(D.gaps), run: clone(D.run), model: clone(D.model), reviewed: {},
});
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { S = fresh(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode: state lives for this tab only */ } };

/* ── feedback widgets ─────────────────────────── */
function toast(msg, undo) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button>Undo</button>' : ''}`;
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
async function busy(btn, ms) {
  btn?.classList.add('loading');
  await sleep(ms);
  btn?.classList.remove('loading');
}
// Types text into a field one character at a time, so autofill looks like a person typing.
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

/* ── router ───────────────────────────────────── */
const go = p => { location.hash = p; };
const home = () => S.session?.role === 'admin' ? '#/admin' : '#/ask';
function parse() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
}
function render() {
  $$('.menu').forEach(m => m.remove());
  const { parts: [a, b, c], q } = parse();
  const auth = { login: pLogin, sso: pSSO, signup: pSignup, forgot: pForgot, verify: pVerify, reset: pReset, invite: pInvite };
  if (!a) return go(S.session ? home() : '#/login');
  if (auth[a]) return S.session ? go(home()) : auth[a](q);
  if (!S.session) return go('#/login');
  if (a === 'ask') return pAsk(b);
  if (a === 'admin') {
    if (S.session.role !== 'admin') { toast('The admin console is for workspace admins.'); return go('#/ask'); }
    return pAdmin(b, c, q);
  }
  go(home());
}

/* ── event wiring (one delegated listener per event type) ── */
const A = {}, F = {}, I = {};
document.addEventListener('click', e => {
  if (!e.target.closest('.menu,[data-menu]')) $$('.menu').forEach(m => m.remove());
  const el = e.target.closest('[data-act]');
  if (el && A[el.dataset.act]) { e.preventDefault(); A[el.dataset.act](el, e); }
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  F[f.dataset.form]?.(f, e.submitter || f.querySelector('[type=submit]'));
});
document.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el) I[el.dataset.in]?.(el, e); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  $$('.menu').forEach(m => m.remove());
  A.pclose(); $('#shell')?.classList.remove('navopen'); $('#demo').innerHTML = '';
});
A.goto = el => go(el.dataset.to);
A.nav = () => $('#shell')?.classList.toggle('navopen');
A.eye = el => { const i = el.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; el.textContent = i.type === 'password' ? 'Show' : 'Hide'; };
A.openSrc = el => toast(`This would open the original page in ${el.dataset.src}.`);

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
  <div class="small muted" id="meterTxt" style="margin:6px 0 14px">Use 8 or more characters with a number.</div>`;
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

/* sign in */
function pLogin() {
  authWrap('Sign in to Sambad', "Answers from your company's documents.", `
    <button class="btn pri lg" data-act="sso">${ic('key')} Continue with your work account</button>
    <p class="promise">You'll only ever see documents you already have access to.</p>
    <div class="or">or use email</div>
    <form data-form="login" novalidate><div id="err"></div>
      ${fld('Work email', 'email', { type: 'email', ph: 'you@company.com', value: S.prefill, ac: 'username' })}
      ${fld('Password', 'password', { type: 'password', ph: 'Your password', ac: 'current-password', right: '<a href="#/forgot">Forgot password?</a>' })}
      <button class="btn lg" type="submit">Sign in</button>
    </form>
    ${autos(`<button class="auto" data-act="fillLogin" data-u="priya">${SPARK} Priya · employee</button>
      <button class="auto" data-act="fillLogin" data-u="suman">${SPARK} Suman · admin</button>`)}`,
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

/* single sign-on: a stand-in for the company identity provider */
A.sso = () => go('#/sso');
const idpWait = msg => `<div class="center" style="padding:28px 0"><div class="spin" style="margin:0 auto 12px;width:22px;height:22px"></div><div class="muted small">${msg}</div></div>`;
function pSSO() {
  app.innerHTML = `<div class="auth"><div class="auth-box"><div class="idp"><div class="idp-top">${ic('key')} ${esc(S.workspace)} single sign-on</div>
    <div class="idp-body" id="idp">${idpWait('Redirecting to your identity provider…')}</div></div>
    <p class="promise">This screen stands in for your company's own login page (Okta, Entra ID, Google Workspace).</p></div></div>`;
  sleep(900).then(() => {
    const b = $('#idp');
    if (!b) return;
    b.innerHTML = `<div style="font-weight:600">Choose an account</div><div class="muted small" style="margin-bottom:14px">to continue to Sambad</div>
      ${['priya', 'suman'].map(k => { const u = D.users[k]; return `<button class="acct" data-act="ssoPick" data-u="${k}"><span class="av">${initials(u.name)}</span>
        <span class="grow"><b>${u.name}</b><small>${u.email} · ${u.role}</small></span>${ic('right')}</button>`; }).join('')}
      <a class="link small" href="#/login">Cancel</a>`;
  });
}
A.ssoPick = async el => { $('#idp').innerHTML = idpWait('Signing you in…'); await sleep(700); signIn(D.users[el.dataset.u]); };

/* sign up: the first admin creates the workspace */
function pSignup() {
  authWrap('Create your workspace', 'For the person setting Sambad up. Everyone else joins by invite or with their work account.', `
    <form data-form="signup" novalidate><div id="err"></div>
      ${fld('Your name', 'name', { ph: 'Full name', ac: 'name' })}
      ${fld('Work email', 'email', { type: 'email', ph: 'you@company.com', ac: 'email' })}
      ${fld('Company', 'company', { ph: 'Company name', ac: 'organization' })}
      ${fld('Password', 'password', { type: 'password', ph: 'At least 8 characters', ac: 'new-password', attrs: 'data-in="strength"' })}
      ${meter()}
      <label class="check" style="margin-bottom:16px"><input type="checkbox" name="terms"> I agree to the terms and privacy notice</label>
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

/* one-time code */
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
    <div class="row" style="justify-content:space-between;margin-top:14px;font-size:12.5px">
      <span class="muted" id="resend"></span><span class="muted">Demo code <b style="font-family:var(--mono);color:var(--ink)">${D.otp}</b></span></div>
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
  // A brand new workspace: no sources yet, so the admin lands on "add a source".
  const u = { name: p.name, email: p.email, role: 'admin' };
  S.accounts[p.email] = u;
  S.passwords[p.email] = p.password;
  S.workspace = p.company;
  S.connectors = [];
  S.flags.emptyWorkspace = true;
  signIn(u, `Welcome to Sambad, ${first(p.name)}`, '#/admin/connectors/new?welcome=1');
};

/* forgot password */
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

/* set a new password */
function pReset() {
  const p = S.pending;
  if (!p || p.flow !== 'newpw') return go('#/forgot');
  authWrap('Set a new password', `For <b>${esc(p.email)}</b>`, `
    <form data-form="reset" novalidate><div id="err"></div>
      ${fld('New password', 'password', { type: 'password', ph: 'At least 8 characters', ac: 'new-password', attrs: 'data-in="pwrules"' })}
      <div class="meter" id="meter" style="margin:-6px 0 14px"><i></i><i></i><i></i><i></i></div>
      ${fld('Confirm password', 'confirm', { type: 'password', ph: 'Type it again', ac: 'new-password', attrs: 'data-in="pwrules"' })}
      <ul class="rules" id="rules">
        <li data-r="len">${ic('check')} At least 8 characters</li><li data-r="num">${ic('check')} Contains a number</li>
        <li data-r="case">${ic('check')} Upper and lower case letters</li><li data-r="match">${ic('check')} Both passwords match</li></ul>
      <button class="btn pri lg" type="submit" style="margin-top:16px">Update password</button>
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
  const r = pwRules(f);
  if (!Object.values(r).every(Boolean)) return errMsg('Your new password needs all four ticks.');
  await busy(btn, 900);
  const email = S.pending.email;
  S.passwords[email] = val(f, 'password');
  S.pending = null;
  S.prefill = email;
  save();
  $('.auth-card').innerHTML = `<div class="center"><div class="success-ico">${ic('check')}</div>
    <h3 style="margin:0 0 4px;font-size:17px">Password updated</h3>
    <p class="muted" style="margin:0 0 18px;font-size:13.5px">Sign in with your new password. Taking you there now.</p>
    <a class="btn pri lg" href="#/login">Back to sign in</a></div>`;
  setTimeout(() => location.hash === '#/reset' && go('#/login'), 2600);
};

/* invite */
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

/* shared: the signed-in user button and its menu */
const meHTML = () => `<button class="me" data-act="userMenu" data-menu><span class="av">${initials(S.session.name)}</span>
  <span class="who">${esc(S.session.name)}<small>${esc(S.workspace)} · ${S.session.role}</small></span>${ic('chev')}</button>`;
A.userMenu = el => {
  const open = el.parentElement.querySelector('.menu');
  if (open) return open.remove();
  const inAdmin = location.hash.startsWith('#/admin');
  const sw = S.session.role !== 'admin' ? '' : inAdmin ? `<a href="#/ask">${ic('chat')} Ask Sambad</a>` : `<a href="#/admin">${ic('grid')} Admin console</a>`;
  el.insertAdjacentHTML('afterend', `<div class="menu">${sw}<button data-act="signout">${ic('out')} Sign out</button></div>`);
};
A.signout = () => { S.session = null; save(); go('#/login'); toast('Signed out'); };

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
let running = null;   // the answer currently being generated: { id, stop, snap }
let pnl = null;       // the open source panel: { keys, i }

function pAsk(id) {
  const t = id && S.threads.find(x => x.id === id);
  if (id && !t) return go('#/ask');
  pnl = null;
  app.innerHTML = `<div class="app" id="shell"><div class="scrim-side" data-act="nav"></div>
    <aside class="side"><div class="brand">${MARK} Sambad</div>
      <a class="btn newbtn" href="#/ask">${ic('plus')} New question</a>
      <div class="search">${ic('search')}<input class="in" id="histSearch" placeholder="Search your questions" data-in="histSearch"></div>
      <div class="hist" id="hist">${histHTML(id)}</div>
      <div class="sfoot">${meHTML()}</div></aside>
    <div class="main">
      <div class="topbar"><button class="btn ghost sm" data-act="nav" aria-label="Open menu">${ic('menu')}</button><div class="brand">${MARK} Sambad</div><span class="av">${initials(S.session.name)}</span></div>
      <div class="thread" id="thread"><div class="thread-in" id="threadIn"></div></div>
      <div class="composer"><div class="composer-in">
        <form data-form="ask" class="box ${S.flags.emptyWorkspace ? 'off' : ''}" id="box">
          <textarea id="qbox" rows="1" data-in="qbox" placeholder="${t ? 'Ask a follow-up' : "Ask about anything in your company's documents"}"></textarea>
          <button class="send" id="send" type="submit" aria-label="Send" ${running ? 'disabled' : ''}>${ic('up')}</button></form>
        <div class="hint"><span class="hide-m">Enter to send · Shift + Enter for a new line · Sambad only reads documents you can already open.</span>
          <button class="auto" type="button" data-act="example">${SPARK} Try an example</button></div>
      </div></div>
      <aside class="panel" id="panel" aria-label="Source"></aside>
    </div></div>`;
  S.threads.forEach(x => delete x.isNew);
  t ? renderThread(t) : renderEmpty();
  $('#qbox').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#box').requestSubmit(); } });
  if (innerWidth > 860) $('#qbox').focus();
}
function histHTML(active, filter = '') {
  const f = filter.toLowerCase();
  if (!S.threads.length) return '<div class="small muted" style="padding:6px 9px">Nothing yet</div>';
  const list = S.threads.filter(t => !f || t.title.toLowerCase().includes(f) || t.turns.some(u => u.q.toLowerCase().includes(f)));
  if (!list.length) return `<div class="small muted" style="padding:6px 9px">No questions match "${esc(filter)}"</div>`;
  return ['Today', 'Earlier this week', 'Older'].map(g => {
    const items = list.filter(t => t.group === g);
    return items.length ? `<div class="sgroup">${g}</div>` + items.map(t =>
      `<a class="sitem ${t.id === active ? 'act' : ''} ${t.isNew ? 'new' : ''}" href="#/ask/${t.id}" title="${esc(t.title)}">${esc(t.title)}</a>`).join('') : '';
  }).join('');
}
I.histSearch = el => { $('#hist').innerHTML = histHTML(parse().parts[1], el.value); };
I.qbox = el => {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
  $('#send').classList.toggle('ready', !!el.value.trim());
};

function renderEmpty() {
  const el = $('#threadIn');
  if (S.flags.emptyWorkspace) {
    el.innerHTML = `<div class="empty">${MARK}<h4>No documents connected yet</h4>
      <p>Sambad can't answer anything until someone connects your team's documents. Your workspace admin can do this.</p>
      <button class="btn" data-act="msgAdmin">Message your admin</button></div>`;
    return;
  }
  el.innerHTML = `<div class="empty">${MARK}<h4>Ask your company's documents</h4>
    <p>Sambad reads your team's handbooks, policies and notes, and answers with links back to the original.</p>
    <div class="chips">${D.starters.map((q, i) => `<button class="chip" style="animation-delay:${0.1 + i * 0.05}s" data-act="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
}
A.msgAdmin = async el => { await busy(el, 800); el.innerHTML = `${ic('check')} Sent`; el.classList.add('on'); toast('Sent to Suman P. They will get an email.'); };
A.chip = el => ask(el.dataset.q);
A.example = () => {
  if (S.flags.emptyWorkspace) return toast('Nothing to ask yet. No documents are connected.');
  const asked = new Set(S.threads.flatMap(t => t.turns.map(u => u.q)));
  const pool = D.scenarios.filter(s => !asked.has(s.q) && s.id !== 'reseller');
  const pick = (pool.length ? pool : D.scenarios)[Math.floor(Math.random() * (pool.length || D.scenarios.length))];
  typeInto($('#qbox'), pick.q, 18);
};
F.ask = () => ask($('#qbox').value);

function ask(q) {
  q = q.trim();
  if (!q || S.flags.emptyWorkspace) return;
  if (running) return toast('Sambad is still answering. Stop it or wait a moment.');
  const turn = { id: 'u' + Date.now(), q, sid: matchScenario(q), status: 'pending' };
  const { parts } = parse();
  let t = parts[0] === 'ask' && parts[1] && S.threads.find(x => x.id === parts[1]);
  const box = $('#qbox');
  if (box) { box.value = ''; I.qbox(box); }
  if (t) { t.turns.push(turn); save(); renderThread(t); return; }
  t = { id: 't' + Date.now(), title: q.length > 44 ? q.slice(0, 42) + '…' : q, group: 'Today', turns: [turn], isNew: true };
  S.threads.unshift(t);
  save();
  go('#/ask/' + t.id);
}

function renderThread(t) {
  const el = $('#threadIn');
  if (!el) return;
  const last = t.turns.length - 1;
  el.innerHTML = t.turns.map((u, i) => i < last && u.status === 'done'
    ? `<button class="collapsed" data-act="expand"><span>${esc(u.q)} · answered</span>${ic('chev')}</button><div hidden>${turnHTML(t, u, i)}</div>`
    : turnHTML(t, u, i)).join('');
  const lt = t.turns[last];
  if (lt.status === 'pending' && !running) runTurn(t, lt);
  scrollEnd();
}
const scrollEnd = () => { const th = $('#thread'); if (th) th.scrollTop = th.scrollHeight; };
A.expand = el => {
  const x = el.nextElementSibling;
  x.hidden = !x.hidden;
  el.querySelector('.svg').style.transform = x.hidden ? '' : 'rotate(180deg)';
};
const turnHTML = (t, u, i) => `<div class="turn"><div class="whos">You</div><div class="q">${esc(u.q)}</div></div>
  <div class="turn"><div class="whos">Sambad</div><div id="body-${u.id}">${bodyHTML(t, u, i)}</div></div>`;
// Citation plus any trailing punctuation stay on one line, so a lone "." never wraps.
const answerHTML = (text, uid) => esc(text).replace(/\[(\d)\]([.,;:]?)/g, (_, n, p) => `<span style="white-space:nowrap"><button class="cite" data-act="cite" data-n="${n}" data-turn="${uid}" aria-label="Source ${n}">${n}</button>${p}</span>`);
const checkedLine = (sc, secs) => secs ? `<div class="checked">${ic('check')} Checked ${sc.found} ${sc.found === 1 ? 'document' : 'documents'} in ${secs}s</div>` : '';
function srcRow(k, n, uid) {
  const d = D.docs[k], stale = docStale(d);
  const meta = d.stale && !stale ? 'checked by an admin today' : d.updated;
  return `<button class="src" data-act="${uid ? 'cite' : 'near'}" data-n="${n}" data-turn="${uid || ''}" data-k="${k}" style="animation-delay:${n * 0.07}s">
    <span class="n">${uid ? n : '·'}</span><span class="t"><b>${esc(d.title)}</b><span class="${stale ? 'stale' : ''}">${d.src} · ${esc(meta)}</span></span>${ic('right')}</button>`;
}
function bodyHTML(t, u, i, animate = false) {
  const sc = scen(u.sid);
  if (u.status === 'pending') return running?.id === u.id ? running.snap : '';
  if (u.status === 'failed') return `<div class="callout bad"><b>Sambad can't answer right now.</b>The answering service isn't responding. Your question is saved, so try again in a few minutes.
    <div class="acts"><button class="btn pri sm" data-act="retry" data-turn="${u.id}">${ic('refresh')} Try again</button></div></div>`;
  if (u.status === 'stopped') return `${u.cut ? `<div class="ans">${answerHTML(u.cut, u.id)}…</div>` : ''}
    <div class="callout" style="margin-top:10px"><b>Stopped.</b>Your question is still here if you want Sambad to try again.
    <div class="acts"><button class="btn sm" data-act="retry" data-turn="${u.id}">Ask again</button></div></div>`;
  const flagBtn = u.flagged ? `<button class="btn sm on">${ic('check')} Flagged for your admin</button>`
    : `<button class="btn sm" data-act="flag" data-turn="${u.id}">Flag as missing</button>`;
  let h = checkedLine(sc, u.secs);
  if (sc.kind === 'abstain') {
    h += `<div class="callout"><b>This isn't covered in your documents.</b>${esc(sc.text)}${sc.near ? `<div style="margin-top:12px">${srcRow(sc.near, 1)}</div>` : ''}
      <div class="acts"><button class="btn pri sm" data-act="askPerson" data-p="${sc.person}">Ask ${sc.person}</button>${flagBtn}</div></div>`;
  } else {
    h += `<div class="ans">${answerHTML(sc.answer, u.id)}</div>`;
    if (sc.kind === 'partial') h += `<div class="callout warn" style="margin-top:14px"><b>${esc(sc.missingTitle)}</b>${esc(sc.missing)}
      <div class="acts"><button class="btn sm" data-act="askPerson" data-p="People Ops">Ask People Ops</button>${flagBtn}</div></div>`;
    h += `<div class="sources"><div class="lbl">Where this came from</div>${sc.sources.map((k, j) => srcRow(k, j + 1, u.id)).join('')}</div>`;
    h += `<div class="actbar" style="animation-delay:.25s"><button class="mini" data-act="copy" data-turn="${u.id}">${ic('copy')} Copy</button>
      <button class="mini ${u.fb === 'up' ? 'on' : ''}" data-act="up" data-turn="${u.id}">Helpful</button>
      <button class="mini ${u.fb && u.fb !== 'up' ? 'on' : ''}" data-act="down" data-turn="${u.id}">Not helpful</button></div>`;
    h += fbHTML(u);
    const askedFollow = sc.followUp && t.turns.some(x => x.q === sc.followUp);
    if (sc.followUp && !askedFollow && i === t.turns.length - 1) h += `<div class="followup" style="animation-delay:.35s"><span class="lbl">Ask next</span>
      <button class="chip" data-act="chip" data-q="${esc(sc.followUp)}">${esc(sc.followUp)}</button></div>`;
  }
  return animate ? h : `<div class="still">${h}</div>`;
}
const REASONS = ["It's out of date", "It's not what I asked", "It's just wrong"];
function fbHTML(u) {
  if (u.fb === 'sent') return `<div class="checked" style="margin-top:12px">${ic('check')} Thanks. Your admin will see this as "${esc(u.reason)}".</div>`;
  if (u.fb !== 'open') return '';
  return `<div class="callout fb"><b>What went wrong?</b>
    <div class="acts" style="margin-top:8px">${REASONS.map(r => `<button class="btn sm ${u.reason === r ? 'on' : ''}" data-act="reason" data-r="${esc(r)}" data-turn="${u.id}">${esc(r)}</button>`).join('')}</div>
    <textarea class="in" id="fbnote-${u.id}" placeholder="Anything else? (optional)" rows="2">${esc(u.note || '')}</textarea>
    <div class="acts"><button class="btn pri sm" data-act="sendFb" data-turn="${u.id}" ${u.reason ? '' : 'disabled'}>Send</button>
      <button class="btn ghost sm" data-act="cancelFb" data-turn="${u.id}">Cancel</button>
      <button class="auto" data-act="fillFb" data-turn="${u.id}">${SPARK} Example note</button></div></div>`;
}
function refreshBody(uid) {
  const { t, u, i } = findTurn(uid);
  const b = $('#body-' + uid);
  if (b && u) b.innerHTML = bodyHTML(t, u, i);
}

/* the answer animation: steps, then streamed text, then sources */
async function runTurn(t, u) {
  const r = running = { id: u.id, stop: false, snap: '' };
  const send = $('#send');
  if (send) send.disabled = true;
  const sc = scen(u.sid);
  const paint = html => { r.snap = html; const b = $('#body-' + u.id); if (b) { b.innerHTML = html; scrollEnd(); } };
  const labels = ['Looking through your documents', sc.found ? `Found ${sc.found} possible matches` : 'Nothing close yet, widening the search', 'Checking them against your question'];
  const stopBtn = `<div class="actbar"><button class="mini" data-act="stop">${ic('stop')} Stop</button></div>`;
  const steps = n => `<div class="steps">${labels.map((l, i) => `<div class="step ${i < n ? 'done' : i === n ? 'now' : ''}"><span class="tick">${i < n ? ic('check') : ''}</span>${l}</div>`).join('')}</div>${n < 3 ? stopBtn : ''}`;
  const finish = status => {
    u.status = status;
    running = null;
    save();
    const s = $('#send');
    if (s) s.disabled = false;
    const b = $('#body-' + u.id);
    if (b) { b.innerHTML = bodyHTML(t, u, t.turns.indexOf(u), true); scrollEnd(); }
  };
  const t0 = performance.now();
  for (let i = 0; i < 3; i++) {
    paint(steps(i));
    await sleep(rand(650, 1050));
    if (r.stop) return finish('stopped');
    if (i === 0 && S.flags.serviceDown) return finish('failed');
  }
  paint(steps(3));
  await sleep(260);
  u.secs = ((performance.now() - t0) / 1000).toFixed(1);
  if (sc.kind === 'abstain') return finish('done');
  const words = sc.answer.split(' ');
  for (let n = 1; n <= words.length; n++) {
    if (r.stop) { u.cut = words.slice(0, n - 1).join(' '); return finish('stopped'); }
    paint(`${checkedLine(sc, u.secs)}<div class="ans streaming">${answerHTML(words.slice(0, n).join(' '), u.id)}<span class="caret"></span></div>${stopBtn}`);
    await sleep(rand(18, 48));
  }
  finish('done');
}
A.stop = () => { if (running) running.stop = true; };
A.retry = el => {
  const { t, u, i } = findTurn(el.dataset.turn);
  if (!u) return;
  if (running) return toast('Sambad is still answering. Stop it or wait a moment.');
  if (i !== t.turns.length - 1) return ask(u.q);
  u.status = 'pending';
  delete u.cut;
  save();
  renderThread(t);
};

/* answer actions */
A.copy = async el => {
  const { u } = findTurn(el.dataset.turn);
  try { await navigator.clipboard.writeText(scen(u.sid).answer.replace(/\s?\[\d\]/g, '')); } catch { /* clipboard blocked on file://, still confirm */ }
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
  toast('Thanks. Your admin will see this.');
};
A.askPerson = async el => {
  await busy(el, 800);
  el.innerHTML = `${ic('check')} Sent to ${el.dataset.p}`;
  el.classList.remove('pri');
  el.classList.add('on');
  el.removeAttribute('data-act');
  toast(`Sent your question to ${el.dataset.p}. They'll reply by email.`);
};
const GAP_FOR = { sick: 'g1', vendor: 'g2', notice: 'g3' };
A.flag = el => {
  const { u } = findTurn(el.dataset.turn);
  u.flagged = true;
  const g = S.gaps.find(x => x.id === GAP_FOR[u.sid]);
  if (g) { g.asks++; g.status = 'open'; }
  else S.gaps.unshift({ id: 'g' + Date.now(), title: u.q, people: 1, asks: 1, status: 'open', ex: [u.q], fresh: true });
  save();
  refreshBody(u.id);
  toast("Flagged. It now shows up in your admin's knowledge gaps.");
};

/* source panel */
A.cite = el => {
  const { u } = findTurn(el.dataset.turn);
  if (!u) return;
  pnl = { keys: scen(u.sid).sources, i: +el.dataset.n - 1 };
  paintPanel();
};
A.near = el => { pnl = { keys: [el.dataset.k], i: 0 }; paintPanel(); };
A.pnav = el => { pnl.i = (pnl.i + +el.dataset.d + pnl.keys.length) % pnl.keys.length; paintPanel(); };
A.pclose = () => { $('#panel')?.classList.remove('open'); pnl = null; };
function paintPanel() {
  const p = $('#panel');
  if (!p || !pnl) return;
  const d = D.docs[pnl.keys[pnl.i]], n = pnl.keys.length, stale = docStale(d);
  p.innerHTML = `<div class="ph"><span class="lbl">Source ${pnl.i + 1} of ${n}</span><div class="row" style="gap:2px">
      ${n > 1 ? `<button class="btn ghost sm" data-act="pnav" data-d="-1" aria-label="Previous source">${ic('left')}</button><button class="btn ghost sm" data-act="pnav" data-d="1" aria-label="Next source">${ic('right')}</button>` : ''}
      <button class="btn ghost sm" data-act="pclose" aria-label="Close">${ic('x')}</button></div></div>
    <div class="pbody"><div class="doc"><div class="dt">${esc(d.title)}</div>
      <div class="dm ${stale ? 'stale' : ''}">${d.src} · ${esc(d.space)} · ${esc(stale || !d.stale ? d.updated : 'checked by an admin today')}</div>
      <p>${esc(d.before)}</p><p class="hl">${esc(d.passage)}</p><p>${esc(d.after)}</p></div>
      ${stale ? '<div class="callout warn small" style="margin:6px 0 14px"><b>Nobody has updated this page in a while.</b>It may still be right, it just hasn\'t been checked recently.</div>' : ''}
      <button class="btn" style="width:100%" data-act="openSrc" data-src="${d.src}">Open in ${d.src} ${ic('ext')}</button></div>`;
  p.classList.add('open');
}

/* ════════════════ ADMIN ════════════════ */
const STALE_TOTAL = 18;
const staleCount = () => STALE_TOTAL - Object.keys(S.reviewed).length;
const openGaps = () => S.gaps.filter(g => g.status === 'open');
const NAV = [
  ['Monitor', [['', 'Overview'], ['freshness', 'Sync & freshness', staleCount], ['gaps', 'Knowledge gaps', () => openGaps().length]]],
  ['Security', [['audit', 'Access audit'], ['inspector', 'Access inspector'], ['people', 'People & groups']]],
  ['Setup', [['connectors', 'Connectors'], ['model', 'Model']]],
];
let ctx = {}, navTok = 0;
let tmp = {};   // per-page scratch state that should not survive a reload

function pAdmin(b = '', c, q) {
  const key = b === 'connectors' && c === 'new' ? 'newsource' : b === 'documents' ? 'doc' : b === 'runs' ? 'run' : (b || 'overview');
  const page = ADMIN[key];
  if (!page) return go('#/admin');
  const navKey = { doc: 'freshness', run: 'connectors', newsource: 'connectors', overview: '' }[key] ?? key;
  app.innerHTML = `<div class="app" id="shell"><div class="scrim-side" data-act="nav"></div>
    <aside class="aside"><div class="brand">${MARK} Sambad <small>admin</small></div>
      ${NAV.map(([g, items]) => `<div class="navgrp">${g}</div>` + items.map(([k, l, badge]) =>
        `<a class="nitem ${k === navKey ? 'act' : ''}" href="#/admin${k ? '/' + k : ''}">${l}${badge ? `<span class="badge" data-badge="${k}">${S.flags.emptyWorkspace ? 0 : badge()}</span>` : ''}</a>`).join('')).join('')}
      <div style="flex:1"></div>
      <a class="nitem" href="#/ask">${'Ask Sambad'} ${ic('chat')}</a>
      <div class="sfoot">${meHTML()}</div></aside>
    <div class="acontent">
      <div class="topbar"><button class="btn ghost sm" data-act="nav" aria-label="Open menu">${ic('menu')}</button><div class="brand">${MARK} Sambad <small>admin</small></div><span class="av">${initials(S.session.name)}</span></div>
      <div class="abar" id="abar"></div><div class="abody" id="abody"></div></div></div>`;
  if (ctx.key !== key || ctx.c !== c) tmp = {};
  ctx = { key, page, c, q };
  page.init?.();
  paintAdmin(true);
}
function paintAdmin(skel) {
  const { page } = ctx, tok = ++navTok, body = $('#abody');
  if (!body) return;
  $('#abar').innerHTML = page.bar();
  body.classList.toggle('still', !skel);
  if (S.flags.emptyWorkspace && page.needsData) {
    body.innerHTML = `<div class="card center empty-admin" style="padding:48px 20px">${MARK}<h5 style="font-size:16px">Nothing indexed yet</h5>
      <p class="sub" style="max-width:42ch;margin:6px auto 18px">This page fills in once Sambad has read your first source. Connecting one takes about a minute.</p>
      <a class="btn pri" href="#/admin/connectors/new">${ic('plus')} Connect a source</a></div>`;
    return;
  }
  const fill = () => { body.innerHTML = page.body(); page.mount?.(); };
  if (!skel) return fill();
  body.innerHTML = `<div class="kpis">${'<div class="sk" style="height:86px"></div>'.repeat(4)}</div>
    <div class="sk" style="height:150px;margin-bottom:14px"></div><div class="sk" style="height:230px"></div>`;
  sleep(rand(260, 480)).then(() => tok === navTok && body.isConnected && fill());
}
const refresh = () => paintAdmin(false);
const onPage = k => ctx.key === k && location.hash.startsWith('#/admin') && $('#abody');
function updateBadges() {
  NAV.flatMap(([, items]) => items).filter(x => x[2]).forEach(([k, , fn]) => {
    const b = $(`[data-badge="${k}"]`);
    if (!b) return;
    const v = String(S.flags.emptyWorkspace ? 0 : fn());
    if (b.textContent !== v) { b.textContent = v; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  });
}
const kpi = (k, v, d, cls = '', suf = '') => `<div class="kpi"><div class="k">${k}</div><div class="v" data-count="${v}" data-suf="${suf}">0${suf}</div><div class="d ${cls}">${d}</div></div>`;
function countUp() {
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count, suf = el.dataset.suf, t0 = performance.now();
    const f = now => {
      const p = Math.max(0, Math.min(1, (now - t0) / 650));   // frame timestamps can predate t0
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString() + suf;
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
const growBars = () => setTimeout(() => $$('.histo i').forEach(i => { i.style.height = i.dataset.h + '%'; }), 30);
const histo = (bars, l, r) => { const max = Math.max(...bars); return `<div class="histo">${bars.map(h => `<i data-h="${h}" class="${h === max ? 'hot' : ''}" title="${h * 3} documents"></i>`).join('')}</div><div class="axis"><span>${l}</span><span>${r}</span></div>`; };
const statusPill = s => ({ healthy: '<span class="pill ok"><span class="dot"></span>healthy</span>', failing: '<span class="pill bad"><span class="dot"></span>failing</span>',
  indexing: '<span class="pill live"><span class="dot"></span>indexing</span>', syncing: '<span class="pill live"><span class="dot"></span>catching up</span>' }[s]);
const connSub = c => c.status === 'failing' ? `${c.docs.toLocaleString()} documents · last success ${c.synced}`
  : c.status === 'indexing' ? `Reading documents for the first time` : `${c.docs.toLocaleString()} documents · synced ${c.synced}${c.paused ? ' · paused' : ''}`;
const sel = (name, opts, cur, attrs = '') => `<select class="in" name="${name}" ${attrs}>${opts.map(o => { const [v, l, dis] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === cur ? 'selected' : ''} ${dis ? 'disabled' : ''}>${esc(l)}</option>`; }).join('')}</select>`;

// Progress animations for connectors survive re-renders because they read state, not DOM.
function tickConn(c) {
  if (c._t) return;
  const total = c.total, ms = c.status === 'indexing' ? 6000 : 3200;
  const stepN = Math.max(1, Math.ceil(total / (ms / 140)));
  c._t = setInterval(() => {
    c.progress = Math.min(total, (c.progress || 0) + Math.ceil(stepN * rand(0.6, 1.4)));
    const bar = $('#prog-' + c.id), txt = $('#ptxt-' + c.id);
    if (bar) bar.style.width = (c.progress / total * 100) + '%';
    if (txt) txt.textContent = `${c.progress.toLocaleString()} of ${total.toLocaleString()} ${c.status === 'indexing' ? 'documents read' : 'changed documents caught up'}`;
    if (c.progress < total) return;
    clearInterval(c._t);
    delete c._t;
    const wasIndexing = c.status === 'indexing';
    if (wasIndexing) c.docs = total;
    c.status = 'healthy';
    c.synced = 'just now';
    c.progress = 0;
    const wasEmpty = S.flags.emptyWorkspace;
    if (wasIndexing) S.flags.emptyWorkspace = false;
    save();
    if (onPage('connectors') || onPage('freshness')) refresh();
    updateBadges();
    toast(wasIndexing ? `${c.name} is ready. ${total.toLocaleString()} documents indexed.${wasEmpty ? ' Your team can start asking.' : ''}` : `${c.name} is back. ${total} changed documents caught up.`);
  }, 140);
}

const ADMIN = {
  /* ── overview ── */
  overview: {
    needsData: true,
    bar: () => `<div class="atitle">Overview</div>${sel('range', [['24h', 'Last 24 hours'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']], S.range, 'data-in="range" style="width:auto"')}`,
    body: () => {
      const k = D.kpis[S.range], failing = S.connectors.filter(c => c.status === 'failing');
      return `<div class="kpis">${kpi('Documents indexed', k.docs, `across ${S.connectors.length} sources`)}${kpi('Questions asked', k.asked, k.delta, 'up')}
          ${kpi('Answered', k.answered, `${100 - k.answered}% said "not covered"`, '', '%')}${kpi('Needs attention', staleCount(), 'stale documents', 'down')}</div>
        <div class="two"><div class="card"><h5>Sync activity</h5><p class="sub">Documents changed and re-indexed per day</p>${histo(k.bars, 'Mon', 'Sun')}</div>
          <div class="card"><h5>Most asked, least answered</h5><p class="sub">Where your documentation is thinnest</p>
            <table>${openGaps().slice(0, 3).map(g => `<tr class="click" data-act="goto" data-to="#/admin/gaps"><td><b>${esc(g.title)}</b></td><td class="tright">${g.asks} asks</td></tr>`).join('') || '<tr><td class="muted">No open gaps right now.</td></tr>'}</table></div></div>
        <div class="card"><h5>Attention</h5><table>
          ${staleCount() ? `<tr><td style="width:80px"><span class="pill warn">stale</span></td><td><b>${staleCount()} documents</b> haven't changed in over a year but were cited 43 times this week</td><td class="tright"><a class="btn sm" href="#/admin/freshness">Review</a></td></tr>` : ''}
          ${failing.map(c => `<tr><td><span class="pill bad">failing</span></td><td><b>${c.name}</b> sync failed 3 times. The sign-in may have expired.</td><td class="tright"><a class="btn sm" href="#/admin/connectors">Fix</a></td></tr>`).join('')}
          ${!staleCount() && !failing.length ? '<tr><td class="muted">All clear. Nothing needs you right now.</td></tr>' : ''}</table></div>`;
    },
    mount: () => { countUp(); growBars(); },
  },

  /* ── freshness ── */
  freshness: {
    needsData: true,
    bar: () => `<div class="atitle">Sync &amp; freshness</div><button class="btn pri" data-act="reindexAll" ${tmp.reidx ? 'disabled' : ''}>${ic('refresh')} Re-index everything</button>`,
    body: () => `${tmp.reidx ? `<div class="card"><div class="row"><div class="grow"><h5>Re-indexing everything</h5><p class="sub" style="margin:0" id="reidxTxt">Starting…</p></div><span class="pill live"><span class="dot"></span>running</span></div><div class="progress"><i id="reidxBar"></i></div></div>` : ''}
      <div class="two" style="margin-bottom:14px">${S.connectors.map(c => `<div class="card" style="margin:0"><div class="row"><div class="grow"><h5>${c.name}</h5><p class="sub" style="margin:0">${connSub(c)}</p></div>${statusPill(c.status)}</div></div>`).join('')}</div>
      <div class="card"><h5>How old is what people are reading?</h5><p class="sub">Documents by age, weighted by how often they're cited</p>${histo(D.ageBars, 'under 1 week', 'over 1 year')}</div>
      <div class="card"><h5>Stale and still in use</h5><p class="sub">Old documents that answered questions this week. Fix these first.</p><div class="tscroll"><table>
        <thead><tr><th>Document</th><th class="hide-m">Source</th><th>Last changed</th><th>Cited</th><th></th></tr></thead>
        ${D.staleDocs.map(d => `<tr class="click" data-act="goto" data-to="#/admin/documents/${d.id}"><td><b>${d.title}</b></td><td class="hide-m">${d.src}</td>
          <td>${S.reviewed[d.id] ? '<span class="pill ok">checked today</span>' : `<span class="stale">${d.age}</span>`}</td><td>${d.cited}×</td><td class="tright"><span class="btn sm">Open</span></td></tr>`).join('')}
        <tr><td colspan="5" class="small muted">15 more stale documents are cited less often.</td></tr></table></div></div>`,
    mount: () => growBars(),
  },

  /* ── document detail ── */
  doc: {
    needsData: true,
    bar: () => { const d = D.documents[ctx.c]; return d ? `<div><a class="back" href="#/admin/freshness">${ic('back')} Sync &amp; freshness</a><div class="atitle">${d.title}</div><div class="asub">${d.src} · ${d.space}</div></div>
      <div class="row"><button class="btn" data-act="openSrc" data-src="${d.src}">Open in ${d.src} ${ic('ext')}</button><button class="btn pri" data-act="reindexDoc">Re-index</button></div>` : '<div class="atitle">Document not found</div>'; },
    body: () => {
      const d = D.documents[ctx.c];
      if (!d) return '<div class="card">That document is not in the index any more. <a class="link" href="#/admin/freshness">Back to freshness</a></div>';
      const ok = S.reviewed[ctx.c];
      return `<div class="three" style="margin-bottom:14px">
          <div class="kpi"><div class="k">Last changed</div><div class="v" style="font-size:19px">${d.changed}</div><div class="d ${ok ? '' : 'stale'}">${ok ? 'checked by you today' : 'flagged stale'}</div></div>
          <div class="kpi"><div class="k">Cited</div><div class="v" style="font-size:19px">${d.cited}×</div><div class="d">this week</div></div>
          <div class="kpi"><div class="k">Chunks</div><div class="v" style="font-size:19px">${d.chunks}</div><div class="d">${d.restricted ? d.restricted + ' restricted' : 'none restricted'}</div></div></div>
        ${ok ? '' : `<div class="callout warn" style="margin-bottom:14px"><b>Nobody has changed this in ${d.changed.replace(' mo', ' months')}.</b>It was cited ${d.cited} times this week. If it's still right, mark it checked and Sambad stops warning people about it for 6 months.
          <div class="acts"><button class="btn pri sm" data-act="markReviewed">Mark as still accurate</button><button class="btn sm" data-act="nudgeOwner">Ask the owner to update it</button></div></div>`}
        <div class="card"><h5>Who can see this</h5><p class="sub">Mirrored from ${d.src} at last sync · 4 minutes ago</p><div class="tscroll"><table><thead><tr><th>Rule</th><th>Applies to</th><th>Scope</th></tr></thead>
          ${d.rules.map(([r, g, n, s]) => `<tr><td><span class="pill ${r === 'allow' ? 'ok' : 'bad'}">${r}</span></td><td><b>${g}</b> (${n})</td><td>${s}</td></tr>`).join('')}</table></div></div>
        <div class="card"><h5>Chunks</h5><p class="sub">The pieces Sambad actually searches</p><div class="tscroll"><table><thead><tr><th>#</th><th>Preview</th><th>Access</th><th>Cited</th></tr></thead>
          ${d.rows.map(([n, t, a, c]) => `<tr><td>${n}</td><td>${esc(t)}</td><td><span class="pill ${a === 'finance only' ? 'bad' : ''}">${a}</span></td><td>${c}×</td></tr>`).join('')}</table></div></div>`;
    },
  },

  /* ── run detail ── */
  run: {
    needsData: true,
    bar: () => `<div><a class="back" href="#/admin/connectors">${ic('back')} Connectors</a><div class="atitle">Sync run · ${S.run.source}</div>
      <div class="asub">Started 2 days ago · ${S.run.failures.length ? 'finished with errors' : 'everything synced'}</div></div>
      <button class="btn pri" data-act="retryAll" ${S.run.failures.some(f => f.retry === 'ok') ? '' : 'disabled'}>${ic('refresh')} Retry failed</button>`,
    body: () => {
      const r = S.run;
      return `<div class="kpis">${kpi('Checked', r.checked, 'documents')}${kpi('Unchanged', r.unchanged, 'same content hash, skipped')}${kpi('Re-indexed', r.reindexed, 'changed since last run')}${kpi('Failed', r.failures.length, r.failures.length ? 'needs attention' : 'all fixed', r.failures.length ? 'down' : 'up')}</div>
        ${r.failures.length ? `<div class="card"><h5>Failures</h5><p class="sub">Documents that didn't make it into the index, and why</p><div class="tscroll"><table><thead><tr><th>Document</th><th>Reason</th><th>Attempts</th><th></th></tr></thead>
          ${r.failures.map((f, i) => `<tr><td><b>${esc(f.doc)}</b></td><td>${esc(f.reason)}</td><td>${f.attempts}</td>
            <td class="tright" style="white-space:nowrap"><button class="btn sm" data-act="retryRow" data-i="${i}">Retry</button> <button class="btn ghost sm" data-act="skipRow" data-i="${i}">Skip</button></td></tr>`).join('')}</table></div></div>`
          : '<div class="callout good"><b>Nothing left to fix.</b>Every document from this run is either indexed or deliberately skipped.</div>'}`;
    },
    mount: () => countUp(),
  },

  /* ── access audit ── */
  audit: {
    needsData: true,
    init: () => { tmp.person ??= ''; tmp.range ??= '24h'; tmp.open ??= { 1: true }; },
    bar: () => `<div class="atitle">Access audit</div><div class="row" style="flex-wrap:wrap">
      ${sel('person', [['', 'All people'], ...[...new Set(D.audit.map(a => a.person))].map(p => [p, p])], tmp.person, 'data-in="auditPerson" style="width:auto"')}
      ${sel('range', [['24h', 'Last 24 hours'], ['7d', 'Last 7 days']], tmp.range, 'data-in="auditRange" style="width:auto"')}
      <button class="btn" data-act="exportCsv">Export CSV</button></div>`,
    body: () => {
      const rows = auditRows();
      return `<div class="card" style="padding:6px 6px 0;overflow:hidden"><div class="tscroll"><table><thead><tr><th>Time</th><th>Person</th><th>Question</th><th class="hide-m">Used</th><th>Withheld</th><th></th></tr></thead>
        ${rows.map(({ a, i }) => `<tr class="click" data-act="auditRow" data-i="${i}" ${tmp.open[i] ? 'style="background:#fbfbfc"' : ''}><td style="white-space:nowrap">${a.time}</td><td style="white-space:nowrap"><b>${a.person}</b></td><td>${esc(a.q)}</td>
          <td class="hide-m" style="white-space:nowrap">${a.used.length} chunks</td><td>${a.withheld.length ? `<span class="pill warn">${a.withheld.length} withheld</span>` : '0'}</td>
          <td class="tright" style="color:var(--faint)">${tmp.open[i] ? '▴' : '▾'}</td></tr>
          ${tmp.open[i] ? `<tr style="background:#fbfbfc"><td colspan="6" style="padding:0 10px 14px"><div class="card" style="margin:0;animation:rise .25s var(--ease)">${auditDetail(a)}</div></td></tr>` : ''}`).join('')
        || '<tr><td colspan="6" class="muted">No questions match these filters.</td></tr>'}</table></div></div>
        <div class="callout note"><b>Withheld isn't the same as a denied person.</b>Every question logs which chunks were used and which were withheld, with the rule that fired. That is the evidence that permission filtering happened inside the search, not after it.</div>`;
    },
  },

  /* ── access inspector ── */
  inspector: {
    needsData: true,
    init: () => { tmp.who ??= 'Dev K.'; },
    bar: () => `<div class="atitle">Access inspector</div>${sel('who', Object.keys(D.people), tmp.who, 'data-in="inspWho" style="width:auto"')}`,
    body: () => {
      const p = D.people[tmp.who];
      return `<div class="two"><div class="card"><h5>Groups</h5><p class="sub">Including groups inherited through nesting</p><div class="tree">
          ${p.groups.map(([g, l, k]) => `<div class="tnode ${l ? 'l' + l : ''}"><b>${g}</b><span class="pill ${k === 'deny source' ? 'bad' : ''}">${k}</span></div>`).join('')}</div></div>
        <div class="card"><h5>Effective access</h5><p class="sub">After deny rules are applied</p><table>
          <tr><td><b>Can see</b></td><td class="tright">${p.see.toLocaleString()} of 1,284 documents</td></tr>
          <tr><td><b>Partial access</b></td><td class="tright">${p.partial} documents</td></tr><tr><td><b>No access</b></td><td class="tright">${p.none} documents</td></tr></table>
          <form data-form="checkDoc" class="row" style="margin-top:14px"><input class="in" name="doc" id="checkDocIn" list="docList" placeholder="Check a specific document…"><button class="btn" type="submit">Check</button></form>
          <datalist id="docList">${['Vendor Payment Runbook', 'Compensation Bands', 'Regional Pricing 2026', 'Board Minutes 2026', 'Employee Handbook: Leave'].map(d => `<option value="${d}">`).join('')}</datalist>
          <div class="autos" style="margin-top:8px"><button class="auto" data-act="fillCheck">${SPARK} Vendor Payment Runbook</button></div><div id="checkRes"></div></div></div>
        <div class="card"><h5>Partial access: documents where some chunks are hidden</h5><div class="tscroll"><table><thead><tr><th>Document</th><th>Visible</th><th>Hidden</th><th>Rule</th></tr></thead>
          ${p.docs.map(([d, v, h, r]) => `<tr><td><b>${d}</b></td><td>${v} chunks</td><td>${h} chunks</td><td>${r}</td></tr>`).join('')}</table></div></div>`;
    },
  },

  /* ── knowledge gaps ── */
  gaps: {
    needsData: true,
    init: () => { tmp.tab ??= 'open'; },
    bar: () => `<div class="atitle">Knowledge gaps</div><div class="tabs">${[['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].map(([k, l]) => `<button class="${tmp.tab === k ? 'on' : ''}" data-act="gapTab" data-t="${k}">${l}</button>`).join('')}</div>`,
    body: () => {
      const list = S.gaps.filter(g => g.status !== 'dismissed' && (tmp.tab === 'all' || g.status === tmp.tab));
      return (list.map(g => g.status === 'resolved'
        ? `<div class="gap done"><div class="gaphead"><div class="gapq">${esc(g.title)}</div><div class="gapn">${g.people} people · ${g.asks} asks · resolved</div></div><div class="gapex">${esc(g.note)}</div></div>`
        : `<div class="gap" data-gap="${g.id}"><div class="gaphead"><div class="gapq">${esc(g.title)} ${g.fresh ? '<span class="pill warn">new</span>' : ''}</div>
            <div class="row" style="gap:8px">${g.owner ? `<span class="pill">assigned to ${g.owner}</span>` : ''}<span class="gapn">${g.people} ${g.people === 1 ? 'person' : 'people'} · ${g.asks} asks</span></div></div>
          ${g.ex.map(x => `<div class="gapex">"${esc(x)}"</div>`).join('')}
          <div class="acts"><button class="btn pri sm" data-act="gapDone" data-id="${g.id}">Mark as written</button>
            <span class="wrap-menu"><button class="btn sm" data-act="gapAssign" data-id="${g.id}" data-menu>${g.owner ? 'Reassign' : 'Assign'} ${ic('chev')}</button></span>
            <button class="btn ghost sm" data-act="gapDismiss" data-id="${g.id}">Not a gap</button></div></div>`).join('')
        || `<div class="card center muted" style="padding:36px">${tmp.tab === 'open' ? 'No open gaps. Your documents cover what people are asking.' : 'Nothing here yet.'}</div>`)
        + `<div class="callout note" style="margin-top:16px"><b>The distinction this screen has to get right.</b>A question can go unanswered because the content doesn't exist, or because search failed to find content that does. Only the first is a knowledge gap. "Not a gap" sends the question to search quality checks instead.</div>`;
    },
  },

  /* ── connectors ── */
  connectors: {
    bar: () => `<div class="atitle">Connectors</div><a class="btn pri" href="#/admin/connectors/new">${ic('plus')} Add a source</a>`,
    body: () => S.connectors.length ? S.connectors.map(c => `<div class="card"><div class="row" style="flex-wrap:wrap"><div class="grow"><h5>${c.name}</h5><p class="sub" style="margin:0">${connSub(c)}${c.status === 'healthy' ? ` · ${c.freq.toLowerCase()} · permissions mirrored` : ''}</p></div>
        ${statusPill(c.status)}<button class="btn sm" data-act="connSettings" data-id="${c.id}">Settings</button></div>
        ${c.status === 'failing' ? `<div class="callout bad" style="margin-top:12px;font-size:13px"><b>Sambad can't reach ${c.name}.</b>The access token was revoked or has expired. Reconnecting resumes syncing from where it stopped.
          <div class="acts"><button class="btn pri sm" data-act="reconnect" data-id="${c.id}">Reconnect</button><a class="btn sm" href="#/admin/runs/${S.run.id}">View last run</a></div></div>` : ''}
        ${c.status === 'indexing' || c.status === 'syncing' ? `<div class="progress"><i id="prog-${c.id}" style="width:${(c.progress || 0) / c.total * 100}%"></i></div><div class="small muted" style="margin-top:6px" id="ptxt-${c.id}">Starting…</div>` : ''}
        ${tmp.settings === c.id ? `<div class="sep"></div><div class="two"><div class="field"><label>How often should it check for changes?</label>${sel('freq', ['Every 15 minutes', 'Every hour', 'Every 6 hours', 'Once a day'], c.freq, `id="freq-${c.id}"`)}</div>
          <div class="field"><label>Syncing</label><div class="row" style="padding-top:8px"><button class="switch ${c.paused ? '' : 'on'}" data-act="switch" id="sw-${c.id}" aria-label="Syncing on"></button><span class="small muted">${c.paused ? 'Paused' : 'On'}</span></div></div></div>
          <div class="acts" style="margin-top:0"><button class="btn pri sm" data-act="connSave" data-id="${c.id}">Save</button><button class="btn sm" data-act="syncNow" data-id="${c.id}">${ic('refresh')} Sync now</button>
            <div style="flex:1"></div><button class="btn ghost sm danger" data-act="disconnect" data-id="${c.id}">Disconnect</button></div>` : ''}</div>`).join('')
      : `<div class="card center empty-admin" style="padding:44px 20px">${MARK}<h5 style="font-size:16px">No sources yet</h5><p class="sub" style="margin:6px auto 16px">Connect where your team keeps its documents.</p><a class="btn pri" href="#/admin/connectors/new">${ic('plus')} Add a source</a></div>`,
  },

  /* ── add a source ── */
  newsource: {
    init: () => {
      const taken = S.connectors.map(c => c.name);
      tmp.type ??= Object.keys(D.sourceTypes).find(t => !taken.includes(t));
      tmp.connected ??= false; tmp.files ??= []; tmp.all ??= true; tmp.freq ??= 'Every 15 minutes';
    },
    bar: () => `<div class="atitle">Add a source</div><div class="row"><button class="auto" data-act="fillSource">${SPARK} Fill for me</button><a class="btn" href="#/admin/connectors">Cancel</a></div>`,
    body: () => {
      const taken = S.connectors.map(c => c.name), up = tmp.type === 'Upload files', spaces = D.sourceTypes[tmp.type];
      const welcome = ctx.q.get('welcome') && S.flags.emptyWorkspace
        ? `<div class="welcome"><b>Welcome to Sambad, ${esc(first(S.session.name))}. ${esc(S.workspace)} is ready.</b>Connect the place your team keeps its documents. Everything else in the admin console fills in from here.</div>` : '';
      return `<div class="narrow">${welcome}<form data-form="addSource" novalidate>
        <div class="field"><label>Where are the documents?</label>${sel('type', Object.keys(D.sourceTypes).map(t => [t, taken.includes(t) ? `${t} (already connected)` : t, taken.includes(t)]), tmp.type, 'data-in="srcType"')}</div>
        <div class="field"><label>${up ? 'Files' : 'Connect'}</label>${up
          ? `<div class="drop" data-act="pickFiles" id="drop">${ic('upload')}<div style="margin-top:6px">Drop files here or <b>browse</b></div><div class="small muted">PDF, Word, Markdown. Up to 50 MB each.</div></div>
             <input type="file" id="fileIn" multiple hidden>${tmp.files.map(f => `<div class="file"><span>${esc(f.name)}</span><span class="muted">${f.size}</span></div>`).join('')}
             <div class="autos" style="margin-top:8px"><button class="auto" type="button" data-act="sampleFiles">${SPARK} Add sample files</button></div>`
          : tmp.connected
            ? `<div class="callout good"><b>Connected as ${esc(S.session.email)}</b>Sambad can read ${tmp.type}. It never writes anything back.</div>`
            : `<button type="button" class="btn pri lg" data-act="srcConnect">Sign in to ${tmp.type}</button><div class="help">Sambad reads documents and their permissions. It never writes anything back.</div>`}</div>
        ${up ? '' : `<div class="field" style="${tmp.connected ? '' : 'opacity:.45;pointer-events:none'}"><label>Which spaces?</label>
          <label class="check"><input type="checkbox" data-in="allSpaces" ${tmp.all ? 'checked' : ''}> All spaces I can access</label>
          <div class="spaces">${spaces.map(s => `<label class="check"><input type="checkbox" name="space" value="${s}" ${tmp.all ? 'checked disabled' : ''}> ${s}</label>`).join('')}</div></div>`}
        <div class="field"><label>How often should it check for changes?</label>${sel('freq', ['Every 15 minutes', 'Every hour', 'Every 6 hours', 'Once a day'], tmp.freq, 'data-in="srcFreq"')}</div>
        <div class="callout" style="margin:20px 0"><b>${up ? 'Uploaded files are visible to everyone in the workspace.' : 'Permissions come across too.'}</b>${up
          ? 'Sambad keeps the only copy, stored on your own server. Use a connected source for anything that needs restricted access.'
          : `Everyone sees only what they can already open in ${tmp.type}. Sambad never widens access. If someone loses access there, they lose it here at the next sync.`}</div>
        <button class="btn pri" type="submit" ${tmp.connected || tmp.files.length ? '' : 'disabled'}>Add source and start indexing</button></form></div>`;
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
    bar: () => `<div class="atitle">People &amp; groups</div><div class="row"><span class="small muted" id="peopleSync">${tmp.synced ? 'Synced just now' : 'Synced 4 minutes ago'}</span><button class="btn" data-act="resync">${ic('refresh')} Re-sync</button></div>`,
    body: () => {
      const g = D.groups.find(x => x.id === tmp.group);
      const parent = { 0: 'top-level group', 1: 'nested inside all-staff', 2: 'nested inside engineering' }[g.lvl];
      return `<div class="two"><div class="card"><h5>Groups</h5><p class="sub">Nested groups are expanded at question time</p><div class="tree">
          ${D.groups.map(x => `<button class="tnode ${x.lvl ? 'l' + x.lvl : ''} ${x.id === tmp.group ? 'sel' : ''}" data-act="pickGroup" data-g="${x.id}"><b>${x.id}</b><span class="pill">${x.n}</span></button>`).join('')}</div></div>
        <div class="card"><h5>${g.id}</h5><p class="sub">${g.n} people · ${parent}</p><table><thead><tr><th>Person</th><th>Via</th><th>Asked</th></tr></thead>
          ${g.members.map(([p, v, a]) => `<tr><td><b>${p}</b></td><td>${v}</td><td>${a}</td></tr>`).join('')}
          <tr><td colspan="3" class="small muted">${g.n - g.members.length} more</td></tr></table></div></div>
        <div class="callout note"><b>Read-only, on purpose.</b>Groups are edited where they live, in your identity provider or source system. This view shows what Sambad believes, so you can check it matches.</div>`;
    },
  },

  /* ── model ── */
  model: {
    init: () => { tmp.md ??= clone(S.model); },
    bar: () => `<div class="atitle">Model</div><button class="btn pri" data-act="modelSave" id="modelSave" ${dirty() ? '' : 'disabled'}>Save changes</button>`,
    body: () => {
      const m = tmp.md;
      return `<div class="narrow"><div class="card"><h5>Where answers are generated</h5><p class="sub">Nothing leaves your infrastructure unless you choose a hosted endpoint</p>
          <div class="two" style="gap:10px">
            <button class="radio ${m.mode === 'local' ? 'on' : ''}" data-act="mode" data-m="local"><span><b>On this server</b><small>Ollama · ${m.answering}</small></span><span class="o"></span></button>
            <button class="radio ${m.mode === 'hosted' ? 'on' : ''}" data-act="mode" data-m="hosted"><span><b>Hosted endpoint</b><small>Your own API key</small></span><span class="o"></span></button></div>
          ${m.mode === 'hosted' ? `<div style="margin-top:14px;animation:rise .25s var(--ease)">
            <div class="field"><label>Endpoint URL</label><input class="in" id="mEndpoint" data-in="mField" data-k="endpoint" placeholder="https://llm.internal.example.com/v1" value="${esc(m.endpoint)}"></div>
            <div class="field"><label>API key</label><input class="in" id="mKey" type="password" data-in="mField" data-k="key" placeholder="sk-…" value="${esc(m.key)}"></div>
            <div class="autos"><button class="auto" data-act="fillEndpoint">${SPARK} Sample endpoint</button></div>
            <div class="callout warn small" style="margin-top:12px"><b>Questions leave this server.</b>Each question and the passages used to answer it are sent to this endpoint. Permission filtering still happens here first.</div></div>` : ''}</div>
        <div class="card"><h5>Models</h5>
          <div class="field"><label>Answering model</label>${sel('answering', D.answeringModels, m.answering, 'data-in="mField" data-k="answering"')}</div>
          <div class="field" style="margin:0"><label>Search model</label>${sel('search', D.searchModels, m.search, 'data-in="mField" data-k="search"')}
            <div class="help ${m.search !== S.model.search ? 'stale' : ''}" id="searchHelp">Changing this re-indexes all 1,284 documents. Takes about 40 minutes.</div></div></div>
        <div class="card"><h5>When to say "I don't know"</h5><p class="sub">How certain Sambad must be before it answers at all</p>
          <input type="range" min="0" max="100" value="${m.threshold}" data-in="thresh" aria-label="Answer threshold">
          <div class="axis"><span>Answer more often</span><span>Only when certain</span></div>
          <p style="font-size:13px;color:var(--mid);margin:12px 0 0">At this setting, Sambad would have declined <b id="declined">${declined(m.threshold)}%</b> of questions last week.</p></div>
        <div class="card" style="margin:0"><div class="row"><div class="grow"><h5>Connection</h5><p class="sub" style="margin:0" id="connTxt">Last checked 2 minutes ago · 340ms</p></div>
          <span id="connPill"><span class="pill ok"><span class="dot"></span>reachable</span></span><button class="btn sm" data-act="testConn">Test</button></div></div></div>`;
    },
  },
};

/* admin actions */
I.range = el => { S.range = el.value; save(); refresh(); };
A.reindexAll = async el => {
  if (!await confirmBox({ title: 'Re-index everything?', body: 'Sambad re-reads all 1,284 documents. Anything whose content hash hasn\'t changed is skipped, so this is quick unless a lot changed. People can keep asking while it runs.', ok: 'Re-index' })) return;
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
    if (txt) txt.textContent = `${r.done.toLocaleString()} of ${total.toLocaleString()} documents checked`;
    if (r.done < total) return;
    clearInterval(t);
    tmp.reidx = null;
    if (onPage('freshness')) { $('#abar').innerHTML = ADMIN.freshness.bar(); refresh(); }
    toast('Re-index finished. 1,261 unchanged, 23 re-indexed, 0 failed.');
  }, 120);
};
A.reindexDoc = async el => { await busy(el, 1400); toast("Re-indexed. The content hash hadn't changed, so nothing new was embedded."); };
A.markReviewed = () => { S.reviewed[ctx.c] = true; save(); refresh(); updateBadges(); toast("Marked as checked. Employees won't see a staleness warning for this page."); };
A.nudgeOwner = async el => { await busy(el, 800); el.innerHTML = `${ic('check')} Reminder sent`; el.classList.add('on'); el.removeAttribute('data-act'); toast('Sent a reminder to the page owner, Grace L.'); };

A.retryRow = async el => {
  const f = S.run.failures[+el.dataset.i];
  await busy(el, 1200);
  if (f.retry === 'ok') {
    S.run.failures.splice(+el.dataset.i, 1);
    S.run.reindexed++;
    toast(`${f.doc} is in the index now.`);
  } else {
    f.attempts++;
    toast(`Still failing: ${f.reason}`);
  }
  save();
  $('#abar').innerHTML = ADMIN.run.bar();
  refresh();
};
A.skipRow = el => {
  const i = +el.dataset.i, [f] = S.run.failures.splice(i, 1);
  save();
  $('#abar').innerHTML = ADMIN.run.bar();
  refresh();
  toast(`Skipped ${f.doc}. It won't be retried.`, () => { S.run.failures.splice(i, 0, f); save(); if (onPage('run')) { $('#abar').innerHTML = ADMIN.run.bar(); refresh(); } });
};
A.retryAll = async el => {
  await busy(el, 1800);
  const ok = S.run.failures.filter(f => f.retry === 'ok');
  S.run.failures = S.run.failures.filter(f => f.retry !== 'ok');
  S.run.failures.forEach(f => f.attempts++);
  S.run.reindexed += ok.length;
  save();
  $('#abar').innerHTML = ADMIN.run.bar();
  refresh();
  toast(`${ok.length} fixed, ${S.run.failures.length} still failing.`);
};

const auditRows = () => D.audit.map((a, i) => ({ a, i })).filter(({ a }) => (!tmp.person || a.person === tmp.person) && (tmp.range === '7d' || a.day === 0));
function auditDetail(a) {
  const used = a.used.length ? `<div class="lbl">Used in this answer</div>${a.used.map(u => `<div class="small" style="padding:3px 0">${esc(u)}</div>`).join('')}`
    : '<div class="small muted">Nothing matched closely enough, so Sambad said this isn\'t covered.</div>';
  if (!a.withheld.length) return used;
  return `<div class="lbl">Withheld from this answer</div><table>${a.withheld.map(([c, why, rule]) => `<tr><td><b>${esc(c)}</b></td><td>${esc(why)}</td><td class="tright"><span class="pill ${rule === 'deny rule' ? 'bad' : ''}">${rule}</span></td></tr>`).join('')}</table>
    <p class="small muted" style="margin:10px 0 14px">${a.person} was never shown these chunks and was not told they exist.</p>${used}`;
}
I.auditPerson = el => { tmp.person = el.value; refresh(); };
I.auditRange = el => { tmp.range = el.value; refresh(); };
A.auditRow = el => { const i = el.dataset.i; tmp.open[i] = !tmp.open[i]; refresh(); };
A.exportCsv = () => {
  const rows = auditRows();
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const csv = ['time,person,question,chunks_used,chunks_withheld,withheld_detail',
    ...rows.map(({ a }) => [a.time, a.person, a.q, a.used.length, a.withheld.length, a.withheld.map(w => `${w[0]} (${w[2]})`).join('; ')].map(q).join(','))].join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = 'sambad-access-audit.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast(`Exported ${rows.length} rows to sambad-access-audit.csv`);
};

I.inspWho = el => { tmp.who = el.value; refresh(); };
A.fillCheck = () => typeInto($('#checkDocIn'), 'Vendor Payment Runbook');
F.checkDoc = async (f, btn) => {
  const name = val(f, 'doc');
  if (!name) return;
  await busy(btn, 600);
  const p = D.people[tmp.who], hit = p.docs.find(d => d[0].toLowerCase() === name.toLowerCase());
  const res = !hit ? `<div class="callout good"><b>${tmp.who} can see all of ${esc(name)}.</b>No allow or deny rule hides any part of it.</div>`
    : hit[1] === 0 ? `<div class="callout bad"><b>${tmp.who} can't see ${esc(hit[0])} at all.</b>Reason: ${hit[3]}. It never appears in their answers.</div>`
    : `<div class="callout warn"><b>${tmp.who} can see ${hit[1]} of ${hit[1] + hit[2]} chunks of ${esc(hit[0])}.</b>The other ${hit[2]} are hidden by: ${hit[3]}.</div>`;
  $('#checkRes').innerHTML = `<div style="margin-top:12px;animation:rise .25s var(--ease)">${res}</div>`;
};

A.gapTab = el => { tmp.tab = el.dataset.t; $('#abar').innerHTML = ADMIN.gaps.bar(); refresh(); };
const gapById = id => S.gaps.find(g => g.id === id);
async function gapOut(id) { const c = $(`[data-gap="${id}"]`); if (c) { c.classList.add('out'); await sleep(260); } }
A.gapDone = async el => {
  const g = gapById(el.dataset.id);
  await gapOut(g.id);
  g.status = 'resolved';
  g.note = 'Marked written just now · watching for new asks';
  save(); refresh(); updateBadges();
  toast('Marked as written. Sambad will tell you if people keep asking.');
};
A.gapAssign = el => {
  const open = el.parentElement.querySelector('.menu');
  if (open) return open.remove();
  el.insertAdjacentHTML('afterend', `<div class="menu">${D.owners.map(o => `<button data-act="gapOwner" data-id="${el.dataset.id}" data-o="${o}">${o}</button>`).join('')}</div>`);
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
A.connSettings = el => { tmp.settings = tmp.settings === el.dataset.id ? null : el.dataset.id; refresh(); };
A.switch = el => { el.classList.toggle('on'); el.nextElementSibling.textContent = el.classList.contains('on') ? 'On' : 'Paused'; };
A.connSave = async el => {
  const c = conn(el.dataset.id);
  c.freq = $('#freq-' + c.id).value;
  c.paused = !$('#sw-' + c.id).classList.contains('on');
  await busy(el, 600);
  tmp.settings = null;
  save(); refresh();
  toast(`${c.name} settings saved`);
};
A.syncNow = async el => { const c = conn(el.dataset.id); await busy(el, 1500); c.synced = 'just now'; save(); refresh(); toast(`${c.name} synced. 3 changed documents re-indexed, the rest skipped.`); };
A.disconnect = async el => {
  const c = conn(el.dataset.id), i = S.connectors.indexOf(c);
  if (!await confirmBox({ title: `Disconnect ${c.name}?`, body: `Sambad removes its ${c.docs.toLocaleString()} documents from the index. People won't get answers from them until you reconnect.`, ok: 'Disconnect', danger: true })) return;
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

I.srcType = el => { tmp.type = el.value; tmp.connected = false; tmp.files = []; refresh(); };
I.srcFreq = el => { tmp.freq = el.value; };
I.allSpaces = el => { tmp.all = el.checked; $$('[name=space]').forEach(c => { c.disabled = tmp.all; if (tmp.all) c.checked = true; }); };
async function connectSource(el) { await busy(el, 1300); tmp.connected = true; refresh(); toast(`Connected to ${tmp.type}`); }
A.srcConnect = el => connectSource(el);
A.pickFiles = () => $('#fileIn')?.click();
A.sampleFiles = () => { tmp.files.push(...D.sampleFiles); refresh(); };
A.fillSource = async () => {
  const taken = S.connectors.map(c => c.name);
  tmp.type = Object.keys(D.sourceTypes).find(t => !taken.includes(t) && t !== 'Upload files') || 'Upload files';
  tmp.connected = false;
  refresh();
  await sleep(200);
  if (tmp.type === 'Upload files') return A.sampleFiles();
  const b = $('[data-act=srcConnect]');
  if (b) await connectSource(b);
};
F.addSource = async (f, btn) => {
  const up = tmp.type === 'Upload files';
  if (!up && !tmp.connected) return toast(`Sign in to ${tmp.type} first.`);
  if (up && !tmp.files.length) return toast('Add at least one file first.');
  if (!up && !tmp.all && !$$('[name=space]:checked').length) return toast('Pick at least one space.');
  await busy(btn, 900);
  const picked = up ? 0 : tmp.all ? D.sourceTypes[tmp.type].length : $$('[name=space]:checked').length;
  const c = { id: 'c' + Date.now(), name: up ? 'Uploaded files' : tmp.type, docs: 0, total: up ? tmp.files.length : picked * 68,
    status: 'indexing', synced: 'just now', freq: tmp.freq, progress: 0 };
  S.connectors.push(c);
  save();
  tmp = {};
  go('#/admin/connectors');
  toast(`Indexing ${c.name}. You can leave this page.`);
  tickConn(c);
};

A.pickGroup = el => { tmp.group = el.dataset.g; refresh(); };
A.resync = async el => { await busy(el, 1200); tmp.synced = true; $('#peopleSync').textContent = 'Synced just now'; toast('Groups re-synced. No changes since last time.'); };

const declined = v => Math.round(2 + v * 0.19);
const dirty = () => tmp.md && JSON.stringify(tmp.md) !== JSON.stringify(S.model);
const markDirty = () => { const b = $('#modelSave'); if (b) b.disabled = !dirty(); };
A.mode = el => { tmp.md.mode = el.dataset.m; refresh(); markDirty(); };
I.mField = el => {
  tmp.md[el.dataset.k] = el.value;
  if (el.dataset.k === 'search') $('#searchHelp').classList.toggle('stale', el.value !== S.model.search);
  markDirty();
};
I.thresh = el => { tmp.md.threshold = +el.value; $('#declined').textContent = declined(+el.value) + '%'; markDirty(); };
A.fillEndpoint = async () => { await typeInto($('#mEndpoint'), 'https://llm.acme.internal/v1'); await typeInto($('#mKey'), 'sk-acme-7f3a91c2e4b8'); };
A.testConn = async el => {
  await busy(el, 1100);
  const m = tmp.md, bad = m.mode === 'hosted' && !m.endpoint;
  $('#connPill').innerHTML = bad ? '<span class="pill bad"><span class="dot"></span>unreachable</span>' : '<span class="pill ok"><span class="dot"></span>reachable</span>';
  $('#connTxt').textContent = bad ? 'Add an endpoint URL first' : `Checked just now · ${Math.round(rand(240, 420))}ms`;
};
A.modelSave = async el => {
  const m = tmp.md;
  if (m.mode === 'hosted' && (!m.endpoint || !m.key)) return toast('Add the endpoint URL and API key first.');
  if (m.search !== S.model.search && !await confirmBox({ title: 'Switch search model?', body: `All 1,284 documents will be re-read with <b>${esc(m.search)}</b>. It takes about 40 minutes, and Sambad keeps answering from the current index until it finishes.`, ok: 'Save and re-index' })) return;
  await busy(el, 900);
  S.model = clone(m);
  save();
  markDirty();
  toast('Model settings saved');
};

/* ════════════════ DEMO PANEL ════════════════ */
const FLAGS = [['serviceDown', 'Answering service is down'], ['emptyWorkspace', 'Workspace has no documents'], ['slow', 'Slow network']];
function paintDemo() {
  $('#demo').innerHTML = `<div class="demo" data-menu><h6>Demo controls</h6><p class="small muted" style="margin:0 0 6px">Force states you can't reach by clicking around.</p>
    ${FLAGS.map(([k, l]) => `<div class="row"><span>${l}</span><button class="switch ${S.flags[k] ? 'on' : ''}" data-act="demoFlag" data-k="${k}" aria-label="${l}"></button></div>`).join('')}
    <div class="sep" style="margin:10px 0"></div><div class="lbl">Sign in as</div>
    <div class="row" style="padding-top:0"><button class="btn sm" data-act="demoUser" data-u="priya">Priya · employee</button><button class="btn sm" data-act="demoUser" data-u="suman">Suman · admin</button></div>
    <div class="lbl" style="margin-top:8px">Jump to</div>
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
  location.hash === el.dataset.to ? render() : go(el.dataset.to);
};
A.demoReset = async () => {
  if (!await confirmBox({ title: 'Reset the demo?', body: 'Clears every question, setting and account you created and signs you out.', ok: 'Reset', danger: true })) return;
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
  location.hash = '';
  location.reload();
};

/* ── boot ─────────────────────────────────────── */
S.connectors.forEach(c => { delete c._t; if (c.status === 'indexing' || c.status === 'syncing') tickConn(c); });
window.addEventListener('hashchange', render);
render();
})();
