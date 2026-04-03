import { type NextRequest } from "next/server";
import { z } from "zod";
import { db, ensureInit } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";

const InviteSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

// GET: Return team members for the authenticated user's agency
export async function GET(request: NextRequest) {
  try {
    await ensureInit();
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const walletAddress = auth.user!.walletAddress;
    if (!walletAddress) {
      return Response.json({ error: "No wallet associated" }, { status: 403 });
    }

    const members = await db.team.findByAgency(walletAddress);
    return Response.json({ members });
  } catch (error) {
    console.error("[agency/team/GET] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

// POST: Invite a new team member (email + role)
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
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, name, role } = parsed.data;

    // Create a placeholder team member record keyed by email (no wallet yet)
    // We use email as a temporary address placeholder until they connect a wallet
    const memberAddress = `invite:${email}`;
    const member = await db.team.addMember(walletAddress, {
      memberAddress,
      memberName: name,
      memberEmail: email,
      role,
    });

    // Send invite email via Resend if configured
    let emailSent = false;
    if (isEmailConfigured()) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://trustsignal.xyz";
        const inviteUrl = `${appUrl}/join?agency=${walletAddress}`;

        await resend.emails.send({
          from: "TrustSignal <noreply@trustsignal.xyz>",
          to: email,
          subject: "You've been invited to join an agency on TrustSignal",
          html: buildTeamInviteHtml({ name, inviteUrl, agencyAddress: walletAddress }),
        });
        emailSent = true;
      } catch (emailErr) {
        console.warn("[agency/team/POST] Email send failed:", emailErr instanceof Error ? emailErr.message : emailErr);
      }
    }

    return Response.json({ member, emailSent }, { status: 201 });
  } catch (error) {
    console.error("[agency/team/POST] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

function buildTeamInviteHtml(params: {
  name?: string;
  inviteUrl: string;
  agencyAddress: string;
}): string {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";
  const shortAddr = `${params.agencyAddress.slice(0, 6)}...${params.agencyAddress.slice(-4)}`;
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #2E8B57;">TrustSignal</h2>
      <p>${greeting}</p>
      <p>You've been invited to join agency <strong>${shortAddr}</strong> on TrustSignal as a team member.</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #666;">Connect your wallet to accept this invitation and start collaborating.</p>
      </div>
      <a href="${params.inviteUrl}" style="display: inline-block; background: #2E8B57; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Join Agency
      </a>
      <p style="margin-top: 24px; font-size: 12px; color: #999;">
        You received this email because someone invited you to their team on TrustSignal.
      </p>
    </div>
  `;
}
