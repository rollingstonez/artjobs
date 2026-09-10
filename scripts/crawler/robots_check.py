#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
아트잡스 robots.txt 판정기 — 바로쌤 robots_check_v2.py 이식.

새 소스를 붙이기 전에 반드시 한 번 돌린다. 판정은 4단계:
  깨끗한 허용  User-agent:* 규칙이 우리 경로를 막지 않고, 검색봇 차단도 없음 → 수집 가능
  회색지대     우리(*)한텐 열렸지만 Yeti/Googlebot 등 검색봇에 게시판 경로를 콕 집어 막음
               = 자동수집 거부 의도 → 수집하지 않고 공식 경로(공공데이터 신청·서면 협의)로
  차단         User-agent:* 에서 우리 경로 Disallow → 수집하지 않는다
  확인필요     robots.txt 응답 없음 → 재접속 후 재판정

사용법 (저장소 최상위에서):
    python scripts/crawler/robots_check.py
    python scripts/crawler/robots_check.py https://example.org /board/list.do   # 단건

★ sources.py 의 list_path 는 우리가 실제로 크롤링하는 URL과 반드시 같아야 판정이 정확하다.
  list_path 가 None 인 사이트는 '/' 로 판정되며 근거에 '목록경로 미정' 표시가 붙는다.
"""
import csv
import io
import re
import sys

import requests

UA = "ArtjobsBot/0.1 (+https://artjobs.kr; contact: support@artjobs.kr)"

# (소스코드, 이름, base, 실제 수집 목록경로) — 대장은 sources.py 하나로 관리한다. 여기서 복사하지 말 것.
from sources import robots_targets

SITES = robots_targets()

SEARCH_BOTS = {"yeti", "googlebot", "daumoa", "bingbot", "naverbot", "google", "msnbot"}


def fetch(base):
    url = base.rstrip("/") + "/robots.txt"
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=12)
        return r.status_code, (r.text if r.status_code == 200 else "")
    except Exception as e:
        return None, str(e)


def parse_groups(text):
    groups, agents, rules, last_was_rule = [], [], [], False
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        field, val = line.split(":", 1)
        field, val = field.strip().lower(), val.strip()
        if field == "user-agent":
            if last_was_rule and agents:
                groups.append((agents, rules))
                agents, rules = [], []
            agents.append(val.lower())
            last_was_rule = False
        elif field in ("allow", "disallow"):
            rules.append((field, val))
            last_was_rule = True
    if agents:
        groups.append((agents, rules))
    return groups


def pattern_matches(pattern, path):
    if pattern == "":
        return False
    regex = ""
    for ch in pattern:
        if ch == "*":
            regex += ".*"
        elif ch == "$":
            regex += "$"
        else:
            regex += re.escape(ch)
    return re.match(regex, path) is not None


def status_for(rules, path):
    best = None
    for typ, pat in rules:
        if typ == "disallow" and pat == "":
            continue
        if pattern_matches(pat, path):
            if best is None or len(pat) > best[0]:
                best = (len(pat), typ)
    return best[1] if best else "none"


def classify(path, status, text):
    if status is None:
        return "확인필요", "연결실패(응답없음)"
    if status == 404 or not text.strip():
        return "깨끗한 허용", "robots.txt 없음(막을 규칙 자체가 없음)"

    star_rules, named = None, []
    for agents, rules in parse_groups(text):
        for a in agents:
            if a == "*":
                star_rules = rules
            else:
                named.append((a, rules))

    if star_rules is not None and status_for(star_rules, path) == "disallow":
        return "차단", "User-agent:* 에서 우리 경로 Disallow"

    blockers = [a for a, rules in named if a in SEARCH_BOTS and status_for(rules, path) == "disallow"]
    if blockers:
        return "회색지대", f"검색봇 차단: {', '.join(blockers)} (자동수집 거부 의도)"

    if star_rules is not None:
        return "깨끗한 허용", "User-agent:* 존재 + 우리 경로 허용 + 검색봇 차단 없음"
    return "깨끗한 허용", "우리 경로를 막는 규칙 없음"


def main():
    sites = SITES
    if len(sys.argv) == 3:
        sites = [("adhoc", sys.argv[1], sys.argv[1], sys.argv[2])]
    if not sites:
        sys.exit("SITES 가 비어 있습니다. 파일의 SITES 에 채우거나  python robots_check.py <base> <path>  로 실행하세요.")

    rows, order = [], {"깨끗한 허용": 0, "회색지대": 1, "차단": 2, "확인필요": 3}
    print(f"\nUser-Agent: {UA}\n" + "=" * 74)
    for code, name, base, path in sites:
        status, text = fetch(base)
        verdict, reason = classify(path, status, text)
        if path == "/":
            reason += " ※목록경로 미정 — 사이트 최상위로 판정함. sources.py 의 list_path 를 채운 뒤 재판정"
        rows.append((code, name, base + path, status, verdict, reason))

    rows.sort(key=lambda r: order.get(r[4], 9))
    for code, name, url, status, verdict, reason in rows:
        print(f"[{verdict:6}] {name} ({status if status is not None else '—'})  {url}")
        print(f"          → {reason}")

    with io.open("robots_result.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["코드", "기관", "URL", "HTTP", "판정", "근거"])
        w.writerows(rows)
    print("=" * 74 + "\nrobots_result.csv 저장 완료.")


if __name__ == "__main__":
    main()
