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
  'firebase-config.js'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/feed/') && url.pathname.endsWith('.ics')) {
    const id = url.pathname.split('/').pop().replace('.ics', '');
    event.respondWith((async () => {
      if (!firestore) return new Response('Service unavailable', { status: 503 });
      try {
        const doc = await firestore.collection('polls').doc(id).get();
        if (!doc.exists) return new Response('Not found', { status: 404 });
        const poll = doc.data();
        if (!poll.finalized || !poll.finalChoice) return new Response('Not finalized', { status: 404 });
        const toIcsDate = iso => iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
        const start = new Date(poll.finalChoice);
        const end = new Date(start.getTime() + 60 * 60000);
        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DoodleClone//EN\nBEGIN:VEVENT\nUID:${poll.id}@doodleclone\nDTSTAMP:${toIcsDate(new Date().toISOString())}\nDTSTART:${toIcsDate(start.toISOString())}\nDTEND:${toIcsDate(end.toISOString())}\nSUMMARY:${poll.title}\nDESCRIPTION:${poll.description}\nEND:VEVENT\nEND:VCALENDAR`;
        return new Response(ics, { headers: { 'Content-Type': 'text/calendar' } });
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

