"use client";

import { useState, type FC, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  LockKeyholeIcon,
  MailCheckIcon,
  MailIcon,
} from "@/components/icons";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginShell } from "@/components/auth/login-shell";
import teacherStyles from "@/components/auth/teacher-login.module.css";
import {
  sendVerification,
  signInWithIdentifier,
} from "@/components/auth/auth-api";
import { roleHome } from "@/components/auth/role-home";

export type LoginTheme = "student" | "teacher" | "admin";

type Spec = {
  identifierLabel: string;
  identifierPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submit: string;
  submitting: string;
};

const SPECS: Record<LoginTheme, Spec> = {
  student: {
    identifierLabel: "ID pelajar atau emel",
    identifierPlaceholder: "cth. aiman.hakim atau nama@sekolah.edu.my",
    passwordLabel: "Kata laluan",
    passwordPlaceholder: "Kata laluan anda",
    submit: "Jom masuk! 🚀",
    submitting: "Sedang masuk…",
  },
  teacher: {
    identifierLabel: "Emel atau ID",
    identifierPlaceholder: "cth. nama@sekolah.edu.my atau nama.pengguna",
    passwordLabel: "Kata laluan",
    passwordPlaceholder: "Kata laluan anda",
    submit: "Log masuk",
    submitting: "Sedang masuk…",
  },
  admin: {
    identifierLabel: "Emel atau ID pentadbir",
    identifierPlaceholder: "cth. admin@pixelspace.my",
    passwordLabel: "Kata laluan",
    passwordPlaceholder: "Kata laluan anda",
    submit: "Log masuk",
    submitting: "Mengesahkan…",
  },
};

export const LoginForm: FC<{
  theme: LoginTheme;
  delimaAvailable?: boolean;
}> = ({ theme, delimaAvailable = false }) => {
  const spec = SPECS[theme];
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || password.length < 8) return;
    setPending(true);
    setError(null);
    setUnverifiedEmail(null);
    setResendState("idle");
    try {
      const value = identifier.trim();
      const { user, error: authError } = await signInWithIdentifier(
        value,
        password,
        remember,
      );
      if (authError) {
        if (authError.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(value.includes("@") ? value : null);
          setError(
            "Emel anda belum disahkan. Semak peti masuk anda dan klik pautan pengesahan sebelum log masuk.",
          );
        } else {
          setError("Emel/ID atau kata laluan tidak sah. Sila cuba lagi.");
        }
        setPending(false);
        return;
      }
      window.location.assign(roleHome(user?.role));
    } catch {
      setError("Sambungan gagal. Sila cuba lagi.");
      setPending(false);
    }
  };

  const resendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendState("sending");
    await sendVerification(unverifiedEmail);
    setResendState("sent");
  };

  const form = (
    <form
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-4", teacherStyles.form)}
      aria-busy={pending}
    >
      <div className={cn("flex flex-col gap-1.5", teacherStyles.field)}>
        <label htmlFor={`${theme}-identifier`} className={teacherStyles.label}>
          {spec.identifierLabel}
        </label>
        <div className={teacherStyles.inputGroup}>
          {<MailIcon className={teacherStyles.inputIcon} aria-hidden="true" />}
          <Input
            id={`${theme}-identifier`}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={spec.identifierPlaceholder}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={false}
            required
            disabled={pending}
            className={teacherStyles.input}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${theme}-login-error` : undefined}
          />
        </div>
      </div>

      <div className={cn("flex flex-col gap-1.5", teacherStyles.field)}>
        <label htmlFor={`${theme}-password`} className={teacherStyles.label}>
          {spec.passwordLabel}
        </label>
        <div className={cn("relative", teacherStyles.inputGroup)}>
          {
            <LockKeyholeIcon
              className={teacherStyles.inputIcon}
              aria-hidden="true"
            />
          }
          <Input
            id={`${theme}-password`}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={spec.passwordPlaceholder}
            autoComplete="current-password"
            required
            disabled={pending}
            className={cn(teacherStyles.input, "pr-10")}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${theme}-login-error` : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"
            }
            aria-pressed={showPassword}
            className={cn(
              "text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2",
              teacherStyles.passwordToggle,
            )}
            disabled={pending}
          >
            {showPassword ? (
              <EyeOffIcon className="size-4" aria-hidden="true" />
            ) : (
              <EyeIcon className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between",
          teacherStyles.options,
        )}
      >
        <label
          className={cn("flex items-center gap-2", teacherStyles.remember)}
        >
          <span className={teacherStyles.checkboxControl}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={pending}
              className={teacherStyles.checkbox}
            />
            {<CheckIcon aria-hidden="true" />}
          </span>
          <span className={teacherStyles.checkboxLabel}>Ingat saya</span>
        </label>
        <Link
          href="/forgot-password"
          className={cn("text-sm", teacherStyles.forgotLink)}
        >
          Lupa kata laluan?
        </Link>
      </div>

      {error && (
        <div
          className={teacherStyles.error}
          role="alert"
          id={`${theme}-login-error`}
        >
          <p>{error}</p>
          {unverifiedEmail &&
            (resendState === "sent" ? (
              <p
                className={cn(
                  "mt-2 flex items-center gap-1.5",
                  teacherStyles.hint,
                )}
              >
                <MailCheckIcon className="size-3.5" aria-hidden="true" />
                Pautan pengesahan baharu telah dihantar.
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resendVerification}
                disabled={resendState === "sending"}
                className="mt-2"
              >
                {resendState === "sending" ? (
                  <>
                    <Loader2Icon
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    Sedang menghantar…
                  </>
                ) : (
                  "Hantar semula pautan pengesahan"
                )}
              </Button>
            ))}
        </div>
      )}

      <Button
        type="submit"
        disabled={pending || !identifier.trim() || password.length < 8}
        className={teacherStyles.submit}
      >
        {pending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            {spec.submitting}
          </>
        ) : (
          <>
            {spec.submit}
            {theme !== "student" && <ArrowRightIcon aria-hidden="true" />}
          </>
        )}
      </Button>
    </form>
  );

  return (
    <LoginShell theme={theme} delimaAvailable={delimaAvailable}>
      {form}
    </LoginShell>
  );
};
