import { type NextRequest } from "next/server";
import { z } from "zod";
import { db, ensureInit } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const SetupSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  description: z.string().optional().default(""),
  website: z.string().url().optional().or(z.literal("")),
  categories: z.array(z.string()).min(1, "Select at least one category"),
});

const InviteSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

// POST: Create or update agency profile
export async function POST(request: NextRequest) {
  try {
    await ensureInit();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const walletAddress = auth.user!.walletAddress;
    if (!walletAddress) {
      return Response.json({ error: "No wallet associated" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = SetupSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Upsert user with agency role
    await db.users.upsert(walletAddress, { roles: ["agency"] });

    // Update agency profile with identity
    await db.users.updateAgencyScore(walletAddress, {
      companyName: parsed.data.companyName,
      description: parsed.data.description,
      website: parsed.data.website || undefined,
      categories: parsed.data.categories,
    });

    // Add owner as first team member
    await db.team.addMember(walletAddress, {
      memberAddress: walletAddress,
      role: "owner",
    });

    const profile = await db.users.findByAddress(walletAddress);
    return Response.json(profile, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
