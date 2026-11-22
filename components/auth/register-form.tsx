"use client";

import { useState, type FC, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  GraduationCapIcon,
  Loader2Icon,
  MailCheckIcon,
  UserIcon,
} from "@/components/icons";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/filter-select";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  SchoolPicker,
  type SchoolOption,
} from "@/components/auth/school-picker";
import {
  sendVerification,
  signUpAccount,
  type AuthError,
} from "@/components/auth/auth-api";

const YEARS_PRIMARY = [
  "Tahun 1",
  "Tahun 2",
  "Tahun 3",
  "Tahun 4",
  "Tahun 5",
  "Tahun 6",
];
const YEARS_SECONDARY = [
  "Tingkatan 1",
  "Tingkatan 2",
  "Tingkatan 3",
  "Tingkatan 4",
  "Tingkatan 5",
];

const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._]{2,19}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEP_LABELS = ["Sekolah", "Maklumat anda", "Kata laluan"];

const suggestUsername = (fullName: string) =>
  fullName
    .toLowerCase()
    .replace(/\b(bin|binti|a\/l|a\/p)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(".")
    .slice(0, 20);

type RegisterRole = "student" | "teacher";

type Classes = {
  input: string;
  select: string;
  label: string;
  hint: string;
  error: string;
  primary: string;
  ghost: string;
  card: string;
  stepDot: string;
  stepText: string;
};

const CLASSES: Record<RegisterRole, Classes> = {
  student: {
    input:
      "h-12 rounded-2xl border-2 border-violet-200 bg-violet-50/60 text-base focus-visible:border-violet-400 focus-visible:ring-violet-200 dark:border-violet-800 dark:bg-violet-950/40",
    select:
      "h-12 w-full appearance-none rounded-2xl border-2 border-violet-200 bg-violet-50/60 pr-10 pl-11 text-base outline-none focus:border-violet-400 disabled:opacity-60 dark:border-violet-800 dark:bg-violet-950/40",
    label: "text-sm font-bold text-violet-900 dark:text-violet-100",
    hint: "text-xs font-medium text-violet-500 dark:text-violet-300",
    error: "text-xs font-semibold text-rose-600 dark:text-rose-400",
    primary:
      "h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-teal-500 text-base font-bold text-white shadow-lg shadow-violet-300/60 hover:from-violet-600 hover:to-teal-600 dark:shadow-none",
    ghost:
      "h-12 rounded-2xl border-2 border-violet-200 bg-white text-base font-bold text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200",
    card: "rounded-[2rem] border-4 border-white/70 bg-white/95 p-6 shadow-[0_18px_0_-6px_rgba(139,92,246,0.3)] backdrop-blur sm:p-8 dark:border-violet-900 dark:bg-slate-900/95",
    stepDot: "bg-violet-500",
    stepText: "text-violet-700 dark:text-violet-200",
  },
  teacher: {
    input: "h-10",
    select:
      "h-10 w-full appearance-none rounded-lg border border-input bg-transparent pr-9 pl-10 text-sm outline-none focus:border-[#1b8a7f] disabled:opacity-60 dark:bg-input/30",
    label: "text-sm font-medium",
    hint: "text-muted-foreground text-xs",
    error: "text-sm text-red-500",
    primary: "h-10 bg-[#1b8a7f] text-white hover:bg-[#23a093]",
    ghost: "h-10",
    card: "",
    stepDot: "bg-[#1b8a7f]",
    stepText: "text-muted-foreground",
  },
};

export const RegisterForm: FC<{ role: RegisterRole }> = ({ role }) => {
  const t = useT();
  const styles = CLASSES[role];
  const isStudent = role === "student";
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [school, setSchool] = useState<SchoolOption | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [yearLabel, setYearLabel] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const yearOptions =
    school?.type === "secondary" ? YEARS_SECONDARY : YEARS_PRIMARY;

  const clearError = (field: string) =>
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

  const onSchoolSelect = (next: SchoolOption | null) => {
    setSchool(next);
    setYearLabel("");
    clearError("school");
  };

  const nextFromSchool = () => {
    const errors: Record<string, string> = {};
    if (!school) errors.school = "Pilih sekolah anda untuk meneruskan.";
    if (isStudent && !yearLabel)
      errors.yearLabel = "Pilih tahun/tingkatan anda.";
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setStep(2);
  };

  const nextFromDetails = () => {
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 3) errors.fullName = t("register.enterName");
    if (!USERNAME_PATTERN.test(username.trim()))
      errors.username =
        "ID: 3–20 aksara (huruf, nombor, titik atau garis bawah).";
    if (displayName.trim().length > 30)
      errors.displayName = "Maksimum 30 aksara.";
    if (!EMAIL_PATTERN.test(email.trim()))
      errors.email = t("register.badEmail");
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setStep(3);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (password.length < 8) errors.password = t("reset.tooShort");
    if (confirm !== password) errors.confirm = t("reset.mismatch");
    if (!terms) errors.terms = t("register.termsError");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!school) {
      setFieldErrors({ school: "Pilih sekolah anda untuk meneruskan." });
      setStep(1);
      return;
    }

    setPending(true);
    setFormError(null);
    let authError: AuthError;
    try {
      authError = await signUpAccount({
        email: email.trim(),
        password,
        name: fullName.trim(),
        username: username.trim(),
        displayName: displayName.trim() || fullName.trim().split(" ")[0],
        schoolId: school.id,
        role,
        yearLabel: isStudent ? yearLabel : undefined,
      });
    } catch {
      setPending(false);
      setFormError(t("register.connection"));
      return;
    }
    setPending(false);

    if (authError) {
      const code = authError.code ?? "";
      if (code.includes("USERNAME")) {
        setFieldErrors({ username: t("register.idTaken") });
        setStep(2);
      } else if (code.includes("EXISTS")) {
        setFieldErrors({
          email: t("register.emailExists"),
        });
        setStep(2);
      } else {
        setFormError(t("register.failed"));
      }
      return;
    }

    setSentEmail(email.trim());
    setStep(4);
  };

  const resendVerification = async () => {
    if (!sentEmail) return;
    setResendState("sending");
    await sendVerification(sentEmail);
    setResendState("sent");
  };

  if (step === 4 && sentEmail) {
    const success = (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[#E7F6F4] text-[#177e89] dark:bg-[#12312e] dark:text-[#8fd9c8]">
          <MailCheckIcon className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-semibold">Semak emel anda</h2>
        <p className={cn("text-sm", styles.stepText)}>
          Kami menghantar pautan pengesahan ke <strong>{sentEmail}</strong>.
          Klik pautan itu untuk mengaktifkan akaun anda, kemudian log masuk.
        </p>
        <p
          className={cn("bg-muted rounded-2xl px-3 py-2 text-xs", styles.hint)}
        >
          Tidak jumpa emel? Semak folder spam atau promosi anda. Pautan
          pengesahan sah selama 1 jam dan boleh dihantar semula.
        </p>
        {resendState === "sent" ? (
          <p className={cn("flex items-center gap-1.5 text-xs", styles.hint)}>
            <MailCheckIcon className="size-3.5" aria-hidden="true" />
            Pautan pengesahan baharu telah dihantar.
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={resendVerification}
            disabled={resendState === "sending"}
            className="h-10"
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
        )}
        <Link
          href="/login"
          className={cn("text-sm font-semibold", styles.stepText)}
        >
          Sudah sahkan emel? Log masuk
        </Link>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Mod pembangunan (tanpa SMTP): emel boleh dilihat di{" "}
          <a
            href="/api/dev/mailbox"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            /api/dev/mailbox
          </a>
          .
        </p>
      </div>
    );
    if (isStudent) {
      return (
        <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-violet-200 via-teal-100 to-amber-100 px-4 py-10 text-violet-950 dark:from-violet-950 dark:via-slate-950 dark:to-teal-950 dark:text-violet-50">
          <div className={cn("relative z-10 w-full max-w-md", styles.card)}>
            {success}
          </div>
        </div>
      );
    }
    return (
      <AuthShell
        subtitle="Satu langkah lagi — sahkan emel anda."
        widthClass="max-w-md"
      >
        {success}
      </AuthShell>
    );
  }

  const field = (name: string) =>
    fieldErrors[name] ? (
      <p className={styles.error} role="alert">
        {fieldErrors[name]}
      </p>
    ) : null;

  const form = (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      aria-busy={pending}
    >
      {step === 1 && (
        <>
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold",
              isStudent
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200"
                : "bg-[#E7F6F4] text-[#00786a] dark:bg-[#12312e] dark:text-[#8fd9c8]",
            )}
          >
            {isStudent ? (
              <GraduationCapIcon className="size-4" aria-hidden="true" />
            ) : (
              <UserIcon className="size-4" aria-hidden="true" />
            )}
            {isStudent ? "Akaun Pelajar" : "Akaun Guru"}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={styles.label}>Sekolah</label>
            <SchoolPicker
              selected={school}
              onSelect={onSchoolSelect}
              disabled={pending}
              tone={isStudent ? "fun" : "clean"}
            />
            {field("school")}
            <p className={styles.hint}>
              Taip untuk mencari sekolah anda — pengalaman pembelajaran
              menyesuaikan sekolah anda.
            </p>
          </div>

          {isStudent && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="yearLabel" className={styles.label}>
                {school?.type === "secondary" ? "Tingkatan" : "Tahun"}
              </label>
              <div className="relative">
                <GraduationCapIcon
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <FilterSelect
                  id="yearLabel"
                  value={yearLabel}
                  onValueChange={(value) => {
                    setYearLabel(value);
                    clearError("yearLabel");
                  }}
                  disabled={!school || pending}
                  options={yearOptions.map((year) => ({
                    value: year,
                    label: year,
                  }))}
                  placeholder={
                    school ? "Pilih tahun/tingkatan" : "Pilih sekolah dahulu"
                  }
                  className={cn(
                    styles.select,
                    "flex items-center justify-between",
                  )}
                  contentClassName="min-w-40"
                  ariaLabel="Tahun atau tingkatan"
                />
                <ChevronDownIcon
                  className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
              </div>
              {field("yearLabel")}
            </div>
          )}

          <Button
            type="button"
            onClick={nextFromSchool}
            disabled={!school || (isStudent && !yearLabel)}
            className={styles.primary}
          >
            Seterusnya
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className={styles.label}>
              Nama penuh
            </label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => {
                const value = event.target.value;
                setFullName(value);
                clearError("fullName");
                if (!usernameTouched && value.trim().length >= 3) {
                  setUsername(suggestUsername(value));
                }
              }}
              autoComplete="name"
              placeholder="cth. Aiman Hakim bin Roslan"
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.fullName)}
              className={styles.input}
            />
            {field("fullName")}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className={styles.label}>
              {isStudent ? t("register.studentId") : t("register.teacherId")}
            </label>
            <Input
              id="username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setUsernameTouched(true);
                clearError("username");
              }}
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              placeholder={t("register.idPlaceholder")}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.username)}
              className={styles.input}
            />
            {field("username") ?? (
              <p className={styles.hint}>{t("register.idHint")}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="displayName" className={styles.label}>
              {t("register.displayNameLabel")}
            </label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                clearError("displayName");
              }}
              placeholder={t("register.displayNamePlaceholder")}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.displayName)}
              className={styles.input}
            />
            {field("displayName")}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className={styles.label}>
              Emel
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError("email");
              }}
              autoComplete="email"
              placeholder="nama@sekolah.edu.my"
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.email)}
              className={styles.input}
            />
            {field("email") ?? (
              <p className={styles.hint}>{t("register.emailHint")}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={pending}
              className={cn("shrink-0", styles.ghost)}
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              {t("register.back")}
            </Button>
            <Button
              type="button"
              onClick={nextFromDetails}
              className={cn("flex-1", styles.primary)}
            >
              {t("register.next")}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={styles.label}>
              {t("register.password")}
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearError("password");
                  clearError("confirm");
                }}
                autoComplete="new-password"
                placeholder={t("register.passwordPh")}
                disabled={pending}
                aria-invalid={Boolean(fieldErrors.password)}
                className={cn(styles.input, "pr-10")}
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
            {field("password")}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className={styles.label}>
              Sahkan kata laluan
            </label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value);
                clearError("confirm");
              }}
              autoComplete="new-password"
              placeholder={t("register.confirmPassword")}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.confirm)}
              className={styles.input}
            />
            {field("confirm")}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={terms}
                onChange={(event) => {
                  setTerms(event.target.checked);
                  clearError("terms");
                }}
                disabled={pending}
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isStudent ? "accent-violet-500" : "accent-[#1b8a7f]",
                )}
              />
              <span className={cn("text-sm leading-relaxed", styles.label)}>
                Saya bersetuju dengan terma penggunaan dan dasar privasi
                Pixelspace AI Classroom.
              </span>
            </label>
            {field("terms")}
          </div>

          {formError && (
            <p className={cn(styles.error, "text-sm")} role="alert">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              disabled={pending}
              className={cn("shrink-0", styles.ghost)}
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              Kembali
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className={cn("flex-1", styles.primary)}
            >
              {pending ? (
                <>
                  <Loader2Icon
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                  Sedang mendaftar…
                </>
              ) : (
                t("register.submit")
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );

  const progress = (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((number) => (
          <span
            key={number}
            className={cn(
              "h-1.5 rounded-full transition-all",
              number <= step ? cn("w-8", styles.stepDot) : "bg-muted w-4",
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs font-medium", styles.stepText)}>
        Langkah {step} daripada 3 · <strong>{STEP_LABELS[step - 1]}</strong>
      </p>
    </div>
  );

  const footer = (
    <div className="flex flex-col items-center gap-1.5 text-center text-sm">
      <p className={styles.stepText}>
        Sudah ada akaun?{" "}
        <Link href="/login" className="font-semibold underline">
          Log masuk
        </Link>
      </p>
      <p className={styles.hint}>
        {isStudent ? (
          <>
            Guru?{" "}
            <Link href="/register/teacher" className="underline">
              Daftar sebagai guru
            </Link>
          </>
        ) : (
          <>
            Pelajar?{" "}
            <Link href="/register/student" className="underline">
              Daftar sebagai pelajar
            </Link>
          </>
        )}
      </p>
      <Link
        href="/"
        className={cn(styles.hint, "underline-offset-2 hover:underline")}
      >
        ← Kembali ke laman utama
      </Link>
    </div>
  );

  if (isStudent) {
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
          🎒
        </span>
        <div className="relative z-10 w-full max-w-md">
          <div className={styles.card}>
            <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-teal-100 text-3xl">
              🚀
            </span>
            <h1 className="mt-4 text-3xl font-extrabold">
              Jom daftar, pelajar!
            </h1>
            <p className="mt-1 text-sm font-medium text-violet-500 dark:text-violet-300">
              Isi butiran anda dan mula belajar bersama AI.
            </p>
            <div className="mt-5 flex flex-col gap-4">
              {progress}
              {form}
            </div>
          </div>
          <div className="mt-4">{footer}</div>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      subtitle="Daftar sebagai guru — sahkan emel selepas mendaftar."
      widthClass="max-w-md"
    >
      <div className="flex flex-col gap-4">
        {progress}
        {form}
        {footer}
      </div>
    </AuthShell>
  );
};
