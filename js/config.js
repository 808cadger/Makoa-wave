// config.js — server URL for Capacitor native builds
// Capacitor WebView can't use relative URLs — needs the absolute IP.
// PWA (same-origin): set to '' so relative /api/* URLs work.
// Capacitor (phone): set to your server's LAN IP.
// #ASSUMPTION: 192.168.1.132 is this machine's local IP (run `hostname -I` to verify)
window.GLOWAI_SERVER_URL = 'http://192.168.1.132:8000';
