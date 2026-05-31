// Byte-stable init script for theme + sidebar state.
//
// This string is injected verbatim as an `is:inline` <script> in BaseLayout via
// `set:html`, so it runs synchronously in <head> before first paint (no FOUC).
// Because CSP is enabled and Astro does NOT hash `is:inline` scripts, its SHA-256
// hash is computed from this exact string in `astro.config.mjs` and added to the
// CSP `script-src` allowlist. Keep this a single flat string: any change to its
// bytes changes the hash, which the config recomputes automatically on build.
//
// Responsibilities:
//   - apply persisted theme (data-theme) + sidebar state (data-sidebar) on <html>
//   - keep the (non-media) theme-color <meta> in sync with the resolved theme
//   - re-apply after every view-transition swap (astro:after-swap) to avoid flashes
//   - expose window.__themeSyncMeta so the interactive handler script can reuse it
export const UI_INIT_SCRIPT = `(function(){var d=document.documentElement;function dark(){var t=d.getAttribute('data-theme');return t?t==='dark':window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}function syncMeta(){var m=document.querySelector('meta[name="theme-color"]:not([media])');if(m){m.setAttribute('content',dark()?'#0a0b0d':'#fcfcfd');}}function apply(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){d.setAttribute('data-theme',t);}else{d.removeAttribute('data-theme');}var s=localStorage.getItem('sidebar');if(s==='collapsed'){d.setAttribute('data-sidebar','collapsed');}else{d.removeAttribute('data-sidebar');}}catch(e){}syncMeta();}window.__themeSyncMeta=syncMeta;apply();if(!window.__themeSwapBound){window.__themeSwapBound=1;document.addEventListener('astro:after-swap',apply);}})();`;
