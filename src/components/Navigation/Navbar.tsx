'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MenuOverlay } from './MenuOverlay';
import { useMotion } from '@/components/shared/MotionProvider';
import { useSound } from '@/components/shared/SoundProvider';
import { portfolioContent } from '@/content/portfolio';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const sectionHref = (href: string) => pathname === '/' ? href : `/${href}`;
  const { activeSection, ready } = useMotion();
  const { enabled, toggle, status } = useSound();
  const { identity, navigation, ui } = portfolioContent;
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [topLink, ...sectionLinks] = navigation;
  const soundLabel = status === 'loading' ? ui.soundLoading : status === 'blocked' ? ui.soundBlocked : status === 'error' ? ui.soundUnavailable : enabled ? ui.soundOn : ui.soundOff;

  return (
    <>
      <header className="site-header" data-enhanced={ready ? '' : undefined}>
        <nav className="site-nav" aria-label="Primary">
          <a href={sectionHref(topLink.href)} className="site-nav__mark">{identity.name}</a>
          <ul className="site-nav__links">
            {sectionLinks.map(({ target, href, label }) => (
              <li key={target}>
                <a href={sectionHref(href)} className={activeSection === target ? 'is-active' : undefined} aria-current={activeSection === target ? 'location' : undefined}>
                  {label}
                </a>
              </li>
            ))}
            {ready ? (
              <li>
                <button type="button" className="site-nav__sound" aria-pressed={enabled} onClick={toggle}>{soundLabel}</button>
              </li>
            ) : null}
          </ul>
          {ready ? (
            <button type="button" className="site-nav__menu" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(true)}>
              {ui.menu}
            </button>
          ) : null}
        </nav>
      </header>
      <MenuOverlay id="site-menu" open={menuOpen} onClose={closeMenu} />
    </>
  );
}
