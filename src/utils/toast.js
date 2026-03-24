let _timer = null;

export function showToast(msg, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast toast--${type}`;
  el.style.display = 'block';
  clearTimeout(_timer);
  _timer = setTimeout(() => { el.style.display = 'none'; }, 2400);
}
