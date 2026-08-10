'use client';

import { createClient } from '@/lib/supabase/client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/** Mirrors backend app/schemas/onboarding.py OnboardingState. */
export interface OnboardingState {
  onboarding_completed: boolean;
  onboarding_step: string;
  onboarding_data: Record<string, unknown>;
  primary_domain: string | null;
  domain_verified: boolean;
  name: string | null;
  industry: string | null;
  notification_email: string | null;
  whatsapp_number: string | null;
}

export class OnboardingError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'OnboardingError';
    this.status = status;
  }
}

async function authToken(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await authToken();
  if (!token) throw new OnboardingError('Not authenticated.', 401);
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = `Request failed (${String(res.status)}).`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (body.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      // keep the generic message
    }
    throw new OnboardingError(detail, res.status);
  }
  return (await res.json()) as T;
}

export const getOnboarding = (): Promise<OnboardingState> => request('/org/me/onboarding');

export const saveOnboardingStep = (
  step: string,
  data: Record<string, unknown>,
): Promise<OnboardingState> =>
  request('/org/me/onboarding', { method: 'PATCH', body: JSON.stringify({ step, data }) });

export const saveDomain = (domain: string): Promise<OnboardingState> =>
  request('/org/me/domain', { method: 'PUT', body: JSON.stringify({ domain }) });

export const generateVerifyToken = (): Promise<{ token: string; txt_record: string }> =>
  request('/org/me/domain/verify-token', { method: 'POST' });

export const verifyDomain = (): Promise<{ message: string }> =>
  request('/org/me/domain/verify-check', { method: 'POST' });

export const finishOnboarding = (): Promise<OnboardingState> =>
  request('/org/me/onboarding/complete', { method: 'POST' });
