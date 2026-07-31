// Bladewise — minimal client enhancements (no dependencies)

// Keyboard shortcut: "/" focuses the search box
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
    const box = document.querySelector('.search input');
    if (box) { e.preventDefault(); box.focus(); }
  }
});

// Auto-dismiss flash messages after a few seconds
const flash = document.querySelector('.flash');
if (flash) {
  setTimeout(() => {
    flash.style.transition = 'opacity .4s';
    flash.style.opacity = '0';
    setTimeout(() => flash.remove(), 400);
  }, 3500);
}
