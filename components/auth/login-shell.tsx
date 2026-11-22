"use client";

import { useId, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BarChart3Icon,
  BookOpenIcon,
  GraduationCapIcon,
  InfoIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { LoginTheme } from "./login-form";
import s from "./teacher-login.module.css";
import r from "./login-roles.module.css";
import { useT } from "@/lib/i18n";

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
    src: "/auth/school-community.png",
    alt: "Murid, guru, pegawai KPM dan pentadbir bekerjasama menggunakan Pixelspace AI Classroom",
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
}: {
  children: ReactNode;
  theme: LoginTheme;
}) {
  const student = theme === "student";
  const admin = theme === "admin";
  const t = useT();
  const title = student
    ? t("auth.studentTitle")
    : admin
      ? t("auth.adminTitle")
      : t("auth.title");
  const subtitle = student
    ? t("auth.studentSubtitle")
    : admin
      ? t("auth.adminSubtitle")
      : t("auth.subtitle");
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
                {t("auth.headline1")}
                <br />
                {t("auth.headline2")}
                <br />
                <span>{t("auth.headline3")}</span>
              </h1>
              <p className={cn(s.introText, r.introText)}>{t("auth.intro")}</p>
              <ul className={s.benefits}>
                <li>
                  <span>
                    <SparklesIcon aria-hidden="true" />
                  </span>
                  {t("auth.benefit1")}
                </li>
                <li>
                  <span>
                    <BookOpenIcon aria-hidden="true" />
                  </span>
                  {t("auth.benefit2")}
                </li>
                <li>
                  <span>
                    <BarChart3Icon aria-hidden="true" />
                  </span>
                  {t("auth.benefit3")}
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
              <p className={cn(s.register, r.register)}>
                {student ? t("auth.newHere") : t("auth.noAccount")}{" "}
                <Link href={student ? `/register/${theme}` : "/"}>
                  {student ? t("auth.registerStudent") : t("auth.registerMain")}
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
                {t("auth.homeLink")}
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
