// 포트폴리오 링크를 화면 안에서 바로 볼 수 있는지 판정한다.
// 유튜브·비메오·사운드클라우드는 삽입(iframe)을 허용하고, 이미지 주소는 그대로 보여준다.
// 인스타그램·네이버 블로그·개인 홈페이지 등은 삽입을 막으므로 새 탭으로 연다.

export type Embed =
  | { kind: "iframe"; src: string; ratio: "video" | "audio" }
  | { kind: "image"; src: string }
  | { kind: "external" };

export function embedFor(url: string): Embed {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { kind: "external" };
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
    let id = "";
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (u.searchParams.get("v")) id = u.searchParams.get("v") ?? "";
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{6,})/);
      if (m) id = m[1];
    }
    if (/^[A-Za-z0-9_-]{6,}$/.test(id)) {
      const start = u.searchParams.get("t")?.replace(/s$/, "");
      return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}${start && /^\d+$/.test(start) ? `?start=${start}` : ""}`, ratio: "video" };
    }
  }

  // Vimeo: vimeo.com/123456789, player.vimeo.com/video/123456789
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(\d{6,})/);
    if (m) return { kind: "iframe", src: `https://player.vimeo.com/video/${m[1]}`, ratio: "video" };
  }

  // SoundCloud: 공개 플레이어가 원본 주소를 그대로 받는다.
  if (host === "soundcloud.com" || host === "on.soundcloud.com") {
    return {
      kind: "iframe",
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23292524&auto_play=false&show_comments=false`,
      ratio: "audio",
    };
  }

  // 이미지 파일 주소
  if (/\.(jpe?g|png|gif|webp|avif|svg)$/i.test(u.pathname)) return { kind: "image", src: url };

  return { kind: "external" };
}

/** 링크 종류를 주소에서 짐작한다(등록 폼에서 기본값으로 쓴다). */
export function guessKind(url: string): "video" | "image" | "audio" | "link" {
  const e = embedFor(url);
  if (e.kind === "image") return "image";
  if (e.kind === "iframe") return e.ratio === "audio" ? "audio" : "video";
  return "link";
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
