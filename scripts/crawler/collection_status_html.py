# -*- coding: utf-8 -*-
"""
robots 판정 결과 → 브라우저에서 보는 판정표(HTML 한 파일). 마크다운(collection_status.py)과 같은 규칙을 쓴다.

실행:  python scripts/crawler/collection_status_html.py docs/robots_result.json docs/collection-status.html
"""
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collection_status import BUCKET_ACTION, BUCKET_TITLE, KNOWN_OPEN_DATA, bucket, is_public  # noqa: E402
from sources import SITES  # noqa: E402

CAT = {"all": "시각예술 전반", "painting": "회화", "sculpture_installation": "조각·설치", "media_art": "미디어아트",
       "print_drawing": "판화·드로잉", "craft": "공예", "photography": "사진", "curation": "전시기획·큐레이션",
       "art_management": "아트매니지먼트", "art_education": "예술교육", "residency_open_call": "레지던시·공모"}
TIER = {1: "통합 플랫폼", 2: "중앙 공공기관", 3: "광역 미술관·문화재단", 4: "레지던시·비엔날레·사립·전문", 5: "공모전 포털·공공 API"}


def build(json_path, out_path):
    data = json.load(io.open(json_path, encoding="utf-8"))
    rows = {r["code"]: r for r in data["rows"]}
    items = []
    for s in SITES:
        r = rows.get(s["code"])
        if not r:
            continue
        b = bucket(s, r)
        items.append(dict(
            code=s["code"], name=s["name"], bucket=b, tier=TIER[s["tier"]], kind=s["kind"], priority=s["priority"],
            cats="·".join(CAT[c] for c in s["categories"]), region=s["region"], public=is_public(s),
            url=r["url"], base=s["base_url"], verdict=r["verdict"], robots_http=r["robots_http"],
            path_known=r["path_known"], list_http=r["list_http"], list_links=r["list_links"], list_err=r["list_err"],
            reason=r["reason"], note=s["note"], open_data=KNOWN_OPEN_DATA.get(s["code"], ""),
        ))
    checked = data.get("checked_at", "")[:16].replace("T", " ") + " UTC"
    payload = json.dumps(dict(checked=checked, items=items,
                              titles={k: v[3:] for k, v in BUCKET_TITLE.items()}, actions=BUCKET_ACTION),
                         ensure_ascii=False)
    html = TEMPLATE.replace("__DATA__", payload.replace("</", "<\\/"))
    io.open(out_path, "w", encoding="utf-8").write(html)
    print(f"생성: {out_path} ({len(items)}곳)")


TEMPLATE = r"""<title>아트잡스 수집 판정표</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@600;700&display=swap">
<style>
:root{
  --bg:#F4F5F8; --surface:#FFFFFF; --ink:#1B1F2A; --muted:#5C6370; --line:#D9DCE3; --soft:#EBEDF2;
  --accent:#2447C9; --accent-ink:#FFFFFF;
  --ok:#1E7F4F; --ok-bg:#E3F3EA; --warn:#9A6A12; --warn-bg:#FBF0D6; --bad:#B3261E; --bad-bg:#FBE4E2; --hold:#5B6472; --hold-bg:#E9ECF1;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --bg:#14171E; --surface:#1C2029; --ink:#EEF0F4; --muted:#A3AAB8; --line:#333947; --soft:#262B37;
  --accent:#7B96FF; --accent-ink:#0D1220;
  --ok:#5FD08F; --ok-bg:#173324; --warn:#E8B85A; --warn-bg:#3A2E12; --bad:#FF8A80; --bad-bg:#3E1D1A; --hold:#B4BCCB; --hold-bg:#2A303C;
}}
:root[data-theme="dark"]{
  --bg:#14171E; --surface:#1C2029; --ink:#EEF0F4; --muted:#A3AAB8; --line:#333947; --soft:#262B37;
  --accent:#7B96FF; --accent-ink:#0D1220;
  --ok:#5FD08F; --ok-bg:#173324; --warn:#E8B85A; --warn-bg:#3A2E12; --bad:#FF8A80; --bad-bg:#3E1D1A; --hold:#B4BCCB; --hold-bg:#2A303C;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans KR",-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:14px;line-height:1.55;padding:0 20px 64px}
.wrap{max-width:1180px;margin:0 auto}
header{padding-block:36px 20px;border-bottom:1px solid var(--line)}
.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}
h1{font-family:"Noto Serif KR","IBM Plex Sans KR",serif;font-weight:700;font-size:30px;margin:6px 0 8px;text-wrap:balance;letter-spacing:-.01em}
.lede{color:var(--muted);max-width:68ch;margin:0}
.lede b{color:var(--ink)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:22px 0 14px}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:12px 14px;cursor:pointer;text-align:left;font:inherit;color:inherit;display:flex;flex-direction:column;gap:4px;border-left:4px solid var(--stripe,var(--hold))}
.tile[aria-pressed="true"]{outline:2px solid var(--accent);outline-offset:1px}
.tile:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.tile .k{font-size:11px;letter-spacing:.08em;color:var(--muted);font-weight:600}
.tile .n{font-size:26px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.tile .t{font-size:12px;color:var(--muted);line-height:1.35}
.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:8px 0 14px}
.toolbar input{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);min-width:240px;flex:1 1 240px}
.toolbar input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.toolbar .count{color:var(--muted);font-variant-numeric:tabular-nums}
.toolbar button{font:inherit;padding:8px 12px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink);cursor:pointer}
.toolbar button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.action{background:var(--soft);border-left:4px solid var(--accent);padding:10px 14px;border-radius:0 6px 6px 0;margin:0 0 14px;display:none}
.action b{display:block;margin-bottom:2px}
.tablewrap{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:6px}
table{border-collapse:collapse;width:100%;min-width:980px}
th,td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}
th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:var(--soft);position:sticky;top:0;font-weight:600}
tr:last-child td{border-bottom:0}
td.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;color:var(--pc);background:var(--pb)}
.pill.ok{--pc:var(--ok);--pb:var(--ok-bg)} .pill.warn{--pc:var(--warn);--pb:var(--warn-bg)} .pill.bad{--pc:var(--bad);--pb:var(--bad-bg)} .pill.hold{--pc:var(--hold);--pb:var(--hold-bg)}
.name{font-weight:600}
.code{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-size:12px;color:var(--muted)}
.sub{color:var(--muted);font-size:12.5px}
a{color:var(--accent)} a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.note{font-size:12.5px;color:var(--muted);max-width:52ch}
h2{font-family:"Noto Serif KR",serif;font-size:20px;margin:40px 0 8px;text-wrap:balance}
.h2sub{color:var(--muted);margin:0 0 12px;max-width:72ch}
.quote{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:12px 14px;margin:0 0 14px;max-width:80ch}
.quote .k{font-size:11px;letter-spacing:.08em;color:var(--muted);font-weight:600;margin-bottom:4px}
.empty{color:var(--muted);padding:14px}
@media (max-width:600px){h1{font-size:24px} body{padding:0 16px 48px}}
@media (prefers-reduced-motion:no-preference){.tile{transition:transform .12s ease} .tile:hover{transform:translateY(-1px)}}
</style>
<div class="wrap">
<header>
  <div class="eyebrow">아트잡스 · 크롤 소스 판정</div>
  <h1>수집 대상 사이트 판정표</h1>
  <p class="lede" id="lede"></p>
</header>

<div class="tiles" id="tiles" role="group" aria-label="묶음별 필터"></div>
<div class="action" id="action"></div>
<div class="toolbar">
  <input id="q" type="search" placeholder="기관명·코드·지역·분야로 찾기" aria-label="검색">
  <button id="reset" type="button">전체 보기</button>
  <span class="count" id="count"></span>
</div>
<div class="tablewrap"><table>
  <thead><tr><th>묶음</th><th>기관</th><th>구분</th><th>분야 · 지역</th><th>robots</th><th>목록 페이지</th><th>판정 근거 · 다음 할 일</th></tr></thead>
  <tbody id="rows"></tbody>
</table></div>

<h2>공공데이터 요청 목록</h2>
<p class="h2sub">robots.txt 로 자동수집을 막아 둔(차단·회색지대) 공공기관. 홈페이지 수집 대신 공공데이터포털(data.go.kr) '제공신청'이나 기관 담당자에게 데이터 개방을 요청한다.</p>
<div class="quote"><div class="k">요청 문구 예시</div>귀 기관 홈페이지의 채용공고·공모 게시판(제목, 접수기간, 원문 링크)을 오픈API 또는 파일 데이터로 개방해 주시기를 요청드립니다. 예술인 대상 구인·공모 정보를 한곳에 모아 원문 링크와 출처를 표기해 안내하는 서비스(아트잡스)에 활용하려 합니다.</div>
<div class="tablewrap"><table>
  <thead><tr><th>기관</th><th>현재 판정</th><th>요청할 데이터</th><th>신청 경로 · 이미 있는 API</th></tr></thead>
  <tbody id="ask"></tbody>
</table></div>

<h2>국내에서 다시 판정한 뒤 정할 곳</h2>
<p class="h2sub">GitHub 서버(해외)에서 접속이 안 됐거나 페이지가 안 열린 공공기관. 국내 PC 에서 <code>python scripts/crawler/robots_check.py</code> 를 돌려 '차단'으로 확인되면 위 요청 목록으로 올린다.</p>
<div class="tablewrap"><table>
  <thead><tr><th>기관</th><th>현재 판정</th><th>근거</th></tr></thead>
  <tbody id="later"></tbody>
</table></div>

<h2>민간 사이트 협의 목록</h2>
<p class="h2sub">robots 는 허용이지만 민간이 운영하는 곳. 수집을 시작하기 전에 운영자에게 출처 표기·원문 링크·게시 즉시 반영 원칙을 알리고 시작한다.</p>
<div class="tablewrap"><table>
  <thead><tr><th>사이트</th><th>현재 판정</th><th>연락처 · 비고</th></tr></thead>
  <tbody id="priv"></tbody>
</table></div>
</div>

<script>
const DATA = __DATA__;
const TONE = {A:"ok",B:"ok",C:"warn",D:"warn",E:"bad",F:"bad",G:"hold"};
const STRIPE = {ok:"var(--ok)",warn:"var(--warn)",bad:"var(--bad)",hold:"var(--hold)"};
const ORDER = ["A","B","C","D","E","F","G"];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let sel = null, q = "";

const counts = {}; ORDER.forEach(k => counts[k] = 0); DATA.items.forEach(i => counts[i.bucket]++);
const now = counts.A + counts.B, fix = counts.C + counts.D, off = counts.E + counts.F;
document.getElementById("lede").innerHTML =
  `판정 시각 ${esc(DATA.checked)} · ${DATA.items.length}곳. <b>지금 수집할 수 있는 곳 ${now}곳</b>, 주소·페이지만 손보면 되는 곳 ${fix}곳, 수집하지 않고 공식 경로로 갈 곳 ${off}곳, 국내에서 재판정할 곳 ${counts.G}곳. 묶음을 누르면 그 묶음만 보이고 할 일이 나타납니다.`;

const tiles = document.getElementById("tiles");
ORDER.forEach(k => {
  const b = document.createElement("button"); b.className = "tile"; b.type = "button"; b.setAttribute("aria-pressed","false");
  b.style.setProperty("--stripe", STRIPE[TONE[k]]);
  b.innerHTML = `<span class="k">${k}</span><span class="n">${counts[k]}</span><span class="t">${esc(DATA.titles[k].split(" — ")[0])}</span>`;
  b.addEventListener("click", () => { sel = (sel === k) ? null : k; render(); });
  tiles.appendChild(b);
});
document.getElementById("q").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); render(); });
document.getElementById("reset").addEventListener("click", () => { sel = null; q = ""; document.getElementById("q").value = ""; render(); });

function listCell(i){
  if (!i.path_known) return `<span class="sub">주소 미정</span>`;
  if (i.list_http == null) return `<span class="pill hold">실패 ${esc(i.list_err||"")}</span>`;
  const tone = i.list_http === 200 ? (i.list_links >= 20 ? "ok" : "warn") : "bad";
  return `<span class="pill ${tone}">HTTP ${i.list_http}</span> <span class="sub">링크 ${i.list_links}</span>`;
}
function render(){
  [...tiles.children].forEach((b, idx) => b.setAttribute("aria-pressed", String(ORDER[idx] === sel)));
  const act = document.getElementById("action");
  if (sel){ act.style.display = "block"; act.innerHTML = `<b>${sel}. ${esc(DATA.titles[sel])}</b>할 일: ${esc(DATA.actions[sel])}`; } else act.style.display = "none";
  const list = DATA.items.filter(i => (!sel || i.bucket === sel) && (!q || [i.name,i.code,i.region,i.cats,i.tier].join(" ").toLowerCase().includes(q)))
    .sort((a,b) => ORDER.indexOf(a.bucket) - ORDER.indexOf(b.bucket) || a.priority - b.priority || a.code.localeCompare(b.code));
  document.getElementById("count").textContent = `${list.length}곳`;
  document.getElementById("rows").innerHTML = list.map(i => `<tr>
    <td><span class="pill ${TONE[i.bucket]}">${i.bucket}</span></td>
    <td><div class="name">${esc(i.name)}</div><div class="code">${esc(i.code)} · 우선 ${i.priority}</div><div class="sub"><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.base.replace(/^https?:\/\//,""))}</a></div></td>
    <td><div>${i.public ? "공공" : "민간"} · ${esc(i.kind)}</div><div class="sub">${esc(i.tier)}</div></td>
    <td><div>${esc(i.cats)}</div><div class="sub">${esc(i.region)}</div></td>
    <td><div>${esc(i.verdict)}</div><div class="sub">HTTP ${i.robots_http ?? "—"}</div></td>
    <td>${listCell(i)}</td>
    <td><div class="note">${esc(i.reason)}</div>${i.note ? `<div class="note" style="margin-top:4px">비고: ${esc(i.note)}</div>` : ""}</td>
  </tr>`).join("") || `<tr><td colspan="7" class="empty">해당하는 사이트가 없습니다.</td></tr>`;
}
render();

const ask = DATA.items.filter(i => i.public && (i.bucket === "E" || i.bucket === "F"));
document.getElementById("ask").innerHTML = ask.map(i => `<tr><td><div class="name">${esc(i.name)}</div><div class="code">${esc(i.code)}</div></td><td><span class="pill bad">${esc(i.verdict)}</span></td><td>${esc(i.kind)} 게시판 (제목·접수기간·원문 URL)</td><td class="note">${esc(i.open_data || "data.go.kr 제공신청")}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">지금 요청이 필요한 공공기관이 없습니다.</td></tr>`;
const later = DATA.items.filter(i => i.public && (i.bucket === "D" || i.bucket === "G"));
document.getElementById("later").innerHTML = later.map(i => `<tr><td><div class="name">${esc(i.name)}</div><div class="code">${esc(i.code)}</div></td><td><span class="pill hold">${esc(i.verdict)}</span></td><td class="note">${esc(i.reason)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">없음</td></tr>`;
const priv = DATA.items.filter(i => !i.public && ["B","D","E","F"].includes(i.bucket));
document.getElementById("priv").innerHTML = priv.map(i => `<tr><td><div class="name">${esc(i.name)}</div><div class="code">${esc(i.code)}</div></td><td><span class="pill ${TONE[i.bucket]}">${i.bucket} · ${esc(i.verdict)}</span></td><td class="note">${esc(i.note)}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">없음</td></tr>`;
</script>
"""

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "robots_result.json"
    dst = sys.argv[2] if len(sys.argv) > 2 else "docs/collection-status.html"
    build(src, dst)
