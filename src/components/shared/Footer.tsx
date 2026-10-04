'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Reveal } from './Reveal';
import { useMotion } from './MotionProvider';
import { Statement } from '@/components/Portfolio/Statement';
import { portfolioContent } from '@/content/portfolio';

export function Footer() {
  const { identity, contact, ui } = portfolioContent;
  const pathname = usePathname();
  const [email, linkedIn] = contact.links;
  const { ready, reduced, systemReduced, locked, requestIntroReplay, toggleMotionReduction } = useMotion();
  const [feedback, setFeedback] = useState('');
  const mounted = useRef(false);
  const copying = useRef(false);
  const reset = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(reset.current);
    };
  }, []);

  const copyEmail = async () => {
    if (copying.current) return;
    copying.current = true;
    window.clearTimeout(reset.current);
    try {
      await navigator.clipboard.writeText(email.value);
      if (mounted.current) setFeedback(ui.emailCopied);
    } catch {
      if (mounted.current) setFeedback(ui.copyUnavailable);
    } finally {
      copying.current = false;
      if (mounted.current) reset.current = window.setTimeout(() => setFeedback(''), 3500);
    }
  };

  return (
    <footer className="site-footer night">
      <section id="contact" className="contact" aria-labelledby="contact-title" tabIndex={-1}>
        <Statement id="contact-title" text={contact.title} />
        <Reveal><p className="contact__summary">{contact.summary}</p></Reveal>
        <Reveal delay={0.1}>
          <a href={email.href} className="contact__email">{email.value}</a>
          <div className="contact__actions">
            <a href={linkedIn.href} target="_blank" rel="noreferrer" className="text-link">
              {linkedIn.label}<span aria-hidden="true">↗</span>
            </a>
            {ready ? <button type="button" className="text-link" onClick={copyEmail}>{ui.copyEmail}</button> : null}
          </div>
          <p className="contact__feedback mono" role="status" aria-live="polite">{feedback}</p>
        </Reveal>
      </section>

      <div className="site-footer__baseline">
        <p className="mono">{identity.name}, {identity.location}</p>
        <div className="site-footer__tools">
          {ready ? (
            <>
              {pathname === '/' ? <button type="button" className="text-link" disabled={reduced || locked} onClick={requestIntroReplay}>{ui.replayIntro}</button> : null}
              <button type="button" className="text-link" aria-label={ui.reduceMotion} aria-pressed={reduced} disabled={systemReduced} onClick={toggleMotionReduction}>
                {systemReduced ? ui.motionSystem : reduced ? ui.motionReduced : ui.motionFull}
              </button>
            </>
          ) : null}
          <a href={pathname === '/' ? '#top' : '/#top'} className="text-link">Back to top <span aria-hidden="true">↑</span></a>
        </div>
      </div>
      <p className="site-footer__ghost" aria-hidden="true">{identity.name}</p>
    </footer>
  );
}
