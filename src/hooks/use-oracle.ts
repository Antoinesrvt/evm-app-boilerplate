"use client";

import { useApi } from "./use-api";
import type { OracleProfile, LeaderboardEntry, OracleAttestation, OracleSource } from "@/lib/types";

export function useOracleProfile(address: string | null) {
  const url = address ? `/api/oracle/profile?address=${encodeURIComponent(address)}` : null;
  const { data, loading, error, refresh } = useApi<OracleProfile>(url);
  return { profile: data, loading, error, refresh };
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  source: OracleSource;
}

export function useOracleLeaderboard(sort: string = "score") {
  const { data, loading, error, refresh } = useApi<LeaderboardResponse>(
    `/api/oracle/leaderboard?sort=${encodeURIComponent(sort)}&limit=10`,
  );
  return {
    leaderboard: data?.entries ?? [],
    source: data?.source ?? "db" as OracleSource,
    loading,
    error,
    refresh,
  };
}

interface AttestationsResponse {
  entries: OracleAttestation[];
  source: OracleSource;
}

export function useOracleAttestations(address: string | null) {
  const url = address ? `/api/oracle/attestations?agency=${encodeURIComponent(address)}` : null;
  const { data, loading, error, refresh } = useApi<AttestationsResponse>(url);
  return {
    attestations: data?.entries ?? [],
    source: data?.source ?? "db" as OracleSource,
    loading,
    error,
    refresh,
  };
}
