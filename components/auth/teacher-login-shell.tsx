"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BarChart3Icon,
  BookOpenIcon,
  GraduationCapIcon,
  Loader2Icon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import s from "./teacher-login.module.css";

function PixelspaceLogo() {
  const id = useId();
  return (
    <Link
      href="/"
      className={s.brand}
      aria-label="Pixelspace AI Classroom — Laman utama"
    >
      <svg viewBox="0 0 48 56" aria-hidden="true" className={s.brandMark}>
        <defs>
          <linearGradient id={id} x1="0" x2="1" y1="0" y2=".8">
            <stop stopColor="#00565d" />
            <stop offset=".48" stopColor="#009f94" />
            <stop offset="1" stopColor="#83e4d5" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${id})`}
          fillRule="evenodd"
          d="M0 48V21C0 9.4 9.2 0 21 0h5c12.2 0 22 9.3 22 21.3 0 12-9.5 20.7-21.3 20.7H17v6a8.5 8.5 0 0 1-17 0ZM24 14a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"
        />
        <path
          d="M17 27v17"
          stroke="#08c9b3"
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".6"
        />
      </svg>
      <span>
        <strong>Pixelspace</strong>
        <span>AI CLASSROOM</span>
      </span>
    </Link>
  );
}

export function TeacherLoginShell({
  children,
  delimaAvailable = false,
}: {
  children: ReactNode;
  delimaAvailable?: boolean;
}) {
  const [delimaOpen, setDelimaOpen] = useState(false);
  const [socialPending, setSocialPending] = useState(false);
  const [socialError, setSocialError] = useState(false);
  const signInDelima = async () => {
    if (!delimaAvailable) {
      setDelimaOpen(true);
      return;
    }
    setSocialPending(true);
    setSocialError(false);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (result.error) {
        setSocialError(true);
        setSocialPending(false);
      }
    } catch {
      setSocialError(true);
      setSocialPending(false);
    }
  };

  return (
    <main className={s.page} lang="ms">
      <div className={s.topRibbon} aria-hidden="true" />
      <div className={s.bottomRibbon} aria-hidden="true" />
      <div className={s.layout}>
        <section
          className={s.introduction}
          aria-labelledby="teacher-intro-title"
        >
          <PixelspaceLogo />
          <h1 id="teacher-intro-title">
            Ruang pembelajaran
            <br />
            berkuasa AI untuk
            <br />
            <span>guru Malaysia.</span>
          </h1>
          <p className={s.introText}>
            Rancang pengajaran, hasilkan bahan, jalankan penilaian dan pantau
            perkembangan murid — semuanya dalam satu platform.
          </p>
          <ul className={s.benefits}>
            <li>
              <span>
                <SparklesIcon aria-hidden="true" />
              </span>
              RPH &amp; bahan pengajaran AI
            </li>
            <li>
              <span>
                <BarChart3Icon aria-hidden="true" />
              </span>
              Penilaian &amp; analitik murid
            </li>
            <li>
              <span>
                <UsersIcon aria-hidden="true" />
              </span>
              Pengurusan kelas yang mudah
            </li>
          </ul>
          <Image
            src="/auth/teacher-classroom.png"
            alt="Guru Malaysia menggunakan tablet bersama robot AI, buku dan komputer riba"
            width={1440}
            height={720}
            className={s.illustration}
            priority
          />
        </section>

        <section className={s.card} aria-labelledby="teacher-login-title">
          <div className={s.cardHeader}>
            <span className={s.portalIcon}>
              <GraduationCapIcon aria-hidden="true" />
            </span>
            <h2 id="teacher-login-title">Log masuk sebagai Guru</h2>
            <p>Pixelspace AI Classroom</p>
          </div>
          {children}
          <div className={s.divider}>
            <span />
            atau
            <span />
          </div>
          <Button
            type="button"
            variant="outline"
            className={s.delimaButton}
            onClick={signInDelima}
            disabled={socialPending}
          >
            {socialPending ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <BookOpenIcon aria-hidden="true" />
            )}
            {socialPending ? "Menyambung…" : "Log masuk dengan DELIMa"}
          </Button>
          {socialError && (
            <p role="alert" className={s.error}>
              Log masuk DELIMa belum berjaya. Sila cuba lagi atau gunakan
              emel/ID guru anda.
            </p>
          )}
          <p className={s.register}>
            Belum ada akaun?{" "}
            <Link href="/register/teacher">Daftar sebagai guru</Link>
          </p>
          <Link href="/" className={s.homeLink}>
            <ArrowLeftIcon aria-hidden="true" />
            Kembali ke laman utama
          </Link>
        </section>
      </div>

      <Dialog open={delimaOpen} onOpenChange={setDelimaOpen}>
        <DialogContent className={s.delimaDialog}>
          <DialogTitle>Log masuk DELIMa</DialogTitle>
          <DialogDescription>
            Log masuk DELIMa belum diaktifkan untuk Pixelspace AI Classroom.
            Buat masa ini, sila log masuk menggunakan emel atau ID guru dan kata
            laluan anda.
          </DialogDescription>
          <Button
            type="button"
            className={s.dialogButton}
            onClick={() => setDelimaOpen(false)}
          >
            Gunakan emel atau ID guru
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
