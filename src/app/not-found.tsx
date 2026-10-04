import { portfolioContent } from '@/content/portfolio';

export default function NotFound() {
  const { ui } = portfolioContent;
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <p className="mono">404</p>
      <h1 id="not-found-title" className="statement">{ui.pageMissing}</h1>
      <p>{ui.pageMissingSummary}</p>
      <div className="contact__actions">
        <a className="text-link text-link--primary" href="/#work">{ui.backToWork}<span aria-hidden="true">↘</span></a>
        <a className="text-link" href="/">{ui.home}</a>
      </div>
    </section>
  );
}
