# RUN2RAVE · raw

〈RUN2RAVE: 공명〉 소전시 테마 사이트 (UX미디어스튜디오 기말 과제, 작업용 저장소)

모바일 전용 UI. 데스크톱에서는 폰 목업 프레임 안에 표시된다(시연용).

> 달린 자만이 플로어로 들어간다.
> 서울의 코스를 비트에 맞춰 달리고, 코스 끝 가상의 레이빙 베뉴에 입장한다.

## 흐름

| 단계 | 화면 | 하는 일 |
| --- | --- | --- |
| 01 RUN | 서울 외곽선 지도 | 코스 고르기, 음악 10곡 중 선택, BPM 슬라이더로 내 페이스에 맞추기 |
| 02 TO | 러닝 게임 (일시정지: ⏸ 버튼, Esc, P) | 실제 코스 지도 위를 캐릭터가 달리고 카메라가 따라감. 링이 겹칠 때 탭(Space), 오르막에서는 HOLD(누르고 버티기). 아래 막대는 실제 고도 프로필 |
| 03 RAVE | 베뉴 도착 | 평균 속도·환산 시간·정확도 확인, 이름 넣고 입장권 PNG 저장 |
| 소개 | 브랜드·서비스 소개 | RUN/TO/RAVE, 건강한 카타르시스, 4가지 차별점, 포스터·리스트밴드·캔 목업 |

## 코스와 가상 베뉴

| 코스(편도) | 거리·누적 오르막 | 비트 | 도착 베뉴(가상) |
| --- | --- | --- | --- |
| 01 EASY 경춘선숲길: 과기대 방면 숲길 → 화랑대철도공원 | 1.8km · 오르막 +26m | 120 하우스 | R2R LOOP |
| 02 NORMAL 반포한강공원: 동작대교 남단 → 반포대교 달빛광장 | 2.0km · +31m | 126 UK 개러지 | R2R RIPPLE |
| 03 HARD 남산 북측순환로: 국립극장 앞 → 북측순환로 입구 쉼터 | 3.4km · +82m | 134 테크노 | R2R WAVE |

## 속도 계산

- 실시간 속도 = 기준 속도 × (0.7 + 0.5 × 최근 8박 정확도) × 지형 계수(평지 1.0 · 오르막 0.85 · 내리막 1.1)
- 지형(오르막·내리막)은 SRTM 고도에서 계산 (`tools/build_elevation.py`). SRTM은 나무·건물이 섞인 표면 고도라 평지(한강변)에도 약간의 잡음이 있다
- 페이스 = 60 ÷ 속도, 환산 시간 = 실제 거리 ÷ 평균 속도
- 게임 시간은 `courses.js`의 `duration`(기준 속도일 때 초)으로 압축된다. 숫자는 모두 밸런스용 예시.

## 폴더

```
index.html        화면(홈 · RUN · TO · RAVE · 소개)
css/style.css     A안 컬러·타입·레이아웃
js/courses.js     코스 데이터 (코스 추가는 여기만)
js/tracks.js      오리지널 테크노 10곡 패턴 (118~142 BPM)
js/beat.js        음악 엔진: 드럼·베이스·애시드·스탭·아르페지오·패드를 실시간 합성, 일시정지는 오디오 시계 정지
js/seoul.js       서울 외곽선·구 경계·한강 (통계청 2013 행정구역, southkorea/seoul-maps)
assets/audio/     홈 화면 배경 음악 (달리는 화면에서는 꺼짐)
js/route.js       위도·경도 → 지도 좌표 변환, 따라가는 지도와 미니맵
js/ticket.js      입장권 캔버스
js/app.js         화면 전환 · 게임 루프 · 판정 · 결과
assets/svg/       A안 원본 SVG(source-A-logo-*.svg)와 이를 묶은 sprite.svg
assets/img/       시그니처·워드마크·초록 심볼 (PNG)
assets/mockup/    포스터·리스트밴드·캔 목업 (JPG로 압축)
```

## 피규어 쓰는 법

`index.html` 맨 위에 SVG 스프라이트가 들어 있다. 아무 데서나 이렇게 쓰면 `app.js`가 채워 준다.

```html
<svg class="내클래스" data-fig="fig-run"></svg>
```

| id | 그림 |
| --- | --- |
| `fig-run` · `fig-jump` · `fig-dance` | 꽉 찬 피규어 3종 (별 포함) |
| `line-run` · `line-jump` · `line-dance` | 선 피규어 3종 |
| `fig-group` · `line-group` | 세 피규어가 이어진 그룹 |
| `line-two` | 선으로 된 심볼 '2' |

색은 CSS `color`(몸), `--star`(별), 선 굵기는 `--line`으로 바꾼다.

## 로컬에서 보기

입장권 저장(canvas)은 `file://`에서 막히므로 로컬 서버로 연다.

```bash
python3 -m http.server 8000
# http://localhost:8000
```

테스트용 주소 옵션: `?fast=5`(게임 5배속), `?screen=about`(특정 화면으로 바로), `?debug=1`

## GitHub Pages

Settings → Pages → Branch `main` / `(root)` → Save. 잠시 뒤 `https://<아이디>.github.io/run2rave_raw/`에서 열린다.

## 할 일

- [x] 피규어·심볼 '2'를 원본 SVG로 교체
- [ ] 시그니처·워드마크 원본 SVG 받아서 교체 (지금은 프로포절 PDF에서 따낸 임시 PNG)
- [x] 코스 경로를 OpenStreetMap 실제 길 데이터로 교체 (`data/osm-export.geojson` → `tools/build_routes.py`)
- [ ] 코스별 배경 일러스트 (철길·동네 / 강변·다리 / 숲·언덕)
- [ ] 전시 태블릿에서 박자 판정 테스트

## 크레딧과 고지

- RUN2RAVE는 수업 과제를 위해 만든 **가상의 브랜드**이며, 같은 이름의 실제 행사·단체와 관련이 없다. 코스 끝 레이빙 베뉴도 모두 가상의 장소다.
- 브랜드 기획·디자인 시스템(로고, 심볼, 피규어): Team 3 브랜드 프로포절 A안 '살아있는 내면의 공명'
- 지도 데이터: © OpenStreetMap contributors (ODbL) · 고도: NASA SRTM
- 배경 음악: Jeremy Black, "You Know Me" (사용 조건 확인 필요)
- 폰트: Pretendard, Oswald (SIL Open Font License)
