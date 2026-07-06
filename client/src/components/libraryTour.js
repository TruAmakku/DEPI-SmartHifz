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

const buildSteps = (blueprint, t) =>
  blueprint
    .filter(({ sel }) => isVisible(document.querySelector(sel)))
    .map(({ sel, titleKey, bodyKey, side, align }) => ({
      element: sel,
      popover: { title: t(titleKey), description: t(bodyKey), side, align },
    }));

const makeDriver = ({ t, steps, single = false, onDone }) => {

  const isDark = document.documentElement.classList.contains('dark');
  const tour = driver({
    showProgress: !single,

    showButtons: single ? ['next', 'close'] : ['next', 'previous', 'close'],
    allowClose: true,

    overlayColor: isDark ? 'rgb(0, 0, 0)' : 'rgba(3, 25, 18, 0.6)',
    overlayOpacity: isDark ? 0.82 : 0.7,
    stagePadding: 6,
    stageRadius: 12,
    popoverClass: 'qt-tour',
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.back'),
    doneBtnText: single ? t('tour.gotIt') : t('tour.done'),
    progressText: t('tour.progress'),
    steps,
    onHighlightStarted: (el) => centerTarget(el),
    onHighlighted: (_el, _step, { driver }) => refreshPopover(driver),
    onDestroyed: () => { onDone?.(); },
  });
  tour.drive();
  return tour;
};

export function startLibraryTour({ t, onDone } = {}) {
  const steps = buildSteps([
    { sel: '[data-tour="lib-nav"]',      titleKey: 'libraryTour.navTitle',      bodyKey: 'libraryTour.navBody',      side: 'bottom', align: 'start' },
    { sel: '[data-tour="lib-audio"]',    titleKey: 'libraryTour.audioTitle',    bodyKey: 'libraryTour.audioBody',    side: 'top',    align: 'start' },
    { sel: '[data-tour="lib-verse"]',    titleKey: 'libraryTour.verseTitle',    bodyKey: 'libraryTour.verseBody',    side: 'bottom', align: 'start' },
    { sel: '[data-tour="lib-memorize"]', titleKey: 'libraryTour.memorizeTitle', bodyKey: 'libraryTour.memorizeBody', side: 'bottom', align: 'start' },
  ], t);
  if (steps.length === 0) { onDone?.(); return undefined; }
  return makeDriver({ t, steps, onDone });
}

export function startMemorizeTour({ t, onDone } = {}) {
  const steps = buildSteps([
    { sel: '[data-tour="mem-test"]',  titleKey: 'libraryTour.memTestTitle',   bodyKey: 'libraryTour.memTestBody',   side: 'bottom', align: 'start' },
    { sel: '[data-tour="lib-verse"]', titleKey: 'libraryTour.memRevealTitle', bodyKey: 'libraryTour.memRevealBody', side: 'bottom', align: 'start' },
    { sel: '[data-tour="mem-mark"]',  titleKey: 'libraryTour.memMarkTitle',   bodyKey: 'libraryTour.memMarkBody',   side: 'top',    align: 'start' },
  ], t);
  if (steps.length === 0) { onDone?.(); return undefined; }
  return makeDriver({ t, steps, onDone });
}

export function startVerseActionsCoachmark({ t, onDone } = {}) {
  if (!isVisible(document.querySelector('[data-tour="verse-actions"]'))) {
    onDone?.();
    return undefined;
  }
  const steps = [{
    element: '[data-tour="verse-actions"]',
    popover: { title: t('libraryTour.coachTitle'), description: t('libraryTour.coachBody'), side: 'top', align: 'center' },
  }];
  return makeDriver({ t, steps, single: true, onDone });
}
