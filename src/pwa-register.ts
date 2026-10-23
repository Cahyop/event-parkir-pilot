/**
 * Single guarded service-worker registration wrapper (see PWA skill).
 * Registers only in production builds outside Lovable previews; anywhere the
 * registration is refused, matching app service workers are unregistered.
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return void (await unregisterAppSw());
  if ("serviceWorker" in navigator === false) return;

  const hostname = window.location.hostname;
  const inIframe = window.self !== window.top;
  const isPreviewHost =
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev");
  const swOff = new URLSearchParams(window.location.search).has("sw=off");

  if (inIframe || isPreviewHost || swOff) return void (await unregisterAppSw());

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}

async function unregisterAppSw(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()),
    );
  } catch {
    // ignore
  }
}
