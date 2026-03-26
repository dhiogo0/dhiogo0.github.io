/**
 * Minimal DOM morphing: atualiza `container` para refletir `html`
 * sem substituir elementos existentes — evita pisca-pisca no re-render.
 */

function _syncAttrs(from, to) {
  for (let i = from.attributes.length - 1; i >= 0; i--) {
    const { name } = from.attributes[i];
    if (name === 'xmlns') continue;
    if (!to.hasAttribute(name)) from.removeAttribute(name);
  }
  for (let i = 0; i < to.attributes.length; i++) {
    const { name, value } = to.attributes[i];
    if (name === 'xmlns') continue;
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }
}

function _morphChildren(from, to) {
  const fc = [...from.childNodes];
  const tc = [...to.childNodes];
  const len = Math.max(fc.length, tc.length);

  for (let i = 0; i < len; i++) {
    const f = fc[i];
    const t = tc[i];

    if (!t) {
      from.removeChild(f);
    } else if (!f) {
      from.appendChild(t.cloneNode(true));
    } else if (
      f.nodeType !== t.nodeType ||
      (f.nodeType === 1 && f.tagName !== t.tagName)
    ) {
      from.replaceChild(t.cloneNode(true), f);
    } else if (f.nodeType === 3) {
      if (f.textContent !== t.textContent) f.textContent = t.textContent;
    } else if (
      f.nodeType === 1 &&
      f.getAttribute('data-morph-key') !== null &&
      f.getAttribute('data-morph-key') !== t.getAttribute('data-morph-key')
    ) {
      from.replaceChild(t.cloneNode(true), f);
    } else {
      _syncAttrs(f, t);
      _morphChildren(f, t);
    }
  }
}

export function morphHTML(container, html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  _morphChildren(container, tmp);
}
