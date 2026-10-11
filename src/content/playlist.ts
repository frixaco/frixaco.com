// The app bar player's playlist, curated by frixaco, in play order (see tracks.ts).
import ghostCover from '#/assets/covers/otika-ghost.jpg'
import areelCover from '#/assets/covers/ariiol-areel.jpg'
import { tracks } from './tracks'

export interface Track {
  title: string
  artist: string
  album: string
  /** Track number on the album ("01"). */
  number: string
  /** Seconds, measured from the file. */
  duration: number
  src: string
  /** Small cover for the playlist and the lock screen / media controls. */
  cover: string
}

const covers: Record<string, string> = { ghost: ghostCover, AREEL: areelCover }

export const playlist: Track[] = tracks.map(({ title, artist, album, number, duration, id }) => ({
  title,
  artist,
  album,
  number,
  duration,
  src: `/music/${id}`,
  cover: covers[album],
}))

export interface Album {
  title: string
  artist: string
  cover: string
  /** Total length in seconds. */
  duration: number
  /** Playlist indexes of its tracks, in order. */
  tracks: number[]
}

/** The playlist grouped into its albums (consecutive runs), for the playlist popup. */
export const albums: Album[] = playlist.reduce<Album[]>((list, track, i) => {
  const last = list.at(-1)
  if (last?.title === track.album) {
    last.duration += track.duration
    last.tracks.push(i)
  } else {
    list.push({ title: track.album, artist: track.artist, cover: track.cover, duration: track.duration, tracks: [i] })
  }
  return list
}, [])
