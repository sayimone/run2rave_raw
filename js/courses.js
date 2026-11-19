/* RUN2RAVE 코스 데이터
 * 엔진(app.js)은 하나, 코스는 이 배열에 객체로만 추가한다.
 * 거리·BPM·판정·속도·지형·체크포인트 위치는 게임 밸런스용 예시 값이다.
 * 베뉴는 모두 가상의 장소다.
 */
const COURSES = [
  {
    id: 'easy',
    level: '01 EASY',
    keyword: '순환 LOOP',
    name: '공릉 경춘선숲길',
    tagline: '기차가 멈춘 철길을, 이제 우리가 달린다',
    from: '과기대 입구',
    to: '화랑대철도공원',
    distanceKm: 2.0,
    distanceLabel: '약 2 KM',
    terrainLabel: '평지 · 철길',
    bpm: 120,
    window: 0.15,          // 판정 범위(초): 이 안이면 GOOD, 절반 안이면 PERFECT
    baseKmh: 8,
    duration: 45,          // 기준 속도로 달렸을 때 게임 시간(초)
    color: '#EAFE50',
    ink: '#000000',
    figure: 'lime',
    stage: 'rail',
    terrain: [{ from: 0, to: 1, type: 'flat' }],
    checkpoints: [
      { at: 0.35, name: '공리단길' },
      { at: 0.68, name: '도깨비시장' }
    ],
    map: { x: 520, y: 150, labelDx: -230, labelDy: -4 },
    venue: {
      id: 'loop',
      name: 'R2R LOOP',
      kr: '순환의 플랫폼',
      place: '화랑대철도공원 옛 승강장 옆',
      value: '정착',
      line: '처음 온 사람을 위한 입문 쿨다운 플로어. 오늘의 한 바퀴가 내일의 루틴이 된다.',
      programs: ['BPM을 천천히 내리는 입문용 쿨다운 셋', '스트레칭 서클 · 이온음료 · 콤부차', '다음 회차 약속 보드']
    }
  },
  {
    id: 'normal',
    level: '02 NORMAL',
    keyword: '번짐 RIPPLE',
    name: '반포한강공원',
    tagline: '강바람 아래, 서로의 템포가 번진다',
    from: '동작대교 남단',
    to: '반포대교 달빛광장',
    distanceKm: 2.5,
    distanceLabel: '약 2.5 KM',
    terrainLabel: '평지 · 강변',
    bpm: 128,
    window: 0.12,
    baseKmh: 10,
    duration: 50,
    color: '#5B8CFF',
    ink: '#000000',
    figure: 'blue',
    stage: 'river',
    terrain: [{ from: 0, to: 1, type: 'flat' }],
    checkpoints: [
      { at: 0.4, name: '서래섬' },
      { at: 0.75, name: '세빛섬' }
    ],
    map: { x: 300, y: 420, labelDx: 22, labelDy: 30 },
    venue: {
      id: 'ripple',
      name: 'R2R RIPPLE',
      kr: '번짐의 데크',
      place: '반포대교 달빛광장 앞 수변',
      value: '공명',
      line: '분수 물결처럼 에너지가 번지는 플로어. 혼자 와도 자연스럽게 연결된다.',
      programs: ['강바람 아래 쿨다운 + 스트레칭', '무알코올 보태니컬 드링크 바', '대화가 강요되지 않는 네트워킹 데크']
    }
  },
  {
    id: 'hard',
    level: '03 HARD',
    keyword: '파동 WAVE',
    name: '남산 북측순환로',
    tagline: '언덕을 넘을 때마다, 심박이 파동이 된다',
    from: '국립극장 앞',
    to: '북측순환로 입구 쉼터',
    distanceKm: 3.4,
    distanceLabel: '약 3.4 KM',
    terrainLabel: '업힐 · 다운힐 반복',
    bpm: 135,
    window: 0.09,
    baseKmh: 12,
    duration: 60,
    color: '#FF4FA3',
    ink: '#000000',
    figure: 'pink',
    stage: 'hill',
    terrain: [
      { from: 0.00, to: 0.10, type: 'flat' },
      { from: 0.10, to: 0.30, type: 'up' },
      { from: 0.30, to: 0.40, type: 'down' },
      { from: 0.40, to: 0.58, type: 'up' },
      { from: 0.58, to: 0.68, type: 'flat' },
      { from: 0.68, to: 0.85, type: 'up' },
      { from: 0.85, to: 1.00, type: 'down' }
    ],
    checkpoints: [
      { at: 0.3, name: '첫 번째 언덕' },
      { at: 0.58, name: '숲 터널' },
      { at: 0.85, name: '마지막 오르막' }
    ],
    map: { x: 360, y: 250, labelDx: -210, labelDy: -2 },
    venue: {
      id: 'wave',
      name: 'R2R WAVE',
      kr: '파동의 숲',
      place: '북측순환로 끝 숲속 공터',
      value: '몰입',
      line: '언덕을 넘은 심박을 천천히 내려 주는 숲속 플로어. 다 쏟고 나서 맑아진다.',
      programs: ["심박을 내리는 '다운 웨이브' 셋", '도심 야경 · 수분 보충', '마지막 5분, 음악을 끄고 함께 호흡']
    }
  }
];

/* 지형 계수: 실시간 속도에 곱한다 */
const TERRAIN_FACTOR = { flat: 1.0, up: 0.85, down: 1.1 };
const TERRAIN_LABEL = { flat: 'FLAT', up: 'UPHILL', down: 'DOWNHILL' };
