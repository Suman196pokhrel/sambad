/*
 * Sambad clickable mock: where visitor feedback goes.
 * Leave both empty and feedback stays on the device it was written on (the
 * presenter exports it from the Demo panel). Fill both in after deploying
 * feedback-worker/ (see its README) and queued feedback is sent there too.
 * Neither value is a secret: the Worker checks everything itself.
 */
window.SAMBAD_FEEDBACK = {
  endpoint: '',          // https://sambad-feedback.<you>.workers.dev/feedback
  turnstileSiteKey: '',  // Cloudflare Turnstile site key for the mock's hostname
};
