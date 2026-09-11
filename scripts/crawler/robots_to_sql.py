"""robots 판정 결과(docs/robots_result.json) → Supabase crawl_sources.robots_status 갱신 SQL.

robots-check 워크플로가 만든 판정을 DB 에 옮긴다. 운영자 화면(/admin/sources)은 robots_status 가
clean 또는 agreed 인 소스만 켤 수 있으므로, 판정 후 이 SQL 을 SQL Editor 에서 한 번 실행한다.

    python scripts/crawler/robots_to_sql.py   # → supabase/seed/robots_status.sql

판정 → 상태:  깨끗한 허용 → clean · 회색지대 → gray · 차단 → blocked · 확인필요 → unchecked
서면 협의가 끝난 소스(agreed)는 덮어쓰지 않는다. is_active 는 건드리지 않는다(켜는 건 운영자가 화면에서).
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "robots_result.json"
OUT = ROOT / "supabase" / "seed" / "robots_status.sql"

VERDICT_TO_STATUS = {
    "깨끗한 허용": "clean",
    "회색지대": "gray",
    "차단": "blocked",
    "확인필요": "unchecked",
}


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    rows = data["rows"]
    checked_at = data.get("checked_at", "")
    counts: dict[str, int] = {}
    lines = [
        f"-- robots 판정({checked_at}) → crawl_sources.robots_status. scripts/crawler/robots_to_sql.py 가 생성.",
        "-- agreed(서면 협의 완료)는 유지, is_active 는 건드리지 않는다.",
        "",
    ]
    for r in rows:
        status = VERDICT_TO_STATUS.get(r.get("verdict", ""), "unchecked")
        counts[status] = counts.get(status, 0) + 1
        note = (r.get("reason") or "").replace("'", "''")
        lines.append(
            f"update crawl_sources set robots_status = '{status}' "
            f"where code = '{r['code']}' and robots_status <> 'agreed';  -- {r.get('verdict','')}: {note}"
        )
    lines.append("")
    lines.append("select robots_status, count(*) from crawl_sources group by 1 order by 1;")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}: {len(rows)}곳 → {counts}")


if __name__ == "__main__":
    main()
