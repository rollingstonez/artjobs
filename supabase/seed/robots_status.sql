-- robots 판정(2026-09-10T03:54:56.907243+00:00) → crawl_sources.robots_status. scripts/crawler/robots_to_sql.py 가 생성.
-- agreed(서면 협의 완료)는 유지, is_active 는 건드리지 않는다.

update crawl_sources set robots_status = 'clean' where code = 'artmore' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음
update crawl_sources set robots_status = 'clean' where code = 'artnuri' and robots_status <> 'agreed';  -- 깨끗한 허용: robots.txt 없음(막을 규칙 자체가 없음)
update crawl_sources set robots_status = 'clean' where code = 'momo365' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'kocaca' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'mcst_job' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'gojobs' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음
update crawl_sources set robots_status = 'clean' where code = 'curatorjob' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음
update crawl_sources set robots_status = 'unchecked' where code = 'neolook' and robots_status <> 'agreed';  -- 확인필요: robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'arthub' and robots_status <> 'agreed';  -- 확인필요: robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'clean' where code = 'artmap' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음
update crawl_sources set robots_status = 'clean' where code = 'daljin' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'art1' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'artnet' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'artistmap' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'artculture' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'kfaa' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음
update crawl_sources set robots_status = 'clean' where code = 'seoul_culture' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'arko' and robots_status <> 'agreed';  -- 깨끗한 허용: robots.txt 없음(막을 규칙 자체가 없음)
update crawl_sources set robots_status = 'clean' where code = 'mmca' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'sema' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'kcdf' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'kawf' and robots_status <> 'agreed';  -- 깨끗한 허용: robots.txt 없음(막을 규칙 자체가 없음)
update crawl_sources set robots_status = 'clean' where code = 'museum_go' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'craftmuseum' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'museum_assoc' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'galleries' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'busan_art' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'gwangju_art' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'ulsan_art' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'gmoma' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'njp' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'gyeongnam_art' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'jeonbuk_art' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'suwon_art' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'cheongju_art' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'sfac' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'ggcf' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'ifac' and robots_status <> 'agreed';  -- 깨끗한 허용: robots.txt 없음(막을 규칙 자체가 없음) ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'bscf' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'uctf' and robots_status <> 'agreed';  -- 깨끗한 허용: robots.txt 없음(막을 규칙 자체가 없음) ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'sjcf' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'gwcf' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'cbfc' and robots_status <> 'agreed';  -- 확인필요: robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'clean' where code = 'jbct' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'gacf' and robots_status <> 'agreed';  -- 확인필요: robots.txt 요청이 거부됨(HTTP 403) — 봇/해외 IP 차단 가능성. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'clean' where code = 'inartplatform' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'nabi' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'namjunepaik' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'gwangjubiennale' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'busanbiennale' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'changwon_biennale' and robots_status <> 'agreed';  -- 깨끗한 허용: 우리 경로를 막는 규칙 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'leeum' and robots_status <> 'agreed';  -- 깨끗한 허용: robots.txt 없음(막을 규칙 자체가 없음)
update crawl_sources set robots_status = 'clean' where code = 'museumhanmi' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'goeun' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'artsonje' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'ilmin' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'apma' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'kiaf' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'alio_api' and robots_status <> 'agreed';  -- 깨끗한 허용: robots.txt 없음(막을 규칙 자체가 없음) ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'work24_api' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'contestkorea' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'clean' where code = 'wevity' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음 ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'clean' where code = 'thinkcontest' and robots_status <> 'agreed';  -- 깨끗한 허용: User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음
update crawl_sources set robots_status = 'gray' where code = 'gcaf' and robots_status <> 'agreed';  -- 회색지대: 검색봇 차단: googlebot (자동수집 거부 의도)
update crawl_sources set robots_status = 'blocked' where code = 'gokams_job' and robots_status <> 'agreed';  -- 차단: User-agent:* 에서 우리 경로 Disallow
update crawl_sources set robots_status = 'blocked' where code = 'acc' and robots_status <> 'agreed';  -- 차단: User-agent:* 에서 우리 경로 Disallow
update crawl_sources set robots_status = 'blocked' where code = 'arte' and robots_status <> 'agreed';  -- 차단: User-agent:* 에서 우리 경로 Disallow
update crawl_sources set robots_status = 'blocked' where code = 'daejeon_art' and robots_status <> 'agreed';  -- 차단: User-agent:* 에서 우리 경로 Disallow
update crawl_sources set robots_status = 'blocked' where code = 'jeju_art' and robots_status <> 'agreed';  -- 차단: User-agent:* 에서 우리 경로 Disallow ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'artmuseums' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'daegu_art' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'jeonnam_art' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'dgfac' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'gjcf' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'dcaf' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'ctcf' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'jncf' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'jfac' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'daeguartfactory' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'okcj' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정
update crawl_sources set robots_status = 'unchecked' where code = 'songeun' and robots_status <> 'agreed';  -- 확인필요: 연결실패(응답없음) — GitHub 서버(해외 IP)에서 실패했을 수 있음. 국내 PC 에서 재판정

select robots_status, count(*) from crawl_sources group by 1 order by 1;
