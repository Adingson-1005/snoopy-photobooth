const screens = document.querySelectorAll('.screen');

function showScreen(id) {
  screens.forEach(s => s.classList.toggle('active', s.id === id));
}

document.getElementById('startBtn')
  .addEventListener('click', () => showScreen('editor'));

  // Floating hearts & stars
const floatersEl = document.getElementById('floaters');
const symbols = ['💗', '⭐', '✨', '🌸', '💛'];

for (let i = 0; i < 18; i++) {
  const el = document.createElement('span');
  el.className = 'floater';
  el.textContent = symbols[i % symbols.length];
  el.style.left = Math.random() * 100 + '%';
  el.style.fontSize = 14 + Math.random() * 18 + 'px';
  el.style.animationDuration = 8 + Math.random() * 10 + 's';
  el.style.animationDelay = -Math.random() * 15 + 's';
  floatersEl.appendChild(el);
}