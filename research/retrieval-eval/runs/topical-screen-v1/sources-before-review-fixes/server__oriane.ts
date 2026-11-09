import { z } from 'zod';
import type { Reference } from '../shared/schema';

const count = z.number().nullish().transform(value => value ?? null);
const mediaSchema = z.object({
  duration: count, transcript: z.string().nullish(), onScreenText: z.array(z.string()).nullish(),
  frames: z.array(z.object({ url: z.string(), timestampSeconds: z.number(), onScreenTextRegions: z.array(z.object({ text: z.string() })).nullish() })).nullish(),
});
export const contentSchema = z.object({
  id: z.string(), profileHandle: z.string(), platform: z.string(), platformId: z.string(),
  caption: z.string().nullish(), title: z.string().nullish(), thumbnailMediaUrl: z.string().nullish(),
  publishedAt: z.string(), viewsCount: count, likesCount: count, commentsCount: count,
  sharesCount: count, interactionsCount: count, engagementRatePerViews: count,
  media: z.array(mediaSchema),
});
const searchSchema = z.object({ data: z.object({ results: z.array(contentSchema) }) });
export type Content = z.infer<typeof contentSchema>;
export async function orianeRequest(path: string, body: unknown, params = ''): Promise<unknown> {
  const key = process.env.ORIANE_API_KEY?.replace(/^Bearer\s+/i, '');
  if (!key) throw new Error('Oriane is not connected. Add ORIANE_API_KEY to .env and restart.');
  const response = await fetch(`https://connect.oriane.xyz/rest/${path}${params}`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  const result: unknown = await response.json();
  if (!response.ok || (typeof result === 'object' && result !== null && 'error' in result)) throw new Error(`Oriane could not complete the search (${response.status}). Try a broader brief.`);
  return result;
}

export async function searchContents(body: unknown, sort: string, limit: number, projection: string): Promise<Content[]> {
  const result = await orianeRequest('contents/search', body, `?sort=${encodeURIComponent(sort)}&limit=${limit}&projection=${projection}`);
  return searchSchema.parse(result).data.results;
}

export async function createVisualAsset(text: string): Promise<string> {
  const result = await orianeRequest('assets', { type: 'text', text });
  return z.object({ data: z.object({ id: z.string() }) }).parse(result).data.id;
}

export function toReference(content: Content): Reference {
  const media = content.media.at(0);
  const frames = media?.frames ?? [];
  const useful = frames.filter(frame => frame.onScreenTextRegions?.length);
  const selected = [...new Map([frames.at(0), useful.at(Math.floor(useful.length / 2)), frames.at(-1)].filter(frame => frame !== undefined).map(frame => [frame.url, frame])).values()];
  const url = content.platform === 'instagram' ? `https://www.instagram.com/reel/${content.platformId}/` : content.platform === 'youtube' ? `https://www.youtube.com/watch?v=${content.platformId}` : `https://www.tiktok.com/@${content.profileHandle}/video/${content.platformId}`;
  return {
    id: content.id, title: content.title || content.caption?.split('\n')[0]?.slice(0,90) || `A video by ${content.profileHandle}`,
    creator: content.profileHandle, platform: content.platform, url, thumbnail: content.thumbnailMediaUrl || selected[0]?.url || '',
    publishedAt: content.publishedAt, views: content.viewsCount, likes: content.likesCount, comments: content.commentsCount,
    shares: content.sharesCount, interactions: content.interactionsCount, engagementRate: content.engagementRatePerViews,
    duration: media?.duration ?? null, caption: content.caption ?? '', transcript: media?.transcript ?? '',
    frames: selected.map(frame => ({ url: frame.url, seconds: frame.timestampSeconds, text: frame.onScreenTextRegions?.map(region => region.text).join(' · ') ?? '' })),
    relevance: 'adjacent', relevanceReason: '', format: 'To be interpreted', hook: '',
  };
}
