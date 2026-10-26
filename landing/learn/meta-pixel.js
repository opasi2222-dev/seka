// Only the server-confirmed landing preference can activate this module.
// No SDK, cookies or requests are created before that preference is accepted.
let initialized = '';
export function advertisingPixel(preference) {
  if (preference?.choice !== 'accepted') {
    if (window.fbq) { window.fbq.queue = []; window.fbq('consent', 'revoke'); }
    return;
  }
  const pixel = preference.pixelId;
  if (preference.version !== 'landing-v3' || !/^\d{5,25}$/.test(pixel) ||
      ['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol !== 'https:') return;
  if (initialized) return; // One pixel and one PageView per document, not per slide.
  initialized = pixel;
  const fbq = window.fbq = function (...args) { fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args); };
  fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = []; window._fbq = fbq;
  fbq('consent', 'grant'); fbq('set', 'autoConfig', false, pixel); fbq('init', pixel);
  fbq('trackSingle', pixel, 'PageView');
  const script = document.createElement('script'); script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  // Ad blockers and SDK failures must never prevent training or a reward.
  script.onerror = () => {}; document.head.append(script);
}
