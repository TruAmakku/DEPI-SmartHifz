import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const isVisible = (el) => !!el && el.getClientRects().length > 0;

const centerTarget = (el) => {
  if (!el) return;
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  requestAnimationFrame(() => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
};

const refreshPopover = (driver) => {
  requestAnimationFrame(() => { try { driver.refresh(); } catch {} });
};

export function startDashboardTour({ t, onDone } = {}) {

  const isDark = document.documentElement.classList.contains('dark');

  const blueprint = [
    { sel: '[data-tour="new-mem"]', titleKey: 'tour.newMemTitle', bodyKey: 'tour.newMemBody', side: 'bottom', align: 'start' },
    { sel: '[data-tour="listen"]',  titleKey: 'tour.listenTitle', bodyKey: 'tour.listenBody', side: 'bottom', align: 'start' },
    { sel: '[data-tour="review"]',  titleKey: 'tour.reviewTitle', bodyKey: 'tour.reviewBody', side: 'bottom', align: 'start' },
    { sel: '[data-tour="streak"]',  titleKey: 'tour.streakTitle', bodyKey: 'tour.streakBody', side: 'bottom', align: 'start' },
    { sel: '[data-tour="settings"]', titleKey: 'tour.settingsTitle', bodyKey: 'tour.settingsBody', side: 'bottom', align: 'end' },
  ];

  const steps = blueprint
    .filter(({ sel }) => isVisible(document.querySelector(sel)))
    .map(({ sel, titleKey, bodyKey, side, align }) => ({
      element: sel,
      popover: { title: t(titleKey), description: t(bodyKey), side, align },
    }));

  if (steps.length === 0) {
    onDone?.();
    return undefined;
  }

  const tour = driver({
    showProgress: true,
    allowClose: true,

    overlayColor: isDark ? 'rgb(0, 0, 0)' : 'rgba(3, 25, 18, 0.6)',
    overlayOpacity: isDark ? 0.82 : 0.7,
    stagePadding: 6,
    stageRadius: 12,
    popoverClass: 'qt-tour',
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.back'),
    doneBtnText: t('tour.done'),
    progressText: t('tour.progress'),
    steps,
    onHighlightStarted: (el) => centerTarget(el),
    onHighlighted: (_el, _step, { driver }) => refreshPopover(driver),
    onDestroyed: () => { onDone?.(); },
  });

  tour.drive();
  return tour;
}
