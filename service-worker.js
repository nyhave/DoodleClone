importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
importScripts('firebase-config.js');

const firestore = (self.firebase && firebase.apps && firebase.apps.length) ? firebase.firestore() : null;

const CACHE_NAME = 'doodle-cache-v1';
const ASSETS = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'polls.js',
  'firebase-config.js',
  'manifest.webmanifest'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'cache-ics') {
    const { id, ics } = event.data;
    const resp = new Response(ics, { headers: { 'Content-Type': 'text/calendar' } });
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => cache.put(`/feed/${id}.ics`, resp))
    );
  }
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/feed/') && url.pathname.endsWith('.ics')) {
    const id = url.pathname.split('/').pop().replace('.ics', '');
    event.respondWith((async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (!firestore) return new Response('Service unavailable', { status: 503 });
      try {
        const doc = await firestore.collection('polls').doc(id).get();
        if (!doc.exists) return new Response('Not found', { status: 404 });
        const poll = doc.data();
        if (!poll.finalized || !poll.finalChoice) return new Response('Not finalized', { status: 404 });
        const toIcsDate = iso => iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
        const start = new Date(poll.finalChoice);
        const dur = parseInt(poll.duration || 60);
        const end = new Date(start.getTime() + dur * 60000);
        const loc = poll.location ? `\nLOCATION:${poll.location}` : '';
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DoodleClone//EN\nBEGIN:VEVENT\nUID:${poll.id}@doodleclone\nDTSTAMP:${toIcsDate(new Date().toISOString())}\nDTSTART:${toIcsDate(start.toISOString())}\nDTEND:${toIcsDate(end.toISOString())}\nSUMMARY:${poll.title}\nDESCRIPTION:${poll.description}${loc}\nEND:VEVENT\nEND:VCALENDAR`;
        const resp = new Response(ics, { headers: { 'Content-Type': 'text/calendar' } });
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, resp.clone());
        return resp;
      } catch (e) {
        return new Response('Error', { status: 500 });
      }
    })());
    return;
  }
  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

