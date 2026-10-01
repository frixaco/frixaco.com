// Presentational sections shared by the map and the index.
import { useState } from "react";
import { motion } from "motion/react";
import {
  about,
  favoriteAnime,
  favoriteArtists,
  favoriteMusic,
  avatar,
  contacts,
  resume,
  roles,
  sourceUrl,
  workHtml,
  type Project,
} from "./content";
import { formatDuration, monthsBetween, type YearMonth } from "./markdown";
import { cx, ease, useReducedMotion } from "./ui";

// The one primary call to action: the résumé, styled identically everywhere.
export function ResumeButton({
  label = "Résumé",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <a
      className={cx("resume-button nodrag nopan", className)}
      href={resume}
      target="_blank"
      rel="noreferrer"
    >
      {label} <small>PDF</small> <span aria-hidden>↗</span>
    </a>
  );
}

const today = new Date();
const current: YearMonth = {
  year: today.getFullYear(),
  month: today.getMonth(),
};
const monthIndex = (value: YearMonth) => value.year * 12 + value.month;

export function WorkTimeline() {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  if (!roles.length)
    return (
      <div className="prose" dangerouslySetInnerHTML={{ __html: workHtml }} />
    );
  const firstYear = Math.min(...roles.map((role) => role.start.year));
  const axisStart = firstYear * 12;
  const axisEnd = (current.year + 1) * 12;
  const at = (month: number) =>
    `${((month - axisStart) / (axisEnd - axisStart)) * 100}%`;
  const years = Array.from(
    { length: current.year - firstYear + 1 },
    (_, i) => firstYear + i,
  );
  const span = (role: (typeof roles)[number]) =>
    monthsBetween(role.start, role.end ?? current);
  const total = monthsBetween(
    roles.reduce((a, b) => (monthIndex(b.start) < monthIndex(a.start) ? b : a))
      .start,
    current,
  );
  const hoverProps = (i: number) => ({
    onPointerEnter: () => setHover(i),
    onPointerLeave: () => setHover(null),
  });
  return (
    <div className="work-timeline">
      <header className="section-card-head">
        <div>
          <p className="kicker">Experience</p>
          <h3>Where I've worked</h3>
        </div>
        <div className="head-aside">
          <p>
            <strong>{Math.floor(total / 12)}+ years</strong>
            <span>
              {roles.length} roles since {firstYear}
            </span>
          </p>
          <ResumeButton label="Full résumé" className="is-feature" />
        </div>
      </header>
      {/* Visual summary only; the role list below carries the same facts. */}
      <div className="gantt" aria-hidden>
        <div className="gantt-axis">
          {years.map((year) => (
            <span key={year} style={{ left: at(year * 12) }}>
              {year}
            </span>
          ))}
        </div>
        {roles.map((role, i) => (
          <div
            key={role.name}
            className={cx(
              "gantt-row",
              hover === i && "is-hover",
              !role.end && "is-current",
            )}
            {...hoverProps(i)}
          >
            <span className="gantt-label">{role.name}</span>
            <span className="gantt-track">
              <motion.span
                className="gantt-bar"
                style={{
                  left: at(monthIndex(role.start)),
                  width: `calc(${at(monthIndex(role.end ?? current) + 1)} - ${at(monthIndex(role.start))})`,
                }}
                initial={{ scaleX: reduce ? 1 : 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: reduce ? 0 : 0.8,
                  delay: reduce ? 0 : 0.15 + (roles.length - i) * 0.08,
                  ease,
                }}
              />
            </span>
          </div>
        ))}
        <div className="gantt-overlay">
          <span
            className="gantt-now"
            style={{ left: at(monthIndex(current) + 0.5) }}
          >
            <span>now</span>
          </span>
        </div>
      </div>
      <ol className="role-grid">
        {roles.map((role, i) => (
          <li
            key={role.name}
            className={cx(
              "role-card",
              hover === i && "is-hover",
              !role.end && "is-current",
            )}
            {...hoverProps(i)}
          >
            <div className="role-head">
              <h4 dangerouslySetInnerHTML={{ __html: role.nameHtml }} />
              {!role.end && <span className="status">Now</span>}
            </div>
            <p className="role-period">
              {role.period} <span aria-hidden>·</span>{" "}
              {formatDuration(span(role))}
            </p>
            <p
              className="role-summary"
              dangerouslySetInnerHTML={{ __html: role.summaryHtml }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AboutProfile() {
  const facts = about.facts.slice(1);
  return (
    <div className="about-profile">
      <img
        className="about-portrait"
        src={avatar}
        alt="Profile avatar"
        width="116"
        height="116"
      />
      <header className="about-id">
        <h3>Hi,</h3>
        <p className="about-lead">
          I'm a software engineer working across multiple stacks.
        </p>
        {facts.length > 0 && (
          <div className="about-bio">
            {facts.map((fact) => (
              <p key={fact} dangerouslySetInnerHTML={{ __html: fact }} />
            ))}
          </div>
        )}
      </header>
      <div className="about-interests">
        <section className="about-section about-setup">
          <h4>Dev Setup</h4>
          <a
            className="dotfiles-link"
            href={sourceUrl("dotfiles")}
            target="_blank"
            rel="noreferrer"
          >
            Dotfiles <span aria-hidden>↗</span>
          </a>
        </section>
        {about.learning.length > 0 && (
          <section className="about-section">
            <h4>Making & learning</h4>
            <ul className="learning-list">
              <li>
                <strong>Drawing</strong>
                <p>I love {favoriteArtists.join(", ")}.</p>
              </li>
              {about.learning.map((item) => (
                <li
                  key={item.subject}
                  className={cx(item.paused && "is-paused")}
                >
                  <strong>{item.subject}</strong>
                  {item.paused && <small>Paused</small>}
                  <p dangerouslySetInnerHTML={{ __html: item.html }} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {(about.watching || about.playing) && (
          <section className="about-section">
            <h4>Downtime</h4>
            <dl className="about-downtime">
              {about.watching && (
                <div>
                  <dt>Anime & manga</dt>
                  <dd>
                    <p dangerouslySetInnerHTML={{ __html: about.watching.html }} />
                    <p className="about-favorites">
                      <strong>Favorite anime:</strong> {favoriteAnime.join(", ")}
                    </p>
                  </dd>
                </div>
              )}
              <div>
                <dt>Music</dt>
                <dd>{favoriteMusic.join(", ")}</dd>
              </div>
              {about.playing && (
                <div>
                  <dt>Gaming</dt>
                  <dd dangerouslySetInnerHTML={{ __html: about.playing }} />
                </div>
              )}
            </dl>
          </section>
        )}
      </div>
      <footer className="about-footer">
        <ResumeButton />
        <nav className="about-links" aria-label="Elsewhere">
          {contacts.map((link) => (
            <a
              key={link.href}
              className="nodrag nopan"
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  );
}

// Real screenshots/recordings when a project has them; otherwise an animated
// diagram of how it works, so the slot is never an empty box.
export function ProjectVisual({ project }: { project: Project }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const media = project.media ?? [];
  if (media.length) {
    const item = media[Math.min(index, media.length - 1)];
    return (
      <figure className="project-visual has-media">
        <div className="visual-frame">
          {item.type === "video" ? (
            <video
              key={item.src}
              src={item.src}
              poster={item.poster}
              aria-label={item.alt}
              muted
              loop
              playsInline
              autoPlay={!reduce}
              controls
            />
          ) : (
            <img key={item.src} src={item.src} alt={item.alt} />
          )}
        </div>
        <figcaption>
          <span>{item.alt}</span>
          {media.length > 1 && (
            <span className="visual-thumbs">
              {media.map((entry, i) => (
                <button
                  key={`${i}-${entry.src}`}
                  className="nodrag nopan"
                  aria-label={`Show ${entry.alt}`}
                  aria-pressed={i === index}
                  onClick={() => setIndex(i)}
                >
                  {String(i + 1).padStart(2, "0")}
                </button>
              ))}
            </span>
          )}
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="project-visual">
      <div className="visual-frame is-diagram">
        <div className="visual-bar" aria-hidden>
          <span />
          <span />
          <span />
          <code>~/{project.id}</code>
        </div>
        <div className="flow-stage">
          <ol className="flow-diagram" aria-label="How it works">
            {project.flow.map((step, i) => (
              <motion.li
                key={step}
                initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduce ? 0 : 0.45,
                  delay: reduce ? 0 : 0.18 + i * 0.09,
                  ease,
                }}
              >
                <span className="flow-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step}
              </motion.li>
            ))}
          </ol>
          {!reduce && (
            <motion.span
              className="flow-pulse"
              aria-hidden
              initial={{ left: "4%", opacity: 0 }}
              animate={{ left: ["4%", "96%"], opacity: [0, 1, 1, 0] }}
              transition={{
                duration: 2.6,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.5,
                delay: 0.6,
              }}
            />
          )}
        </div>
      </div>
      <figcaption>
        <span>How it works</span>
      </figcaption>
    </figure>
  );
}
