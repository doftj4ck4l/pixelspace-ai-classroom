import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  ChevronRightIcon,
  FlameIcon,
  ListChecksIcon,
  PresentationIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Wand2Icon,
} from "lucide-react";
import { cn } from "cn";
import { getSessionUser } from "@/lib/auth-session";
import { getRoleHome, roleOf } from "@/lib/roles";
import { AppPreview } from "@/components/landing/app-preview";

export const metadata: Metadata = {
  title: "Pixelspace AI Classroom — Ruang pembelajaran AI untuk murid Malaysia",
  description:
    "Tukar nota dan buku teks kepada buku kerja pintar — nota, kuiz, kad imbas dan slaid dijana AI. Direka untuk sekolah rendah dan menengah Malaysia.",
};

const FEATURES = [
  {
    icon: SparklesIcon,
    emoji: "📚",
    title: "Buku kerja pintar",
    text: "Kad imbas, kuiz, peta minda dan nota — semuanya dijana daripada bahan anda sendiri.",
  },
  {
    icon: Wand2Icon,
    emoji: "✨",
    title: "Studio AI",
    text: "Jana bahan ulang kaji dalam beberapa saat: kuiz, kad imbas, peta minda dan panduan belajar.",
  },
  {
    icon: PresentationIcon,
    emoji: "🎨",
    title: "Slaid dengan ilustrasi",
    text: "Dek slaid kelas yang kemas dan tersusun, lengkap dengan ilustrasi dijana AI.",
  },
  {
    icon: FlameIcon,
    emoji: "🔥",
    title: "Rentetan & kemajuan",
    text: "Bina tabiat belajar harian dan pantau penguasaan setiap subjek dengan jelas.",
  },
  {
    icon: ShieldCheckIcon,
    emoji: "🛡️",
    title: "Selamat untuk sekolah",
    text: "Akaun disahkan sekolah, nama paparan selamat dan guru sentiasa mengawal.",
  },
];

const STEPS = [
  {
    icon: BookOpenCheckIcon,
    title: "Cipta ruang pembelajaran",
    text: "Pilih sumber pembelajaran — nota, PDF atau pautan — dan susun mengikut subjek.",
  },
  {
    icon: Wand2Icon,
    title: "Jana dengan AI",
    text: "Satu ketikan untuk nota, kuiz, kad imbas dan slaid — semuanya berdasarkan sumber anda.",
  },
  {
    icon: ListChecksIcon,
    title: "Ulang kaji & kongsi",
    text: "Belajar dengan kuiz interaktif, kumpul rentetan dan kongsi bahan dengan rakan.",
  },
];

const FAQ = [
  {
    q: "Adakah Pixelspace percuma untuk pelajar?",
    a: "Ya — pelajar di sekolah yang menyertai program perintis boleh menggunakan Pixelspace secara percuma. Daftar dengan emel anda dan pilih sekolah daripada senarai.",
  },
  {
    q: "Bagaimana data murid dilindungi?",
    a: "Akaun murid disahkan melalui sekolah. Bahan pembelajaran peribadi, sembang AI dan nota tidak pernah dikongsi tanpa kebenaran.",
  },
  {
    q: "Sekolah saya tiada dalam senarai. Boleh sertai?",
    a: "Boleh. Semasa mendaftar, taip nama sekolah anda dan pilih \u201cSekolah saya tiada dalam senarai\u201d — pasukan kami akan menghubungi pihak sekolah anda.",
  },
  {
    q: "Adakah AI boleh membuat kesilapan?",
    a: "Boleh — itu sebabnya setiap jawapan AI di Pixelspace disertakan rujukan sumber. Murid dan guru boleh menyemak setiap fakta dengan pantas.",
  },
];

const ROLE_CARDS = [
  {
    href: "/login/student",
    emoji: "🎒",
    label: "Masuk sebagai Pelajar",
    text: "Jom sambung belajar! Kuiz, kad imbas dan slaid menanti anda.",
    card: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-teal-50 hover:border-violet-300 dark:border-violet-800 dark:from-violet-950/60 dark:via-slate-900 dark:to-teal-950/40",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
    button:
      "bg-gradient-to-r from-violet-500 to-teal-500 text-white shadow-lg shadow-violet-300/50 dark:shadow-none",
    title: "text-violet-950 dark:text-violet-50",
    textClass: "text-violet-700 dark:text-violet-200",
  },
  {
    href: "/login/teacher",
    emoji: "🧑‍🏫",
    label: "Masuk sebagai Guru",
    text: "Urus kelas, bahan pembelajaran dan pantau kemajuan murid anda.",
    card: "border-[#bfe9e2] bg-white hover:border-[#8fd9c8] dark:border-[#1d5b55] dark:bg-slate-900",
    badge: "bg-[#E7F6F4] text-[#00786a] dark:bg-[#12312e] dark:text-[#8fd9c8]",
    button: "bg-[#1b8a7f] text-white",
    title: "text-slate-900 dark:text-slate-50",
    textClass: "text-slate-500 dark:text-slate-400",
  },
  {
    href: "/login/admin",
    emoji: "🛡️",
    label: "Masuk sebagai Pentadbir",
    text: "Portal rasmi pentadbir sekolah, pegawai KPM dan penyelia sistem.",
    card: "border-slate-800 bg-slate-900 hover:border-slate-600",
    badge: "bg-slate-800 text-slate-300",
    button: "bg-white text-slate-900",
    title: "text-white",
    textClass: "text-slate-400",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect(getRoleHome(roleOf(user)));

  return (
    <div className="min-h-dvh bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Pixelspace AI Classroom"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#177e89] to-[#8fd9c8] text-white">
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">Pixelspace</span>
              <span className="text-muted-foreground block text-[10px] font-semibold tracking-[0.2em] uppercase">
                AI Classroom
              </span>
            </span>
          </Link>
          <nav
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex dark:text-slate-300"
            aria-label="Navigasi laman"
          >
            <a
              href="#ciri"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Ciri-ciri
            </a>
            <a
              href="#cara"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Cara ia berfungsi
            </a>
            <a
              href="#sekolah"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Untuk sekolah
            </a>
            <a
              href="#soalan"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Soalan lazim
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#masuk"
              className="hidden h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Log masuk
            </a>
            <a
              href="#daftar"
              className="inline-flex h-9 items-center rounded-lg bg-[#1b8a7f] px-4 text-sm font-semibold text-white hover:bg-[#23a093]"
            >
              Daftar
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 via-cyan-50/40 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 size-[420px] rounded-full bg-teal-200/50 blur-3xl dark:bg-teal-900/30"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-24 size-[380px] rounded-full bg-violet-200/50 blur-3xl dark:bg-violet-900/20"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/70 px-3 py-1 text-[11px] font-bold tracking-[0.15em] text-[#177e89] uppercase dark:border-teal-800 dark:bg-slate-900/70 dark:text-[#8fd9c8]">
                <SparklesIcon className="size-3.5" aria-hidden="true" />
                Ruang pembelajaran AI · Malaysia
              </span>
              <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Belajar lebih pintar,
                <br />
                <span className="bg-gradient-to-r from-[#177e89] via-teal-500 to-violet-500 bg-clip-text text-transparent">
                  bersama AI.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                Tukar nota dan buku teks kepada buku kerja pintar — nota, kuiz,
                kad imbas dan slaid dijana AI. Direka untuk sekolah rendah dan
                menengah Malaysia. 🇲🇾
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#daftar"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#177e89] to-teal-500 px-6 text-sm font-bold text-white shadow-lg shadow-teal-300/50 hover:from-[#12666f] hover:to-teal-600 dark:shadow-none"
                >
                  Daftar percuma
                  <ArrowRightIcon className="size-4" aria-hidden="true" />
                </a>
                <a
                  href="#masuk"
                  className="inline-flex h-12 items-center rounded-xl border border-slate-300 bg-white/70 px-6 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Saya sudah ada akaun
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <li>🎓 Rendah &amp; Menengah</li>
                <li>🏫 Diselia sekolah</li>
                <li>💬 Bahasa Melayu</li>
              </ul>
            </div>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-8 right-4 text-4xl"
              >
                ✨
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-24 -bottom-6 text-3xl"
              >
                🚀
              </span>
              <AppPreview />
            </div>
          </div>
        </section>

        <section
          id="ciri"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20"
        >
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold tracking-[0.2em] text-[#177e89] uppercase dark:text-[#8fd9c8]">
              Ciri-ciri
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Semua yang murid perlukan dalam satu ruang.
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Daripada memahami bab baharu hingga ulang kaji sebelum ujian —
              Pixelspace membantu setiap langkah.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-100 text-[#177e89] dark:from-teal-950 dark:to-slate-900 dark:text-[#8fd9c8]">
                  <feature.icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold">
                  {feature.title}{" "}
                  <span aria-hidden="true">{feature.emoji}</span>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {feature.text}
                </p>
              </article>
            ))}
            <article className="flex flex-col justify-center rounded-3xl bg-gradient-to-br from-[#177e89] to-teal-600 p-6 text-white shadow-lg">
              <p className="text-3xl" aria-hidden="true">
                🎯
              </p>
              <h3 className="mt-3 text-lg font-bold">Mula hari ini</h3>
              <p className="mt-2 text-sm leading-relaxed text-teal-50">
                Daftar dalam masa dua minit dan jana bahan ulang kaji pertama
                anda.
              </p>
              <a
                href="#daftar"
                className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25"
              >
                Daftar sekarang
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </a>
            </article>
          </div>
        </section>

        <section
          id="cara"
          className="scroll-mt-20 border-y border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold tracking-[0.2em] text-[#177e89] uppercase dark:text-[#8fd9c8]">
                Cara ia berfungsi
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Tiga langkah mudah.
              </h2>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                Tiada pemasangan, tiada kekeliruan — buka pelayar dan mula
                belajar.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <article
                  key={step.title}
                  className="relative rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="absolute -top-4 left-6 grid size-9 place-items-center rounded-xl bg-[#1b8a7f] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="mt-2 inline-grid size-11 place-items-center rounded-2xl bg-teal-50 text-[#177e89] dark:bg-teal-950 dark:text-[#8fd9c8]">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="sekolah"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20"
        >
          <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0d4f56] via-[#177e89] to-teal-600 p-8 text-white sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="text-xs font-bold tracking-[0.2em] text-teal-100 uppercase">
                  Untuk sekolah &amp; guru
                </span>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Bawa Pixelspace ke sekolah anda.
                </h2>
                <p className="mt-4 max-w-xl leading-relaxed text-teal-50">
                  Urus subjek, kongsi bahan pembelajaran dan pantau kemajuan
                  murid — dengan kawalan penuh, laporan jelas dan sokongan
                  program perintis bersama pasukan kami.
                </p>
                <ul className="mt-6 space-y-2 text-sm font-medium text-teal-50">
                  <li>✅ Subjek dan keahlian murid yang teratur</li>
                  <li>✅ Kongsi bahan pembelajaran dengan sekali klik</li>
                  <li>✅ Pantau kemajuan dan penguasaan subjek</li>
                </ul>
                <Link
                  href="/register/teacher"
                  className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#0d4f56] hover:bg-teal-50"
                >
                  Daftar sebagai guru
                  <ArrowRightIcon className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div
                className="text-center text-6xl sm:text-7xl"
                aria-hidden="true"
              >
                🏫<p className="mt-4 text-5xl sm:text-6xl">🧑‍🏫 👩‍🎓</p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="masuk"
          className="scroll-mt-20 border-y border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold tracking-[0.2em] text-[#177e89] uppercase dark:text-[#8fd9c8]">
                Log masuk
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Pilih portal anda.
              </h2>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                Tiga pengalaman berbeza untuk tiga peranan.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {ROLE_CARDS.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className={cn(
                    "group flex flex-col rounded-3xl border-2 p-6 transition-all hover:-translate-y-1 hover:shadow-xl",
                    card.card,
                  )}
                >
                  <span className="text-4xl" aria-hidden="true">
                    {card.emoji}
                  </span>
                  <span
                    className={cn(
                      "mt-4 w-fit rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] uppercase",
                      card.badge,
                    )}
                  >
                    {card.href.split("/").pop()}
                  </span>
                  <h3 className={cn("mt-3 text-xl font-extrabold", card.title)}>
                    {card.label}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 flex-1 text-sm leading-relaxed",
                      card.textClass,
                    )}
                  >
                    {card.text}
                  </p>
                  <span
                    className={cn(
                      "mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-transform group-hover:gap-3",
                      card.button,
                    )}
                  >
                    Masuk sekarang
                    <ArrowRightIcon className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Akaun pentadbir (KPM &amp; penyelia) dicipta oleh pentadbir sistem
              sahaja.
            </p>
          </div>
        </section>

        <section
          id="daftar"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20"
        >
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold tracking-[0.2em] text-[#177e89] uppercase dark:text-[#8fd9c8]">
              Daftar
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Belum ada akaun? Daftar dalam dua minit. ⏱️
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Pilih peranan anda — pengalaman pembelajaran menyesuaikan sekolah
              dan tahun anda.
            </p>
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register/student"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-teal-500 px-8 text-sm font-bold text-white shadow-lg shadow-violet-300/50 hover:from-violet-600 hover:to-teal-600 sm:w-auto dark:shadow-none"
            >
              🎒 Daftar sebagai Pelajar
            </Link>
            <Link
              href="/register/teacher"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1b8a7f] px-8 text-sm font-bold text-white hover:bg-[#23a093] sm:w-auto"
            >
              🧑‍🏫 Daftar sebagai Guru
            </Link>
          </div>
        </section>

        <section
          id="soalan"
          className="scroll-mt-20 border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="text-center">
              <span className="text-xs font-bold tracking-[0.2em] text-[#177e89] uppercase dark:text-[#8fd9c8]">
                Soalan lazim
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ada soalan? Kami jawab.
              </h2>
            </div>
            <div className="mt-10 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 open:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-bold">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="text-slate-400 transition-transform group-open:rotate-90"
                    >
                      <ChevronRightIcon className="size-4" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="rounded-[2.5rem] border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-violet-50 p-10 text-center dark:border-teal-900 dark:from-slate-900 dark:via-slate-950 dark:to-violet-950/40">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Sedia untuk memulakan perjalanan pembelajaran? 🚀
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-300">
              Daftar dalam masa dua minit — terus mula belajar dengan buku kerja
              pertama anda.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#daftar"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#177e89] to-teal-500 px-6 text-sm font-bold text-white shadow-lg shadow-teal-300/50 hover:from-[#12666f] hover:to-teal-600 dark:shadow-none"
              >
                Daftar sekarang
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </a>
              <a
                href="#masuk"
                className="inline-flex h-12 items-center rounded-xl border border-slate-300 bg-white/70 px-6 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Log masuk
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#177e89] to-[#8fd9c8] text-white">
              <ChevronRightIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">
                Pixelspace AI Classroom
              </span>
              <span className="text-muted-foreground block text-xs">
                Ruang pembelajaran AI untuk murid Malaysia.
              </span>
            </span>
          </div>
          <nav
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300"
            aria-label="Pautan footer"
          >
            <a
              href="#ciri"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Ciri-ciri
            </a>
            <a
              href="#masuk"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Log masuk
            </a>
            <a
              href="#daftar"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Daftar
            </a>
            <Link
              href="/help"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Bantuan
            </Link>
          </nav>
        </div>
        <p className="text-muted-foreground border-t border-slate-100 px-4 py-4 text-center text-xs dark:border-slate-900">
          © 2026 Pixelspace · Dibina untuk sekolah rendah dan menengah Malaysia
        </p>
      </footer>
    </div>
  );
}
