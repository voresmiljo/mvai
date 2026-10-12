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

export async function sendAuthMail(action: MailAction): Promise<void> {
  const password = process.env.SMTP_PASSWORD;
  if (!password) {
    throw new Error("SMTP_PASSWORD mangler på serveren.");
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || "kontakt@mvai.dk";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "send.one.com",
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });

  const copy = mailCopy(action);
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "MVAI <kontakt@mvai.dk>",
    to: action.email,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
  });
}
