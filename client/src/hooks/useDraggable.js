import { useRef, useState, useCallback, useEffect } from 'react';

export function useDraggable(storageKey, { axis } = {}) {
  const ref = useRef(null);
  const moved = useRef(false);

  const [pos, setPos] = useState(() => {
    if (!storageKey) return { x: 0, y: 0 };
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
    } catch {}
    return { x: 0, y: 0 };
  });

  const onPointerDown = useCallback((e) => {
    if (e.button != null && e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    moved.current = false;

    const start = {
      px: e.clientX,
      py: e.clientY,
      x: pos.x,
      y: pos.y,
      naturalLeft: rect.left - pos.x,
      naturalTop: rect.top - pos.y,
      w: rect.width,
      h: rect.height,
    };
    const margin = 8;

    const onMove = (ev) => {
      const dx = ev.clientX - start.px;
      const dy = ev.clientY - start.py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;

      let nx = axis === 'y' ? start.x : start.x + dx;
      let ny = axis === 'x' ? start.y : start.y + dy;

      const minX = -start.naturalLeft + margin;
      const maxX = window.innerWidth - start.w - start.naturalLeft - margin;
      const minY = -start.naturalTop + margin;
      const maxY = window.innerHeight - start.h - start.naturalTop - margin;
      nx = Math.min(Math.max(nx, minX), maxX);
      ny = Math.min(Math.max(ny, minY), maxY);

      setPos({ x: nx, y: ny });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [pos, axis]);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(pos));
  }, [pos, storageKey]);

  return {
    ref,
    style: { transform: `translate(${pos.x}px, ${pos.y}px)` },
    moved,
    dragHandlers: { onPointerDown },
  };
}
