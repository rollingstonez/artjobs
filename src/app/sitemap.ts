import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getPostings } from "@/lib/postings";
import { FIELDS } from "@/types/job";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const postings = await getPostings();
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/auditions`, changeFrequency: "daily", priority: 0.9 },
    ...FIELDS.map((f) => ({
      url: `${SITE_URL}/jobs?field=${f.code}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    ...postings.map((p) => ({
      url: `${SITE_URL}/${p.board === "audition" ? "auditions" : "jobs"}/${p.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
