# RUN2RAVE · raw

〈RUN2RAVE: 공명〉 소전시 테마 사이트 (UX미디어스튜디오 기말 과제, 작업용 저장소)

> 달린 자만이 플로어로 들어간다.
> 서울의 코스를 비트에 맞춰 달리고, 코스 끝 가상의 레이빙 베뉴에 입장한다.

## 흐름

| 단계 | 화면 | 하는 일 |
| --- | --- | --- |
| 01 RUN | 서울 개략 지도 | 코스 3종(EASY · NORMAL · HARD) 중 하나 고르기 |
| 02 TO | 비트 러닝 게임 | 실제 코스 지도 위를 캐릭터가 달리고, 카메라가 따라감. 캐릭터를 감싼 링이 겹칠 때 화면 탭(Space). 정확할수록 km/h가 오름. 미니맵으로 전체 위치 확인 |
| 03 RAVE | 베뉴 도착 | 평균 속도·환산 시간·정확도 확인, 이름 넣고 입장권 PNG 저장 |
| 소개 | 브랜드·서비스 소개 | RUN/TO/RAVE, 건강한 카타르시스, 4가지 차별점, 포스터·리스트밴드·캔 목업 |

## 코스와 가상 베뉴

| 코스(편도) | 거리 | BPM | 도착 베뉴(가상) |
| --- | --- | --- | --- |
| 01 EASY 공릉 경춘선숲길: 과기대 방면 숲길 → 화랑대철도공원 | 약 1.8km | 120 | R2R LOOP · 순환의 플랫폼 |
| 02 NORMAL 반포한강공원: 동작대교 남단 → 반포대교 달빛광장 | 약 2.0km | 128 | R2R RIPPLE · 번짐의 데크 |
| 03 HARD 남산 북측순환로: 국립극장 앞 → 북측순환로 입구 쉼터 | 약 3.4km | 135 | R2R WAVE · 파동의 숲 |

## 속도 계산

- 실시간 속도 = 기준 속도 × (0.7 + 0.5 × 최근 8박 정확도) × 지형 계수(평지 1.0 · 오르막 0.85 · 내리막 1.1)
- 페이스 = 60 ÷ 속도, 환산 시간 = 실제 거리 ÷ 평균 속도
- 게임 시간은 `courses.js`의 `duration`(기준 속도일 때 초)으로 압축된다. 숫자는 모두 밸런스용 예시.

## 폴더

```
index.html        화면(홈 · RUN · TO · RAVE · 소개)
css/style.css     A안 컬러·타입·레이아웃
js/courses.js     코스 데이터 (코스 추가는 여기만)
js/beat.js        Web Audio 비트 엔진 (킥·하이햇 직접 합성, 저작권 음원 없음)
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
- 지도 데이터: © OpenStreetMap contributors (ODbL)
- 폰트: Pretendard, Oswald (SIL Open Font License)
