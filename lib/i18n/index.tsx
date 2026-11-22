"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from "react";

/**
 * App-wide language: formal Bahasa Melayu (Malaysian — "baharu", "boleh",
 * "tetapan") or English. The choice persists in localStorage and applies
 * instantly across every surface inside the app shell.
 */

export type Language = "en" | "ms";

export const LANGUAGE_STORAGE_KEY = "pixelspace.language";

const en = {
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.add": "Add",
  "common.loading": "Loading…",
  "common.remove": "Remove",
  "common.open": "Open",
  "common.search": "Search",

  "shell.newChat": "New chat",
  "shell.home": "Home",
  "shell.hub": "Hub",
  "shell.scheduled": "Scheduled",
  "shell.admin": "Admin",
  "shell.searchChats": "Search chats",
  "shell.search": "Search",
  "shell.hideSidebar": "Hide sidebar",
  "shell.lightMode": "Light mode",
  "shell.darkMode": "Dark mode",
  "shell.rumah": "Home",
  "shell.kpm": "KPM Dashboard",
  "shell.textbooks": "Textbooks",
  "shell.spaces": "Spaces",
  "shell.buddy": "Buddy",
  "shell.duties": "Duties",
  "shell.sources": "Sources",
  "shell.recents": "Recents",
  "shell.openHistory": "Open chat history",

  "profile.accountMenu": "Account menu",
  "profile.account": "Account",
  "profile.profile": "Profile",
  "profile.settings": "Settings",
  "profile.help": "Help & support",
  "profile.language": "Language",
  "profile.signOut": "Sign out",
  "language.en": "English",
  "language.ms": "Bahasa Melayu",

  "threads.search": "Search threads",
  "threads.newChat": "New chat",
  "threads.running": "Running",
  "threads.moreOptions": "More options",
  "threads.rename": "Rename",
  "threads.renameAria": "Rename thread",
  "threads.titlePlaceholder": "Thread title",
  "threads.archive": "Archive",
  "threads.delete": "Delete",

  "chat.greeting": "How can I help you today?",
  "chat.ask": "Ask Pixelspace AI Classroom",
  "chat.placeholder.flashcards": "What flashcards do you want to create?",
  "chat.placeholder.quizzes": "What quiz do you want to generate?",
  "chat.placeholder.mindmaps": "What mind map do you want to generate?",
  "chat.placeholder.slides": "What slide deck do you want to generate?",
  "chat.placeholder.reports": "Ready to write a report?",
  "chat.placeholder.infographics": "What infographic do you want to generate?",
  "chat.placeholder.notes": "What notes do you want to create?",
  "chat.send": "Send message",
  "chat.stop": "Stop generating",
  "chat.queueWaiting": "Waiting",
  "chat.queueRemove": "Remove from queue",
  "chat.disclaimer":
    "Pixelspace AI Classroom can make mistakes, so double-check it.",
  "chat.voiceMode": "Voice mode",

  "books.title": "Textbooks",
  "books.subtitle":
    "The KPM textbook collection — primary and secondary school. Click any book to open it.",
  "books.all": "All",
  "books.level.tahun": "Standard {n}",
  "books.level.tingkatan": "Form {n}",
  "books.allSubjects": "All subjects",
  "books.search": "Search textbooks…",
  "books.count": "{n} books",
  "books.loading": "Loading textbooks…",
  "books.empty": "No books match this filter.",
  "books.pages": "{n} pages",

  "spaceSources.title": "Sources",
  "spaceSources.generate": "Generate materials ↗",
  "spaceSources.group": "Textbook: {subject} · {count} chapters",
  "spaceSources.empty": "No sources yet.",
  "spaceSources.addTextbook": "Textbook",
  "spaceSources.addOwn": "My materials",
  "spaceSources.noSubjects": "No other subjects for this level.",
  "spaceSources.noUploads": "No materials uploaded yet (see the Sources menu).",
  "spaceSources.add": "Add",
  "spaceSources.chapters": "{count} chapters",
  "spaceSources.removeAria": "Remove {name}",

  "spaces.title": "Spaces",
  "spaces.subtitle.teacher":
    "Add the subjects you teach and share the code with your students.",
  "spaces.subtitle.student":
    "Subjects you joined with a code from your teacher.",
  "spaces.add": "Add subject",
  "spaces.edit": "Edit subject",
  "spaces.empty": "No subjects yet",
  "spaces.name": "Subject name",
  "spaces.namePlaceholder": "e.g. Additional Mathematics",
  "spaces.level": "Level",
  "spaces.description": "Description",
  "spaces.optional": "(optional)",
  "spaces.descriptionPlaceholder": "e.g. Chapters 1–5, KSSM",
  "spaces.color": "Colour",
  "spaces.menuAria": "Subject options",
  "spaces.searchPlaceholder": "Search subjects…",
  "spaces.copyCode": "Copy code",
  "spaces.copied": "Copied!",
  "spaces.code": "Subject code",
  "spaces.deleteTitle": "Delete subject?",
  "spaces.deleteBody":
    "This subject and its join code will be removed for everyone. This cannot be undone.",
  "spaces.joinTitle": "Join subject",
  "spaces.joinHint": "Enter the subject code from your teacher to join.",
  "spaces.join": "Join",
  "spaces.students": "{n} students",
  "spaces.free": "Any level",
  "spaces.general": "General",
  "spaces.created": "Subject created.",
  "spaces.createError": "Could not save the subject.",
  "spaces.joinError": "Could not join the subject.",

  "sources.title": "Sources",
  "sources.subtitle":
    "Upload teaching materials — the AI uses them when generating content.",
  "sources.add": "Add source",
  "sources.addVideo": "Add YouTube video",
  "sources.videoUrl": "YouTube link",
  "sources.uploading": "Uploading…",
  "sources.upload": "Upload",
  "sources.uploadFailed": "Upload failed. Try again.",
  "sources.videoFailed": "Could not add the video.",
  "sources.youtubeAuto": "Fetched automatically from YouTube",
  "sources.empty": "No sources yet",
  "sources.searchPlaceholder": "Search sources…",
  "sources.deleteTitle": "Delete source?",
  "sources.menuAria": "Source options",
  "sources.tab.all": "All",
  "sources.tab.pdf": "PDF",
  "sources.tab.doc": "Documents",
  "sources.tab.slides": "Slides",
  "sources.tab.sheets": "Sheets",
  "sources.tab.images": "Images",
  "sources.tab.youtube": "YouTube",
  "sources.tab.other": "Other",

  "admin.title": "Administrator Console",
  "admin.subtitle":
    "Manage schools, user accounts, registration requests and feedback from teachers and KPM.",
  "admin.tab.schools": "Schools",
  "admin.tab.users": "Users",
  "admin.tab.requests": "Requests",
  "admin.tab.feedback": "Feedback",

  "student.title": "Home",
  "buddy.title": "Buddy",
  "duties.title": "Duties",
  "kpm.title": "KPM Dashboard",
  "scheduled.title": "Scheduled",
  "scheduled.subtitle": "Scheduled tasks will appear here.",
} as const;

export type TranslationKey = keyof typeof en;

const ms: Record<TranslationKey, string> = {
  "common.cancel": "Batal",
  "common.save": "Simpan",
  "common.add": "Tambah",
  "common.loading": "Memuatkan…",
  "common.remove": "Buang",
  "common.open": "Buka",
  "common.search": "Cari",

  "shell.newChat": "Sembang Baharu",
  "shell.home": "Utama",
  "shell.hub": "Hub",
  "shell.scheduled": "Berjadual",
  "shell.admin": "Pentadbir",
  "shell.searchChats": "Cari sembang",
  "shell.search": "Cari",
  "shell.hideSidebar": "Sembunyikan bar sisi",
  "shell.lightMode": "Mod cerah",
  "shell.darkMode": "Mod gelap",
  "shell.rumah": "Rumah",
  "shell.kpm": "Papan Pemuka KPM",
  "shell.textbooks": "Buku Teks",
  "shell.spaces": "Spaces",
  "shell.buddy": "Buddy",
  "shell.duties": "Tugasan",
  "shell.sources": "Sumber",
  "shell.recents": "Terkini",
  "shell.openHistory": "Buka sejarah sembang",

  "profile.accountMenu": "Menu akaun",
  "profile.account": "Akaun",
  "profile.profile": "Profil",
  "profile.settings": "Tetapan",
  "profile.help": "Bantuan & sokongan",
  "profile.language": "Bahasa",
  "profile.signOut": "Log keluar",
  "language.en": "English",
  "language.ms": "Bahasa Melayu",

  "threads.search": "Cari sembang",
  "threads.newChat": "Sembang Baharu",
  "threads.running": "Sedang berjalan",
  "threads.moreOptions": "Pilihan lain",
  "threads.rename": "Namakan semula",
  "threads.renameAria": "Namakan semula sembang",
  "threads.titlePlaceholder": "Tajuk sembang",
  "threads.archive": "Arkibkan",
  "threads.delete": "Padam",

  "chat.greeting": "Apa yang boleh saya bantu hari ini?",
  "chat.ask": "Tanya Pixelspace AI Classroom",
  "chat.placeholder.flashcards": "Kad imbas apa yang anda mahu hasilkan?",
  "chat.placeholder.quizzes": "Kuiz apa yang anda mahu jana?",
  "chat.placeholder.mindmaps": "Peta minda apa yang anda mahu jana?",
  "chat.placeholder.slides": "Slaid apa yang anda mahu jana?",
  "chat.placeholder.reports": "Sedia untuk menulis laporan?",
  "chat.placeholder.infographics": "Infografik apa yang anda mahu jana?",
  "chat.placeholder.notes": "Nota apa yang anda mahu hasilkan?",
  "chat.send": "Hantar mesej",
  "chat.stop": "Hentikan penjanaan",
  "chat.queueWaiting": "Menunggu",
  "chat.queueRemove": "Buang daripada baris gilir",
  "chat.disclaimer":
    "Pixelspace AI Classroom boleh tersilap — semak semula maklumatnya.",
  "chat.voiceMode": "Mod suara",

  "books.title": "Buku Teks",
  "books.subtitle":
    "Koleksi buku teks KPM — sekolah rendah dan menengah. Klik mana-mana buku untuk membukanya.",
  "books.all": "Semua",
  "books.level.tahun": "Tahun {n}",
  "books.level.tingkatan": "Tingkatan {n}",
  "books.allSubjects": "Semua subjek",
  "books.search": "Cari buku teks…",
  "books.count": "{n} buku",
  "books.loading": "Memuatkan buku teks…",
  "books.empty": "Tiada buku sepadan dengan tapisan ini.",
  "books.pages": "{n} ms",

  "spaceSources.title": "Sumber",
  "spaceSources.generate": "Hasilkan bahan ↗",
  "spaceSources.group": "Buku teks: {subject} · {count} bab",
  "spaceSources.empty": "Belum ada sumber.",
  "spaceSources.addTextbook": "Buku teks",
  "spaceSources.addOwn": "Bahan saya",
  "spaceSources.noSubjects": "Tiada subjek lain untuk tahap ini.",
  "spaceSources.noUploads": "Belum ada bahan dimuat naik (lihat menu Sumber).",
  "spaceSources.add": "Tambah",
  "spaceSources.chapters": "{count} bab",
  "spaceSources.removeAria": "Buang {name}",

  "spaces.title": "Spaces",
  "spaces.subtitle.teacher":
    "Tambah subjek yang anda ajar dan kongsi kod kepada pelajar anda.",
  "spaces.subtitle.student":
    "Subjek yang anda sertai dengan kod daripada guru anda.",
  "spaces.add": "Tambah subjek",
  "spaces.edit": "Sunting subjek",
  "spaces.empty": "Belum ada subjek",
  "spaces.name": "Nama subjek",
  "spaces.namePlaceholder": "cth. Matematik Tambahan",
  "spaces.level": "Tahap",
  "spaces.description": "Keterangan",
  "spaces.optional": "(pilihan)",
  "spaces.descriptionPlaceholder": "cth. Bab 1–5, KSSM",
  "spaces.color": "Warna",
  "spaces.menuAria": "Pilihan subjek",
  "spaces.searchPlaceholder": "Cari subjek…",
  "spaces.copyCode": "Salin kod",
  "spaces.copied": "Disalin!",
  "spaces.code": "Kod subjek",
  "spaces.deleteTitle": "Padam subjek?",
  "spaces.deleteBody":
    "Subjek ini dan kod sertai akan dibuang untuk semua orang. Tindakan ini tidak boleh dibatalkan.",
  "spaces.joinTitle": "Sertai subjek",
  "spaces.joinHint": "Masukkan kod subjek daripada guru anda untuk menyertai.",
  "spaces.join": "Sertai",
  "spaces.students": "{n} pelajar",
  "spaces.free": "Tahap bebas",
  "spaces.general": "Umum",
  "spaces.created": "Subjek berjaya dicipta.",
  "spaces.createError": "Gagal menyimpan subjek.",
  "spaces.joinError": "Gagal menyertai subjek.",

  "sources.title": "Sumber",
  "sources.subtitle":
    "Muat naik bahan pengajaran — AI akan menggunakannya semasa menjana kandungan.",
  "sources.add": "Tambah sumber",
  "sources.addVideo": "Tambah video YouTube",
  "sources.videoUrl": "Pautan YouTube",
  "sources.uploading": "Memuat naik…",
  "sources.upload": "Muat naik",
  "sources.uploadFailed": "Muat naik gagal. Sila cuba lagi.",
  "sources.videoFailed": "Gagal menambah video.",
  "sources.youtubeAuto": "Diambil secara automatik daripada YouTube",
  "sources.empty": "Belum ada sumber",
  "sources.searchPlaceholder": "Cari sumber…",
  "sources.deleteTitle": "Padam sumber?",
  "sources.menuAria": "Pilihan sumber",
  "sources.tab.all": "Semua",
  "sources.tab.pdf": "PDF",
  "sources.tab.doc": "Dokumen",
  "sources.tab.slides": "Slaid",
  "sources.tab.sheets": "Hamparan",
  "sources.tab.images": "Imej",
  "sources.tab.youtube": "YouTube",
  "sources.tab.other": "Lain-lain",

  "admin.title": "Konsol Pentadbir",
  "admin.subtitle":
    "Urus sekolah, akaun pengguna, permintaan pendaftaran dan maklum balas daripada guru serta KPM.",
  "admin.tab.schools": "Sekolah",
  "admin.tab.users": "Pengguna",
  "admin.tab.requests": "Permintaan",
  "admin.tab.feedback": "Maklum Balas",

  "student.title": "Rumah",
  "buddy.title": "Buddy",
  "duties.title": "Tugasan",
  "kpm.title": "Papan Pemuka KPM",
  "scheduled.title": "Berjadual",
  "scheduled.subtitle": "Tugasan berjadual akan dipaparkan di sini.",
};

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  ms,
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "ms",
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: FC<{
  children: ReactNode;
  initial?: Language;
}> = ({ children, initial = "ms" }) => {
  const [language, setLanguageState] = useState<Language>(initial);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "ms") setLanguageState(stored);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const dictionary = dictionaries[language];
    const t: LanguageContextValue["t"] = (key, params) => {
      let text = dictionary[key] ?? en[key] ?? key;
      if (params) {
        for (const [name, param] of Object.entries(params)) {
          text = text.replaceAll(`{${name}}`, String(param));
        }
      }
      return text;
    };
    return {
      language,
      setLanguage: (next) => {
        setLanguageState(next);
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      },
      t,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useI18n = () => useContext(LanguageContext);

export const useT = () => useContext(LanguageContext).t;
