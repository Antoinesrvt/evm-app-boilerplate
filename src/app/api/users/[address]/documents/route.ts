import { type NextRequest } from "next/server";
import { db, ensureInit } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    await ensureInit();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { address } = await params;

    const authWallet = auth.user!.walletAddress;
    if (!authWallet || authWallet.toLowerCase() !== address.toLowerCase()) {
      return Response.json({ error: "Forbidden: address mismatch" }, { status: 403 });
    }

    const user = await db.users.findByAddress(address);

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const label = formData.get("label") as string | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!label) {
      return Response.json({ error: "No label provided" }, { status: 400 });
    }

    if (file.size > MAX_DOC_SIZE) {
      return Response.json({ error: "File too large. Maximum 5 MB." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.some(t => file.type.startsWith(t.split("/")[0]))) {
      return Response.json({ error: "Unsupported file type" }, { status: 400 });
    }

    // Compute SHA-256 hash of the file contents
    const { createHash } = await import("crypto");
    const arrayBuffer = await file.arrayBuffer();
    const hash = createHash("sha256").update(Buffer.from(arrayBuffer)).digest("hex");

    const attestation = { label, verified: false, hash };

    const existingAttestations =
      user.agencyProfile?.attestations ?? [];

    await db.users.updateAgencyScore(address, {
      attestations: [...existingAttestations, attestation],
    });

    return Response.json(attestation, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
