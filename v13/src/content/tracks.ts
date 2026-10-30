// The app bar player's tracks, in play order. Titles and artists are the files' own tags, verbatim.
// The audio isn't in the repo: it lives in the "music" Railway bucket (as `<id>.m4a`), uploaded from
// a local music/ folder (`file`) by scripts/upload-music.ts. Plain data, so that script can import it.

export interface TrackFile {
  title: string
  artist: string
  album: string
  /** Track number on the album, as in the file name ("01"). */
  number: string
  /** File name in the local music/ folder. */
  file: string
  /** Served at /music/<id> (no extension: Vite's dev server keeps those URLs for files). */
  id: string
  /** Length in seconds, measured from the file (`ffprobe -show_entries format=duration`). */
  duration: number
}

const ghost = (n: string, title: string, duration: number): TrackFile => ({
  title,
  artist: 'OTIKA',
  album: 'ghost',
  number: n,
  file: `OTIKA - ghost - ${n} ${title}.m4a`,
  id: `otika-ghost-${n}`,
  duration,
})

const areel = (n: string, title: string, duration: number, name = title): TrackFile => ({
  title,
  artist: 'ariiol',
  album: 'AREEL',
  number: n,
  file: `ariiol - AREEL - ${n} ${name}.m4a`,
  id: `ariiol-areel-${n}`,
  duration,
})

export const tracks: TrackFile[] = [
  areel('01', 'cinema', 138.089),
  areel('02', '.conf', 179.606),
  areel('03', 'rollback/Q', 150.581, 'rollback-Q'),
  areel('04', 'I might', 150.814),
  areel('05', 'eyelock (ft. ナースロボ＿タイプＴ)', 139.691),
  areel('06', 'closer (ft.ナースロボ＿タイプＴ)', 150.581),
  areel('07', 'typing', 191.82),
  areel('08', 'RED HOUR', 129.521),
  areel('09', 'raining', 140.086),
  areel('10', '9054 (ft. ナースロボ＿タイプＴ)', 148.561),
  areel('11', 'REK421', 215.851),
  areel('12', 'flicker', 156.131),
  areel('13', '404GB', 85.675),
  ghost('01', 'DOORS (feat. 初音ミク)', 192.043),
  ghost('02', 'ghost (feat. 初音ミク)', 167.275),
  ghost('03', 'DARE (feat. 初音ミク)', 186.048),
  ghost('04', 'supernova (feat. 初音ミク)', 125.419),
  ghost('05', 'DOGS (feat. 初音ミク)', 182.635),
]
