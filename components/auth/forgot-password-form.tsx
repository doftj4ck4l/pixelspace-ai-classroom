"use client";

import { useState, type FC, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRightIcon, Loader2Icon, MailCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordForm: FC = () => {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) return;
    setPending(true);
    await authClient
      .requestPasswordReset({
        email: email.trim(),
        redirectTo: "/reset-password",
      })
      .catch(() => null);
    setPending(false);
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <AuthShell subtitle="Tetapan semula kata laluan" widthClass="max-w-md">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[#E7F6F4] text-[#177e89] dark:bg-[#12312e] dark:text-[#8fd9c8]">
            <MailCheckIcon className="size-7" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold">Semak emel anda</h2>
          <p className="text-muted-foreground text-sm">
            Jika <strong>{sentTo}</strong> berdaftar, pautan tetapan semula kata
            laluan akan dihantar tidak lama lagi. Pautan itu sah selama 30 minit
            dan hanya boleh digunakan sekali.
          </p>
          <p className="text-muted-foreground bg-muted rounded-2xl px-3 py-2 text-xs">
            Tidak jumpa emel? Semak folder spam atau promosi anda sebelum
            meminta pautan baharu.
          </p>
          <Link
            href="/"
            className="text-sm font-semibold underline underline-offset-2"
          >
            Kembali ke laman utama
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Masukkan emel akaun anda dan kami akan menghantar pautan tetapan semula.">
      <h2 className="text-center text-lg font-semibold">Lupa kata laluan?</h2>
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
        aria-busy={pending}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgot-email" className="text-sm font-medium">
            Emel
          </label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="nama@sekolah.edu.my"
            autoFocus
            required
            disabled={pending}
            className="h-10"
          />
        </div>
        <Button
          type="submit"
          disabled={pending || !EMAIL_PATTERN.test(email.trim())}
          className="h-10 bg-[#1b8a7f] text-white hover:bg-[#23a093]"
        >
          {pending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              Sedang menghantar…
            </>
          ) : (
            <>
              Hantar pautan
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
      <div className="flex flex-col items-center gap-1.5 text-center text-sm">
        <p className="text-muted-foreground">
          Ingat kata laluan anda?{" "}
          <Link href="/" className="text-foreground underline">
            Log masuk
          </Link>
        </p>
        <Link
          href="/"
          className="text-muted-foreground text-xs underline-offset-2 hover:underline"
        >
          ← Kembali ke laman utama
        </Link>
      </div>
    </AuthShell>
  );
};
