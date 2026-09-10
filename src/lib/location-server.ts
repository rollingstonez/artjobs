// 서버 컴포넌트에서 사용자 위치 쿠키를 읽는다. 클라이언트 쪽 저장은 components/NearMeBar.tsx.
import { cookies } from "next/headers";
import { LOCATION_COOKIE, parseLocationCookie, type UserLocation } from "@/lib/location";

export async function getUserLocation(): Promise<UserLocation | null> {
  const jar = await cookies();
  return parseLocationCookie(jar.get(LOCATION_COOKIE)?.value);
}
