"""목록·상세 페이지 HTML 을 받아 사람이 읽기 좋게 로그에 찍는다 — 파서 만들 때 선택자 확인용.

GitHub Actions(fetch-sample) 에서 돈다. 작업 환경(클로드 코드)은 외부 사이트 접근이 막혀 있어서
사이트 구조는 이 로그로 본다. script/style/svg 는 빼고 본문만 정리해서 출력한다.

    python scripts/crawler/fetch_sample.py <url> [max_lines]
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
    r = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30, allow_redirects=True)
    r.encoding = r.apparent_encoding or "utf-8"
    print(f"=== GET {url}\n=== HTTP {r.status_code} · {len(r.content)} bytes · final {r.url} · encoding {r.encoding}")
    soup = BeautifulSoup(r.text, "html.parser")
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
