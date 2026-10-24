function createLeafFall() {
  const container = document.createElement('div');
  container.id = 'leaf-fall';
  document.body.appendChild(container);

  const leaves = ['🍂', '🍁'];
  const count = window.innerWidth < 720 ? 8 : 15;

  for (let i = 0; i < count; i++) {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.textContent = leaves[Math.floor(Math.random() * leaves.length)];
    leaf.style.left = Math.random() * 100 + '%';
    leaf.style.fontSize = (14 + Math.random() * 16) + 'px';
    leaf.style.animationDuration = (8 + Math.random() * 10) + 's';
    leaf.style.animationDelay = Math.random() * 10 + 's';
    leaf.style.opacity = 0.4 + Math.random() * 0.4;
    container.appendChild(leaf);
  }
}

function createPumpkins() {
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
  for (let i = 0; i < 20; i++) {
    const dot = document.createElement('div');
    dot.className = 'spooky-dot';
    dot.style.left = Math.random() * 100 + '%';
    dot.style.top = Math.random() * 100 + '%';
    dot.style.animationDelay = Math.random() * 3 + 's';
    document.body.appendChild(dot);
  }
}

function enableHalloweenCursor() {
  document.body.classList.add('halloween-cursor');
}

document.addEventListener('DOMContentLoaded', () => {
  createLeafFall();
  createPumpkins();
  createSpookyDots();
  enableHalloweenCursor();
});
