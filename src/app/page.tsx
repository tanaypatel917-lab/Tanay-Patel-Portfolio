import { CarsSection } from '@/components/Cars/CarsSection';
import { DisciplinesStrip } from '@/components/Portfolio/DisciplinesStrip';
import { EvidenceList } from '@/components/Portfolio/EvidenceList';
import { Hero } from '@/components/Portfolio/Hero';
import { ProjectPoster } from '@/components/Portfolio/ProjectPoster';
import { SignalCanvas } from '@/components/Portfolio/SignalCanvas';
import { Statement } from '@/components/Portfolio/Statement';
import { portfolioContent } from '@/content/portfolio';

export default function Home() {
  const { chapters, projects, evidence, disciplines, intro, ui } = portfolioContent;

  return (
    <>
      <Hero />
      <section id="work" className="section work" aria-labelledby="work-title" tabIndex={-1}>
        <Statement id="work-title" text={chapters.work} className="statement section__statement" />
        <ol className="work__list" role="list">
          {projects.map((project) => (
            <li key={project.id}>
              <article className={`work-entry work-entry--${project.presentation.kind}`} aria-labelledby={`${project.id}-title`}>
                <header className="work-entry__header">
                  <div className="work-entry__meta mono"><span>{project.eyebrow}</span><span>{project.status}</span></div>
                  <h3 id={`${project.id}-title`}>{project.title}</h3>
                  <p className="work-entry__summary">{project.summary}</p>
                </header>
                {project.presentation.kind === 'signal' ? (
                  <>
                    <figure className="work-entry__signal">
                      <SignalCanvas className="work-signal" />
                      <figcaption className="mono">{ui.signalDisclaimer}</figcaption>
                    </figure>
                    <dl className="work-stages">
                      {project.presentation.panels.map((panel) => (
                        <div key={panel.label}><dt className="mono">{panel.label}</dt><dd>{panel.text}</dd></div>
                      ))}
                    </dl>
                    <p className="work-entry__caveat">{project.proof}</p>
                  </>
                ) : (
                  <ProjectPoster title={project.title} tone="accent" panels={project.presentation.panels} />
                )}
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section id="proof" className="section proof" aria-labelledby="proof-title" tabIndex={-1}>
        <Statement id="proof-title" text={chapters.proof} strike />
        <EvidenceList items={evidence} />
        <DisciplinesStrip items={disciplines} intro={intro.summary} />
      </section>

      <CarsSection />
    </>
  );
}
