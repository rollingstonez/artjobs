// 내 집 근처 공고 우선 — 위치 설정과 거리 계산.
// 바로쌤의 "우리 동네 우선" 원칙을 아트잡스에 옮겼다. 사용자의 위치는 서버에 저장하지 않고
// 브라우저 쿠키(artjobs_loc)에만 둔다. 시·도 하나만 골라도 되고, 현재 위치 버튼을 누르면
// 좌표에서 가장 가까운 시·도를 골라 준다(좌표도 쿠키에만 남는다).
//
// 정렬 규칙(rankNearness): 0 = 같은 시·도(또는 15km 이내) → 1 = 인접권(60km 이내)·전국·온라인
// → 2 = 그 밖. 같은 등급 안에서는 최신순. 좌표가 양쪽에 다 있으면 실제 거리로 판단한다.
import { REGIONS, type Region } from "@/types/job";

export const LOCATION_COOKIE = "artjobs_loc";

export interface UserLocation {
  region: Region;
  lat?: number;
  lng?: number;
}

/** 시·도 대표 좌표(도청·시청 부근). 인접 판정과 "현재 위치 → 시·도" 변환에 쓴다. */
export const REGION_CENTERS: Record<Exclude<Region, "전국·온라인">, { lat: number; lng: number }> = {
  서울: { lat: 37.5665, lng: 126.978 },
  경기: { lat: 37.2894, lng: 127.0535 },
  인천: { lat: 37.4563, lng: 126.7052 },
  부산: { lat: 35.1796, lng: 129.0756 },
  대구: { lat: 35.8714, lng: 128.6014 },
  광주: { lat: 35.1595, lng: 126.8526 },
  대전: { lat: 36.3504, lng: 127.3845 },
  울산: { lat: 35.5384, lng: 129.3114 },
  세종: { lat: 36.48, lng: 127.289 },
  강원: { lat: 37.8228, lng: 128.1555 },
  충북: { lat: 36.6357, lng: 127.4917 },
  충남: { lat: 36.6588, lng: 126.6728 },
  전북: { lat: 35.8203, lng: 127.1088 },
  전남: { lat: 34.8161, lng: 126.4629 },
  경북: { lat: 36.576, lng: 128.5056 },
  경남: { lat: 35.2383, lng: 128.6924 },
  제주: { lat: 33.4996, lng: 126.5312 },
};

export const SELECTABLE_REGIONS = REGIONS.filter((r) => r !== "전국·온라인") as Exclude<
  Region,
  "전국·온라인"
>[];

export function isRegion(v: unknown): v is Region {
  return typeof v === "string" && (REGIONS as readonly string[]).includes(v);
}

/** 두 좌표 사이 거리(km). 하버사인. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 좌표에서 가장 가까운 시·도. 현재 위치 버튼이 쓴다. */
export function nearestRegion(lat: number, lng: number): Exclude<Region, "전국·온라인"> {
  let best: Exclude<Region, "전국·온라인"> = "서울";
  let bestD = Infinity;
  for (const r of SELECTABLE_REGIONS) {
    const d = distanceKm({ lat, lng }, REGION_CENTERS[r]);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

export function parseLocationCookie(raw: string | undefined | null): UserLocation | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(raw));
    if (!isRegion(obj?.region) || obj.region === "전국·온라인") return null;
    const out: UserLocation = { region: obj.region };
    if (typeof obj.lat === "number" && typeof obj.lng === "number") {
      out.lat = obj.lat;
      out.lng = obj.lng;
    }
    return out;
  } catch {
    return null;
  }
}

export function serializeLocationCookie(loc: UserLocation): string {
  return encodeURIComponent(JSON.stringify(loc));
}

export type NearRank = 0 | 1 | 2;

/** 공고가 사용자 위치에서 얼마나 가까운지. 0이 가장 가깝다. */
export function rankNearness(
  posting: { region: Region | null; lat?: number | null; lng?: number | null },
  loc: UserLocation,
): NearRank {
  if (loc.lat != null && loc.lng != null && posting.lat != null && posting.lng != null) {
    const d = distanceKm({ lat: loc.lat, lng: loc.lng }, { lat: posting.lat, lng: posting.lng });
    return d <= 15 ? 0 : d <= 60 ? 1 : 2;
  }
  if (!posting.region) return 2;
  if (posting.region === loc.region) return 0;
  if (posting.region === "전국·온라인") return 1;
  const d = distanceKm(REGION_CENTERS[loc.region as keyof typeof REGION_CENTERS], REGION_CENTERS[posting.region as keyof typeof REGION_CENTERS]);
  return d <= 60 ? 1 : 2;
}

/** 카드에 붙일 거리 문구. 좌표가 있으면 km, 없으면 등급 문구. */
export function nearnessLabel(
  posting: { region: Region | null; lat?: number | null; lng?: number | null },
  loc: UserLocation,
): string | null {
  if (loc.lat != null && loc.lng != null && posting.lat != null && posting.lng != null) {
    const d = distanceKm({ lat: loc.lat, lng: loc.lng }, { lat: posting.lat, lng: posting.lng });
    return d < 1 ? "1km 이내" : `약 ${Math.round(d)}km`;
  }
  const rank = rankNearness(posting, loc);
  if (rank === 0) return "내 지역";
  if (rank === 1) return posting.region === "전국·온라인" ? null : "인접 지역";
  return null;
}
