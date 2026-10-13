import { connection, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { sendAuthMail } from "@/lib/authMail";

type EmailPayload = {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    token_hash_new?: string;
  };
};

function hookSecrets(): string[] {
  const raw = (process.env["SEND_EMAIL_HOOK_SECRET"] || "").trim().replace(/^["']|["']$/g, "");
  if (!raw) return [];
  return [...new Set([raw.replace(/^v1,whsec_/, ""), raw.replace(/^v1,/, ""), raw])].filter(Boolean);
}

function hookFailure(message: string) {
  return NextResponse.json({ error: { http_code: 400, message } });
}

export async function POST(req: Request) {
  await connection();
  const secrets = hookSecrets();
  if (secrets.length === 0) {
    return hookFailure("Mailhemmeligheden mangler på serveren.");
  }

  const payload = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") || "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
    "webhook-signature": req.headers.get("webhook-signature") || "",
  };

  let data: EmailPayload | null = null;
  let verifyError = "Bekræftelsesmailens signatur blev afvist.";
  for (const secret of secrets) {
    try {
      data = new Webhook(secret).verify(payload, headers) as EmailPayload;
      break;
    } catch (error) {
      verifyError = error instanceof Error ? error.message : verifyError;
    }
  }
  if (!data) {
    console.error("Auth mail signature error:", verifyError);
    return hookFailure("Bekræftelsesmailens signatur blev afvist.");
  }

  const tokenHash =
    data.email_data.email_action_type === "email_change" && data.email_data.token_hash_new
      ? data.email_data.token_hash_new
      : data.email_data.token_hash;

  try {
    await sendAuthMail({
      email: data.user.email,
      token: data.email_data.token,
      tokenHash,
      emailActionType: data.email_data.email_action_type,
      redirectTo: data.email_data.redirect_to,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bekræftelsesmailen kunne ikke sendes.";
    console.error("Auth mail error:", message);
    return hookFailure(message);
  }

  return NextResponse.json({});
}
