"use client";

import { useApi } from "./use-api";

export interface DashboardContract {
  id: string;
  title: string;
  description: string;
  category: string;
  totalValue: number;
  status: string;
  client: string;
  agency: string;
  milestones: Array<{
    id: number;
    name: string;
    description: string;
    amount: number;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export function useDashboard(role: string, userAddress?: string) {
  const url = userAddress
    ? `/api/contracts?user=${encodeURIComponent(userAddress)}`
    : "/api/contracts";

  const { data, loading, error, refresh } =
    useApi<DashboardContract[]>(url);

  return {
    contracts: data ?? [],
    loading,
    error,
    refresh,
  };
}
