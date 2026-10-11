// The app bar player's tracks, in play order. Titles and artists are the files' own tags, verbatim.
// The audio isn't in the repo: it lives in the "music" Railway bucket (as `<id>.m4a`), uploaded from
// a local music/ folder (`file`) by scripts/upload-music.ts. Plain data, so that script can import it.

export interface TrackFile {
  title: string
  artist: string
  album: string
  /** File name in the local music/ folder. */
  file: string
  /** Served at /music/<id> (no extension: Vite's dev server keeps those URLs for files). */
  id: string
}

const ghost = (n: string, title: string): TrackFile => ({
  title,
  artist: 'OTIKA',
  album: 'ghost',
  file: `OTIKA - ghost - ${n} ${title}.m4a`,
  id: `otika-ghost-${n}`,
})

const areel = (n: string, title: string, name = title): TrackFile => ({
  title,
  artist: 'ariiol',
  album: 'AREEL',
  file: `ariiol - AREEL - ${n} ${name}.m4a`,
  id: `ariiol-areel-${n}`,
})

export const tracks: TrackFile[] = [
  areel('01', 'cinema'),
  areel('02', '.conf'),
  areel('03', 'rollback/Q', 'rollback-Q'),
  areel('04', 'I might'),
  areel('05', 'eyelock (ft. ナースロボ＿タイプＴ)'),
  areel('06', 'closer (ft.ナースロボ＿タイプＴ)'),
  areel('07', 'typing'),
  areel('08', 'RED HOUR'),
  areel('09', 'raining'),
  areel('10', '9054 (ft. ナースロボ＿タイプＴ)'),
  areel('11', 'REK421'),
  areel('12', 'flicker'),
  areel('13', '404GB'),
  ghost('01', 'DOORS (feat. 初音ミク)'),
  ghost('02', 'ghost (feat. 初音ミク)'),
  ghost('03', 'DARE (feat. 初音ミク)'),
  ghost('04', 'supernova (feat. 初音ミク)'),
  ghost('05', 'DOGS (feat. 初音ミク)'),
]
