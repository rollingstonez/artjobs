# 아트잡스 수집 가능 여부 판정표

- 판정 시각: 2026-09-10 03:54 UTC (GitHub Actions `robots-check`)
- User-Agent: `ArtjobsBot/0.1 (+https://artjobs.kr; contact: support@artjobs.kr)`
- 이 문서는 `scripts/crawler/collection_status.py` 가 자동 생성한다. 판정을 다시 하려면 GitHub → Actions → robots-check → Run workflow.

## 한눈에 보기

| 묶음 | 곳 | 뜻 |
|---|---|---|
| A | 13 | 지금 바로 수집 가능 |
| B | 8 | 수집 가능 — 민간 운영이라 시작 전 운영자에게 한 번 알리기(협의 권장) |
| C | 34 | robots 는 허용 — 목록 주소만 브라우저로 확인해 채우면 됨(미정이거나 추정 주소가 404) |
| D | 4 | robots 는 허용 — 목록 페이지가 안 열리거나 자바스크립트로만 그려짐(사람이 확인 필요) |
| E | 1 | 회색지대 — 자동수집 거부 의도. 수집하지 않고 협의 또는 공공데이터 요청 |
| F | 5 | 차단 — 수집하지 않는다. 공공기관이면 공공데이터 요청 |
| G | 16 | 접속 실패 — GitHub(해외) 서버에서 응답 없음/거부. 국내 PC 에서 재판정 |

**지금 수집할 수 있는 곳: 21곳 (A+B)** · 손보면 되는 곳: 38곳 (C+D) · 수집하지 않고 공식 경로로: 6곳 (E+F) · 재확인: 16곳

## A. 지금 바로 수집 가능 (13곳)

**할 일:** crawl_<code>.py 작성 → Supabase crawl_sources 에서 robots_status='clean', is_active=true

| 우선 | 코드 | 이름 | 공공/민간 | 분야 | 지역 | robots | 목록 페이지 | 근거 | 링크 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `artnuri` | 아트누리(예술지원사업 통합 안내) | 공공 | residency_open_call | 전국·온라인 | 깨끗한 허용 (HTTP 404) | HTTP 200 / 링크 360 | robots.txt 없음(막을 규칙 자체가 없음) | [열기](https://artnuri.or.kr/crawler/info/search.do) |
| 1 | `kcdf` | 한국공예·디자인문화진흥원 채용공고 | 공공 | craft | 서울 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 482 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.kcdf.or.kr/brd/board/342/L/menu/288) |
| 1 | `mmca` | 국립현대미술관 채용 | 공공 | curation·art_education·residency_open_call | 서울 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 150 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.mmca.go.kr/pr/employmentList.do) |
| 1 | `sema` | 서울시립미술관 채용시험 | 공공 | curation·art_education·photography·media_art | 서울 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 166 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://sema.seoul.go.kr/kr/bbs/611389/getBbsList) |
| 1 | `sfac` | 서울문화재단 채용공고 | 공공 | all | 서울 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 251 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.sfac.or.kr/opensquare/notice/recruit_list.do) |
| 2 | `busan_art` | 부산시립미술관 고시공고 | 공공 | curation·art_education | 부산 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 116 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://art.busan.go.kr/anucmt/list.nm) |
| 2 | `gojobs` | 나라일터(인사혁신처) 일반채용 모집공고 | 공공 | curation | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 96 | 우리 경로를 막는 규칙 없음 | [열기](https://www.gojobs.go.kr/apmList.do?menuNo=401) |
| 2 | `kocaca` | 한국문화예술회관연합회(KoCACA) 채용공고 | 공공 | curation·art_management·art_education | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 179 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.kocaca.or.kr/myboard/myboard10) |
| 2 | `mcst_job` | 문화체육관광부 채용정보(소속·공공기관) | 공공 | curation·art_management | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 540 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.mcst.go.kr/site/s_notice/notice/jobList.jsp?pTab=02) |
| 2 | `seoul_culture` | 서울문화포털 채용공고 | 공공 | all | 서울 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 126 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://culture.seoul.go.kr/culture/bbs/B0000002/list.do?menuNo=200052) |
| 3 | `kfaa` | 한국미술협회 미술계 소식 | 공공 | all | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 98 | 우리 경로를 막는 규칙 없음 | [열기](https://kfaa.or.kr/bbs/?so_table=art_news01) |
| 3 | `museum_go` | 국립중앙박물관 채용 안내 | 공공 | curation | 서울 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 161 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.museum.go.kr/MUSEUM/contents/M0701030000.do?catCustomType=post&catId=54) |
| 3 | `nabi` | 아트센터 나비 | 공공 | media_art·residency_open_call | 서울 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 54 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.nabi.or.kr/page/board_list.php?brd_id=project) |

## B. 수집 가능 — 민간 운영이라 시작 전 운영자에게 한 번 알리기(협의 권장) (8곳)

**할 일:** 운영자 메일로 수집 안내(출처 표기·원문 링크·게시 즉시 반영) 후 A 와 동일

| 우선 | 코드 | 이름 | 공공/민간 | 분야 | 지역 | robots | 목록 페이지 | 근거 | 링크 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `artmore` | 아트모아(예술경영지원센터 예술 일자리 플랫폼) | 민간 | all | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 145 | 우리 경로를 막는 규칙 없음 | [열기](https://www.artmore.kr/sub/recruit/search_list.do?search_cd=JD&search_nm=%EB%AF%B8%EC%88%A0%EB%B6%84%EC%95%BC&search_val=13-17-28&listSize=50&page=1) |
| 1 | `momo365` | 모모365(문화사업지원플랫폼) | 민간 | all | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 102 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.momo365.net/Support?cd=support&ViewType=list) |
| 2 | `artmap` | 아트맵 공모·레지던시 소식 | 민간 | residency_open_call | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 84 | 우리 경로를 막는 규칙 없음 | [열기](https://art-map.co.kr/notice/list.php?b_id=002&showtype=3) |
| 2 | `busanbiennale` | 부산비엔날레 채용공고 | 민간 | curation·art_management | 부산 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 79 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](http://www.busanbiennale.org/BBOCkr/index.php?pCode=gongo&mode=list) |
| 3 | `artculture` | 아트앤컬처 문화예술신문 공모 | 민간 | residency_open_call | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 520 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://art-culture.co.kr/magazine_contest) |
| 3 | `artnet` | 아트넷 채용정보·공모전 | 민간 | all | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 106 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](http://artnet.kr/p/recruit) |
| 3 | `contestkorea` | 콘테스트코리아 미술·디자인 공모전 | 민간 | painting·print_drawing·media_art·photography | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 418 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.contestkorea.com/sub/list.php?int_gbn=1&Txt_bcode=030610001) |
| 3 | `leeum` | 리움미술관 공지 | 민간 | curation·art_education | 서울 | 깨끗한 허용 (HTTP 404) | HTTP 200 / 링크 60 | robots.txt 없음(막을 규칙 자체가 없음) | [열기](https://www.leeumhoam.org/leeum/info/notice) |

## C. robots 는 허용 — 목록 주소만 브라우저로 확인해 채우면 됨(미정이거나 추정 주소가 404) (34곳)

**할 일:** 브라우저에서 목록 페이지 주소 복사 → sources.py list_path 채우기 → robots-check 재실행

| 우선 | 코드 | 이름 | 공공/민간 | 분야 | 지역 | robots | 목록 페이지 | 근거 | 링크 |
|---|---|---|---|---|---|---|---|---|---|
| 2 | `alio_api` | 잡알리오 공공기관 채용정보(공공데이터 API) | 공공 | curation·art_management·art_education | 전국·온라인 | 깨끗한 허용 (HTTP 404) | — | robots.txt 없음(막을 규칙 자체가 없음) ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://job.alio.go.kr/) |
| 2 | `arko` | 한국문화예술위원회(ARKO) 채용 | 공공 | art_management·curation | 전남 | 깨끗한 허용 (HTTP 404) | — | robots.txt 없음(막을 규칙 자체가 없음) | [열기](https://www.arko.or.kr/) |
| 2 | `bscf` | 부산문화재단 | 공공 | all | 부산 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.bscf.or.kr/) |
| 2 | `craftmuseum` | 서울공예박물관 채용 | 공공 | craft·curation | 서울 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://craftmuseum.seoul.go.kr/) |
| 2 | `ggcf` | 경기문화재단 | 민간 | all | 경기 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.ggcf.kr/) |
| 2 | `gmoma` | 경기도미술관 | 민간 | curation·art_education | 경기 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://gmoma.ggcf.kr/) |
| 2 | `gwangju_art` | 광주시립미술관 | 공공 | curation·residency_open_call | 광주 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://artmuse.gwangju.go.kr/) |
| 2 | `gwangjubiennale` | 광주비엔날레 | 민간 | curation·art_management | 광주 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.gwangjubiennale.org/) |
| 2 | `ifac` | 인천문화재단 | 공공 | all | 인천 | 깨끗한 허용 (HTTP 404) | — | robots.txt 없음(막을 규칙 자체가 없음) ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.ifac.or.kr/) |
| 2 | `inartplatform` | 인천아트플랫폼 공지사항 | 민간 | residency_open_call·curation | 인천 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://inartplatform.kr/) |
| 2 | `kawf` | 한국예술인복지재단 공지사항 | 민간 | all | 서울 | 깨끗한 허용 (HTTP 404) | — | robots.txt 없음(막을 규칙 자체가 없음) | [열기](https://www.kawf.kr/) |
| 2 | `njp` | 백남준아트센터 | 민간 | media_art·curation | 경기 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://njp.ggcf.kr/) |
| 3 | `apma` | 아모레퍼시픽미술관 | 민간 | curation | 서울 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://apma.amorepacific.com/) |
| 3 | `artsonje` | 아트선재센터 | 민간 | curation | 서울 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://artsonje.org/) |
| 3 | `changwon_biennale` | 창원조각비엔날레(창원문화재단) | 공공 | sculpture_installation·curation | 경남 | 깨끗한 허용 (HTTP 200) | — | 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.changwonbiennale.or.kr/) |
| 3 | `cheongju_art` | 청주시립미술관 | 공공 | curation | 충북 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://cmoa.cheongju.go.kr/) |
| 3 | `daljin` | 김달진미술연구소(서울아트가이드) 구인구직 | 민간 | all | 전국·온라인 | 깨끗한 허용 (HTTP 200) | — | 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.daljin.com/) |
| 3 | `galleries` | 한국화랑협회 | 공공 | art_management | 서울 | 깨끗한 허용 (HTTP 200) | — | 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.koreagalleries.or.kr/) |
| 3 | `goeun` | 고은사진미술관 | 민간 | photography | 부산 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.goeunmuseum.kr/) |
| 3 | `gwcf` | 강원문화재단 | 공공 | all | 강원 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.gwcf.or.kr/) |
| 3 | `gyeongnam_art` | 경남도립미술관 | 공공 | curation | 경남 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.gyeongnam.go.kr/) |
| 3 | `ilmin` | 일민미술관 | 민간 | curation | 서울 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://ilmin.org/) |
| 3 | `jbct` | 전북문화관광재단 | 공공 | all | 전북 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.jbct.or.kr/) |
| 3 | `jeonbuk_art` | 전북도립미술관 | 공공 | curation·residency_open_call | 전북 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.jma.go.kr/) |
| 3 | `kiaf` | 키아프 서울(한국화랑협회) | 민간 | art_management | 서울 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://kiaf.org/) |
| 3 | `museum_assoc` | 한국박물관협회 채용정보 | 공공 | curation | 서울 | 깨끗한 허용 (HTTP 200) | — | 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://museum.or.kr/) |
| 3 | `museumhanmi` | 뮤지엄한미 공모(MH Talent Portfolio) | 공공 | photography | 서울 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://museumhanmi.or.kr/) |
| 3 | `namjunepaik` | 백남준문화재단 미디어아트 공모 | 민간 | media_art | 전국·온라인 | 깨끗한 허용 (HTTP 200) | — | 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://namjunepaik.org/) |
| 3 | `sjcf` | 세종시문화관광재단 | 공공 | all | 세종 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.sjcf.or.kr/) |
| 3 | `suwon_art` | 수원시립미술관 | 공공 | curation·art_education | 경기 | 깨끗한 허용 (HTTP 200) | — | 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://suma.suwon.go.kr/) |
| 3 | `uctf` | 울산문화관광재단 | 공공 | all | 울산 | 깨끗한 허용 (HTTP 404) | — | robots.txt 없음(막을 규칙 자체가 없음) ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.uctf.or.kr/) |
| 3 | `ulsan_art` | 울산시립미술관 | 공공 | curation·media_art | 울산 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.ulsan.go.kr/) |
| 3 | `wevity` | 위비티 예체능·미술 공모전 | 민간 | painting·photography·media_art | 전국·온라인 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.wevity.com/) |
| 3 | `work24_api` | 고용24(워크넷) 채용정보 API | 공공 | all | 전국·온라인 | 깨끗한 허용 (HTTP 200) | — | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.work24.go.kr/) |

## D. robots 는 허용 — 목록 페이지가 안 열리거나 자바스크립트로만 그려짐(사람이 확인 필요) (4곳)

**할 일:** 브라우저로 열어 보기: 페이지가 뜨면 자바스크립트 렌더링(→ curl_cffi/API 경로 확인), 안 뜨면 차단(→ F 처럼 처리)

| 우선 | 코드 | 이름 | 공공/민간 | 분야 | 지역 | robots | 목록 페이지 | 근거 | 링크 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `curatorjob` | 큐레이터잡(큐레이터·학예사 구인정보) | 민간 | curation·art_management·art_education | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 0 | 우리 경로를 막는 규칙 없음 | [열기](https://www.xn--om2b25z4do96ac6a.com/bbs/board.php?bo_table=guin) |
| 3 | `art1` | 아트원 구인/구직 게시판 | 민간 | all | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 403 / 링크 0 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.art1.com/bbs/) |
| 3 | `artistmap` | 아티스트맵 일자리 정보 | 민간 | all | 전국·온라인 | 깨끗한 허용 (HTTP 200) | 실패(SSLError) | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://artistmap.kr/board/list/code/job) |
| 3 | `thinkcontest` | 씽굿 공모전 | 민간 | painting·photography·media_art | 전국·온라인 | 깨끗한 허용 (HTTP 200) | HTTP 200 / 링크 0 | User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 | [열기](https://www.thinkcontest.com/Contest/CateField.html?c=8) |

## E. 회색지대 — 자동수집 거부 의도. 수집하지 않고 협의 또는 공공데이터 요청 (1곳)

**할 일:** 공공기관: 공공데이터 요청 / 민간: 서면 협의. 답 오기 전까지 is_active=false 유지

| 우선 | 코드 | 이름 | 공공/민간 | 분야 | 지역 | robots | 목록 페이지 | 근거 | 링크 |
|---|---|---|---|---|---|---|---|---|---|
| 2 | `gcaf` | 경남문화예술진흥원 공고 | 공공 | all | 경남 | 회색지대 (HTTP 200) | HTTP 200 / 링크 396 | 검색봇 차단: googlebot (자동수집 거부 의도) | [열기](https://www.gcaf.or.kr/bbs/board.php?bo_table=sub4_1) |

## F. 차단 — 수집하지 않는다. 공공기관이면 공공데이터 요청 (5곳)

**할 일:** 공공기관: 공공데이터 요청 / 민간: 서면 협의. robots_status='blocked'

| 우선 | 코드 | 이름 | 공공/민간 | 분야 | 지역 | robots | 목록 페이지 | 근거 | 링크 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `arte` | 한국문화예술교육진흥원 채용공고 | 공공 | art_education | 서울 | 차단 (HTTP 200) | 실패() | User-agent:* 에서 우리 경로 Disallow | [열기](https://arte.or.kr/notice/job/notice/Job_BoardList.do) |
| 1 | `gokams_job` | 예술경영지원센터 채용정보 | 공공 | curation·art_management | 전국·온라인 | 차단 (HTTP 200) | 실패() | User-agent:* 에서 우리 경로 Disallow | [열기](https://www.gokams.or.kr/01_news/jobposting_list.aspx) |
| 2 | `acc` | 국립아시아문화전당 채용공고 | 공공 | curation·media_art·residency_open_call | 광주 | 차단 (HTTP 200) | 실패() | User-agent:* 에서 우리 경로 Disallow | [열기](https://www.acc.go.kr/main/board/board.do?PID=0702) |
| 2 | `daejeon_art` | 대전시립미술관 | 공공 | curation·art_education | 대전 | 차단 (HTTP 200) | 실패() | User-agent:* 에서 우리 경로 Disallow | [열기](https://www.daejeon.go.kr/dma/DmaBoardList.do?menuSeq=6098) |
| 3 | `jeju_art` | 제주도립미술관 | 공공 | curation | 제주 | 차단 (HTTP 200) | — | User-agent:* 에서 우리 경로 Disallow ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정 | [열기](https://www.jeju.go.kr/) |

## G. 접속 실패 — GitHub(해외) 서버에서 응답 없음/거부. 국내 PC 에서 재판정 (16곳)

**할 일:** 국내 PC 에서 `python scripts/crawler/robots_check.py <주소> <목록경로>` 로 재판정(해외 IP 차단 사이트가 많음). 국내에서도 실패하면 주소 자체를 다시 확인

| 우선 | 코드 | 이름 | 공공/민간 | 분야 | 지역 | robots | 목록 페이지 | 근거 | 링크 |
|---|---|---|---|---|---|---|---|---|---|
| 2 | `arthub` | 아트허브 아트잡·공모 | 민간 | all | 전국·온라인 | 확인필요 (HTTP 403) | HTTP 403 / 링크 0 | robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정 | [열기](https://www.arthub.co.kr/m/board/job_list.html) |
| 2 | `daegu_art` | 대구미술관 | 공공 | curation·art_education | 대구 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://daeguartmuseum.or.kr/) |
| 2 | `daeguartfactory` | 대구예술발전소 공지사항 | 민간 | residency_open_call | 대구 | 확인필요 (HTTP —) | 실패() | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://www.daeguartfactory.kr/front/board/list.php?code=notice) |
| 2 | `gjcf` | 광주문화재단 채용공고 | 공공 | all | 광주 | 확인필요 (HTTP —) | 실패() | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://www.gjcf.or.kr/cf/news/hire.do) |
| 2 | `jfac` | 제주문화예술재단 채용공고 | 공공 | all | 제주 | 확인필요 (HTTP —) | 실패() | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](http://www.jcaf.or.kr/contents/index.php?mid=070102) |
| 2 | `neolook` | 네오룩(비물질 아카이브) 모집·공모 | 민간 | all | 전국·온라인 | 확인필요 (HTTP 403) | HTTP 403 / 링크 0 | robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정 | [열기](https://neolook.com/archives) |
| 3 | `artmuseums` | 한국사립미술관협회 | 민간 | curation·art_education | 서울 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://artmuseums.kr/) |
| 3 | `cbfc` | 충북문화재단 | 공공 | all | 충북 | 확인필요 (HTTP 403) | — | robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정 | [열기](https://www.cbfc.or.kr/) |
| 3 | `ctcf` | 충남문화관광재단 | 공공 | all | 충남 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://www.ctcf.or.kr/) |
| 3 | `dcaf` | 대전문화재단 | 공공 | all | 대전 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://www.dcaf.or.kr/) |
| 3 | `dgfac` | 대구문화예술진흥원 | 공공 | all | 대구 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://www.dgfac.or.kr/) |
| 3 | `gacf` | 경북문화재단 | 민간 | all | 경북 | 확인필요 (HTTP 403) | — | robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정 | [열기](http://www.gacf.kr/) |
| 3 | `jeonnam_art` | 전남도립미술관 | 공공 | curation | 전남 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://jnam.jeonnam.go.kr/) |
| 3 | `jncf` | 전남문화재단 | 공공 | all | 전남 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://www.jncf.or.kr/) |
| 3 | `okcj` | 청주공예비엔날레 | 민간 | craft·curation | 충북 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://www.okcj.org/) |
| 3 | `songeun` | 송은 | 공공 | curation·residency_open_call | 서울 | 확인필요 (HTTP —) | — | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 | [열기](https://www.songeun.or.kr/) |

## 공공데이터 요청 목록 (차단·회색지대로 확인된 공공기관 = E·F)

공공데이터포털(data.go.kr) 상단 '제공신청' 또는 각 기관 정보공개 창구에 아래 내용으로 요청한다. 요청 문구 예시: "귀 기관 홈페이지 채용공고·공모 게시판(제목, 접수기간, 원문 링크)을 오픈API 또는 파일 데이터로 개방 요청드립니다. 예술인 대상 구인·공모 정보를 한곳에 모아 원문 링크와 출처를 표기해 안내하는 비영리 성격의 서비스(아트잡스)에 활용하려 합니다."

| 코드 | 기관 | 현재 판정 | 요청할 데이터 | 이미 있는 대체 API / 신청 경로 |
|---|---|---|---|---|
| `gcaf` | 경남문화예술진흥원 공고 | 회색지대 | 채용+공모 게시판 (제목·접수기간·원문 URL) | data.go.kr 제공신청 |
| `gokams_job` | 예술경영지원센터 채용정보 | 차단 | 채용 게시판 (제목·접수기간·원문 URL) | 예술경영지원센터 → data.go.kr '제공신청' |
| `acc` | 국립아시아문화전당 채용공고 | 차단 | 채용+공모 게시판 (제목·접수기간·원문 URL) | 국립아시아문화전당 → data.go.kr '제공신청' |
| `arte` | 한국문화예술교육진흥원 채용공고 | 차단 | 채용+공모 게시판 (제목·접수기간·원문 URL) | 한국문화예술교육진흥원 → data.go.kr '제공신청' |
| `daejeon_art` | 대전시립미술관 | 차단 | 채용+공모 게시판 (제목·접수기간·원문 URL) | data.go.kr 제공신청 |
| `jeju_art` | 제주도립미술관 | 차단 | 채용+공모 게시판 (제목·접수기간·원문 URL) | data.go.kr 제공신청 |

### 국내에서 재판정한 뒤 요청 여부를 정할 곳 (D·G 중 공공기관)

GitHub 서버(해외)에서 접속이 안 됐거나 페이지가 안 열린 곳. 국내 PC 에서 다시 판정해 '차단'으로 확인되면 위 목록으로 올린다.

| 코드 | 기관 | 현재 판정 | 근거 |
|---|---|---|---|
| `daegu_art` | 대구미술관 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |
| `jeonnam_art` | 전남도립미술관 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |
| `dgfac` | 대구문화예술진흥원 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |
| `gjcf` | 광주문화재단 채용공고 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |
| `dcaf` | 대전문화재단 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |
| `cbfc` | 충북문화재단 | 확인필요 | robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정 |
| `ctcf` | 충남문화관광재단 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |
| `jncf` | 전남문화재단 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |
| `jfac` | 제주문화예술재단 채용공고 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |
| `songeun` | 송은 | 확인필요 | 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정 |

## 민간 사이트 협의 목록 (B·D·E·F 중 민간)

| 코드 | 이름 | 현재 판정 | 연락처·비고 |
|---|---|---|---|
| `artmore` | 아트모아(예술경영지원센터 예술 일자리 플랫폼) | 깨끗한 허용 | 문체부·예술경영지원센터가 예술 분야 채용을 통합한 공식 플랫폼. 미술 분야 필터(search_val=13-17-28)로 검색. 공공 플랫폼이라 공식 협조 요청 여지가 큼. |
| `momo365` | 모모365(문화사업지원플랫폼) | 깨끗한 허용 | 공모지원(/Support?cd=support)·공모전(/Support?cd=contest)·채용정보(/Recruit) 세 게시판. 민간 운영 → 이용약관 확인·서면 협의 권장. 연락처 culture.momo365@gmail.com |
| `artmap` | 아트맵 공모·레지던시 소식 | 깨끗한 허용 | b_id=002 레지던시. 공모 게시판 b_id 값은 실측. 문의 info@art-map.co.kr |
| `artnet` | 아트넷 채용정보·공모전 | 깨끗한 허용 | 공모전은 /p/competition. https 지원 여부 확인. |
| `artculture` | 아트앤컬처 문화예술신문 공모 | 깨끗한 허용 | 레지던시·공모 소식 재게시. 원문 기관 링크가 있으면 원문을 source_url 로. |
| `busanbiennale` | 부산비엔날레 채용공고 | 깨끗한 허용 | https 지원 여부 확인. |
| `leeum` | 리움미술관 공지 | 깨끗한 허용 | 공지에 채용이 섞여 있음. 자바스크립트 렌더링 여부 실측. 사립 → 서면 협의. |
| `contestkorea` | 콘테스트코리아 미술·디자인 공모전 | 깨끗한 허용 | 미술·디자인·웹툰 분류. 디자인·웹툰은 제목 키워드로 제외. |
| `curatorjob` | 큐레이터잡(큐레이터·학예사 구인정보) | 깨끗한 허용 | 한글 도메인 큐레이터잡.com(그누보드). 구인 게시판만 대상. 구직(개인정보) 게시판은 절대 수집하지 않는다. 민간 운영 → 서면 협의. |
| `art1` | 아트원 구인/구직 게시판 | 깨끗한 허용 | 게시판 분류 파라미터 실측 필요. 구직 글은 제외. |
| `artistmap` | 아티스트맵 일자리 정보 | 깨끗한 허용 | 상세 URL(/board/view/id/…/code/job)만 확인됨. 목록 경로 실측. |
| `thinkcontest` | 씽굿 공모전 | 깨끗한 허용 | 분야 코드(c=8)가 미술인지 실측. 민간 → 협의. |

## 이미 공공데이터 API 가 있는 곳 (요청 없이 활용신청만 하면 됨)

- `gojobs` 나라일터(인사혁신처) 일반채용 모집공고: 인사혁신처_공공취업정보 조회 (data.go.kr/data/15000485) 활용신청
- `alio_api` 잡알리오 공공기관 채용정보(공공데이터 API): 재정경제부_공공기관 채용정보 조회서비스 (data.go.kr/data/15125273) 활용신청
- `work24_api` 고용24(워크넷) 채용정보 API: 고용노동부_워크넷 채용정보 API (data.go.kr 에서 '워크넷 채용정보' 검색) 활용신청
