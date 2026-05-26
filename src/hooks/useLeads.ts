"use client";

import { useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import type { ApiResponse, LeadMetaOption, Lead, LeadStats } from "@/types";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface LeadMetaGroups {
  sources:    LeadMetaOption[];
  statuses:   LeadMetaOption[];
  priorities: LeadMetaOption[];
  services:   LeadMetaOption[];
}

export interface LeadsPage {
  leads: Lead[];
  total: number;
  page:  number;
  limit: number;
}

export interface LeadFilters {
  search?:     string;
  statusId?:   number | null;
  priorityId?: number | null;
  sourceId?:   number | null;
  serviceId?:  number | null;
  assignedTo?: number | null;
  converted?:  boolean | null;
  followup?:   "today" | "overdue" | "week" | null;
  page?:       number;
  limit?:      number;
}

// ─── useLeadMeta ──────────────────────────────────────────────────────────────

export function useLeadMeta() {
  const [data, setData] = useState<LeadMetaGroups>({ sources: [], statuses: [], priorities: [], services: [] });
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<LeadMetaGroups>>("/leads/meta");
      setData(res.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { sources: data.sources, statuses: data.statuses, priorities: data.priorities, services: data.services, loading, refetch };
}

// ─── useLeads ─────────────────────────────────────────────────────────────────

export function useLeads(filters: LeadFilters = {}) {
  const [data, setData] = useState<LeadsPage>({ leads: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);

  const { search, statusId, priorityId, sourceId, serviceId, assignedTo, converted, followup, page, limit } = filters;

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search)             params["search"]     = search;
      if (statusId   != null) params["statusId"]   = String(statusId);
      if (priorityId != null) params["priorityId"] = String(priorityId);
      if (sourceId   != null) params["sourceId"]   = String(sourceId);
      if (serviceId  != null) params["serviceId"]  = String(serviceId);
      if (assignedTo != null) params["assignedTo"] = String(assignedTo);
      if (converted  != null) params["converted"]  = converted ? "1" : "0";
      if (followup)           params["followup"]   = followup;
      if (page)               params["page"]       = String(page);
      if (limit)              params["limit"]      = String(limit);
      const res = await api.get<ApiResponse<LeadsPage>>("/leads", { params });
      setData(res.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusId, priorityId, sourceId, serviceId, assignedTo, converted, followup, page, limit]);

  useEffect(() => { refetch(); }, [refetch]);

  return { leads: data.leads, total: data.total, page: data.page, limit: data.limit, loading, refetch };
}

// ─── useLead ──────────────────────────────────────────────────────────────────

export function useLead(uuid: string | null) {
  const [lead, setLead]     = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Lead>>(`/leads/${uuid}`);
      setLead(res.data.data);
    } catch {
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { refetch(); }, [refetch]);

  return { lead, loading, refetch };
}

// ─── useLeadStats ─────────────────────────────────────────────────────────────

export function useLeadStats() {
  const [stats, setStats]   = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<LeadStats>>("/leads/stats/summary");
      setStats(res.data.data);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { stats, loading, refetch };
}
