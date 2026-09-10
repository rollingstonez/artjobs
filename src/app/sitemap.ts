import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getPostings } from "@/lib/postings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const postings = await getPostings();
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    ...postings.map((p) => ({
      url: `${SITE_URL}/jobs/${p.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
