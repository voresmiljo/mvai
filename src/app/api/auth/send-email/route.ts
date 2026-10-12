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

function hookSecret(): string | null {
  const raw = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!raw) return null;
  return raw.replace(/^v1,whsec_/, "");
}

export async function POST(req: Request) {
  await connection();
  const secret = hookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: { http_code: 500, message: "SEND_EMAIL_HOOK_SECRET mangler på serveren." } },
      { status: 500 }
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: EmailPayload;
  try {
    data = new Webhook(secret).verify(payload, headers) as EmailPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ugyldig signatur.";
    return NextResponse.json({ error: { http_code: 401, message } }, { status: 401 });
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
    return NextResponse.json(
      { error: { http_code: 500, message: "Bekræftelsesmailen kunne ikke sendes fra kontakt@mvai.dk." } },
      { status: 500 }
    );
  }

  return NextResponse.json({});
}
