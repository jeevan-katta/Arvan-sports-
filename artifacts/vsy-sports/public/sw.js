// Vsy Sports — Service Worker for Web Push Notifications

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Vsy Sports", body: event.data.text() }; }

  const title   = data.title   || "Vsy Sports";
  const options = {
    body:    data.body    || data.message || "",
    icon:    data.icon    || "/favicon.svg",
    badge:   "/favicon.svg",
    tag:     data.tag     || "vsy-push",
    data:    { url: data.url || "/" },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
