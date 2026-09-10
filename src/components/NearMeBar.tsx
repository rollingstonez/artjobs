"use client";

// "내 집 근처 공고 먼저 보기" 설정 바. 위치는 쿠키에만 저장하고 서버로 보내지 않는다.
// 설정이 바뀌면 router.refresh()로 서버 목록을 다시 받아 가까운 순으로 보여준다.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LOCATION_COOKIE,
  SELECTABLE_REGIONS,
  nearestRegion,
  serializeLocationCookie,
  type UserLocation,
} from "@/lib/location";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function writeCookie(loc: UserLocation | null) {
  if (loc) {
    document.cookie = `${LOCATION_COOKIE}=${serializeLocationCookie(loc)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    document.cookie = `${LOCATION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export default function NearMeBar({
  location,
  compact = false,
}: {
  location: UserLocation | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(location === null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = (loc: UserLocation | null) => {
    writeCookie(loc);
    setEditing(loc === null);
    setError(null);
    startTransition(() => router.refresh());
  };

  const useCurrentPosition = () => {
    if (!("geolocation" in navigator)) {
      setError("이 브라우저는 위치 확인을 지원하지 않습니다. 지역을 직접 골라주세요.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocating(false);
        apply({ region: nearestRegion(lat, lng), lat, lng });
      },
      () => {
        setLocating(false);
        setError("위치를 가져오지 못했습니다. 지역을 직접 골라주세요.");
      },
      { timeout: 8000, maximumAge: 600000 },
    );
  };

  const busy = locating || pending;

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50 ${compact ? "px-3 py-2" : "px-4 py-3"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="font-semibold text-emerald-900">
          📍{" "}
          {location
            ? `${location.region}${location.lat != null ? " (현재 위치)" : ""} 근처 공고를 먼저 보여드립니다`
            : "내 집 근처 공고를 먼저 보고 싶다면"}
        </span>

        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="내 지역"
              className="h-9 rounded-lg border border-emerald-300 bg-white px-2.5 text-sm text-stone-800 focus:border-emerald-700 focus:outline-none"
              value={location?.region ?? ""}
              disabled={busy}
              onChange={(e) => {
                const region = e.target.value as UserLocation["region"];
                if (region) apply({ region });
              }}
            >
              <option value="">지역 선택</option>
              {SELECTABLE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={useCurrentPosition}
              disabled={busy}
              className="h-9 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {locating ? "확인 중…" : "현재 위치로"}
            </button>
            {location && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-9 px-2 text-sm text-emerald-800 underline-offset-2 hover:underline"
              >
                닫기
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-emerald-800 underline-offset-2 hover:underline"
            >
              변경
            </button>
            <span className="text-emerald-300">·</span>
            <button
              type="button"
              onClick={() => apply(null)}
              disabled={busy}
              className="text-emerald-800 underline-offset-2 hover:underline"
            >
              해제
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {!compact && (
        <p className="mt-1.5 text-xs text-emerald-800/80">
          위치는 내 브라우저에만 저장되고 서버로 보내지 않습니다. 언제든 해제할 수 있습니다.
        </p>
      )}
    </div>
  );
}
