window.addEventListener('load', () => {
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }

  document.getElementById('clickMe').addEventListener('click', () => {
    alert('Button clicked!');
  });
});
