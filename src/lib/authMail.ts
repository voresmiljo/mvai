import dns from "node:dns/promises";
import nodemailer from "nodemailer";

type MailAction = {
  email: string;
  token: string;
  tokenHash: string;
  emailActionType: string;
  redirectTo: string;
};

function confirmationUrl(action: MailAction): string {
  const fallback = "https://www.mvai.dk/auth/confirm";
  let base = fallback;
  try {
    const redirect = new URL(action.redirectTo);
    if (redirect.hostname === "mvai.dk" || redirect.hostname === "www.mvai.dk") {
      base = `${redirect.origin}/auth/confirm`;
    }
  } catch {
    base = fallback;
  }

  const url = new URL(base);
  url.searchParams.set("token_hash", action.tokenHash);
  url.searchParams.set("type", action.emailActionType);
  return url.toString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mailCopy(action: MailAction): { subject: string; text: string; html: string } {
  const link = confirmationUrl(action);
  const email = escapeHtml(action.email);
  const token = escapeHtml(action.token);

  if (action.emailActionType === "recovery") {
    return {
      subject: "Nulstil adgangskoden til MVAI",
      text: `Der er bedt om en ny adgangskode til ${action.email}.\n\nVælg en ny adgangskode her:\n${link}\n\nHvis du ikke har bedt om det, kan du se bort fra mailen.`,
      html: `<p>Der er bedt om en ny adgangskode til ${email}.</p><p><a href="${link}">Vælg en ny adgangskode</a></p><p>Hvis du ikke har bedt om det, kan du se bort fra mailen.</p>`,
    };
  }

  if (action.emailActionType === "reauthentication") {
    return {
      subject: "Bekræftelseskode til MVAI",
      text: `Koden er ${action.token}. Den udløber snart.`,
      html: `<p>Koden er <strong>${token}</strong>. Den udløber snart.</p>`,
    };
  }

  return {
    subject: "Bekræft din konto på MVAI",
    text: `Bekræft ${action.email} for at gøre oprettelsen færdig.\n\n${link}\n\nMailen er sendt fra kontakt@mvai.dk.`,
    html: `<p>Bekræft ${email} for at gøre oprettelsen færdig.</p><p><a href="${link}">Bekræft e-mail</a></p><p>Mailen er sendt fra kontakt@mvai.dk.</p>`,
  };
}

function envValue(name: string): string {
  return process.env[name]?.trim() || "";
}

function mailError(error: unknown): Error {
  const err = error as { message?: string; response?: string; code?: string; responseCode?: number };
  const message = `${err.message || ""} ${err.response || ""}`.toLowerCase();
  const code = String(err.code || "");
  if (
    message.includes("invalid login") ||
    message.includes("authentication") ||
    message.includes("535") ||
    code === "EAUTH"
  ) {
    return new Error("one.com afviste adgangskoden til kontakt@mvai.dk.");
  }
  const detail = (err.response || err.message || "ukendt fejl").replace(/\s+/g, " ").trim().slice(0, 140);
  if (
    message.includes("timeout") ||
    message.includes("econn") ||
    message.includes("esocket") ||
    message.includes("greeting") ||
    message.includes("tls") ||
    code === "ECONNECTION" ||
    code === "EDNS" ||
    code === "ETIMEDOUT" ||
    code === "ETLS" ||
    code === "ESOCKET"
  ) {
    return new Error(`Forbindelsen til one.com kunne ikke oprettes. ${detail}`.trim());
  }
  return new Error(`one.com: ${detail}`);
}

async function deliver(action: MailAction, port: number, password: string): Promise<void> {
  const host = envValue("SMTP_HOST") || "send.one.com";
  const user = envValue("SMTP_USER") || "kontakt@mvai.dk";
  const addresses = await dns.resolve4(host);
  const address = addresses[0];
  if (!address) {
    throw new Error("Forbindelsen til one.com kunne ikke oprettes.");
  }
  const transporter = nodemailer.createTransport({
    host: address,
    servername: host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    name: "mvai.dk",
    connectionTimeout: 3000,
    greetingTimeout: 3000,
    socketTimeout: 4000,
    auth: { user, pass: password },
    tls: { servername: host },
  } as Parameters<typeof nodemailer.createTransport>[0]);
  const copy = mailCopy(action);
  await transporter.sendMail({
    from: { name: "MVAI", address: user },
    to: action.email,
    envelope: { from: user, to: action.email },
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
  });
}

export async function sendAuthMail(action: MailAction): Promise<void> {
  const password = envValue("SMTP_PASSWORD");
  if (!password) {
    throw new Error("Adgangskoden til mailen mangler på serveren.");
  }

  const port = 587;
  try {
    await deliver(action, port, password);
  } catch (error) {
    throw mailError(error);
  }
}
