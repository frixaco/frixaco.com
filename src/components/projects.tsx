import { useEffect } from 'react'
import { shouldIgnoreKey } from '@/lib/hotkeys'

const projects = [
  {
    id: 1,
    key: '1',
    title: 'anitrack',
    url: 'https://github.com/frixaco/anitrack',
    tags: ['letui', 'typescript', 'rust'],
    description:
      'Simple TUI to help me watch anime in 4k without extra steps, built with my TUI library - letui',
  },
  {
    id: 2,
    key: '2',
    title: 'aitetsu',
    url: 'https://github.com/frixaco/aitetsu',
    tags: ['tauri', 'typescript', 'rust'],
    description:
      'High performance infinite canvas note-taking and AI chat web and desktop app',
  },
  {
    id: 3,
    key: '3',
    title: 'letui',
    url: 'https://github.com/frixaco/letui',
    tags: ['rust', 'typescript', 'bun'],
    description: 'Component-based TUI library written from scratch',
  },
  {
    id: 4,
    key: '4',
    title: 'whatmedoin',
    url: 'https://github.com/frixaco/whatmedoin',
    tags: ['rust', 'typescript', 'bun'],
    description:
      'Personal activity tracker for macOS, Windows and browser, tracks open tabs and programs',
  },
]

const projectKeyMap = new Map(projects.map((p) => [p.key, p.url]))

export function Projects() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreKey(e)) return

      const url = projectKeyMap.get(e.key)
      if (url) {
        window.open(url, '_blank')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {projects.map((project) => (
        <a
          key={project.id}
          href={project.url}
          target="_blank"
          className="group flex cursor-pointer flex-col gap-2"
          aria-keyshortcuts={project.key}
          title={`${project.title} (${project.key})`}
        >
          <h4 className="text-cyber-fg group-hover:border-b-cyber-grey w-fit border-b border-b-transparent">
            {project.title}{' '}
            <span className="text-cyber-grey">[{project.key}]</span>
          </h4>
          <p className="">{project.description}</p>
          <div className="text-cyber-grey flex gap-1 text-xs">
            {project.tags.map((tag) => (
              <span key={tag} className="bg-cyber-bg-highlight rounded-sm px-1">
                {tag}
              </span>
            ))}
          </div>
        </a>
      ))}
    </div>
  )
}
