// The app bar player's playlist, curated by frixaco, in play order (see tracks.ts).
import ghostCover from '#/assets/covers/otika-ghost.jpg'
import areelCover from '#/assets/covers/ariiol-areel.jpg'
import { tracks } from './tracks'

export interface Track {
  title: string
  artist: string
  album: string
  src: string
  /** Small cover for the lock screen / media controls. */
  cover: string
}

const covers: Record<string, string> = { ghost: ghostCover, AREEL: areelCover }

export const playlist: Track[] = tracks.map(({ title, artist, album, id }) => ({
  title,
  artist,
  album,
  src: `/music/${id}`,
  cover: covers[album],
}))
