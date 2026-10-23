import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
);

registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL('/index.html'),
    { denylist: [/^\/api\//] }
  )
);

self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'BankIde';
  const options = {
    body: typeof payload.body === 'string'
      ? payload.body.slice(0, 240)
      : 'Ada pengingat ide yang perlu dicek.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: {
      url: typeof payload.url === 'string' ? payload.url : '/ideas',
    },
    tag: typeof payload.tag === 'string' ? payload.tag : 'bankide-reminder',
    renotify: false,
    actions: [
      {
        action: 'open',
        title: 'Buka BankIde',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const requested = event.notification.data?.url || '/ideas';
  const parsed = new URL(requested, self.location.origin);
  const targetUrl = parsed.origin === self.location.origin
    ? parsed.href
    : `${self.location.origin}/ideas`;

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of clientList) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ('navigate' in client) {
          await client.navigate(targetUrl);
        }
        return;
      }
    }

    await self.clients.openWindow(targetUrl);
  })());
});
