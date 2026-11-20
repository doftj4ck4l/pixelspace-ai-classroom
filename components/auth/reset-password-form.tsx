"use client";

import { Suspense, useState, type FC, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  ShieldAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { authClient } from "@/lib/auth-client";

const ResetFormInner: FC = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token || linkError || tokenError) {
    return (
      <AuthShell subtitle="Tetapan semula kata laluan">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
            <ShieldAlertIcon className="size-7" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold">
            Pautan tidak sah atau telah tamat
          </h2>
          <p className="text-muted-foreground text-sm">
            Pautan tetapan semula hanya sah selama 30 minit dan sekali guna.
            Minta pautan baharu untuk meneruskan.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm font-semibold underline underline-offset-2"
          >
            Minta pautan baharu
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell subtitle="Tetapan semula kata laluan">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[#E7F6F4] text-[#177e89] dark:bg-[#12312e] dark:text-[#8fd9c8]">
            <CheckCircle2Icon className="size-7" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold">Kata laluan dikemas kini</h2>
          <p className="text-muted-foreground text-sm">
            Semua sesi lain telah ditamatkan. Log masuk dengan kata laluan
            baharu anda.
          </p>
          <Link
            href="/"
            className="text-sm font-semibold underline underline-offset-2"
          >
            Log masuk
          </Link>
        </div>
      </AuthShell>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirm) return;
    setPending(true);
    setError(null);
    const result = await authClient
      .resetPassword({ newPassword: password, token })
      .catch(() => null);
    setPending(false);
    if (result?.error) {
      const code = result.error.code ?? "";
      if (
        code.includes("INVALID_TOKEN") ||
        (result.error.status ?? 0) === 400
      ) {
        setTokenError(true);
        return;
      }
      setError("Tetapan semula gagal. Sila cuba lagi.");
      return;
    }
    setDone(true);
  };

  return (
    <AuthShell subtitle="Pilih kata laluan baharu untuk akaun anda.">
      <h2 className="text-center text-lg font-semibold">Kata laluan baharu</h2>
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
        aria-busy={pending}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reset-password" className="text-sm font-medium">
            Kata laluan baharu
          </label>
          <div className="relative">
            <Input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Sekurang-kurangnya 8 aksara"
              autoFocus
              required
              disabled={pending}
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword
                  ? "Sembunyikan kata laluan"
                  : "Tunjukkan kata laluan"
              }
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOffIcon className="size-4" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {password.length > 0 && password.length < 8 && (
            <p className="text-sm text-red-500" role="alert">
              Kata laluan mesti sekurang-kurangnya 8 aksara.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reset-confirm" className="text-sm font-medium">
            Sahkan kata laluan
          </label>
          <Input
            id="reset-confirm"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            placeholder="Taip semula kata laluan baharu"
            required
            disabled={pending}
            className="h-10"
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="text-sm text-red-500" role="alert">
              Kata laluan tidak sepadan.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending || password.length < 8 || password !== confirm}
          className="h-10 bg-[#1b8a7f] text-white hover:bg-[#23a093]"
        >
          {pending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              Sedang menyimpan…
            </>
          ) : (
            "Simpan kata laluan"
          )}
        </Button>
      </form>
    </AuthShell>
  );
};

export const ResetPasswordForm: FC = () => (
  <Suspense fallback={null}>
    <ResetFormInner />
  </Suspense>
);
