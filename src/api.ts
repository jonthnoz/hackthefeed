import { z } from 'zod';
import { jobSchema, studySchema } from '../shared/schema';

async function request<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ message: z.string().optional(), error: z.string().optional() }).safeParse(body);
    throw new Error(error.success ? error.data.message ?? error.data.error ?? 'The request could not be completed.' : 'The request could not be completed.');
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new Error('Angle received an incomplete response. Please try again.');
  return result.data;
}

export const api = {
  examples: () => request('/api/examples', z.array(studySchema)),
  study: (id: string) => request(`/api/studies/${encodeURIComponent(id)}`, studySchema),
  research: (brief: string) => request('/api/research', jobSchema, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brief, focus: '', refresh: false }),
  }),
  job: (id: string) => request(`/api/jobs/${encodeURIComponent(id)}`, jobSchema),
};

export type Resource<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string };
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function metric(value: number | null): string {
  return value === null ? 'Unavailable' : Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function timestamp(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
