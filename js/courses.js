/* RUN2RAVE 코스 데이터
 * route: 실제 길을 따라가는 [위도, 경도] 목록. 지금 값은 지도 데이터를 받기 전의 '임시 대략 경로'이며
 *        OpenStreetMap 등에서 받은 실제 좌표로 교체한다 (routeSource 참고).
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
    duration: 20,          // 기준 속도로 달렸을 때 게임 시간(초)
    color: '#EAFE50',
    ink: '#000000',
    figure: 'lime',
    stage: 'rail',
    routeSource: '임시 대략 경로',
    route: [[37.6318,127.0775],[37.6304,127.0773],[37.6290,127.0772],[37.6276,127.0770],[37.6262,127.0768],[37.6248,127.0767],[37.6236,127.0766],[37.6231,127.0778],[37.6226,127.0790],[37.6221,127.0801],[37.6216,127.0812],[37.6212,127.0821],[37.6208,127.0830],[37.6204,127.0839],[37.6200,127.0848],[37.6195,127.0860]],
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
    duration: 24,
    color: '#5B8CFF',
    ink: '#000000',
    figure: 'blue',
    stage: 'river',
    routeSource: '임시 대략 경로',
    route: [[37.5072,126.9806],[37.5077,126.9822],[37.5082,126.9838],[37.5088,126.9853],[37.5093,126.9868],[37.5098,126.9881],[37.5102,126.9893],[37.5105,126.9906],[37.5108,126.9918],[37.5111,126.9930],[37.5114,126.9942],[37.5118,126.9953],[37.5121,126.9963]],
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
    duration: 28,
    color: '#FF4FA3',
    ink: '#000000',
    figure: 'pink',
    stage: 'hill',
    routeSource: '임시 대략 경로',
    route: [[37.5530,127.0030],[37.5538,127.0021],[37.5545,127.0010],[37.5543,126.9998],[37.5541,126.9985],[37.5549,126.9973],[37.5556,126.9962],[37.5554,126.9950],[37.5552,126.9938],[37.5559,126.9926],[37.5566,126.9915],[37.5564,126.9902],[37.5561,126.9890],[37.5568,126.9879],[37.5574,126.9868],[37.5571,126.9858],[37.5568,126.9848]],
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
