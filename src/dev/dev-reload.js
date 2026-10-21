export function startDevReload() {
  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  // Port 5173 also supports the documented same-Wi-Fi preview on private IPv4 hosts.
  const privateHost = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
  if (!localHost && !(privateHost && location.port === '5173')) return;

  let revision;
  async function poll() {
    try {
      const response = await fetch('/__dev_revision', { cache: 'no-store' });
      if (response.ok) {
        const next = await response.text();
        if (revision !== undefined && revision !== next) location.reload();
        revision = next;
      }
    } catch { /* Keep the page usable while the server restarts. */ }
    setTimeout(poll, 1000);
  }
  setTimeout(poll, 1000);
}
