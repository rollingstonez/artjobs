// 이메일 도메인 오타 검사 — 가입할 때 hanmail.ner 같은 오타를 잡는다.
//   아트잡스는 이메일이 유일한 연락 수단이라(전화번호를 받지 않는다) 주소 하나가 틀리면 답을 드릴 방법이 없다.
//   확신할 수 있는 오타만 표에 넣는다. 표에 없으면 통과 — 드물지만 진짜 있는 도메인을 막으면 안 된다.

const TYPO_DOMAINS: Record<string, string> = {
  // gmail
  "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmial.com": "gmail.com",
  "gmaill.com": "gmail.com", "gamil.com": "gmail.com", "gmai.com": "gmail.com", "gmail.comm": "gmail.com",
  "gnail.com": "gmail.com", "gmail.co.kr": "gmail.com",
  // naver
  "naver.co": "naver.com", "naver.con": "naver.com", "navr.com": "naver.com", "nave.com": "naver.com",
  "naver.cm": "naver.com", "naver.om": "naver.com", "navber.com": "naver.com",
  // daum · hanmail
  "hanmail.ner": "hanmail.net", "hanmail.ne": "hanmail.net", "hanmail.com": "hanmail.net",
  "daum.ner": "daum.net", "daum.com": "daum.net", "daum.ne": "daum.net",
  // kakao · nate
  "kakao.co": "kakao.com", "katao.com": "kakao.com", "nate.co": "nate.com", "nate.con": "nate.com",
  // 해외
  "hotmail.co": "hotmail.com", "hotmial.com": "hotmail.com", "outlook.co": "outlook.com",
  "icloud.co": "icloud.com", "yahoo.co": "yahoo.com",
};

/** 오타가 확실하면 고친 주소를 돌려준다. 아니면 null. */
export function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase().trim();
  const fixed = TYPO_DOMAINS[domain];
  return fixed ? `${local}@${fixed}` : null;
}

/** 가입 화면에서 쓸 안내 문장. 문제가 없으면 null. */
export function emailTypoError(email: string): string | null {
  const fix = suggestEmailFix(email);
  return fix ? `이메일 주소를 다시 확인해 주세요. 혹시 ${fix} 인가요? (오타로 보이는 주소는 받을 수 없습니다)` : null;
}
