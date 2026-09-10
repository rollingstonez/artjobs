# 아트잡스 수집 대상 사이트 대장

`scripts/crawler/sources.py` 에서 자동 생성됨 — 이 파일을 직접 고치지 말고 sources.py 를 고친 뒤 `python scripts/crawler/export_sources.py` 를 실행한다.

- 사이트 **81곳** (목록 경로 확정 39곳 / 실측 필요 42곳)
- **우선순위** 1 = 먼저 붙일 것(공고량 많고 예술 특화) · 2 = 다음 · 3 = 나중
- **확인** ✅ = 검색으로 목록 URL 확인 · 🔍 = 기관은 확실하나 목록 경로는 브라우저로 실측 필요
- **robots 판정**은 GitHub Actions `robots-check` 워크플로를 수동 실행하면 `robots_result.csv` 로 받는다. '깨끗한 허용' 또는 서면 협의가 있어야 `crawl_sources.is_active` 를 켠다.

## 분야별 커버리지

'시각예술 전반'으로 표시한 29곳은 모든 분야에 해당하므로 아래 분야별 목록에서는 빼고, 그 분야를 콕 집어 다루는 사이트만 적었다.

- **시각예술 전반** (29곳): 아트모아(예술경영지원센터 예술 일자리 플랫폼), 모모365(문화사업지원플랫폼), 네오룩(비물질 아카이브) 모집·공모, 아트허브 아트잡·공모, 김달진미술연구소(서울아트가이드) 구인구직, 아트원 구인/구직 게시판, 아트넷 채용정보·공모전, 아티스트맵 일자리 정보, 한국미술협회 미술계 소식, 서울문화포털 채용공고, 한국예술인복지재단 공지사항, 서울문화재단 채용공고, 경기문화재단, 인천문화재단, 부산문화재단, 대구문화예술진흥원, 광주문화재단 채용공고, 대전문화재단, 울산문화관광재단, 세종시문화관광재단, 강원문화재단, 충북문화재단, 충남문화관광재단, 전북문화관광재단, 전남문화재단, 경북문화재단, 경남문화예술진흥원 공고, 제주문화예술재단 채용공고, 고용24(워크넷) 채용정보 API
- **회화** (전용 3곳 + 전반 29곳): 콘테스트코리아 미술·디자인 공모전, 위비티 예체능·미술 공모전, 씽굿 공모전
- **조각·설치** (전용 1곳 + 전반 29곳): 창원조각비엔날레(창원문화재단)
- **미디어아트** (전용 9곳 + 전반 29곳): 서울시립미술관 채용시험, 국립아시아문화전당 채용공고, 울산시립미술관, 백남준아트센터, 아트센터 나비, 백남준문화재단 미디어아트 공모, 콘테스트코리아 미술·디자인 공모전, 위비티 예체능·미술 공모전, 씽굿 공모전
- **판화·드로잉** (전용 1곳 + 전반 29곳): 콘테스트코리아 미술·디자인 공모전
- **공예** (전용 3곳 + 전반 29곳): 한국공예·디자인문화진흥원 채용공고, 서울공예박물관 채용, 청주공예비엔날레
- **사진** (전용 6곳 + 전반 29곳): 서울시립미술관 채용시험, 뮤지엄한미 공모(MH Talent Portfolio), 고은사진미술관, 콘테스트코리아 미술·디자인 공모전, 위비티 예체능·미술 공모전, 씽굿 공모전
- **전시기획·큐레이션** (전용 37곳 + 전반 29곳): 예술경영지원센터 채용정보, 한국문화예술회관연합회(KoCACA) 채용공고, 문화체육관광부 채용정보(소속·공공기관), 나라일터(인사혁신처) 일반채용 모집공고, 큐레이터잡(큐레이터·학예사 구인정보), 한국문화예술위원회(ARKO) 채용, 국립현대미술관 채용, 서울시립미술관 채용시험, 국립아시아문화전당 채용공고, 국립중앙박물관 채용 안내, 서울공예박물관 채용, 한국박물관협회 채용정보, 한국사립미술관협회, 부산시립미술관 고시공고, 대구미술관, 광주시립미술관, 대전시립미술관, 울산시립미술관, 경기도미술관, 백남준아트센터, 경남도립미술관, 전북도립미술관, 전남도립미술관, 제주도립미술관, 수원시립미술관, 청주시립미술관, 인천아트플랫폼 공지사항, 광주비엔날레, 부산비엔날레 채용공고, 창원조각비엔날레(창원문화재단), 청주공예비엔날레, 리움미술관 공지, 아트선재센터, 일민미술관, 아모레퍼시픽미술관, 송은, 잡알리오 공공기관 채용정보(공공데이터 API)
- **아트매니지먼트** (전용 10곳 + 전반 29곳): 예술경영지원센터 채용정보, 한국문화예술회관연합회(KoCACA) 채용공고, 문화체육관광부 채용정보(소속·공공기관), 큐레이터잡(큐레이터·학예사 구인정보), 한국문화예술위원회(ARKO) 채용, 한국화랑협회, 광주비엔날레, 부산비엔날레 채용공고, 키아프 서울(한국화랑협회), 잡알리오 공공기관 채용정보(공공데이터 API)
- **예술교육** (전용 13곳 + 전반 29곳): 한국문화예술회관연합회(KoCACA) 채용공고, 큐레이터잡(큐레이터·학예사 구인정보), 국립현대미술관 채용, 서울시립미술관 채용시험, 한국문화예술교육진흥원 채용공고, 한국사립미술관협회, 부산시립미술관 고시공고, 대구미술관, 대전시립미술관, 경기도미술관, 수원시립미술관, 리움미술관 공지, 잡알리오 공공기관 채용정보(공공데이터 API)
- **레지던시·공모** (전용 11곳 + 전반 29곳): 아트누리(예술지원사업 통합 안내), 아트맵 공모·레지던시 소식, 아트앤컬처 문화예술신문 공모, 국립현대미술관 채용, 국립아시아문화전당 채용공고, 광주시립미술관, 전북도립미술관, 인천아트플랫폼 공지사항, 대구예술발전소 공지사항, 아트센터 나비, 송은

## 1. 통합 플랫폼 — 여러 기관 공고가 한 곳에 모이는 사이트 (18곳)

| 우선 | 확인 | 코드 | 이름 | 종류 | 분야 | 지역 | 수집 URL | 비고 |
|---|---|---|---|---|---|---|---|---|
| 1 | ✅ | `artmore` | 아트모아(예술경영지원센터 예술 일자리 플랫폼) | 채용 | 시각예술 전반 | 전국·온라인 | [www.artmore.kr](https://www.artmore.kr/sub/recruit/search_list.do?search_cd=JD&search_nm=%EB%AF%B8%EC%88%A0%EB%B6%84%EC%95%BC&search_val=13-17-28&listSize=50&page=1) | 문체부·예술경영지원센터가 예술 분야 채용을 통합한 공식 플랫폼. 미술 분야 필터(search_val=13-17-28)로 검색. 공공 플랫폼이라 공식 협조 요청 여지가 큼. |
| 1 | ✅ | `artnuri` | 아트누리(예술지원사업 통합 안내) | 공모 | 레지던시·공모 | 전국·온라인 | [artnuri.or.kr](https://artnuri.or.kr/crawler/info/search.do) | 문체부·한국문화예술위원회 운영. 120개 기관(공공기관 9·광역 17·기초 73 문화재단) 지원사업·공모 통합. 장르 '시각예술' 필터 확인 필요. |
| 1 | ✅ | `curatorjob` | 큐레이터잡(큐레이터·학예사 구인정보) | 채용 | 전시기획·큐레이션·아트매니지먼트·예술교육 | 전국·온라인 | [www.xn--om2b25z4do96ac6a.com](https://www.xn--om2b25z4do96ac6a.com/bbs/board.php?bo_table=guin) | 한글 도메인 큐레이터잡.com(그누보드). 구인 게시판만 대상. 구직(개인정보) 게시판은 절대 수집하지 않는다. 민간 운영 → 서면 협의. |
| 1 | ✅ | `gokams_job` | 예술경영지원센터 채용정보 | 채용 | 전시기획·큐레이션·아트매니지먼트 | 전국·온라인 | [www.gokams.or.kr](https://www.gokams.or.kr/01_news/jobposting_list.aspx) | 문화예술기관 채용정보 게시판. 일자리 정보 리스트(/01_news/job_list.aspx)도 함께 확인. |
| 1 | ✅ | `momo365` | 모모365(문화사업지원플랫폼) | 채용+공모 | 시각예술 전반 | 전국·온라인 | [www.momo365.net](https://www.momo365.net/Support?cd=support&ViewType=list) | 공모지원(/Support?cd=support)·공모전(/Support?cd=contest)·채용정보(/Recruit) 세 게시판. 민간 운영 → 이용약관 확인·서면 협의 권장. 연락처 culture.momo365@gmail.com |
| 2 | ✅ | `arthub` | 아트허브 아트잡·공모 | 채용+공모 | 시각예술 전반 | 전국·온라인 | [www.arthub.co.kr](https://www.arthub.co.kr/m/board/job_list.html) | 아트잡(구인)·작가공모·레지던시 게시판 운영. PC 경로(sub04/sub05 board01)는 실측 후 확정. |
| 2 | ✅ | `artmap` | 아트맵 공모·레지던시 소식 | 공모 | 레지던시·공모 | 전국·온라인 | [art-map.co.kr](https://art-map.co.kr/notice/list.php?b_id=002&showtype=3) | b_id=002 레지던시. 공모 게시판 b_id 값은 실측. 문의 info@art-map.co.kr |
| 2 | ✅ | `gojobs` | 나라일터(인사혁신처) 일반채용 모집공고 | 채용 | 전시기획·큐레이션 | 전국·온라인 | [www.gojobs.go.kr](https://www.gojobs.go.kr/apmList.do?menuNo=401) | 국가·지방 학예연구사(직) 임기제·경력채용이 여기에 뜬다. '학예' 검색어로 필터. 공공데이터포털 '인사혁신처_공공취업정보 조회' API(data.go.kr/data/15000485)로 대체 가능. |
| 2 | ✅ | `kocaca` | 한국문화예술회관연합회(KoCACA) 채용공고 | 채용 | 전시기획·큐레이션·아트매니지먼트·예술교육 | 전국·온라인 | [www.kocaca.or.kr](https://www.kocaca.or.kr/myboard/myboard10) | 전국 문예회관 채용공고 모음. 구인게시판(/myboard/myboard14)도 있음. 공연 분야가 섞여 있어 분야 분류 필요. |
| 2 | ✅ | `mcst_job` | 문화체육관광부 채용정보(소속·공공기관) | 채용 | 전시기획·큐레이션·아트매니지먼트 | 전국·온라인 | [www.mcst.go.kr](https://www.mcst.go.kr/site/s_notice/notice/jobList.jsp?pTab=02) | 문체부 소속기관·산하 공공기관 채용 모음(국립현대미술관·아시아문화전당 등 포함). 본부(pTab=01)는 제외. |
| 2 | ✅ | `neolook` | 네오룩(비물질 아카이브) 모집·공모 | 채용+공모 | 시각예술 전반 | 전국·온라인 | [neolook.com](https://neolook.com/archives) | 전시·공모·레지던시·채용이 같은 archives 에 섞여 있어 제목 키워드(모집·공모·채용)로 걸러야 함. 게재가 유료(22만원)인 매체라 운영자 협의 필수. |
| 2 | ✅ | `seoul_culture` | 서울문화포털 채용공고 | 채용 | 시각예술 전반 | 서울 | [culture.seoul.go.kr](https://culture.seoul.go.kr/culture/bbs/B0000002/list.do?menuNo=200052) | 서울시 문화기관(시립미술관·박물관·문화재단 등) 채용 모음. |
| 3 | 🔍 | `art1` | 아트원 구인/구직 게시판 | 채용 | 시각예술 전반 | 전국·온라인 | [www.art1.com](https://www.art1.com/bbs/) | 게시판 분류 파라미터 실측 필요. 구직 글은 제외. |
| 3 | ✅ | `artculture` | 아트앤컬처 문화예술신문 공모 | 공모 | 레지던시·공모 | 전국·온라인 | [art-culture.co.kr](https://art-culture.co.kr/magazine_contest) | 레지던시·공모 소식 재게시. 원문 기관 링크가 있으면 원문을 source_url 로. |
| 3 | 🔍 | `artistmap` | 아티스트맵 일자리 정보 | 채용 | 시각예술 전반 | 전국·온라인 | [artistmap.kr](https://artistmap.kr/board/list/code/job) | 상세 URL(/board/view/id/…/code/job)만 확인됨. 목록 경로 실측. |
| 3 | ✅ | `artnet` | 아트넷 채용정보·공모전 | 채용+공모 | 시각예술 전반 | 전국·온라인 | [artnet.kr](http://artnet.kr/p/recruit) | 공모전은 /p/competition. https 지원 여부 확인. |
| 3 | 🔍 | `daljin` | 김달진미술연구소(서울아트가이드) 구인구직 | 채용 | 시각예술 전반 | 전국·온라인 | [www.daljin.com](https://www.daljin.com) *(경로 실측)* | 구인 게시판 경로(index.php?WS=…) 실측 필요. 구직 글은 제외. |
| 3 | ✅ | `kfaa` | 한국미술협회 미술계 소식 | 공모 | 시각예술 전반 | 전국·온라인 | [kfaa.or.kr](https://kfaa.or.kr/bbs/?so_table=art_news01) | 공모·전시 소식 게시판. 채용 비중은 낮음. |

## 2. 중앙 공공기관 (12곳)

| 우선 | 확인 | 코드 | 이름 | 종류 | 분야 | 지역 | 수집 URL | 비고 |
|---|---|---|---|---|---|---|---|---|
| 1 | ✅ | `arte` | 한국문화예술교육진흥원 채용공고 | 채용+공모 | 예술교육 | 서울 | [arte.or.kr](https://arte.or.kr/notice/job/notice/Job_BoardList.do) | 직원 채용 + 예술강사 모집 공고. 학교 예술강사 지원사업은 aschool.arte.or.kr 별도. |
| 1 | ✅ | `kcdf` | 한국공예·디자인문화진흥원 채용공고 | 채용+공모 | 공예 | 서울 | [www.kcdf.or.kr](https://www.kcdf.or.kr/brd/board/342/L/menu/288) | 채용공고(342/288)·사업공모(/brd/board/337/L/menu/284). 공예청년인턴십 등 공예 분야 핵심 소스. |
| 1 | ✅ | `mmca` | 국립현대미술관 채용 | 채용+공모 | 전시기획·큐레이션·예술교육·레지던시·공모 | 서울 | [www.mmca.go.kr](https://www.mmca.go.kr/pr/employmentList.do) | 학예연구직·기간제·인턴 채용. 고양·창동 레지던시 입주작가 공모는 공지사항(/pr/noticeList.do 추정)에 뜸. |
| 1 | ✅ | `sema` | 서울시립미술관 채용시험 | 채용+공모 | 전시기획·큐레이션·예술교육·사진·미디어아트 | 서울 | [sema.seoul.go.kr](https://sema.seoul.go.kr/kr/bbs/611389/getBbsList) | 채용시험(611389)·공지사항/공고·공모(610221) 두 게시판. 사진미술관·미디어시티비엔날레·난지창작스튜디오 공모 포함. |
| 2 | ✅ | `acc` | 국립아시아문화전당 채용공고 | 채용+공모 | 전시기획·큐레이션·미디어아트·레지던시·공모 | 광주 | [www.acc.go.kr](https://www.acc.go.kr/main/board/board.do?PID=0702) | ACC_R 레지던시·아시아창작스튜디오 공모는 공지 게시판. 재단 채용은 recruit.incruit.com/accf(인크루트 채용관 → 수집 대상 아님). |
| 2 | ✅ | `arko` | 한국문화예술위원회(ARKO) 채용 | 채용 | 아트매니지먼트·전시기획·큐레이션 | 전남 | [arko.recruiton.kr](https://arko.recruiton.kr/recruit/gongo/gongo_list.asp) | 본 사이트 채용모집 게시판은 www.arko.or.kr/board/list/4054(추정). 지원사업 공모는 아트누리로 통합됨. |
| 2 | 🔍 | `craftmuseum` | 서울공예박물관 채용 | 채용 | 공예·전시기획·큐레이션 | 서울 | [craftmuseum.seoul.go.kr](https://craftmuseum.seoul.go.kr/introduce/recruit) | 상세 /introduce/recruit_view/NTT_… 확인됨. 목록 경로 실측. |
| 2 | 🔍 | `kawf` | 한국예술인복지재단 공지사항 | 채용+공모 | 시각예술 전반 | 서울 | [www.kawf.kr](https://www.kawf.kr/notice/sub01List.do) | 상세는 /notice/sub01View.do?selIdx=… 확인됨. 예술인파견지원(예술로) 등 예술인 대상 공모. |
| 3 | 🔍 | `artmuseums` | 한국사립미술관협회 | 채용+공모 | 전시기획·큐레이션·예술교육 | 서울 | [artmuseums.kr](https://artmuseums.kr) *(경로 실측)* | 사립미술관 채용·공모 게시판 유무부터 확인. |
| 3 | 🔍 | `galleries` | 한국화랑협회 | 채용 | 아트매니지먼트 | 서울 | [www.koreagalleries.or.kr](https://www.koreagalleries.or.kr) *(경로 실측)* | 갤러리 채용 게시판 유무 확인. 키아프(kiaf.org) 채용도 여기 계열. |
| 3 | 🔍 | `museum_assoc` | 한국박물관협회 채용정보 | 채용 | 전시기획·큐레이션 | 서울 | [museum.or.kr](https://museum.or.kr) *(경로 실측)* | 회원 박물관·미술관 구인 게시판 경로 실측 필요. |
| 3 | ✅ | `museum_go` | 국립중앙박물관 채용 안내 | 채용 | 전시기획·큐레이션 | 서울 | [www.museum.go.kr](https://www.museum.go.kr/MUSEUM/contents/M0701030000.do?catCustomType=post&catId=54) | 학예연구원 채용(소속 지방박물관 포함). 미술 외 고고·역사 공고가 섞여 제목 필터 필요. |

## 3. 광역 미술관·문화재단 (30곳)

| 우선 | 확인 | 코드 | 이름 | 종류 | 분야 | 지역 | 수집 URL | 비고 |
|---|---|---|---|---|---|---|---|---|
| 1 | ✅ | `sfac` | 서울문화재단 채용공고 | 채용+공모 | 시각예술 전반 | 서울 | [www.sfac.or.kr](https://www.sfac.or.kr/opensquare/notice/recruit_list.do) | 입주작가 공모는 /participation/participation/artspace_movein.do (금천예술공장·서울예술창작센터 등). 직원 공채는 recruit.sfac.or.kr. |
| 2 | 🔍 | `bscf` | 부산문화재단 | 채용+공모 | 시각예술 전반 | 부산 | [www.bscf.or.kr](https://www.bscf.or.kr) *(경로 실측)* | 채용관 busancf.saramin.co.kr. 홍티아트센터 레지던시 공모 포함. |
| 2 | 🔍 | `busan_art` | 부산시립미술관 고시공고 | 채용+공모 | 전시기획·큐레이션·예술교육 | 부산 | [art.busan.go.kr](https://art.busan.go.kr/anucmt/list.nm) | 상세 /anucmt/view.nm 확인됨. 부산시 채용공고(busan.go.kr/nbincruit)에도 동시 게재. |
| 2 | 🔍 | `daegu_art` | 대구미술관 | 채용+공모 | 전시기획·큐레이션·예술교육 | 대구 | [daeguartmuseum.or.kr](https://daeguartmuseum.or.kr) *(경로 실측)* | 채용·공고 게시판 경로 실측. |
| 2 | 🔍 | `daejeon_art` | 대전시립미술관 | 채용+공모 | 전시기획·큐레이션·예술교육 | 대전 | [www.daejeon.go.kr](https://www.daejeon.go.kr/dma/DmaBoardList.do?menuSeq=6098) | 상세 /dma/DmaBoardView.do?menuSeq=6098 확인됨. 대전시 포털 하위라 robots 는 daejeon.go.kr 기준. |
| 2 | ✅ | `gcaf` | 경남문화예술진흥원 공고 | 채용+공모 | 시각예술 전반 | 경남 | [www.gcaf.or.kr](https://www.gcaf.or.kr/bbs/board.php?bo_table=sub4_1) | 그누보드 공고 게시판(sub4_1). 마산현대미술관 레지던시 공모 등. |
| 2 | 🔍 | `ggcf` | 경기문화재단 | 채용+공모 | 시각예술 전반 | 경기 | [www.ggcf.kr](https://www.ggcf.kr) *(경로 실측)* | 채용은 ggcf.saramin.co.kr(사람인 채용관 → 수집 대상 아님). 공모는 경기예술인지원센터(artist.ggcf.kr) 확인. |
| 2 | ✅ | `gjcf` | 광주문화재단 채용공고 | 채용+공모 | 시각예술 전반 | 광주 | [www.gjcf.or.kr](https://www.gjcf.or.kr/cf/news/hire.do) | 열린광장 > 채용공고. |
| 2 | 🔍 | `gmoma` | 경기도미술관 | 채용+공모 | 전시기획·큐레이션·예술교육 | 경기 | [gmoma.ggcf.kr](https://gmoma.ggcf.kr) *(경로 실측)* | 경기문화재단 계열. 채용은 재단 통합 채용(ggcf.saramin.co.kr)로 빠질 수 있음. |
| 2 | 🔍 | `gwangju_art` | 광주시립미술관 | 채용+공모 | 전시기획·큐레이션·레지던시·공모 | 광주 | [artmuse.gwangju.go.kr](https://artmuse.gwangju.go.kr) *(경로 실측)* | 북구 창작스튜디오 입주작가 공모 포함. 경로 실측. |
| 2 | 🔍 | `ifac` | 인천문화재단 | 채용+공모 | 시각예술 전반 | 인천 | [www.ifac.or.kr](https://www.ifac.or.kr) *(경로 실측)* | 채용관 ifac.incruit.com. 인천아트플랫폼 레지던시는 별도(inartplatform). |
| 2 | ✅ | `jfac` | 제주문화예술재단 채용공고 | 채용+공모 | 시각예술 전반 | 제주 | [www.jcaf.or.kr](http://www.jcaf.or.kr/contents/index.php?mid=070102) | 채용관 recruit.incruit.com/jfac. 레지던시 입주작가 통합공모 매년 게시. |
| 2 | 🔍 | `njp` | 백남준아트센터 | 채용+공모 | 미디어아트·전시기획·큐레이션 | 경기 | [njp.ggcf.kr](https://njp.ggcf.kr) *(경로 실측)* | 미디어아트 핵심 기관. 공지·공모 경로 실측. |
| 3 | 🔍 | `cbfc` | 충북문화재단 | 채용+공모 | 시각예술 전반 | 충북 | [www.cbfc.or.kr](https://www.cbfc.or.kr) *(경로 실측)* | 경로 실측. |
| 3 | 🔍 | `cheongju_art` | 청주시립미술관 | 채용+공모 | 전시기획·큐레이션 | 충북 | [cmoa.cheongju.go.kr](https://cmoa.cheongju.go.kr) *(경로 실측)* | 경로 실측. |
| 3 | 🔍 | `ctcf` | 충남문화관광재단 | 채용+공모 | 시각예술 전반 | 충남 | [www.ctcf.or.kr](https://www.ctcf.or.kr) *(경로 실측)* | 경로 실측. |
| 3 | 🔍 | `dcaf` | 대전문화재단 | 채용+공모 | 시각예술 전반 | 대전 | [www.dcaf.or.kr](https://www.dcaf.or.kr) *(경로 실측)* | 경로 실측. |
| 3 | 🔍 | `dgfac` | 대구문화예술진흥원 | 채용+공모 | 시각예술 전반 | 대구 | [www.dgfac.or.kr](https://www.dgfac.or.kr) *(경로 실측)* | 도메인·경로 실측(대구예술발전소는 별도 daeguartfactory). |
| 3 | 🔍 | `gacf` | 경북문화재단 | 채용+공모 | 시각예술 전반 | 경북 | [www.gacf.kr](http://www.gacf.kr) *(경로 실측)* | https 지원 여부·경로 실측. |
| 3 | 🔍 | `gwcf` | 강원문화재단 | 채용+공모 | 시각예술 전반 | 강원 | [www.gwcf.or.kr](https://www.gwcf.or.kr) *(경로 실측)* | 경로 실측. 강원국제트리엔날레 공모 포함 가능. |
| 3 | 🔍 | `gyeongnam_art` | 경남도립미술관 | 채용+공모 | 전시기획·큐레이션 | 경남 | [www.gyeongnam.go.kr](https://www.gyeongnam.go.kr) *(경로 실측)* | 경남도 포털 하위(/gam). 경로 실측. |
| 3 | 🔍 | `jbct` | 전북문화관광재단 | 채용+공모 | 시각예술 전반 | 전북 | [www.jbct.or.kr](https://www.jbct.or.kr) *(경로 실측)* | 경로 실측. |
| 3 | 🔍 | `jeju_art` | 제주도립미술관 | 채용+공모 | 전시기획·큐레이션 | 제주 | [www.jeju.go.kr](https://www.jeju.go.kr) *(경로 실측)* | 제주도 포털 하위(/jmoa). 경로 실측. |
| 3 | 🔍 | `jeonbuk_art` | 전북도립미술관 | 채용+공모 | 전시기획·큐레이션·레지던시·공모 | 전북 | [www.jma.go.kr](https://www.jma.go.kr) *(경로 실측)* | 창작스튜디오 공모 포함. 경로 실측. |
| 3 | 🔍 | `jeonnam_art` | 전남도립미술관 | 채용+공모 | 전시기획·큐레이션 | 전남 | [jnam.jeonnam.go.kr](https://jnam.jeonnam.go.kr) *(경로 실측)* | 경로 실측. |
| 3 | 🔍 | `jncf` | 전남문화재단 | 채용+공모 | 시각예술 전반 | 전남 | [www.jncf.or.kr](https://www.jncf.or.kr) *(경로 실측)* | 채용관 jeonnam.saramin.co.kr. 본 사이트 경로 실측. |
| 3 | 🔍 | `sjcf` | 세종시문화관광재단 | 채용+공모 | 시각예술 전반 | 세종 | [www.sjcf.or.kr](https://www.sjcf.or.kr) *(경로 실측)* | 경로 실측. |
| 3 | 🔍 | `suwon_art` | 수원시립미술관 | 채용+공모 | 전시기획·큐레이션·예술교육 | 경기 | [suma.suwon.go.kr](https://suma.suwon.go.kr) *(경로 실측)* | 경로 실측. |
| 3 | 🔍 | `uctf` | 울산문화관광재단 | 채용+공모 | 시각예술 전반 | 울산 | [www.uctf.or.kr](https://www.uctf.or.kr) *(경로 실측)* | 채용관 uctf.saramin.co.kr / recruit.incruit.com/uctf. 본 사이트 공고 경로 실측. |
| 3 | 🔍 | `ulsan_art` | 울산시립미술관 | 채용+공모 | 전시기획·큐레이션·미디어아트 | 울산 | [www.ulsan.go.kr](https://www.ulsan.go.kr) *(경로 실측)* | 울산시 포털 하위(/s/uam). 경로 실측. |

## 4. 레지던시·비엔날레·사립미술관·전문분야 (16곳)

| 우선 | 확인 | 코드 | 이름 | 종류 | 분야 | 지역 | 수집 URL | 비고 |
|---|---|---|---|---|---|---|---|---|
| 2 | ✅ | `busanbiennale` | 부산비엔날레 채용공고 | 채용 | 전시기획·큐레이션·아트매니지먼트 | 부산 | [www.busanbiennale.org](http://www.busanbiennale.org/BBOCkr/index.php?pCode=gongo&mode=list) | https 지원 여부 확인. |
| 2 | 🔍 | `daeguartfactory` | 대구예술발전소 공지사항 | 채용+공모 | 레지던시·공모 | 대구 | [www.daeguartfactory.kr](https://www.daeguartfactory.kr/front/board/list.php?code=notice) | 상세 /front/board/view.php?code=notice&no=… 확인됨. 매년 12월 레지던시 입주작가 모집. |
| 2 | 🔍 | `gwangjubiennale` | 광주비엔날레 | 채용+공모 | 전시기획·큐레이션·아트매니지먼트 | 광주 | [www.gwangjubiennale.org](https://www.gwangjubiennale.org) *(경로 실측)* | 채용·전시기획자양성과정 모집. 공지 경로 실측. |
| 2 | ✅ | `inartplatform` | 인천아트플랫폼 공지사항 | 채용+공모 | 레지던시·공모·전시기획·큐레이션 | 인천 | [inartplatform.kr](https://inartplatform.kr/notice) | 레지던시 입주작가 공모·인턴 채용. |
| 3 | 🔍 | `apma` | 아모레퍼시픽미술관 | 채용 | 전시기획·큐레이션 | 서울 | [apma.amorepacific.com](https://apma.amorepacific.com) *(경로 실측)* | 사립. 채용은 그룹 채용사이트로 갈 가능성 → 확인. |
| 3 | 🔍 | `artsonje` | 아트선재센터 | 채용 | 전시기획·큐레이션 | 서울 | [artsonje.org](https://artsonje.org) *(경로 실측)* | 사립. 채용 공지 경로·협의. |
| 3 | 🔍 | `changwon_biennale` | 창원조각비엔날레(창원문화재단) | 채용+공모 | 조각·설치·전시기획·큐레이션 | 경남 | [www.changwonbiennale.or.kr](https://www.changwonbiennale.or.kr) *(경로 실측)* | 조각 분야 핵심 행사. 조직위 채용·참여작가 공모. 경로 실측. |
| 3 | 🔍 | `goeun` | 고은사진미술관 | 채용+공모 | 사진 | 부산 | [www.goeunmuseum.kr](https://www.goeunmuseum.kr) *(경로 실측)* | 사진 분야. 공지 경로 실측. |
| 3 | 🔍 | `ilmin` | 일민미술관 | 채용 | 전시기획·큐레이션 | 서울 | [ilmin.org](https://ilmin.org) *(경로 실측)* | 사립. 채용 공지 경로·협의. |
| 3 | 🔍 | `kiaf` | 키아프 서울(한국화랑협회) | 채용 | 아트매니지먼트 | 서울 | [kiaf.org](https://kiaf.org) *(경로 실측)* | 아트페어 스태프 채용. 경로 실측. |
| 3 | ✅ | `leeum` | 리움미술관 공지 | 채용 | 전시기획·큐레이션·예술교육 | 서울 | [www.leeumhoam.org](https://www.leeumhoam.org/leeum/info/notice) | 공지에 채용이 섞여 있음. 자바스크립트 렌더링 여부 실측. 사립 → 서면 협의. |
| 3 | 🔍 | `museumhanmi` | 뮤지엄한미 공모(MH Talent Portfolio) | 채용+공모 | 사진 | 서울 | [museumhanmi.or.kr](https://museumhanmi.or.kr) *(경로 실측)* | 사진 분야 작가 포트폴리오 공모. 공지 경로 실측. |
| 3 | 🔍 | `nabi` | 아트센터 나비 | 채용+공모 | 미디어아트·레지던시·공모 | 서울 | [www.nabi.or.kr](https://www.nabi.or.kr/page/board_list.php?brd_id=project) | 상세 /page/board_view.php?brd_id=project 확인됨. 나비 아티스트 레지던시(미디어아트). |
| 3 | 🔍 | `namjunepaik` | 백남준문화재단 미디어아트 공모 | 공모 | 미디어아트 | 전국·온라인 | [namjunepaik.org](https://namjunepaik.org) *(경로 실측)* | 연 1회 미디어아트 공모전(39세 이하). 상세 /media-art-competition-2025 확인됨. |
| 3 | 🔍 | `okcj` | 청주공예비엔날레 | 채용+공모 | 공예·전시기획·큐레이션 | 충북 | [www.okcj.org](https://www.okcj.org) *(경로 실측)* | 조직위 기간제 채용·공예 공모. 경로 실측. |
| 3 | 🔍 | `songeun` | 송은 | 채용+공모 | 전시기획·큐레이션·레지던시·공모 | 서울 | [www.songeun.or.kr](https://www.songeun.or.kr) *(경로 실측)* | 송은미술대상 공모·채용. 경로 실측. |

## 5. 공모전 포털·공공 채용 API (5곳)

| 우선 | 확인 | 코드 | 이름 | 종류 | 분야 | 지역 | 수집 URL | 비고 |
|---|---|---|---|---|---|---|---|---|
| 2 | ✅ | `alio_api` | 잡알리오 공공기관 채용정보(공공데이터 API) | 채용 | 전시기획·큐레이션·아트매니지먼트·예술교육 | 전국·온라인 | [job.alio.go.kr](https://job.alio.go.kr) *(경로 실측)* | 공공데이터포털 '재정경제부_공공기관 채용정보 조회서비스'(data.go.kr/data/15125273) 인증키 신청 후 사용. 예술경영지원센터·문화예술위원회·ACC재단·KCDF·문화예술교육진흥원·국립박물관문화재단 등 기관코드로 필터. |
| 3 | ✅ | `contestkorea` | 콘테스트코리아 미술·디자인 공모전 | 공모 | 회화·판화·드로잉·미디어아트·사진 | 전국·온라인 | [www.contestkorea.com](https://www.contestkorea.com/sub/list.php?int_gbn=1&Txt_bcode=030610001) | 미술·디자인·웹툰 분류. 디자인·웹툰은 제목 키워드로 제외. |
| 3 | 🔍 | `thinkcontest` | 씽굿 공모전 | 공모 | 회화·사진·미디어아트 | 전국·온라인 | [www.thinkcontest.com](https://www.thinkcontest.com/Contest/CateField.html?c=8) | 분야 코드(c=8)가 미술인지 실측. 민간 → 협의. |
| 3 | 🔍 | `wevity` | 위비티 예체능·미술 공모전 | 공모 | 회화·사진·미디어아트 | 전국·온라인 | [www.wevity.com](https://www.wevity.com) *(경로 실측)* | 분야 필터 파라미터 실측. 민간 → 협의. |
| 3 | ✅ | `work24_api` | 고용24(워크넷) 채용정보 API | 채용 | 시각예술 전반 | 전국·온라인 | [www.work24.go.kr](https://www.work24.go.kr) *(경로 실측)* | 공공데이터포털 워크넷 채용정보 API. 직종코드(문화·예술·디자인)로 필터. 공고량은 많으나 예술 특화도는 낮음. |

## 제외한 사이트

- **사람인·잡코리아·인크루트·인디드·캐치·자소설닷컴** — 대형 취업포털. 이용약관에서 자동수집 금지, robots 차단. 기관별 채용관(xxx.saramin.co.kr 등)도 동일.
- **기관별 인크루트/사람인 채용관(recruit.incruit.com/*, *.saramin.co.kr)** — 위와 같음. 기관 본 사이트 공고 게시판을 대신 수집한다.
- **네이버 카페·오픈채팅(학예사 준비 카페 등)** — 로그인 필요 + 개인 게시물. 수집 불가.
- **구직·인력풀·이력서 게시판 전부** — 구직자 개인정보. 어떤 사이트든 구인 게시판만 대상.
- **예술의전당·국립극장 등 공연예술 전용 기관** — 아트잡스 분야(시각예술) 밖. 문예회관 통합(kocaca)에서 시각예술 공고만 거른다.

## 새 사이트를 붙이는 순서

1. `sources.py` 에 항목 추가(list_path 는 브라우저에서 실제 목록 페이지 주소를 복사).
2. `python scripts/crawler/export_sources.py` 로 이 문서와 SQL 시드를 갱신.
3. GitHub Actions `robots-check` 실행 → `robots_result.csv` 에서 판정 확인.
4. 판정이 '깨끗한 허용'(또는 서면 협의 완료)이면 Supabase `crawl_sources` 에서 해당 code 의 `robots_status`·`is_active` 갱신.
5. `crawl_template.py` 를 복사해 `crawl_<code>.py` 작성 → 실제 HTML 로 선택자 확인 → `PARSER_READY=True`.
6. `.github/workflows/crawl.yml` 에 실행 단계 추가.
