// Small glyphs from the mock (12px, 1.5px square-capped strokes).

/** Two arrows out: open the expanded view. */
export function ExpandIcon({ size = 12 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M7 1h4v4M11 1L7 5M5 11H1V7M1 11l4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  )
}

/** Two arrows in: shrink the expanded view back into its card. */
export function ShrinkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M11 1L7 5M7 2v3h3M1 11l4-4M5 10V7H2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  )
}

export function PlayIcon({ size = 12 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 1.5v9l8-4.5z" fill="currentColor" />
    </svg>
  )
}

export function PauseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" />
    </svg>
  )
}

export function Arrow() {
  return <span className="arrow">↗</span>
}
