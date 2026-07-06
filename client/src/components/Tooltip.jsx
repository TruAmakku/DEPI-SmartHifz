import { useState, useRef, useLayoutEffect, useCallback, cloneElement, isValidElement } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;
const MARGIN = 8;

export default function Tooltip({ label, children, placement = 'top', className = '' }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const bubbleRef = useRef(null);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => { setOpen(false); setVisible(false); setPos(null); }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !bubbleRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const b = bubbleRef.current.getBoundingClientRect();

    let place = placement;
    if (place === 'top' && t.top < b.height + GAP + MARGIN) place = 'bottom';
    else if (place === 'bottom' && t.bottom + b.height + GAP + MARGIN > window.innerHeight) place = 'top';

    const centerX = t.left + t.width / 2;
    let left = centerX - b.width / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - b.width - MARGIN));
    const top = place === 'top' ? t.top - b.height - GAP : t.bottom + GAP;

    setPos({ top, left, place, arrow: centerX - left });
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open, placement, label]);

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children, {
    'aria-label': children.props['aria-label'] ?? (typeof label === 'string' ? label : undefined),
  });

  const onTop = pos?.place === 'top';

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      {open && label && createPortal(
        <span
          ref={bubbleRef}
          role="tooltip"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 9999 }}
          className={`pointer-events-none max-w-[220px] rounded-md bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg transition-opacity duration-150 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {label}
          <span
            className="absolute w-2 h-2 rotate-45 bg-gray-900 dark:bg-gray-700"
            style={{
              left: pos ? Math.max(8, Math.min(pos.arrow, 212)) - 4 : '50%',
              [onTop ? 'bottom' : 'top']: -4,
            }}
          />
        </span>,
        document.body
      )}
    </span>
  );
}
