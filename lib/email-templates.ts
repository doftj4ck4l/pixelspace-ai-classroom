import type { Mail } from "@/lib/email";

const shell = (title: string, body: string) => `
<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <p style="font-size:13px;color:#0f766e;font-weight:600;letter-spacing:.08em;text-transform:uppercase">Pixelspace AI Classroom</p>
  <h1 style="font-size:20px;margin:8px 0 16px">${title}</h1>
  ${body}
  <p style="font-size:12px;color:#6b7280;margin-top:24px">Jika anda tidak meminta emel ini, abaikan sahaja.</p>
</div>`;

export const verifyEmailTemplate = (
  name: string,
  url: string,
): Omit<Mail, "to"> => ({
  subject: "Sahkan emel anda — Pixelspace AI Classroom",
  html: shell(
    `Selamat datang, ${name}!`,
    `<p style="font-size:14px;color:#374151">Klik butang di bawah untuk mengesahkan emel dan mula belajar.</p>
     <p style="margin:20px 0"><a href="${url}" style="background:#0f766e;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">Sahkan emel</a></p>
     <p style="font-size:12px;color:#6b7280">Atau salin pautan ini: ${url}</p>`,
  ),
  text: `Sahkan emel anda: ${url}`,
});

export const resetPasswordEmail = (
  name: string,
  url: string,
): Omit<Mail, "to"> => ({
  subject: "Tetapkan semula kata laluan — Pixelspace AI Classroom",
  html: shell(
    `Tetapkan semula kata laluan`,
    `<p style="font-size:14px;color:#374151">Hai ${name}, klik butang di bawah untuk menetapkan kata laluan baharu. Pautan ini tamat dalam 30 minit.</p>
     <p style="margin:20px 0"><a href="${url}" style="background:#0f766e;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-size:14px">Tetapkan kata laluan</a></p>
     <p style="font-size:12px;color:#6b7280">Atau salin pautan ini: ${url}</p>`,
  ),
  text: `Tetapkan semula kata laluan: ${url}`,
});
