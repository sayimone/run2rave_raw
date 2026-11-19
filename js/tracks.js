/* RUN2RAVE 오리지널 테크노 10곡 — 브라우저에서 실시간 합성 (js/beat.js)
 * 패턴: 한 마디 16스텝. 문자열은 x = 연주, . = 쉼. 음 배열은 루트 기준 반음 수, null = 쉼
 * enter: 레이어가 들어오는 마디 (게임 시작 기준)
 */
const _ = null;
const TRACKS = [
  {
    id: 'warmup', name: 'Warm Up', bpm: 118, mood: 'DUB', root: 33,
    kick: 'x...x...x...x...', kickType: 'deep',
    ohat: '..x...x...x...x.', rim: '...x......x..x..',
    bass: { type: 'sub', notes: [0, _, _, _, _, _, 0, _, _, _, 0, _, _, _, _, _], len: 3 },
    stab: { pattern: '......x.......x.', chords: [[12, 15, 19, 22], [10, 14, 17, 22]], len: 2 },
    pad: { chords: [[12, 15, 19], [10, 14, 17]] },
    enter: { bass: 1, stab: 2, pad: 4 }
  },
  {
    id: 'limelight', name: 'Lime Light', bpm: 122, mood: 'MELODIC', root: 38,
    kick: 'x...x...x...x...', kickType: 'punch',
    hat: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...',
    bass: { type: 'sub', notes: [_, _, 0, _, _, _, 0, _, _, _, 0, _, _, _, 0, _], len: 2 },
    arp: { notes: [24, 27, 31, 34, 31, 27, 24, 22, 24, 27, 31, 36, 31, 27, 24, 19], every: 1, len: 1 },
    pad: { chords: [[12, 15, 19], [8, 12, 15], [10, 14, 17], [7, 10, 14]] },
    enter: { bass: 1, arp: 2, pad: 2 }
  },
  {
    id: 'riverside', name: 'Riverside', bpm: 124, mood: 'MINIMAL', root: 36,
    kick: 'x...x...x...x...', kickType: 'punch',
    hat: 'x.xx..x.x.xx..x.', rim: '..x..x....x..x..',
    bass: { type: 'rolling', notes: [_, _, 0, 0, _, _, 0, _, _, _, 0, 0, _, 3, _, _], len: 1 },
    blip: { notes: [36, _, _, _, _, _, 43, _, _, _, _, 39, _, _, _, _] },
    enter: { bass: 1, blip: 2 }
  },
  {
    id: 'nightbus', name: 'Night Bus', bpm: 126, mood: 'DUB TECHNO', root: 31,
    kick: 'x...x...x...x...', kickType: 'deep',
    ohat: '..x...x...x...x.', ride: 'x.x.x.x.x.x.x.x.',
    bass: { type: 'sub', notes: [0, _, _, 0, _, _, 0, _, _, _, 0, _, _, _, _, _], len: 2 },
    stab: { pattern: '...x.....x....x.', chords: [[12, 15, 19, 22]], len: 1 },
    enter: { bass: 1, stab: 1, ride: 2 }
  },
  {
    id: 'pulse', name: 'Pulse', bpm: 128, mood: 'PEAK', root: 33,
    kick: 'x...x...x...x...', kickType: 'punch',
    ohat: '..x...x...x...x.', ride: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...',
    bass: { type: 'rolling', notes: [_, 0, 0, 0, _, 0, 0, 0, _, 0, 0, 0, _, 0, 0, 12], len: 1 },
    stab: { pattern: 'x.......x.......', chords: [[12, 15, 19]], len: 1 },
    enter: { bass: 1, stab: 2, ride: 2 }
  },
  {
    id: 'acidrun', name: 'Acid Run', bpm: 130, mood: 'ACID', root: 36,
    kick: 'x...x...x...x...', kickType: 'punch',
    hat: 'xxxxxxxxxxxxxxxx', clap: '....x.......x...',
    bass: { type: 'acid', notes: [0, 0, 12, 0, 3, 0, 15, 0, 0, 12, 0, 10, 0, 7, 12, 3], accent: 'x.x...x...x..x..', len: 1 },
    enter: { bass: 1 }
  },
  {
    id: 'uphill', name: 'Uphill', bpm: 132, mood: 'HYPNOTIC', root: 33,
    kick: 'x...x...x...x...', kickType: 'deep',
    hat: '..x...x...x...x.', tom: 'x..x..x...x..x..',
    rumble: '.xx..xx..xx..xx.',
    arp: { notes: [24, 31, 27, 24, 31, 27, 24, 31, 27, 24, 31, 27, 24, 31, 27, 34], every: 1, len: 1 },
    enter: { rumble: 1, arp: 1, tom: 2 }
  },
  {
    id: 'namsan', name: 'Namsan', bpm: 135, mood: 'DRIVING', root: 34,
    kick: 'x...x...x...x...', kickType: 'punch',
    rumble: '.xx..xx..xx..xx.', hat: 'xxxxxxxxxxxxxxxx', ohat: '..x...x...x...x.', clap: '............x...',
    bass: { type: 'reese', notes: [_, _, 0, _, _, _, 0, _, _, _, 0, _, _, _, 0, _], len: 2 },
    enter: { rumble: 0, bass: 1 }
  },
  {
    id: 'afterburn', name: 'Afterburn', bpm: 138, mood: 'HARD', root: 33,
    kick: 'x...x...x...x...', kickType: 'hard',
    ride: 'x.x.x.x.x.x.x.x.', clap: '....x.......x...',
    bass: { type: 'rolling', notes: [_, _, 0, _, _, _, 0, _, _, _, 0, _, _, _, 0, 0], len: 2 },
    lead: { notes: [24, _, _, 24, _, _, 22, _, 24, _, _, 27, _, _, 22, _], len: 1 },
    enter: { bass: 1, lead: 2 }
  },
  {
    id: 'ravefloor', name: 'Rave Floor', bpm: 142, mood: 'RAVE', root: 38,
    kick: 'x...x...x...x...', kickType: 'hard',
    hat: 'x.xxx.xxx.xxx.xx', ohat: '..x...x...x...x.', clap: '....x.......x...',
    bass: { type: 'rolling', notes: [_, 0, 0, _, _, 0, 0, _, _, 0, 0, _, _, 0, 0, _], len: 1 },
    arp: { notes: [24, 31, 36, 31, 24, 31, 36, 39, 24, 31, 36, 31, 22, 29, 34, 29], every: 1, len: 1 },
    pad: { chords: [[12, 15, 19], [8, 12, 15], [3, 7, 10], [10, 14, 17]] },
    enter: { bass: 1, pad: 1, arp: 2 }
  }
];

/* 코스별 기본 곡 */
const DEFAULT_TRACK = { easy: 'limelight', normal: 'pulse', hard: 'namsan' };
