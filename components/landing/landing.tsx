"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenIcon,
  ChevronDownIcon,
  FileTextIcon,
  GraduationCapIcon,
  LayersIcon,
  MenuIcon,
  NetworkIcon,
  SchoolIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
  ZapIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppPreview } from "./app-preview";
import s from "./landing.module.css";

const NAV = [
  ["Utama", "#utama"],
  ["Ciri", "#ciri"],
  ["Modul Pembelajaran", "#modul"],
  ["Komuniti", "#komuniti"],
  ["Sumber", "#sumber"],
] as const;

const FEATURES = [
  {
    icon: ZapIcon,
    title: "Flashcards Pintar",
    text: "Cipta, ulang kaji dan kuasai konsep lebih pantas dengan AI.",
  },
  {
    icon: BookOpenIcon,
    title: "Nota AI",
    text: "Jana nota ringkas, teratur dan mudah difahami.",
  },
  {
    icon: LayersIcon,
    title: "Kuiz & Penilaian",
    text: "Bina kuiz automatik, kuiz topik atau ujian formatif.",
  },
  {
    icon: NetworkIcon,
    title: "Peta Minda",
    text: "Visualkan idea dan hubung kait antara konsep.",
  },
  {
    icon: SparklesIcon,
    title: "Bahan Pembelajaran",
    text: "Hasilkan slaid, latihan, dan rangka kerja pembelajaran.",
  },
  {
    icon: UsersIcon,
    title: "Komuniti Pembelajaran",
    text: "Terokai, kongsi dan belajar bersama rakan sekelas.",
  },
];

const FAQ = [
  {
    q: "Apakah itu Pixelspace AI Classroom?",
    a: "Pixelspace AI Classroom ialah platform pembelajaran berasaskan AI untuk murid, guru dan sekolah. Cipta nota, kad imbas, kuiz, peta minda dan bahan pembelajaran dalam satu ruang.",
  },
  {
    q: "Adakah ia selaras dengan kurikulum KPM?",
    a: "Anda boleh membina bahan mengikut subjek, tahun atau tingkatan serta sumber kurikulum yang digunakan di sekolah. Semak bahan yang dijana AI dengan buku teks dan panduan guru untuk memastikan ketepatannya.",
  },
  {
    q: "Bolehkah guru mencipta bahan pembelajaran sendiri?",
    a: "Ya. Guru boleh menggunakan nota dan sumber sendiri untuk menjana, menyunting dan menyusun bahan pembelajaran seperti kad imbas, kuiz, nota serta slaid.",
  },
  {
    q: "Adakah data sekolah dan murid selamat?",
    a: "Akses menggunakan akaun berdaftar dengan peranan murid, guru dan pentadbir yang berasingan. Jangan masukkan maklumat sensitif dalam arahan atau bahan yang dihantar kepada AI. Hubungi pasukan kami jika sekolah anda memerlukan maklumat lanjut mengenai pengendalian data.",
  },
];

type Panel = "register" | "contact" | "privacy" | "terms" | null;

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/"
      className={s.brand}
      aria-label="Pixelspace AI Classroom — Utama"
    >
      <LayersIcon className={s.brandIcon} aria-hidden="true" />
      <span>
        {footer ? (
          <>
            <strong>Pixelspace AI Classroom</strong>
            <small>
              Platform pembelajaran berasaskan AI untuk pendidikan Malaysia.
            </small>
          </>
        ) : (
          <>
            <strong>Pixelspace AI</strong>
            <span>Classroom</span>
          </>
        )}
      </span>
    </Link>
  );
}

function SchoolContact() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    try {
      const response = await fetch("/api/school-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: form.get("schoolName"),
          requestedBy: form.get("email"),
          note: form.get("note"),
        }),
      });
      if (!response.ok) throw new Error("request failed");
      setState("sent");
    } catch {
      setState("error");
    }
  };
  if (state === "sent")
    return (
      <p role="status" className={s.contactSuccess}>
        Terima kasih! Permintaan sekolah anda telah dihantar kepada pasukan
        kami.
      </p>
    );
  return (
    <form className={s.contactForm} onSubmit={submit}>
      <label htmlFor="landing-school">Nama sekolah</label>
      <Input
        id="landing-school"
        name="schoolName"
        required
        minLength={3}
        maxLength={120}
        placeholder="Nama sekolah anda"
      />
      <label htmlFor="landing-email">Emel untuk dihubungi</label>
      <Input
        id="landing-email"
        name="email"
        type="email"
        required
        maxLength={254}
        placeholder="nama@sekolah.edu.my"
      />
      <label htmlFor="landing-note">Bagaimana kami boleh membantu?</label>
      <Textarea
        id="landing-note"
        name="note"
        maxLength={500}
        rows={3}
        placeholder="Ceritakan keperluan sekolah anda…"
      />
      {state === "error" && (
        <p role="alert">Permintaan belum berjaya dihantar. Sila cuba lagi.</p>
      )}
      <Button
        type="submit"
        disabled={state === "sending"}
        className={s.primary}
      >
        {state === "sending" ? "Menghantar…" : "Hantar permintaan"}
        <ArrowRightIcon />
      </Button>
    </form>
  );
}

export function Landing() {
  const [panel, setPanel] = useState<Panel>(null);
  const register = () => setPanel("register");
  const contact = () => setPanel("contact");
  return (
    <div className={s.landing} lang="ms" id="utama">
      <a href="#kandungan" className={s.skip}>
        Langkau ke kandungan
      </a>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Brand />
          <nav className={s.desktopNav} aria-label="Navigasi utama">
            {NAV.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className={s.headerActions}>
            <Button
              variant="outline"
              className={s.loginButton}
              render={<Link href="/login" />}
            >
              Log Masuk
            </Button>
            <Button className={s.headerRegister} onClick={register}>
              Daftar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className={s.mobileMenu}
                  />
                }
                aria-label="Buka menu navigasi"
              >
                <MenuIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent className={s.floatingMenu} align="end">
                {NAV.map(([label, href]) => (
                  <DropdownMenuItem key={href} render={<a href={href} />}>
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem render={<Link href="/login" />}>
                  Log Masuk
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main id="kandungan">
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.heroRibbon} aria-hidden="true" />
          <div className={s.heroInner}>
            <div className={s.heroCopy}>
              <span className={s.eyebrow}>Pixelspace AI Classroom</span>
              <h1 id="hero-title">
                Belajar lebih pintar,
                <br />
                <span>bersama AI.</span>
              </h1>
              <p>
                Platform pembelajaran berasaskan AI untuk murid, guru dan
                sekolah. Hasilkan bahan pembelajaran, ulang kaji, latihan dan
                penilaian dalam satu ruang yang mudah.
              </p>
              <div className={s.heroActions}>
                <Button className={s.primary} onClick={register}>
                  Mulakan Sekarang
                  <ArrowRightIcon />
                </Button>
                <Button
                  variant="outline"
                  render={<a href="#demo" />}
                  className={s.outline}
                >
                  Lihat Demo
                </Button>
              </div>
              <div className={s.audiences}>
                <a href="#murid">
                  <ShieldCheckIcon />
                  Untuk Murid
                </a>
                <a href="#guru">
                  <GraduationCapIcon />
                  Untuk Guru
                </a>
                <a href="#sekolah">
                  <SchoolIcon />
                  Untuk Sekolah
                </a>
              </div>
            </div>
            <AppPreview />
          </div>
        </section>

        <section
          id="ciri"
          className={s.features}
          aria-labelledby="features-title"
        >
          <div className={s.sectionHeading}>
            <h2 id="features-title">
              Semua yang anda perlukan dalam satu ruang.
            </h2>
            <p>
              Alat pembelajaran berkuasa AI untuk ulang kaji, faham konsep,
              latihan dan banyak lagi.
            </p>
          </div>
          <div className={s.featureGrid} id="modul">
            {FEATURES.map((feature, index) => (
              <article
                id={index === 5 ? "komuniti" : undefined}
                key={feature.title}
                className={cn(s.featureCard, index === 5 && s.communityCard)}
              >
                <feature.icon className={s.featureIcon} aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.aiBanner} aria-labelledby="ai-title">
          <div className={s.bannerCopy}>
            <span>BERKUASA DENGAN AI</span>
            <h2 id="ai-title">Bina bahan pembelajaran dalam beberapa saat.</h2>
            <p>
              Tukar topik kepada set flashcards, kuiz, nota dan peta minda
              secara automatik dengan bantuan AI.
            </p>
            <Button onClick={register} className={s.whiteButton}>
              Cuba Sekarang
              <ArrowRightIcon />
            </Button>
          </div>
          <div className={s.floatingTiles} aria-hidden="true">
            <div className={cn(s.materialTile, s.notesTile)}>
              <FileTextIcon />
              <span>Nota</span>
            </div>
            <div className={cn(s.materialTile, s.quizTile)}>
              <TrophyIcon />
              <span>Kuiz</span>
            </div>
            <div className={cn(s.materialTile, s.mapTile)}>
              <NetworkIcon />
              <span>Peta Minda</span>
            </div>
            <div className={cn(s.materialTile, s.flashcardsTile)}>
              <LayersIcon />
              <span>Flashcards</span>
            </div>
          </div>
        </section>

        <section className={s.roles} aria-labelledby="roles-title">
          <div className={s.sectionHeading}>
            <h2 id="roles-title">Pilihan untuk semua.</h2>
            <p>
              Pengalaman pembelajaran yang disesuaikan mengikut peranan anda.
            </p>
          </div>
          <div className={s.roleGrid}>
            <article className={cn(s.roleCard, s.studentRole)} id="murid">
              <span className={s.roleEmoji} aria-hidden="true">
                🎓
              </span>
              <div>
                <h3>Murid</h3>
                <p>Ulang kaji, buat latihan dan belajar mengikut gaya anda.</p>
              </div>
              <Button
                render={<Link href="/register/student" />}
                className={s.studentButton}
              >
                Mulakan sebagai Murid
                <ArrowRightIcon />
              </Button>
            </article>
            <article className={cn(s.roleCard, s.teacherRole)} id="guru">
              <span className={s.roleEmoji} aria-hidden="true">
                👨‍🏫
              </span>
              <div>
                <h3>Guru</h3>
                <p>
                  Sediakan bahan PdP, kuiz dan penilaian dengan lebih cepat.
                </p>
              </div>
              <Button
                render={<Link href="/register/teacher" />}
                className={s.teacherButton}
              >
                Mulakan sebagai Guru
                <ArrowRightIcon />
              </Button>
            </article>
            <article className={cn(s.roleCard, s.schoolRole)} id="sekolah">
              <span className={s.roleEmoji} aria-hidden="true">
                🏫
              </span>
              <div>
                <h3>Sekolah</h3>
                <p>
                  Urus pembelajaran, pantau penglibatan dan perkembangan murid.
                </p>
              </div>
              <Button
                variant="outline"
                className={s.schoolButton}
                onClick={contact}
              >
                Hubungi Pasukan Kami
                <ArrowRightIcon />
              </Button>
            </article>
          </div>
        </section>

        <section className={s.faq} id="sumber" aria-labelledby="faq-title">
          <div className={s.sectionHeading}>
            <h2 id="faq-title">Soalan lazim.</h2>
            <p>Dapatkan jawapan kepada soalan yang kerap ditanya.</p>
          </div>
          <div className={s.faqList}>
            {FAQ.map(({ q, a }) => (
              <details key={q} className={s.faqItem} name="landing-faq">
                <summary>
                  {q}
                  <ChevronDownIcon aria-hidden="true" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={s.finalCta} aria-labelledby="cta-title">
          <h2 id="cta-title">
            <span aria-hidden="true">✨</span> Sedia untuk pengalaman
            pembelajaran yang lebih pintar?
          </h2>
          <p>Sertai Pixelspace AI Classroom hari ini.</p>
          <div>
            <Button className={s.primary} onClick={register}>
              Daftar Percuma
              <ArrowRightIcon />
            </Button>
            <Button variant="outline" className={s.outline} onClick={contact}>
              Hubungi Kami
            </Button>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <Brand footer />
          <nav aria-label="Pautan footer">
            <a href="#ciri">Tentang</a>
            <button type="button" onClick={contact}>
              Sokongan
            </button>
            <button type="button" onClick={() => setPanel("privacy")}>
              Privasi
            </button>
            <button type="button" onClick={() => setPanel("terms")}>
              Terma
            </button>
          </nav>
        </div>
      </footer>

      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent className={s.dialog}>
          <DialogTitle className={s.dialogTitle}>
            {panel === "register"
              ? "Mulakan bersama Pixelspace."
              : panel === "contact"
                ? "Hubungi pasukan kami."
                : panel === "privacy"
                  ? "Maklumat privasi"
                  : "Panduan penggunaan"}
          </DialogTitle>
          <DialogDescription className={s.dialogDescription}>
            {panel === "register"
              ? "Pilih peranan anda untuk meneruskan."
              : panel === "contact"
                ? "Beritahu kami bagaimana Pixelspace boleh membantu sekolah anda."
                : panel === "privacy"
                  ? "Ada soalan tentang data anda atau keperluan sekolah? Dapatkan penjelasan daripada pasukan kami."
                  : "Gunakan Pixelspace untuk menyokong pembelajaran dan pengajaran anda."}
          </DialogDescription>
          {panel === "register" && (
            <div className={s.rolePicker}>
              {[
                { role: "student", label: "Murid", icon: GraduationCapIcon },
                { role: "teacher", label: "Guru", icon: BookOpenIcon },
              ].map(({ role, label, icon: Icon }) => (
                <Button
                  key={role}
                  variant="outline"
                  className={s.roleChoice}
                  render={<Link href={`/${panel}/${role}`} />}
                >
                  <Icon />
                  <span>{label}</span>
                  <ArrowRightIcon />
                </Button>
              ))}
              <Link href="/login" className={s.switchPanel}>
                Sudah ada akaun? Log masuk
              </Link>
            </div>
          )}
          {panel === "contact" && <SchoolContact />}
          {(panel === "privacy" || panel === "terms") && (
            <div className={s.infoContent}>
              <p>
                {panel === "privacy"
                  ? "Platform ini menggunakan maklumat akaun, sekolah dan bahan pembelajaran untuk menyediakan pengalaman mengikut peranan anda. Elakkan berkongsi maklumat peribadi atau data sensitif dalam bahan yang dihantar kepada AI."
                  : "Semak ketepatan bahan yang dijana AI dengan sumber asal dan panduan guru. Muat naik hanya bahan yang anda mempunyai hak atau kebenaran untuk gunakan, dan hormati privasi serta hasil kerja orang lain."}
              </p>
              <Button className={s.primary} onClick={contact}>
                Hubungi kami
                <ArrowRightIcon />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
