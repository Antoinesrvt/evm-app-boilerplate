import type { TeamMember } from "@/lib/types";
import { getDb } from "./client";
import { teamMembers as teamTable } from "./schema";
import { eq, and } from "drizzle-orm";

function rowToMember(row: typeof teamTable.$inferSelect): TeamMember {
  return {
    memberAddress: row.memberAddress,
    memberName: row.memberName ?? undefined,
    memberEmail: row.memberEmail ?? undefined,
    role: row.role as TeamMember["role"],
    invitedAt: new Date(row.invitedAt),
    acceptedAt: row.acceptedAt ? new Date(row.acceptedAt) : undefined,
  };
}

export async function addMember(
  agencyAddress: string,
  data: { memberAddress: string; memberName?: string; memberEmail?: string; role?: string },
): Promise<TeamMember> {
  // Check if already exists
  const existing = await getDb()
    .select()
    .from(teamTable)
    .where(
      and(
        eq(teamTable.agencyAddress, agencyAddress.toLowerCase()),
        eq(teamTable.memberAddress, data.memberAddress.toLowerCase()),
      ),
    );

  if (existing.length > 0) {
    return rowToMember(existing[0]);
  }

  await getDb().insert(teamTable).values({
    agencyAddress: agencyAddress.toLowerCase(),
    memberAddress: data.memberAddress.toLowerCase(),
    memberName: data.memberName,
    memberEmail: data.memberEmail,
    role: data.role || "member",
    invitedAt: new Date().toISOString(),
  });

  return {
    memberAddress: data.memberAddress.toLowerCase(),
    memberName: data.memberName,
    memberEmail: data.memberEmail,
    role: (data.role || "member") as TeamMember["role"],
    invitedAt: new Date(),
  };
}

export async function findByAgency(agencyAddress: string): Promise<TeamMember[]> {
  const rows = await getDb()
    .select()
    .from(teamTable)
    .where(eq(teamTable.agencyAddress, agencyAddress.toLowerCase()));
  return rows.map(rowToMember);
}

export async function findAgencyForMember(memberAddress: string): Promise<string | null> {
  const rows = await getDb()
    .select()
    .from(teamTable)
    .where(eq(teamTable.memberAddress, memberAddress.toLowerCase()));
  return rows[0]?.agencyAddress ?? null;
}

export async function removeMember(agencyAddress: string, memberAddress: string): Promise<void> {
  await getDb()
    .delete(teamTable)
    .where(
      and(
        eq(teamTable.agencyAddress, agencyAddress.toLowerCase()),
        eq(teamTable.memberAddress, memberAddress.toLowerCase()),
      ),
    );
}
