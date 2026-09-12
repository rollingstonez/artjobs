// 연락처 노출 차단 — 공고·프로필·구직 글 본문에 전화번호·이메일·메신저 아이디를 적는 것을 막는다.
//   왜: 아트잡스는 전화번호를 아예 받지 않고 회원 간 연락을 메시지로만 잇는데,
//       본문에 직접 적으면 그 원칙이 그대로 뚫린다(누구나 보는 화면에 개인 연락처가 남는다).
//   규칙:
//     · 예술가 쪽 글(프로필 소개·경력, 구직 글, 의견)  → 휴대폰·일반전화·이메일·메신저 아이디 모두 차단
//     · 기관 공고 본문                                  → 휴대폰·이메일·메신저 아이디 차단,
//       기관 대표번호(02·031 등 지역번호)는 허용한다. 공고에 기관 대표번호를 적는 건 자연스럽기 때문.
//   판정은 넉넉하게(느슨하게) 잡지 않는다 — 애매하면 통과시킨다. 사람이 정상적으로 쓴 글을 막는 쪽이 더 나쁘다.

/** 010-1234-5678 · 01012345678 · 010 1234 5678 · 공일공… 같은 우회 표기는 잡지 않는다(오탐이 커진다). */
const MOBILE = /(^|[^0-9])01[016-9][-.\s]?\d{3,4}[-.\s]?\d{4}([^0-9]|$)/;
/** 02-123-4567 · 031-123-4567 등 지역번호 유선전화 */
const LANDLINE = /(^|[^0-9])0(2|3[1-3]|4[1-4]|5[1-5]|6[1-4])[-.\s]?\d{3,4}[-.\s]?\d{4}([^0-9]|$)/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
/** 카톡/오픈채팅/라인/인스타/텔레그램 아이디를 적어 둔 표기 */
const MESSENGER = /(카톡|카카오톡|오픈\s*채팅|오픈채팅|kakao(?:\s*talk)?|라인|line|텔레그램|telegram|인스타(?:그램)?|insta(?:gram)?)\s*(아이디|id|:|：|@)/i;
/** 오픈채팅·카톡 링크 */
const MESSENGER_URL = /(open\.kakao\.com|pf\.kakao\.com|t\.me\/|line\.me\/|instagram\.com\/)/i;

export interface ContactHit {
  kind: "mobile" | "landline" | "email" | "messenger";
  label: string;
}

/** 본문에서 연락처로 보이는 것을 찾는다. allowLandline 이면 지역번호 유선전화는 눈감아 준다. */
export function findContactInfo(text: string | null | undefined, opts: { allowLandline?: boolean } = {}): ContactHit[] {
  const s = (text ?? "").trim();
  if (!s) return [];
  const hits: ContactHit[] = [];
  if (MOBILE.test(s)) hits.push({ kind: "mobile", label: "휴대전화 번호" });
  if (!opts.allowLandline && LANDLINE.test(s)) hits.push({ kind: "landline", label: "전화번호" });
  if (EMAIL.test(s)) hits.push({ kind: "email", label: "이메일 주소" });
  if (MESSENGER.test(s) || MESSENGER_URL.test(s)) hits.push({ kind: "messenger", label: "메신저 아이디·링크" });
  return hits;
}

/** 막을 때 사용자에게 보여 줄 문장. 통과하면 null. */
export function contactError(text: string | null | undefined, where: "posting" | "profile" | "seeking" | "feedback"): string | null {
  const hits = findContactInfo(text, { allowLandline: where === "posting" });
  if (hits.length === 0) return null;
  const what = [...new Set(hits.map((h) => h.label))].join("·");
  if (where === "posting") {
    return `공고 본문에 ${what}가 있습니다. 지원·문의는 아트잡스 메신저나 “기관 접수 페이지” 링크로 받아 주세요. 기관 대표번호(02·031 등)는 적으셔도 됩니다.`;
  }
  if (where === "feedback") {
    return `의견에 ${what}가 있습니다. 연락처는 공개 게시판에 남기지 마세요. 답이 필요하면 문의하기를 이용해 주세요.`;
  }
  return `${what}가 들어 있습니다. 아트잡스는 연락처를 공개하지 않습니다. 기관이 아트잡스 메시지로 연락하니 번호·이메일·아이디는 지워 주세요.`;
}
