(() => {
  const videos = [...document.querySelectorAll('.home-hero video')];
  const hero = document.querySelector('.home-hero');
  if (!hero || !videos.length) return;
  const fallback = document.createElement('button');
  fallback.type = 'button';
  fallback.className = 'hero-video-play';
  fallback.textContent = '▶ Reproduzir vídeo';
  fallback.hidden = true;
  hero.append(fallback);
  const visibleVideo = () => videos.find(video => getComputedStyle(video).display !== 'none');
  async function start() {
    const active = visibleVideo();
    for (const video of videos) {
      if (video !== active || document.hidden) video.pause();
    }
    if (!active || document.hidden) return;
    // Set DOM properties as well as attributes for mobile Safari.
    active.defaultMuted = true;
    active.muted = true;
    active.playsInline = true;
    active.autoplay = true;
    try {
      await active.play();
      fallback.hidden = true;
    } catch {
      if (active === visibleVideo() && !document.hidden) fallback.hidden = false;
    }
  }
  for (const video of videos) video.addEventListener('canplay', start);
  fallback.addEventListener('click', start);
  document.addEventListener('visibilitychange', start);
  window.addEventListener('pageshow', start);
  window.matchMedia('(max-width: 1024px)').addEventListener('change', start);
  start();
})();
