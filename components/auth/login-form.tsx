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
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeacherLoginShell } from "@/components/auth/teacher-login-shell";
import teacherStyles from "@/components/auth/teacher-login.module.css";
import {
  sendVerification,
  signInWithIdentifier,
} from "@/components/auth/auth-api";
import { roleHome } from "@/components/auth/role-home";

export type LoginTheme = "student" | "teacher" | "admin";

type Spec = {
  title: string;
  subtitle: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submit: string;
  submitting: string;
  inputClass: string;
  buttonClass: string;
  labelClass: string;
  errorClass: string;
  hintClass: string;
  linkClass: string;
  checkboxClass: string;
  checkboxLabelClass: string;
  brandClass: string;
};

const SPECS: Record<LoginTheme, Spec> = {
  student: {
    title: "Hai, pelajar! 👋",
    subtitle: "Sedia untuk belajar? Masuk dengan ID pelajar atau emel.",
    identifierLabel: "ID pelajar atau emel",
    identifierPlaceholder: "cth. aiman.hakim atau nama@sekolah.edu.my",
    passwordLabel: "Kata laluan",
    passwordPlaceholder: "Kata laluan anda",
    submit: "Jom masuk! 🚀",
    submitting: "Sedang masuk…",
    inputClass:
      "h-12 rounded-2xl border-2 border-violet-200 bg-violet-50/60 text-base focus-visible:border-violet-400 focus-visible:ring-violet-200 dark:border-violet-800 dark:bg-violet-950/40",
    buttonClass:
      "h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-teal-500 text-base font-bold text-white shadow-lg shadow-violet-300/60 hover:from-violet-600 hover:to-teal-600 dark:shadow-none",
    labelClass: "text-sm font-bold text-violet-900 dark:text-violet-100",
    errorClass:
      "rounded-2xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
    hintClass: "text-xs text-violet-500 dark:text-violet-300",
    linkClass:
      "font-bold text-violet-600 underline-offset-2 hover:underline dark:text-violet-300",
    checkboxClass: "size-4 accent-violet-500",
    checkboxLabelClass:
      "text-sm font-medium text-violet-800 dark:text-violet-200",
    brandClass: "text-violet-900 dark:text-violet-100",
  },
  teacher: {
    title: "Log masuk sebagai Guru",
    subtitle: "Pixelspace AI Classroom",
    identifierLabel: "Emel atau ID guru",
    identifierPlaceholder: "cth. guru@sekolah.edu.my atau cikgu.ali",
    passwordLabel: "Kata laluan",
    passwordPlaceholder: "Kata laluan anda",
    submit: "Log Masuk",
    submitting: "Sedang masuk…",
    inputClass: teacherStyles.input,
    buttonClass: teacherStyles.submit,
    labelClass: teacherStyles.label,
    errorClass: teacherStyles.error,
    hintClass: teacherStyles.hint,
    linkClass: teacherStyles.forgotLink,
    checkboxClass: teacherStyles.checkbox,
    checkboxLabelClass: teacherStyles.checkboxLabel,
    brandClass: "",
  },
  admin: {
    title: "Pentadbir & KPM",
    subtitle: "Log masuk dengan akaun rasmi pentadbir.",
    identifierLabel: "Emel atau ID pentadbir",
    identifierPlaceholder: "cth. admin@pixelspace.my",
    passwordLabel: "Kata laluan",
    passwordPlaceholder: "Kata laluan rasmi anda",
    submit: "Log masuk",
    submitting: "Mengesahkan…",
    inputClass:
      "h-10 rounded-md border-slate-300 bg-white font-mono text-sm focus-visible:border-slate-500 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-950",
    buttonClass:
      "h-10 rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
    labelClass: "text-xs font-semibold tracking-wide text-slate-600 uppercase",
    errorClass:
      "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
    hintClass: "text-xs text-slate-500",
    linkClass:
      "text-slate-700 underline underline-offset-2 dark:text-slate-300",
    checkboxClass: "size-4 accent-slate-900 dark:accent-slate-100",
    checkboxLabelClass: "text-sm text-slate-700 dark:text-slate-300",
    brandClass: "",
  },
};

export const LoginForm: FC<{
  theme: LoginTheme;
  delimaAvailable?: boolean;
}> = ({ theme, delimaAvailable = false }) => {
  const teacher = theme === "teacher";
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
      className={cn("flex flex-col gap-4", teacher && teacherStyles.form)}
      aria-busy={pending}
    >
      <div
        className={cn("flex flex-col gap-1.5", teacher && teacherStyles.field)}
      >
        <label htmlFor={`${theme}-identifier`} className={spec.labelClass}>
          {spec.identifierLabel}
        </label>
        <div className={teacher ? teacherStyles.inputGroup : undefined}>
          {teacher && (
            <MailIcon className={teacherStyles.inputIcon} aria-hidden="true" />
          )}
          <Input
            id={`${theme}-identifier`}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder={spec.identifierPlaceholder}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={!teacher}
            required
            disabled={pending}
            className={spec.inputClass}
            aria-invalid={(teacher && !!error) || undefined}
            aria-describedby={
              teacher && error ? "teacher-login-error" : undefined
            }
          />
        </div>
      </div>

      <div
        className={cn("flex flex-col gap-1.5", teacher && teacherStyles.field)}
      >
        <label htmlFor={`${theme}-password`} className={spec.labelClass}>
          {spec.passwordLabel}
        </label>
        <div className={cn("relative", teacher && teacherStyles.inputGroup)}>
          {teacher && (
            <LockKeyholeIcon
              className={teacherStyles.inputIcon}
              aria-hidden="true"
            />
          )}
          <Input
            id={`${theme}-password`}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={spec.passwordPlaceholder}
            autoComplete="current-password"
            required
            disabled={pending}
            className={cn(spec.inputClass, "pr-10")}
            aria-invalid={(teacher && !!error) || undefined}
            aria-describedby={
              teacher && error ? "teacher-login-error" : undefined
            }
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
              teacher && teacherStyles.passwordToggle,
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
          teacher && teacherStyles.options,
        )}
      >
        <label
          className={cn(
            "flex items-center gap-2",
            teacher && teacherStyles.remember,
          )}
        >
          <span
            className={teacher ? teacherStyles.checkboxControl : "contents"}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={pending}
              className={spec.checkboxClass}
            />
            {teacher && <CheckIcon aria-hidden="true" />}
          </span>
          <span className={spec.checkboxLabelClass}>Ingat saya</span>
        </label>
        <Link href="/forgot-password" className={cn("text-sm", spec.linkClass)}>
          Lupa kata laluan?
        </Link>
      </div>

      {error && (
        <div
          className={spec.errorClass}
          role="alert"
          id={teacher ? "teacher-login-error" : undefined}
        >
          <p>{error}</p>
          {unverifiedEmail &&
            (resendState === "sent" ? (
              <p
                className={cn("mt-2 flex items-center gap-1.5", spec.hintClass)}
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
        className={spec.buttonClass}
      >
        {pending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            {spec.submitting}
          </>
        ) : (
          <>
            {spec.submit}
            {teacher && <ArrowRightIcon aria-hidden="true" />}
          </>
        )}
      </Button>
    </form>
  );

  if (theme === "student") {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-violet-200 via-teal-100 to-amber-100 px-4 py-10 text-violet-950 dark:from-violet-950 dark:via-slate-950 dark:to-teal-950 dark:text-violet-50">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-10 left-6 text-4xl opacity-80 sm:left-16"
        >
          ✨
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-6 bottom-12 text-4xl opacity-80 sm:right-20"
        >
          🚀
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 right-10 hidden text-3xl opacity-70 sm:block"
        >
          📚
        </span>
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-[2rem] border-4 border-white/70 bg-white/95 p-6 shadow-[0_18px_0_-6px_rgba(139,92,246,0.3)] backdrop-blur sm:p-8 dark:border-violet-900 dark:bg-slate-900/95">
            <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-teal-100 text-3xl">
              🎒
            </span>
            <h1 className={cn("mt-4 text-3xl font-extrabold", spec.brandClass)}>
              {spec.title}
            </h1>
            <p className="mt-1 text-sm font-medium text-violet-500 dark:text-violet-300">
              {spec.subtitle}
            </p>
            <div className="mt-5">{form}</div>
          </div>
          <div className="mt-4 flex flex-col items-center gap-1.5 text-center text-sm font-medium text-violet-800 dark:text-violet-200">
            <p>
              Baru di sini?{" "}
              <Link href="/register/student" className={spec.linkClass}>
                Daftar sebagai pelajar
              </Link>
            </p>
            <p>
              Guru atau pentadbir?{" "}
              <Link href="/login/teacher" className={spec.linkClass}>
                Masuk di portal anda
              </Link>
            </p>
            <Link
              href="/"
              className="text-violet-500 underline-offset-2 hover:underline dark:text-violet-300"
            >
              ← Kembali ke laman utama
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (theme === "admin") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center gap-3 border-b-2 border-slate-300 pb-4 dark:border-slate-700">
            <span className="grid size-11 place-items-center rounded-md bg-slate-900 text-lg text-white dark:bg-slate-100 dark:text-slate-900">
              🛡️
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] text-slate-500 uppercase">
                Portal Rasmi
              </p>
              <h1 className="text-xl font-bold tracking-tight">{spec.title}</h1>
            </div>
          </div>
          <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              {spec.subtitle}
            </p>
            {form}
            <p className="mt-5 border-t border-dashed border-slate-300 pt-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Akses terhad kepada pentadbir sekolah, pegawai KPM dan penyelia
              sistem. Akaun pentadbir dicipta oleh penyelia sistem sahaja.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <Link
              href="/"
              className="underline-offset-2 hover:text-slate-900 hover:underline dark:hover:text-white"
            >
              ← Laman utama
            </Link>
            <Link
              href="/login/teacher"
              className="underline-offset-2 hover:text-slate-900 hover:underline dark:hover:text-white"
            >
              Portal guru →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TeacherLoginShell delimaAvailable={delimaAvailable}>
      {form}
    </TeacherLoginShell>
  );
};
