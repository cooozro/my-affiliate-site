import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const CONTACT_TO = process.env.CONTACT_EMAIL ?? "cooozro@gmail.com";

type ContactBody = {
  name?: string;
  email?: string;
  message?: string;
};

async function sendViaFormSubmit(
  name: string,
  email: string,
  message: string,
): Promise<boolean> {
  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_TO)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop",
        Referer: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aipick.shop"}/contact`,
      },
      body: JSON.stringify({
        name,
        email,
        message,
        _subject: `[AI Pick & Report] Contact from ${name}`,
        _replyto: email,
        _captcha: "false",
        _template: "table",
      }),
    },
  );

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { success?: boolean | string };
  return data.success === true || data.success === "true";
}

async function sendViaWeb3Forms(
  name: string,
  email: string,
  message: string,
): Promise<boolean> {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    return false;
  }

  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
      name,
      email,
      message,
      subject: `[AI Pick & Report] Contact from ${name}`,
    }),
  });

  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

async function sendViaSmtp(
  name: string,
  email: string,
  message: string,
): Promise<boolean> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: `"AI Pick & Report" <${smtpUser}>`,
    to: CONTACT_TO,
    replyTo: email,
    subject: `[AI Pick & Report] Contact from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
  });

  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactBody;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const sent =
      (await sendViaWeb3Forms(name, email, message)) ||
      (await sendViaSmtp(name, email, message)) ||
      (await sendViaFormSubmit(name, email, message));

    if (!sent) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
