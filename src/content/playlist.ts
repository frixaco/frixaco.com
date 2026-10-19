// The app bar player's playlist, curated by frixaco, in play order (see tracks.ts).
import ghostCover from '#/assets/covers/otika-ghost.jpg'
import areelCover from '#/assets/covers/ariiol-areel.jpg'
// Thumbs stay files (?no-inline), not base64 in the entry bundle.
import ghostThumb from '#/assets/covers/otika-ghost-84.webp?no-inline'
import areelThumb from '#/assets/covers/ariiol-areel-84.webp?no-inline'
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
  /** 512px cover for the lock screen / media controls. */
  cover: string
  /** 84px cover for the playlist (28px at up to 3x). */
  thumb: string
}

const covers: Record<string, string> = { ghost: ghostCover, AREEL: areelCover }
const thumbs: Record<string, string> = { ghost: ghostThumb, AREEL: areelThumb }

export const playlist: Track[] = tracks.map(({ title, artist, album, number, duration, id }) => ({
  title,
  artist,
  album,
  number,
  duration,
  src: `/music/${id}`,
  cover: covers[album],
  thumb: thumbs[album],
}))

export interface Album {
  title: string
  artist: string
  thumb: string
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
    list.push({ title: track.album, artist: track.artist, thumb: track.thumb, duration: track.duration, tracks: [i] })
  }
  return list
}, [])
