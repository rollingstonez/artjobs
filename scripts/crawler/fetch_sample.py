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
    url = sys.argv[1]
    max_lines = int(sys.argv[2]) if len(sys.argv) > 2 else 3000
    mode = sys.argv[3] if len(sys.argv) > 3 else "html"
    post_data = sys.argv[4] if len(sys.argv) > 4 else ""
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
