// The app bar: music player on the left, section tabs in the middle. Sticky.
import { Link, useLocation } from '@tanstack/react-router'
import { SECTIONS, more, type Section } from '#/content/site'
import { isWindowPath, pathForSection, scrollToSection } from '#/lib/sections'
import { Player } from './Player'

export function AppBar() {
  const pathname = useLocation({ select: (l) => l.pathname })

  return (
    <header className="appbar">
      <div className="appbar-inner">
        <Player />
        {/* The router marks the tab matching the URL as current (aria-current="page"). */}
        <nav className="tabs" aria-label="Sections">
          {SECTIONS.map((section: Section) => (
            <Link
              key={section}
              to={pathForSection(section)}
              resetScroll={false}
              className="tab"
              onClick={(e) => {
                // Already there (and nothing opened): just scroll back to it.
                if (pathname === pathForSection(section) && !isWindowPath(pathname)) {
                  e.preventDefault()
                  scrollToSection(section)
                }
              }}
            >
              {section}
              {section === 'more' ? <span className="visually-hidden">{` ${more.linkSuffix}`}</span> : null}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
