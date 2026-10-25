const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const isReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function createLeafFall() {
  const mobile = isMobile();
  const count = mobile ? 3 : 12;
  const container = document.createElement('div');
  container.id = 'leaf-fall';
  document.body.appendChild(container);
  const icons = ['🍂', '🍁'];
  for (let i = 0; i < count; i++) {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.textContent = icons[i % 2];
    leaf.style.left = Math.random() * 100 + '%';
    leaf.style.fontSize = (mobile ? 12 : 14 + Math.random() * 16) + 'px';
    leaf.style.animationDuration = (mobile ? 16 : 8 + Math.random() * 10) + 's';
    leaf.style.animationDelay = Math.random() * 10 + 's';
    leaf.style.opacity = 0.4 + Math.random() * 0.4;
    container.appendChild(leaf);
  }
}

function createPumpkins() {
  if (isMobile()) return;
  const tl = document.createElement('div');
  tl.className = 'pumpkin-corner tl';
  tl.textContent = '🎃';
  document.body.appendChild(tl);
  const br = document.createElement('div');
  br.className = 'pumpkin-corner br';
  br.textContent = '🎃';
  document.body.appendChild(br);
}

function createSpookyDots() {
  if (isMobile()) return;
  for (let i = 0; i < 12; i++) {
    const dot = document.createElement('div');
    dot.className = 'spooky-dot';
    dot.style.left = Math.random() * 100 + '%';
    dot.style.top = Math.random() * 100 + '%';
    dot.style.animationDelay = Math.random() * 3 + 's';
    document.body.appendChild(dot);
  }
}

function enableHalloweenCursor() {
  if (isMobile()) return;
  document.body.classList.add('halloween-cursor');
}

function init() {
  if (isReduced()) return;
  createLeafFall();
  createPumpkins();
  createSpookyDots();
  enableHalloweenCursor();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
