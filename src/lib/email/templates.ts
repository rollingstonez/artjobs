// 아트잡스 메일 템플릿 — 바로쌤 lib/email/templates.ts 의 부품 구조를 옮겼다.
// - 각 함수는 { subject, html } 을 돌려준다. 발송은 send.ts 가 한다.
// - 메일 프로그램(지메일·네이버·아웃룩)에서 깨지지 않도록 table 레이아웃 + 인라인 스타일만 쓴다.
// - 이 파일은 Next 앱(가입 환영 메일)과 GitHub Actions 스크립트(scripts/email/drip.ts)가 함께 쓰므로
//   다른 파일을 import 하지 않는다(경로 별칭 @/ 도 쓰지 않는다).
// - 말투는 "~해요/~합니다" 존댓말. 사실이 아닌 약속("완성하면 먼저 노출")은 쓰지 않는다.

const SITE_URL = "https://artjobs.kr";

const C = {
  ink: "#1c1917",
  ink2: "#292524",
  accent: "#c2410c",
  bg: "#f5f5f4",
  paper: "#fafaf9",
  line: "#e7e5e4",
  text: "#292524",
  sub: "#57534e",
  mute: "#a8a29e",
  warnBg: "#fff7ed",
  warnText: "#c2410c",
  warnLine: "#fdba74",
  okBg: "#ecfdf5",
  okText: "#047857",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', Pretendard, Arial, sans-serif";

export type EmailTemplate = { subject: string; html: string };

function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ───────────────────────── 공통 부품 ─────────────────────────

function wrap(inner: string, preheader = "") {
  return `
<div style="margin:0;padding:0;background:${C.bg};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.bg};">${esc(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;font-family:${FONT};color:${C.text};">
        <tr><td style="background:${C.ink};border-radius:18px 18px 0 0;padding:28px 32px 24px;text-align:center;border-bottom:3px solid ${C.accent};">
          <a href="${SITE_URL}" style="text-decoration:none;">
            <span style="display:block;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.02em;">아트잡스</span>
          </a>
          <span style="display:block;color:#d6d3d1;font-size:12px;margin-top:6px;">예술 일자리 · 오디션 · 공모를 한곳에서</span>
        </td></tr>
        <tr><td style="background:#ffffff;padding:34px 32px 30px;border-left:1px solid ${C.line};border-right:1px solid ${C.line};">
          ${inner}
        </td></tr>
        <tr><td style="background:${C.paper};border:1px solid ${C.line};border-top:none;border-radius:0 0 18px 18px;padding:20px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;line-height:1.7;color:${C.sub};">궁금한 점은 이 메일에 그대로 답장해 주세요.</p>
          <p style="margin:0;font-size:12px;color:${C.mute};">
            <a href="${SITE_URL}/jobs" style="color:${C.mute};text-decoration:underline;">공고 둘러보기</a>
            &nbsp;·&nbsp;
            <a href="${SITE_URL}" style="color:${C.mute};text-decoration:underline;">artjobs.kr</a>
          </p>
          <p style="margin:10px 0 0;font-size:11px;color:${C.mute};">© 아트잡스 · 바로하우스</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
}

function heading(html: string, sub?: string) {
  return `
    <h2 style="margin:0 0 ${sub ? "8px" : "16px"};font-size:21px;line-height:1.45;font-weight:800;color:${C.ink};letter-spacing:-0.02em;">${html}</h2>
    ${sub ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:${C.sub};">${sub}</p>` : ""}`;
}

function para(html: string, opts: { mb?: number; small?: boolean } = {}) {
  return `<p style="margin:0 0 ${opts.mb ?? 16}px;font-size:${opts.small ? 13 : 15}px;line-height:1.85;color:${C.text};">${html}</p>`;
}

function button(label: string, path: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 6px;">
      <tr><td align="center" style="background:${C.ink};border-radius:12px;">
        <a href="${SITE_URL}${path}" style="display:inline-block;padding:15px 34px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${label}</a>
      </td></tr>
    </table>`;
}

function subLink(text: string, label: string, path: string) {
  return `<p style="font-size:13px;color:${C.mute};margin:14px 0 0;text-align:center;">${text} → <a href="${SITE_URL}${path}" style="color:${C.ink2};">${label}</a></p>`;
}

function callout(html: string, tone: "info" | "ok" | "warn" = "info") {
  const t = {
    info: { bg: C.paper, bd: C.line, fg: C.text },
    ok: { bg: C.okBg, bd: "#a7f3d0", fg: C.okText },
    warn: { bg: C.warnBg, bd: C.warnLine, fg: C.warnText },
  }[tone];
  return `<div style="margin:18px 0;padding:16px 18px;background:${t.bg};border:1px solid ${t.bd};border-radius:14px;font-size:14px;line-height:1.8;color:${t.fg};">${html}</div>`;
}

function checklist(items: string[]) {
  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="vertical-align:top;padding:5px 12px 5px 0;width:22px;">
          <span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:999px;background:${C.ink};color:#ffffff;font-size:12px;font-weight:700;">✓</span>
        </td>
        <td style="vertical-align:top;padding:5px 0;font-size:14px;line-height:1.7;color:${C.text};">${it}</td>
      </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:${C.paper};border:1px solid ${C.line};border-radius:14px;">
      <tr><td style="padding:12px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
    </table>`;
}

function steps(items: string[]) {
  const rows = items
    .map(
      (it, i) => `
      <tr>
        <td style="vertical-align:top;padding:7px 14px 7px 0;width:28px;">
          <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:999px;background:${C.accent};color:#ffffff;font-size:13px;font-weight:800;">${i + 1}</span>
        </td>
        <td style="vertical-align:top;padding:7px 0;font-size:14px;line-height:1.7;color:${C.text};">${it}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 8px;">${rows}</table>`;
}

function pill(text: string) {
  return `<span style="display:inline-block;background:${C.warnBg};color:${C.warnText};border:1px dashed ${C.warnLine};font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;margin:0 5px 6px 0;">${esc(text)}</span>`;
}

function progressBar(pct: number) {
  return `
    <div style="height:12px;width:100%;background:${C.line};border-radius:999px;overflow:hidden;margin:0 0 22px;">
      <div style="height:12px;width:${pct}%;background:${C.ink2};border-radius:999px;"></div>
    </div>`;
}

/** 안내 메일 바닥글 — 왜 받는지 + 끄는 방법(설정 › 이메일로도 받기). */
function prefFooter(reason: string) {
  return `
      <p style="font-size:12px;line-height:1.8;color:${C.mute};margin:26px 0 0;border-top:1px solid ${C.line};padding-top:16px;">
        ${reason}
        더 받지 않으시려면 아트잡스 › 마이페이지 ›
        <a href="${SITE_URL}/me/settings" style="color:${C.mute};text-decoration:underline;">설정</a>에서
        &lsquo;이메일로도 받기&rsquo;를 꺼 주세요.
      </p>`;
}

const ARTIST_REASON = "가입하신 뒤 처음 몇 주 동안 아트잡스를 잘 쓰는 방법을 보내드리고 있어요. 해당 항목을 이미 하셨다면 그 안내는 오지 않아요.";
const ORG_REASON = "가입하신 기관께 처음 몇 주 동안 아트잡스 사용 방법을 보내드리고 있어요. 해당 항목을 이미 하셨다면 그 안내는 오지 않아요.";

const who = (name: string | null | undefined, suffix: string) => (name ? `${esc(name)}${suffix}` : "");

// ───────────────────────── 가입 환영 ─────────────────────────

export function welcomeArtistEmail({ name }: { name?: string | null }): EmailTemplate {
  return {
    subject: "아트잡스 가입을 환영합니다 — 시작은 이 세 가지면 돼요",
    html: wrap(
      `
      ${heading(`${who(name, "님, ")}아트잡스에 오신 것을 환영합니다`)}
      ${para("미술관·공연장·문화재단·기업에 흩어져 있는 예술 분야 채용, 오디션·공모, 대관, 배움 공고를 매일 모아 한곳에서 보여드려요.")}
      ${para("처음 오셨다면 아래 세 가지만 해 보세요.", { mb: 4 })}
      ${steps([
        "<b>프로필 채우기</b> — 분야·장르·희망 직무·지역을 고르고, 자기소개와 경력을 적어 두세요. 지원할 때 이 프로필이 그대로 기관에 전달돼요.",
        "<b>알림 조건 저장하기</b> — 원하는 분야·지역의 새 공고가 올라오면 알려 드려요. 기관 홈페이지를 매번 돌아보지 않아도 돼요.",
        "<b>공고 살펴보고 지원하기</b> — 마음에 드는 공고는 저장해 두고 마감 전에 지원하세요.",
      ])}
      ${callout("🔒 <b>연락처는 공개되지 않아요.</b> 기관과의 대화는 아트잡스 메시지로 이루어지고, 전화번호·이메일은 직접 알려주시기 전까지 보이지 않습니다.")}
      ${button("내 프로필 채우기 →", "/me/profile")}
    `,
      "프로필 → 알림 → 지원, 세 단계로 시작하세요.",
    ),
  };
}

export function welcomeOrgEmail({ name }: { name?: string | null }): EmailTemplate {
  return {
    subject: "아트잡스 가입을 환영합니다 — 기관 담당자님께 드리는 안내",
    html: wrap(
      `
      ${heading(`${who(name, " 담당자님, ")}아트잡스에 오신 것을 환영합니다`)}
      ${para("아트잡스는 예술 인력을 찾는 기관과 일을 찾는 예술가를 직접 이어 드리는 서비스예요. 공고 등록과 지원자 확인은 무료입니다.")}
      ${para("시작은 이렇게 하시면 돼요.", { mb: 4 })}
      ${steps([
        "<b>기관 정보 채우기</b> — 기관 유형·분야·주소·소개를 적어 두면 공고에 함께 표시돼요.",
        "<b>기관 인증 받기</b> — 사업자등록증이나 고유번호증을 올려 주시면 확인 후 공고에 ✓ 인증 기관 표시가 붙어요. 예술가들이 믿고 지원할 수 있어요.",
        "<b>공고 올리고 지원자 확인하기</b> — 지원서는 한곳에 모이고, 직원을 초대해 함께 심사할 수도 있어요.",
      ])}
      ${callout("🔒 <b>연락은 아트잡스 메시지로.</b> 담당자 전화번호·이메일을 공고에 적지 않아도 지원자와 바로 대화할 수 있어요.")}
      ${button("기관 정보 채우기 →", "/me/profile")}
    `,
      "기관 정보 → 인증 → 공고 등록, 세 단계로 시작하세요.",
    ),
  };
}

// ───────────────────────── 예술가 안내 (드립) ─────────────────────────

/** D+1 프로필 작성 요령 */
export function artistProfileTipsEmail({ name }: { name?: string | null }): EmailTemplate {
  return {
    subject: "기관이 프로필에서 먼저 보는 네 가지 — 아트잡스",
    html: wrap(
      `
      ${heading(`${who(name, "님, ")}프로필은 지원서가 돼요`, "아트잡스에서 지원하면 프로필이 그대로 기관에 전달됩니다.")}
      ${para("담당자는 짧은 시간에 많은 지원자를 봅니다. 아래 네 가지가 채워져 있으면 훨씬 빨리 읽혀요.")}
      ${checklist([
        "<b>분야·장르·희망 직무</b> — 무엇을 하는 사람인지 한눈에 보여요. 여러 개 골라도 돼요.",
        "<b>자기소개 세 줄</b> — 주 활동 분야 · 대표 경력 한 줄 · 지금 찾는 일. 이 정도면 충분해요.",
        "<b>경력은 최근 것부터</b> — 연도 · 기관(작품명) · 역할 순으로 한 줄씩 적으면 읽기 쉬워요.",
        "<b>포트폴리오 링크</b> — 작품 사진·영상·홈페이지 링크를 붙여 두세요. 말보다 작품이 빨라요.",
      ])}
      ${callout("💡 연락처(전화·이메일·SNS 아이디)는 프로필에 적지 마세요. 기관은 아트잡스 메시지로 먼저 연락합니다.")}
      ${button("프로필 다듬기 →", "/me/profile")}
      ${prefFooter(ARTIST_REASON)}
    `,
      "분야 · 자기소개 · 경력 · 포트폴리오, 이 네 가지만 채워 보세요.",
    ),
  };
}

/** D+3 알림 설정 유도 */
export function artistAlertEmail({ fieldLabel, weekCount }: { fieldLabel: string | null; weekCount: number }): EmailTemplate {
  const what = fieldLabel ? `${fieldLabel} 분야` : "예술 분야";
  return {
    subject: `최근 7일 ${what} 새 공고 ${weekCount}건 — 알림으로 받아보세요`,
    html: wrap(
      `
      ${heading(`최근 7일간 ${esc(what)} 새 공고가 <span style="color:${C.accent};">${weekCount}건</span> 올라왔어요`, "예술 분야 공고는 기관 홈페이지마다 흩어져 있고 마감도 빨라요.")}
      ${para("분야·장르·지역을 한 번 정해 두면, 조건에 맞는 새 공고가 올라올 때마다 알려 드려요.")}
      ${steps(["채용·오디션·공모 중 받을 게시판을 고르고", "분야와 장르를 고르고", "지역을 고르면 끝!"])}
      ${button("알림 설정하기 →", "/me/alerts")}
      ${subLink("지금 올라온 공고 먼저 보기", "전체 공고", "/jobs")}
      ${prefFooter(ARTIST_REASON)}
    `,
      "조건을 한 번 정해 두면 새 공고를 놓치지 않아요.",
    ),
  };
}

/** D+7 프로필 완성도 */
export function artistProgressEmail({ percent, missing }: { percent: number; missing: string[] }): EmailTemplate {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const started = pct > 0;
  return {
    subject: started ? `프로필 ${pct}% · 남은 항목 ${missing.length}개 — 아트잡스` : "프로필, 3분이면 시작할 수 있어요 — 아트잡스",
    html: wrap(
      `
      ${heading(started ? `프로필이 <span style="color:${C.accent};">${pct}%</span> 채워졌어요` : "아직 프로필이 비어 있어요", started ? "남은 칸만 채우면 완성이에요." : "분야와 지역만 골라도 시작이 돼요. 나머지는 천천히 채워도 괜찮아요.")}
      ${progressBar(pct)}
      ${missing.length ? `<p style="font-size:13px;font-weight:800;color:${C.ink};margin:0 0 8px;">아직 비어 있는 항목</p><div style="margin:0 0 18px;">${missing.map(pill).join("")}</div>` : ""}
      ${callout("💡 <b>자기소개는 세 줄이면 충분해요.</b><br>주 활동 분야 · 대표 경력 · 지금 찾는 일을 한 줄씩만 적어 보세요.")}
      ${button(started ? "마저 채우기 →" : "프로필 시작하기 →", "/me/profile")}
      ${prefFooter(ARTIST_REASON)}
    `,
      started ? `남은 항목 ${missing.length}개만 채우면 완성이에요.` : "3분이면 시작할 수 있어요.",
    ),
  };
}

/** D+14 관심받는 요령 — 인재정보 공개 */
export function artistGetNoticedEmail({ isPublic, completed, hasPortfolio }: { isPublic: boolean; completed: boolean; hasPortfolio: boolean }): EmailTemplate {
  const todo: string[] = [];
  if (!completed) todo.push("<b>프로필 완성하기</b> — 분야·장르·직무·지역·자기소개·경력이 다 채워져야 인재정보에 올릴 수 있어요.");
  if (!isPublic) todo.push("<b>인재정보 공개 켜기</b> — 프로필 화면 아래 &lsquo;인재정보에 공개&rsquo;를 켜면 기관이 인재 찾기에서 나를 볼 수 있어요.");
  if (!hasPortfolio) todo.push("<b>포트폴리오 붙이기</b> — 작품 사진·영상·홈페이지 링크를 한두 개만 붙여도 눈에 잘 띄어요.");
  todo.push("<b>&lsquo;기관의 메시지 받기&rsquo; 켜 두기</b> — 기관이 마음에 들면 바로 메시지를 보낼 수 있게요.");
  return {
    subject: "기관이 먼저 연락하게 하려면 — 아트잡스",
    html: wrap(
      `
      ${heading("지원만 하지 말고, 기관이 먼저 찾게 해 보세요", "아트잡스에는 기관이 예술가를 직접 찾는 &lsquo;인재정보&rsquo;가 있어요.")}
      ${para("기관 담당자는 분야·장르·지역으로 인재를 검색하고, 마음에 드는 분께 아트잡스 메시지로 먼저 연락합니다. 인재정보는 로그인한 기관 회원에게만 보이고, 연락처는 어디에도 나오지 않아요.")}
      ${steps(todo)}
      ${button("내 프로필로 가기 →", "/me/profile")}
      ${prefFooter(ARTIST_REASON)}
    `,
      "인재정보에 공개하면 기관이 먼저 메시지를 보낼 수 있어요.",
    ),
  };
}

/** D+21 구직 글 올리기 */
export function artistSeekingEmail(): EmailTemplate {
  return {
    subject: "‘이런 일 찾고 있어요’ 한 줄 올려 보세요 — 아트잡스",
    html: wrap(
      `
      ${heading("구직 글은 기관이 가장 먼저 보는 곳이에요", "공고를 기다리기만 하지 않아도 돼요.")}
      ${para("아트잡스 &lsquo;구직&rsquo; 게시판에 지금 찾는 일을 짧게 올려 두면, 사람을 구하는 기관이 보고 아트잡스 메시지로 바로 연락할 수 있어요. 전화번호·이메일은 공개되지 않습니다.")}
      ${checklist([
        "<b>제목은 구체적으로</b> — 예: &lsquo;현대무용 강사, 주말 수업 가능 (서울)&rsquo;",
        "<b>가능한 기간·요일</b> — 언제부터 어떤 형태로 일할 수 있는지",
        "<b>대표 경력 두세 줄</b> — 자세한 내용은 프로필이 함께 보여요",
      ])}
      ${button("구직 글 올리기 →", "/me/seeking")}
      ${subLink("다른 예술가들은 어떻게 쓰는지", "구직 게시판", "/seeking")}
      ${prefFooter(ARTIST_REASON)}
    `,
      "지금 찾는 일을 짧게 올려 두면 기관이 먼저 연락할 수 있어요.",
    ),
  };
}

// ───────────────────────── 기관 안내 (드립) ─────────────────────────

/** D+1 기관 인증 */
export function orgVerifyEmail({ name }: { name?: string | null }): EmailTemplate {
  return {
    subject: "✓ 인증 기관 표시, 서류 한 장이면 돼요 — 아트잡스",
    html: wrap(
      `
      ${heading(`${who(name, " 담당자님, ")}기관 인증을 받아 보세요`, "인증된 기관의 공고에는 ✓ 인증 기관 표시가 붙어요.")}
      ${para("예술가들은 처음 보는 기관에 지원하기 전에 &lsquo;믿을 만한 곳인가&rsquo;를 먼저 봅니다. 인증 표시가 있으면 지원을 망설이지 않아요.")}
      ${steps([
        "마이페이지 › 기관 정보 아래 <b>&lsquo;기관 인증&rsquo;</b> 칸으로 가서",
        "<b>사업자등록증</b> 또는 <b>고유번호증</b>(비영리단체) 사진이나 PDF를 올리고 등록번호를 적으면",
        "운영팀이 확인한 뒤 인증해 드려요. 결과는 알림으로 알려 드립니다.",
      ])}
      ${callout("🔒 올리신 서류는 운영팀만 볼 수 있고, 다른 회원에게는 공개되지 않아요.")}
      ${button("인증 서류 올리기 →", "/me/profile#verify")}
      ${prefFooter(ORG_REASON)}
    `,
      "사업자등록증이나 고유번호증 한 장이면 인증 기관 표시가 붙어요.",
    ),
  };
}

/** D+3 첫 공고 올리기 요령 */
export function orgFirstPostingEmail(): EmailTemplate {
  return {
    subject: "지원이 잘 들어오는 공고는 이렇게 씁니다 — 아트잡스",
    html: wrap(
      `
      ${heading("첫 공고를 올려 보세요", "공고 등록은 무료이고, 몇 분이면 끝나요.")}
      ${para("예술가들이 공고에서 가장 먼저 확인하는 건 아래 네 가지예요. 이것만 분명하면 지원이 훨씬 잘 들어옵니다.")}
      ${checklist([
        "<b>무슨 일인지</b> — 직무·장르와 실제로 하게 될 일을 두세 줄로",
        "<b>언제·얼마나</b> — 근무 기간과 요일·시간, 정규직/계약직/프리랜서 여부",
        "<b>보수</b> — 금액이나 범위를 적어 주세요. &lsquo;협의&rsquo;보다 지원이 많이 들어와요.",
        "<b>마감일과 제출 서류</b> — 포트폴리오가 필요하면 형식(링크·PDF)도 함께",
      ])}
      ${callout("📨 지원은 아트잡스 메시지로 받거나, 기관 접수 페이지로 연결할 수 있어요. 메시지로 받으면 지원서가 한곳에 모이고 직원과 함께 심사할 수 있어요.")}
      ${button("공고 올리기 →", "/post")}
      ${prefFooter(ORG_REASON)}
    `,
      "무슨 일 · 언제 · 보수 · 마감, 이 네 가지만 분명하면 돼요.",
    ),
  };
}

/** D+7 인재 찾기 · 함께 심사 */
export function orgTalentEmail(): EmailTemplate {
  return {
    subject: "공고를 기다리지 말고 먼저 연락해 보세요 — 아트잡스",
    html: wrap(
      `
      ${heading("필요한 사람을 직접 찾을 수도 있어요", "아트잡스에는 예술가가 스스로 공개한 &lsquo;인재정보&rsquo;와 &lsquo;구직&rsquo; 글이 있어요.")}
      ${steps([
        "<b>인재 찾기</b> — 분야·장르·직무·지역으로 검색하고, 마음에 드는 분께 메시지를 보내세요.",
        "<b>구직 글 보기</b> — 지금 일을 찾고 있다고 직접 올린 예술가들이에요. 바로 연락하면 답이 빨라요.",
        "<b>직원과 함께 심사</b> — 구성원을 초대하면 지원서에 같이 점수를 매기고 의견을 남길 수 있어요.",
      ])}
      ${button("인재 찾기 →", "/talents")}
      ${subLink("구성원 초대는", "마이페이지 › 구성원", "/me/team")}
      ${prefFooter(ORG_REASON)}
    `,
      "인재정보와 구직 글에서 먼저 메시지를 보내 보세요.",
    ),
  };
}
