"use client";

import { useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import type { ApiResponse, MetaOption, Subscription, SubscriptionAnalytics } from "@/types";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface MetaGroup {
  categories: MetaOption[];
  billingCycles: MetaOption[];
  statuses: MetaOption[];
}

export interface SubscriptionsPage {
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
}

export interface SubscriptionFilters {
  search?: string;
  categoryId?: number | null;
  statusId?: number | null;
  billingCycleId?: number | null;
  autopay?: boolean | null;
  page?: number;
  limit?: number;
}

// ─── useSubscriptionMeta ──────────────────────────────────────────────────────

export function useSubscriptionMeta() {
  const [data, setData] = useState<MetaGroup>({ categories: [], billingCycles: [], statuses: [] });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<MetaGroup>>("/subscriptions/meta");
      setData(res.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { categories: data.categories, billingCycles: data.billingCycles, statuses: data.statuses, loading, refetch };
}

// ─── useSubscriptions ─────────────────────────────────────────────────────────

export function useSubscriptions(filters: SubscriptionFilters = {}) {
  const [data, setData] = useState<SubscriptionsPage>({ subscriptions: [], total: 0, page: 1, limit: 15 });
  const [loading, setLoading] = useState(false);

  const { search, categoryId, statusId, billingCycleId, autopay, page, limit } = filters;

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search)              params["search"]          = search;
      if (categoryId != null)  params["categoryId"]      = String(categoryId);
      if (statusId != null)    params["statusId"]        = String(statusId);
      if (billingCycleId != null) params["billingCycleId"] = String(billingCycleId);
      if (autopay != null)     params["autopay"]         = String(autopay);
      if (page)                params["page"]            = String(page);
      if (limit)               params["limit"]           = String(limit);
      const res = await api.get<ApiResponse<SubscriptionsPage>>("/subscriptions", { params });
      setData(res.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, statusId, billingCycleId, autopay, page, limit]);

  useEffect(() => { refetch(); }, [refetch]);

  return { subscriptions: data.subscriptions, total: data.total, page: data.page, limit: data.limit, loading, refetch };
}

// ─── useSubscription ──────────────────────────────────────────────────────────

export function useSubscription(uuid: string | null) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Subscription>>(`/subscriptions/${uuid}`);
      setSubscription(res.data.data);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { refetch(); }, [refetch]);

  return { subscription, loading, refetch };
}

// ─── useSubscriptionAnalytics ─────────────────────────────────────────────────

export function useSubscriptionAnalytics(filters: Record<string, string> = {}) {
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const filtersJson = JSON.stringify(filters);

  useEffect(() => {
    setLoading(true);
    const params = JSON.parse(filtersJson) as Record<string, string>;
    api.get<ApiResponse<SubscriptionAnalytics>>("/subscriptions/analytics/summary", { params })
      .then(res => setAnalytics(res.data.data))
      .catch(() => { /* non-fatal */ })
      .finally(() => setLoading(false));
  }, [filtersJson]);

  return { analytics, loading };
}
