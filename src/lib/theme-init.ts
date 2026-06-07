// Inline theme init: runs in <head> before first paint (no FOUC), applying the
// persisted theme and syncing the theme-color meta, then re-applying after each
// view-transition swap. Injected verbatim via set:html, so its SHA-256 is hashed for
// CSP in astro.config.mjs — keep it a single flat string (byte changes are rehashed
// automatically on build). Exposes window.__themeSyncMeta for the handler script.
export const UI_INIT_SCRIPT = `(function(){var d=document.documentElement;function dark(){var t=d.getAttribute('data-theme');return t?t==='dark':window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}function syncMeta(){var m=document.querySelector('meta[name="theme-color"]:not([media])');if(m){m.setAttribute('content',dark()?'#0a0b0d':'#fcfcfd');}}function apply(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){d.setAttribute('data-theme',t);}else{d.removeAttribute('data-theme');}}catch(e){}syncMeta();}window.__themeSyncMeta=syncMeta;apply();if(!window.__themeSwapBound){window.__themeSwapBound=1;document.addEventListener('astro:after-swap',apply);}})();`;
