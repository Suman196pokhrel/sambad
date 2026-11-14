/*
 * Sambad clickable mock: where visitor feedback goes.
 * With an endpoint, feedback is sent to the Cloudflare Worker in
 * feedback-worker/, which also serves this demo, hence the relative path.
 * When the demo is opened from disk (file://) nothing is sent: feedback
 * stays on the device and the presenter exports it from the Demo panel.
 * Neither value is a secret: the Worker checks everything itself.
 */
window.SAMBAD_FEEDBACK = {
  endpoint: '/feedback',
  turnstileSiteKey: '0x4AAAAAAGBK8kdqlb5LQcXO',  // Cloudflare Turnstile site key (public, safe to commit)
};
