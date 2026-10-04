'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useMotion } from '@/components/shared/MotionProvider';
import { useSound } from '@/components/shared/SoundProvider';
import { portfolioContent } from '@/content/portfolio';
import { EASE_OUT, gsap } from '@/lib/motion';

interface MenuOverlayProps {
  id: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen menu for phones: links stagger up out of the substrate, scroll is
 * held while it is open, native modal semantics contain focus and make the page
 * inert, and Escape closes it. The theme follows the page into night.
 */
export function MenuOverlay({ id, open, onClose }: MenuOverlayProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const releaseLock = useRef<(() => void) | null>(null);
  const animation = useRef<gsap.core.Animation | null>(null);
  const navigating = useRef(false);
  const { acquireScrollLock, navigateTo, reduced, systemReduced, documentVisible, toggleMotionReduction } = useMotion();
  const { enabled, toggle, status } = useSound();
  const { navigation, contact, ui } = portfolioContent;
  const [, ...links] = navigation;
  const [email] = contact.links;
  const soundLabel = status === 'loading' ? ui.soundLoading : status === 'blocked' ? ui.soundBlocked : status === 'error' ? ui.soundUnavailable : enabled ? ui.soundOn : ui.soundOff;

  const finishClose = useCallback(() => {
    animation.current?.kill();
    animation.current = null;
    ref.current?.close();
    releaseLock.current?.();
    releaseLock.current = null;
    if (!navigating.current && document.visibilityState === 'visible') restoreFocus.current?.focus({ preventScroll: true });
  }, []);

  // Open / close choreography.
  useLayoutEffect(() => {
    const overlay = ref.current;
    if (!overlay) return;
    animation.current?.kill();
    animation.current = null;
    if (open) {
      navigating.current = false;
      if (!overlay.open) {
        restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        overlay.showModal();
        releaseLock.current = acquireScrollLock('menu');
      }
      closeRef.current?.focus({ preventScroll: true });
      if (reduced) {
        gsap.set([overlay, ...Array.from(overlay.querySelectorAll('.menu__item'))], { opacity: 1, clearProps: 'transform' });
      } else {
        animation.current = gsap.timeline({ defaults: { ease: EASE_OUT } })
          .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 })
          .fromTo(overlay.querySelectorAll('.menu__item'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, stagger: 0.035 }, 0.04);
      }
    } else if (overlay.open) {
      if (reduced || !documentVisible) finishClose();
      else animation.current = gsap.to(overlay, { opacity: 0, duration: 0.18, ease: 'power2.out', onComplete: finishClose });
    }
    return () => {
      animation.current?.kill();
      animation.current = null;
    };
  }, [open, reduced, acquireScrollLock, documentVisible, finishClose]);

  // Native modal focus, document visibility, and breakpoint cleanup.
  useEffect(() => {
    if (!open) return;
    if (!documentVisible) {
      finishClose();
      onClose();
      return;
    }
    const media = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (media.matches) {
        finishClose();
        onClose();
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [open, documentVisible, finishClose, onClose]);

  useEffect(() => () => {
    animation.current?.kill();
    releaseLock.current?.();
    releaseLock.current = null;
  }, []);

  const onNavigate = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname !== '/' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigating.current = true;
    finishClose();
    onClose();
    navigateTo(href);
  };

  return (
    <dialog ref={ref} id={id} className="menu" aria-label={ui.menu} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="menu__bar">
        <span className="menu__item menu__mark">{portfolioContent.identity.name}</span>
        <button ref={closeRef} type="button" className="menu__item menu__close" onClick={onClose}>{ui.close}</button>
      </div>
      <ul className="menu__links">
        {links.map(({ target, href, label }) => (
          <li key={target} className="menu__item">
            <a href={pathname === '/' ? href : `/${href}`} onClick={(event) => onNavigate(event, href)}>{label}</a>
          </li>
        ))}
      </ul>
      <div className="menu__foot">
        <a className="menu__item text-link" href={email.href}>{email.value}</a>
        <div className="menu__preferences">
          <button type="button" className="menu__item text-link" aria-pressed={enabled} onClick={toggle}>{soundLabel}</button>
          <button type="button" className="menu__item text-link" aria-label={ui.reduceMotion} aria-pressed={reduced} disabled={systemReduced} onClick={toggleMotionReduction}>{systemReduced ? ui.motionSystem : reduced ? ui.motionReduced : ui.motionFull}</button>
        </div>
      </div>
    </dialog>
  );
}
