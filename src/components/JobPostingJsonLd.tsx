// 공고 상세에 넣는 구조화 데이터(JSON-LD, schema.org JobPosting).
//   구글이 이 표시를 읽고 공고를 "채용 정보"로 인식해 검색의 일자리 영역에 노출한다.
//   · 모집이 끝난 공고에는 넣지 않는다(구글은 만료 공고의 표시를 빼라고 요구한다).
//   · 값이 없는 칸은 아예 넣지 않는다. 지어내지 않는다.
//   · 수집 공고는 원문 기관이 올린 정보이므로 hiringOrganization 을 그 기관 이름으로 적는다.
import { SITE_URL } from "@/lib/site";
import { employmentLabel, fieldLabel, type Posting } from "@/types/job";

const EMPLOYMENT_MAP: Record<string, string> = {
  full_time: "FULL_TIME",
  contract: "CONTRACTOR",
  freelance: "CONTRACTOR",
  intern: "INTERN",
  open_call: "OTHER",
};

/** 본문에서 태그·과한 공백을 덜어 낸 설명. 구글은 설명이 비면 표시를 무시한다. */
function description(p: Posting): string {
  const base = (p.description ?? "").replace(/\s+/g, " ").trim();
  if (base.length >= 30) return base.slice(0, 4000);
  // 본문이 짧거나 없으면 화면에 보이는 정보로 최소한의 설명을 만든다.
  return [
    `${p.organization ?? "기관"}에서 ${p.title} 공고를 냈습니다.`,
    fieldLabel(p.field) ? `분야: ${fieldLabel(p.field)}` : "",
    employmentLabel(p.employmentType) ? `고용형태: ${employmentLabel(p.employmentType)}` : "",
    p.region ? `근무지: ${p.region}` : "",
    p.applyEnd ? `접수 마감: ${p.applyEnd}` : "",
    "자세한 내용과 접수 방법은 원문에서 확인하세요.",
  ].filter(Boolean).join(" ");
}

export default function JobPostingJsonLd({ posting, living }: { posting: Posting; living: boolean }) {
  if (!living) return null; // 마감된 공고에는 표시를 넣지 않는다
  const p = posting;
  const path = `${p.board === "audition" ? "auditions" : "jobs"}/${encodeURIComponent(p.id)}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: p.title,
    description: description(p),
    datePosted: p.createdAt || undefined,
    validThrough: p.applyEnd || undefined,
    url: `${SITE_URL}/${path}`,
    identifier: { "@type": "PropertyValue", name: "아트잡스", value: p.id },
    hiringOrganization: {
      "@type": "Organization",
      name: p.organization || "아트잡스 등록 기관",
      ...(p.sourceUrl && p.sourceUrl.startsWith("http") ? { sameAs: p.sourceUrl } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "KR",
        ...(p.region ? { addressRegion: p.region } : {}),
        ...(p.address ? { streetAddress: p.address } : {}),
      },
    },
    ...(p.employmentType && EMPLOYMENT_MAP[p.employmentType] ? { employmentType: EMPLOYMENT_MAP[p.employmentType] } : {}),
    ...(p.orgUserId ? { directApply: true } : {}),
    industry: "예술·문화",
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
