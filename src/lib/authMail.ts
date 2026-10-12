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
  const message = error instanceof Error ? error.message : "";
  const text = message.toLowerCase();
  if (text.includes("invalid login") || text.includes("authentication") || text.includes("535")) {
    return new Error("one.com afviste adgangskoden til kontakt@mvai.dk.");
  }
  if (
    text.includes("timeout") ||
    text.includes("econnrefused") ||
    text.includes("econnreset") ||
    text.includes("esocket") ||
    text.includes("greeting never received") ||
    text.includes("connect")
  ) {
    return new Error("Forbindelsen til one.com kunne ikke oprettes.");
  }
  return new Error("Bekræftelsesmailen kunne ikke sendes fra kontakt@mvai.dk.");
}

async function deliver(action: MailAction, port: number, password: string): Promise<void> {
  const user = envValue("SMTP_USER") || "kontakt@mvai.dk";
  const transporter = nodemailer.createTransport({
    host: envValue("SMTP_HOST") || "send.one.com",
    port,
    secure: port === 465,
    requireTLS: port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user, pass: password },
    tls: { servername: envValue("SMTP_HOST") || "send.one.com" },
  });
  const copy = mailCopy(action);
  await transporter.sendMail({
    from: envValue("SMTP_FROM") || "MVAI <kontakt@mvai.dk>",
    to: action.email,
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

  const preferred = Number(envValue("SMTP_PORT") || 587);
  const ports = preferred === 465 ? [465, 587] : [587, 465];
  let lastError: unknown;
  for (const port of ports) {
    try {
      await deliver(action, port, password);
      return;
    } catch (error) {
      lastError = error;
      const text = error instanceof Error ? error.message.toLowerCase() : "";
      if (text.includes("invalid login") || text.includes("authentication") || text.includes("535")) {
        throw mailError(error);
      }
    }
  }
  throw mailError(lastError);
}
