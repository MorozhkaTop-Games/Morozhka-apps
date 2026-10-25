const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const isReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function createLeafFall() {
  const mobile = isMobile();
  const count = mobile ? 3 : 12;
  const c = document.createElement('div');
  c.id = 'leaf-fall';
  document.body.appendChild(c);
  const icons = ['🍂', '🍁'];
  for (let i = 0; i < count; i++) {
    const l = document.createElement('div');
    l.className = 'leaf';
    l.textContent = icons[i % 2];
    l.style.left = Math.random() * 100 + '%';
    l.style.fontSize = (mobile ? 12 : 14 + Math.random() * 16) + 'px';
    l.style.animationDuration = (mobile ? 16 : 8 + Math.random() * 10) + 's';
    l.style.animationDelay = Math.random() * 10 + 's';
    c.appendChild(l);
  }
}
function createPumpkins() {
  if (isMobile()) return;
  const tl = document.createElement('div');
  tl.className = 'pumpkin-corner tl'; tl.textContent = '🎃';
  const br = document.createElement('div');
  br.className = 'pumpkin-corner br'; br.textContent = '🎃';
  document.body.appendChild(tl); document.body.appendChild(br);
}
function createSpookyDots() {
  if (isMobile()) return;
  for (let i = 0; i < 12; i++) {
    const d = document.createElement('div');
    d.className = 'spooky-dot';
    d.style.left = Math.random() * 100 + '%';
    d.style.top = Math.random() * 100 + '%';
    d.style.animationDelay = Math.random() * 3 + 's';
    document.body.appendChild(d);
  }
}
function init() {
  if (isReduced()) return;
  createLeafFall(); createPumpkins(); createSpookyDots();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
