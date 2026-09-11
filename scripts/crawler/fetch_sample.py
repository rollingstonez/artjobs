"""목록·상세 페이지 HTML 을 받아 사람이 읽기 좋게 로그에 찍는다 — 파서 만들 때 선택자 확인용.

GitHub Actions(fetch-sample) 에서 돈다. 작업 환경(클로드 코드)은 외부 사이트 접근이 막혀 있어서
사이트 구조는 이 로그로 본다. script/style/svg 는 빼고 본문만 정리해서 출력한다.

    python scripts/crawler/fetch_sample.py <url> [max_lines] [mode] [post_data]
    post_data 를 주면(예: "cbIdx=964&pageIndex=1") 폼 POST 로 요청한다 — AJAX 목록 사이트용
    mode: html(기본) — 본문 정리 출력 / scripts — 인라인 스크립트·외부 스크립트 주소 출력(AJAX 목록 사이트용)
          raw — 원문 그대로(줄 단위)
"""
from __future__ import annotations

import sys

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, "scripts/crawler")
from common import USER_AGENT  # noqa: E402


def main() -> None:
    # url 은 공백·쉼표로 여러 개 가능. mode=grep 이면 post_data 를 정규식으로 써서 맞는 줄만(앞뒤 2줄 포함) 찍는다.
    for url in [u for u in sys.argv[1].replace(",", " ").split() if u]:
        one(url, sys.argv[2:])


def one(url: str, rest: list[str]) -> None:
    max_lines = int(rest[0]) if len(rest) > 0 and rest[0] else 3000
    mode = rest[1] if len(rest) > 1 and rest[1] else "html"
    post_data = rest[2] if len(rest) > 2 else ""
    if mode == "grep":
        import re
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
        r.encoding = r.apparent_encoding or "utf-8"
        pat = re.compile(post_data or ".", re.I)
        lines = r.text.splitlines()
        print(f"=== GET {url}\n=== HTTP {r.status_code} · {len(lines)} lines · grep /{post_data}/")
        shown = 0
        for i, ln in enumerate(lines):
            if pat.search(ln):
                for j in range(max(0, i - 2), min(len(lines), i + 3)):
                    print(f"{j + 1:6d}: {lines[j][:300]}")
                print("      ---")
                shown += 1
                if shown >= max_lines:
                    break
        return
    if post_data:
        from urllib.parse import parse_qsl
        r = requests.post(url, data=dict(parse_qsl(post_data, keep_blank_values=True)),
                          headers={"User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest"}, timeout=30)
    else:
        r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30, allow_redirects=True)
    r.encoding = r.apparent_encoding or "utf-8"
    print(f"=== GET {url}\n=== HTTP {r.status_code} · {len(r.content)} bytes · final {r.url} · encoding {r.encoding}")
    if mode == "raw":
        print("=== BEGIN RAW")
        for ln in r.text.splitlines()[:max_lines]:
            print(ln[:600])
        print("=== END RAW")
        return
    soup = BeautifulSoup(r.text, "html.parser")
    if mode == "scripts":
        print("=== BEGIN SCRIPTS")
        for i, sc in enumerate(soup.find_all("script")):
            src = sc.get("src")
            if src:
                print(f"--- script[{i}] src={src}")
                continue
            txt = (sc.string or sc.get_text() or "").strip()
            if not txt:
                continue
            print(f"--- script[{i}] inline ({len(txt)} chars)")
            for ln in txt.splitlines()[:max_lines]:
                if ln.strip():
                    print(ln[:400])
        print("=== END SCRIPTS")
        return
    for t in soup(["script", "style", "svg", "noscript", "iframe", "link", "meta"]):
        t.decompose()
    body = soup.body or soup
    pretty = body.prettify()
    lines = [ln.rstrip() for ln in pretty.splitlines() if ln.strip()]
    print(f"=== {len(lines)} lines (showing up to {max_lines})")
    print("=== BEGIN HTML")
    for ln in lines[:max_lines]:
        print(ln[:400])
    print("=== END HTML")


if __name__ == "__main__":
    main()
