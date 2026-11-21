"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BarChart3Icon,
  BookOpenIcon,
  GraduationCapIcon,
  InfoIcon,
  Loader2Icon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import type { LoginTheme } from "./login-form";
import s from "./teacher-login.module.css";
import r from "./login-roles.module.css";

function PixelspaceLogo() {
  const id = useId();
  return (
    <Link
      href="/"
      className={cn(s.brand, r.brand)}
      aria-label="Pixelspace AI Classroom — Laman utama"
    >
      <svg
        viewBox="0 0 48 56"
        aria-hidden="true"
        className={cn(s.brandMark, r.brandMark)}
      >
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

const ART = {
  teacher: {
    src: "/auth/teacher-classroom.png",
    alt: "Guru Malaysia menggunakan tablet bersama robot AI, buku dan komputer riba",
  },
  student: {
    src: "/auth/student-learning.png",
    alt: "Pelajar ceria belajar menggunakan komputer riba bersama robot AI",
  },
  admin: {
    src: "/auth/admin-dashboard.png",
    alt: "Komputer riba dengan paparan analitik sekolah dan pengurusan pendidikan",
  },
};

export function LoginShell({
  children,
  theme,
  delimaAvailable = false,
}: {
  children: ReactNode;
  theme: LoginTheme;
  delimaAvailable?: boolean;
}) {
  const student = theme === "student";
  const admin = theme === "admin";
  const title = student
    ? "Hai, pelajar! 👋"
    : admin
      ? "Pentadbir & KPM"
      : "Log masuk";
  const subtitle = student
    ? "Sedia untuk belajar? Masuk dengan ID pelajar atau emel."
    : admin
      ? "Log masuk dengan akaun rasmi pentadbir."
      : "Gunakan emel atau ID anda untuk teruskan.";
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
    <main
      className={cn(s.page, student && r.studentPage, admin && r.adminPage)}
      lang="ms"
    >
      <div className={cn(s.topRibbon, r.topRibbon)} aria-hidden="true" />
      <div className={cn(s.bottomRibbon, r.bottomRibbon)} aria-hidden="true" />
      <div className={cn(s.layout, r.layout)}>
        <section
          className={cn(s.introduction, r.introduction)}
          aria-labelledby={`${theme}-intro-title`}
        >
          <PixelspaceLogo />
          {student ? (
            <>
              <span className={r.audienceBadge}>
                <GraduationCapIcon aria-hidden="true" />
                UNTUK MURID
              </span>
              <h1 id="student-intro-title" className={r.studentHeadline}>
                Belajar dengan
                <br />
                lebih bijak,
                <br />
                <span>
                  bersama AI.
                  <span className={r.headlineSparkle} aria-hidden="true">
                    ✨
                  </span>
                </span>
              </h1>
              <p className={cn(s.introText, r.introText)}>
                Akses nota, kuiz, flashcard dan banyak lagi dalam satu ruang
                pembelajaran yang mudah dan menyeronokkan.
              </p>
            </>
          ) : admin ? (
            <>
              <span className={r.audienceBadge}>
                <ShieldCheckIcon aria-hidden="true" />
                PORTAL RASMI
              </span>
              <h1 id="admin-intro-title" className={r.adminHeadline}>
                Pentadbir &amp; KPM
              </h1>
              <p className={cn(s.introText, r.introText)}>
                Akses pentadbiran sekolah dan pengurusan platform Pixelspace AI
                Classroom untuk sokongan pembelajaran di seluruh Malaysia.
              </p>
            </>
          ) : (
            <>
              <h1 id="teacher-intro-title">
                Satu ruang pembelajaran
                <br />
                berkuasa AI untuk
                <br />
                <span>seluruh sekolah.</span>
              </h1>
              <p className={cn(s.introText, r.introText)}>
                Murid belajar dengan kad imbas, kuiz dan nota pintar; guru
                merancang pengajaran dan penilaian; pentadbir memantau
                perkembangan — semuanya dalam satu platform.
              </p>
              <ul className={s.benefits}>
                <li>
                  <span>
                    <SparklesIcon aria-hidden="true" />
                  </span>
                  Kad imbas, kuiz &amp; nota pintar
                </li>
                <li>
                  <span>
                    <BookOpenIcon aria-hidden="true" />
                  </span>
                  Bahan pengajaran &amp; penilaian AI
                </li>
                <li>
                  <span>
                    <BarChart3Icon aria-hidden="true" />
                  </span>
                  Analitik &amp; pengurusan sekolah
                </li>
              </ul>
            </>
          )}
          {admin ? (
            <div className={r.adminArtwork}>
              <Image
                src={ART.admin.src}
                alt={ART.admin.alt}
                width={1440}
                height={800}
                priority
              />
              <Image
                src="/auth/jata-negara.png"
                alt=""
                width={140}
                height={120}
                className={r.artworkCrest}
              />
            </div>
          ) : (
            <Image
              src={ART[theme].src}
              alt={ART[theme].alt}
              width={1440}
              height={student ? 840 : 720}
              className={cn(s.illustration, r.illustration)}
              priority
            />
          )}
        </section>

        <section
          className={cn(s.card, r.card)}
          aria-labelledby={`${theme}-login-title`}
        >
          <div className={cn(s.cardHeader, r.cardHeader)}>
            {admin ? (
              <div className={r.officialHeading}>
                <span className={r.crestTile}>
                  <Image
                    src="/auth/jata-negara.png"
                    alt="Jata Negara Malaysia"
                    width={68}
                    height={58}
                  />
                </span>
                <div>
                  <span>PORTAL RASMI</span>
                  <h2 id="admin-login-title">{title}</h2>
                </div>
              </div>
            ) : (
              <>
                <span className={cn(s.portalIcon, r.portalIcon)}>
                  {student ? (
                    <span className={r.backpack} aria-hidden="true">
                      🎒
                    </span>
                  ) : (
                    <GraduationCapIcon aria-hidden="true" />
                  )}
                </span>
                <h2 id={`${theme}-login-title`}>{title}</h2>
              </>
            )}
            <p>{subtitle}</p>
          </div>
          {children}
          {admin ? (
            <>
              <div className={r.accessNotice}>
                <InfoIcon aria-hidden="true" />
                <p>
                  Akses terhad kepada pentadbir sekolah, pegawai KPM dan
                  penyelia sistem. Akaun pentadbir dicipta oleh penyelia sistem
                  sahaja.
                </p>
              </div>
              <nav
                className={r.adminFooter}
                aria-label="Pautan portal pentadbir"
              >
                <Link href="/">
                  <ArrowLeftIcon aria-hidden="true" />
                  Laman utama
                </Link>
                <span aria-hidden="true" />
                <Link href="/login">
                  Portal guru
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </nav>
            </>
          ) : (
            <>
              <div className={cn(s.divider, r.divider)}>
                <span />
                atau
                <span />
              </div>
              <Button
                type="button"
                variant="outline"
                className={cn(s.delimaButton, r.delimaButton)}
                onClick={signInDelima}
                disabled={socialPending}
              >
                {socialPending ? (
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                ) : student ? (
                  <GraduationCapIcon aria-hidden="true" />
                ) : (
                  <BookOpenIcon aria-hidden="true" />
                )}
                {socialPending
                  ? "Menyambung…"
                  : student
                    ? "Masuk dengan ID DELIMa"
                    : "Log masuk dengan DELIMa"}
              </Button>
              {socialError && (
                <p role="alert" className={s.error}>
                  Log masuk DELIMa belum berjaya. Sila cuba lagi atau gunakan{" "}
                  {student ? "ID pelajar atau emel" : "emel/ID guru"} anda.
                </p>
              )}
              <p className={cn(s.register, r.register)}>
                {student ? "Baru di sini?" : "Belum ada akaun?"}{" "}
                <Link href={student ? `/register/${theme}` : "/"}>
                  {student ? "Daftar sebagai pelajar" : "Daftar di laman utama"}
                </Link>
              </p>
              {student && (
                <p className={r.portalLink}>
                  Guru atau pentadbir?{" "}
                  <Link href="/login">Masuk di portal anda</Link>
                </p>
              )}
              <Link href="/" className={cn(s.homeLink, r.homeLink)}>
                <ArrowLeftIcon aria-hidden="true" />
                Kembali ke laman utama
              </Link>
            </>
          )}
        </section>
      </div>

      <Dialog open={delimaOpen} onOpenChange={setDelimaOpen}>
        <DialogContent className={s.delimaDialog}>
          <DialogTitle>Log masuk DELIMa</DialogTitle>
          <DialogDescription>
            Log masuk DELIMa belum diaktifkan untuk Pixelspace AI Classroom.
            Buat masa ini, sila log masuk menggunakan{" "}
            {student ? "ID pelajar atau emel" : "emel atau ID guru"} dan kata
            laluan anda.
          </DialogDescription>
          <Button
            type="button"
            className={s.dialogButton}
            onClick={() => setDelimaOpen(false)}
          >
            {student
              ? "Gunakan ID pelajar atau emel"
              : "Gunakan emel atau ID guru"}
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
