// The app bar: music player on the left, section tabs in the middle. Sticky.
import { Link, useLocation } from '@tanstack/react-router'
import { SECTIONS, type Section } from '#/content/site'
import { isWindowPath, pathForSection, scrollToSection, sectionFromPath, useActiveSection } from '#/lib/sections'
import { Player } from './Player'

export function AppBar() {
  const pathname = useLocation({ select: (l) => l.pathname })
  const active = useActiveSection(sectionFromPath(pathname))

  return (
    <header className="appbar">
      <div className="appbar-inner">
        <Player />
        <nav className="tabs" aria-label="Sections">
          {SECTIONS.map((section: Section) => (
            <Link
              key={section}
              to={pathForSection(section)}
              resetScroll={false}
              className="tab"
              aria-current={active === section ? 'page' : undefined}
              onClick={(e) => {
                // Already there (and nothing opened): just scroll back to it.
                if (pathname === pathForSection(section) && !isWindowPath(pathname)) {
                  e.preventDefault()
                  scrollToSection(section)
                }
              }}
            >
              {section}
            </Link>
          ))}
        </nav>
        <span className="appbar-end" />
      </div>
    </header>
  )
}
