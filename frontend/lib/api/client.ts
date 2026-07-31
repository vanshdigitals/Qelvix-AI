'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ---- Backend response shapes (mirror backend/app/schemas) ----

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface ApiFinding {
  id: string;
  scan_id: string;
  asset_id: string | null;
  finding_type: string;
  agent_source: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
  raw_data: Record<string, unknown>;
  plain_explanation: string | null;
  remediation_steps: string | null;
  false_positive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiScan {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  error_log: Record<string, unknown> | null;
  finding_summary: Record<string, unknown> | null;
}

export interface ApiAsset {
  id: string;
  value: string;
  asset_type: 'domain' | 'subdomain' | 'ip';
  verified: boolean;
}

export interface ApiCompliance {
  id: string;
  scan_id: string;
  framework: string;
  is_compliant: boolean;
  dpdp_narrative: string | null;
  created_at: string;
}

export interface ApiDashboardSummary {
  security_health_band: string;
  risk_score: number;
  total_assets: number;
  open_critical_findings: number;
  open_high_findings: number;
}

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Client-side GET against the backend with the Supabase bearer token — the same
 * fetch pattern used in DashboardOverview, extracted so every screen shares one
 * auth/error path. Pass `null` to skip the request.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const reqPath: string = path;
    let active = true;
    async function run(): Promise<void> {
      try {
        const supabase = createClient();
        if (!supabase) {
          if (active) setState({ data: null, loading: false, error: 'Backend not configured.' });
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          if (active) setState({ data: null, loading: false, error: 'Not authenticated.' });
          return;
        }
        const res = await fetch(`${API_URL}${reqPath}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (active)
            setState({
              data: null,
              loading: false,
              error: `Request failed (${String(res.status)}).`,
            });
          return;
        }
        const json = (await res.json()) as T;
        if (active) setState({ data: json, loading: false, error: null });
      } catch (e) {
        if (active)
          setState({
            data: null,
            loading: false,
            error: e instanceof Error ? e.message : 'Request failed.',
          });
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [path]);

  return state;
}
