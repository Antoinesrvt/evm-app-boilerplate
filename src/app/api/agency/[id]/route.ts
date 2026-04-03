import { type NextRequest } from "next/server";
import { db, ensureInit } from "@/lib/db";

// Public endpoint — agency profile
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureInit();
    const { id } = await params;
    const profile = await db.users.findByAddress(id);

    if (!profile) {
      return Response.json({ error: "Agency not found" }, { status: 404 });
    }

    const contracts = await db.contracts.findByUser(id);

    // Strip client identity from each contract — never expose publicly
    const safeContracts = contracts.map((c) => ({
      ...c,
      client: "[Private]",
    }));

    return Response.json({ profile, contracts: safeContracts });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
