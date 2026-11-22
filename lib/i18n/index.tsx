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

  "hub.title": "Hub",
  "hub.subtitle":
    "All your work in one place — flashcards, quizzes, slides, reports and more.",
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
  "spaceSources.noUploads": "No materials uploaded yet.",
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
  "spaces.textbookMatch": "Matched textbook",
  "spaces.noTextbookMatch":
    "No matching textbook found — you can add one later in Sources.",
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

  "auth.studentTitle": "Hi, student! 👋",
  "auth.adminTitle": "Administrators & KPM",
  "auth.title": "Sign in",
  "auth.studentSubtitle":
    "Ready to learn? Sign in with your student ID or email.",
  "auth.adminSubtitle": "Sign in with an official administrator account.",
  "auth.subtitle": "Use your email or ID to continue.",
  "auth.noAccount": "Don't have an account yet?",
  "auth.newHere": "New here?",
  "auth.registerMain": "Register on the home page",
  "auth.registerStudent": "Register as a student",
  "auth.homeLink": "Back to the home page",
  "auth.headline1": "One AI-powered",
  "auth.headline2": "learning space for",
  "auth.headline3": "the whole school.",
  "auth.intro":
    "Students learn with flashcards, quizzes and smart notes; teachers plan lessons and assessments; administrators track progress — all in one platform.",
  "auth.benefit1": "Flashcards, quizzes & smart notes",
  "auth.benefit2": "AI teaching & assessment materials",
  "auth.benefit3": "School analytics & management",

  "loginForm.id.student": "Student ID or email",
  "loginForm.id.teacher": "Email or ID",
  "loginForm.id.admin": "Administrator email or ID",
  "loginForm.id.ph.student": "e.g. aiman.hakim or name@school.edu.my",
  "loginForm.id.ph.teacher": "e.g. name@school.edu.my or username",
  "loginForm.password": "Password",
  "loginForm.password.ph": "Your password",
  "loginForm.submit": "Sign in",
  "loginForm.submit.student": "Let's go! 🚀",
  "loginForm.submitting": "Signing in…",
  "loginForm.verifying": "Verifying…",
  "loginForm.remember": "Remember me",
  "loginForm.forgot": "Forgot password?",
  "loginForm.show": "Show password",
  "loginForm.hide": "Hide password",
  "loginForm.invalid": "Invalid email/ID or password. Please try again.",
  "loginForm.connection": "Connection failed. Please try again.",
  "loginForm.unverified":
    "Your email is not verified yet. Check your inbox and click the verification link before signing in.",
  "loginForm.resend": "Resend verification link",
  "loginForm.resending": "Sending…",
  "loginForm.resent": "A new verification link has been sent.",

  "forgot.title": "Reset password",
  "forgot.check": "Check your email",
  "forgot.email": "Email",
  "forgot.submit": "Send link",
  "forgot.sending": "Sending…",
  "forgot.remember": "Remember your password?",
  "forgot.signIn": "Sign in",
  "forgot.back": "Back to the home page",

  "reset.subtitle": "Choose a new password for your account.",
  "reset.title": "New password",
  "reset.passwordLabel": "New password",
  "reset.passwordPh": "At least 8 characters",
  "reset.confirmLabel": "Confirm password",
  "reset.confirmPh": "Retype the new password",
  "reset.tooShort": "Password must be at least 8 characters.",
  "reset.mismatch": "Passwords do not match.",
  "reset.save": "Save password",
  "reset.saving": "Saving…",
  "reset.updated": "Password updated",
  "reset.failed": "Reset failed. Please try again.",

  "register.studentTitle": "Student account",
  "register.teacherTitle": "Teacher account",
  "register.myInfo": "Your information",
  "register.studentId": "Student ID",
  "register.teacherId": "Teacher ID",
  "register.idPlaceholder": "e.g. aiman.hakim",
  "register.idHint": "Use this ID or your email to sign in later.",
  "register.displayNameLabel": "Display name (optional)",
  "register.displayNamePlaceholder": "Name others will see",
  "register.emailHint": "We will send a verification link to this email.",
  "register.back": "Back",
  "register.next": "Next",
  "register.password": "Password",
  "register.passwordPh": "At least 8 characters",
  "register.confirmPassword": "Retype password",
  "register.submit": "Register now",
  "register.terms": "I accept the terms of use.",
  "register.termsError": "Please accept the terms of use.",
  "register.verifyTitle": "One more step — verify your email.",
  "register.idTaken": "This ID is already taken. Try another.",
  "register.emailExists": "This email is already registered. Try signing in.",
  "register.failed": "Registration failed. Check your details and try again.",
  "register.connection": "Connection failed. Please try again.",
  "register.badEmail": "Enter a valid email.",
  "register.enterName": "Enter your full name.",

  "duties.subtitle":
    "Teacher duty roster — invigilation, supervision and weekly tasks appear here.",
  "duties.empty": "No duties yet",
  "duties.emptyBody":
    "Duties assigned by your school administrators will appear here by date.",
  "buddy.subtitle":
    "Your AI learning companion — ask questions, get revision tips and keep learning with the Pixelspace mascot.",
  "buddy.preparing": "Buddy is getting ready",
  "buddy.preparingBody":
    "Soon you can chat with Buddy about the topic you are learning, ask for revision tips and revise together.",

  "landing.login": "Sign in",
  "landing.register": "Register",
  "landing.menu": "Open navigation menu",
  "landing.nav": "Main navigation",
  "landing.heroEyebrow": "Pixelspace AI Classroom",
  "landing.heroTitle1": "Learn smarter,",
  "landing.heroTitle2": "with AI.",

  "spaceDetail.back": "Back to Spaces",
  "spaceDetail.tab.sources": "Sources",
  "spaceDetail.tab.students": "Students",
  "spaceDetail.tab.analytics": "Analytics",
  "spaceDetail.joined": "Joined",
  "spaceDetail.chats": "Chats",
  "spaceDetail.quizzes": "Quizzes",
  "spaceDetail.lastActive": "Last active",
  "spaceDetail.never": "Not active yet",
  "spaceDetail.noStudents":
    "No students have joined yet. Share the subject code to invite them.",
  "spaceDetail.activeWeek": "Active this week",
  "spaceDetail.engagement": "Engagement",
  "spaceDetail.summary.students": "Students",
  "spaceDetail.summary.chats": "Total chats",
  "spaceDetail.summary.quizzes": "Quiz attempts",

  "spaceDetail.shareCode": "Show code",
  "spaceDetail.codeBody":
    "Show this code to your students — they can key it in to join.",
  "spaceDetail.copy": "Copy",
  "spaceDetail.copied": "Copied",
  "spaceDetail.joinWithCode": "Join a class with a code",
  "spaceDetail.moreActions": "More actions",
  "spaceDetail.sourcesSubtitle":
    "Add and manage learning materials for this subject.",
  "spaceDetail.storage": "{used} of {quota} used",
  "spaceDetail.addSource": "Add source",
  "spaceDetail.uploadFile": "Upload file",
  "spaceDetail.addVideo": "Add YouTube video",
  "spaceDetail.addLink": "Add link",
  "spaceDetail.addTextbook": "Textbook",
  "spaceDetail.textbookBody": "Pick textbooks to add as sources of this space.",
  "spaceDetail.textbookSearch": "Search textbooks…",
  "spaceDetail.textbookAdd": "Add",
  "spaceDetail.textbookAdded": "Added",
  "spaceDetail.textbookEmpty": "No textbooks match.",
  "spaceDetail.done": "Done",
  "spaceDetail.linkTitle": "Link title",
  "spaceDetail.linkUrl": "Link (URL)",
  "spaceDetail.invalidUrl": "Invalid link.",
  "spaceDetail.cat.all": "All",
  "spaceDetail.cat.textbook": "Textbook",
  "spaceDetail.cat.slides": "Slide",
  "spaceDetail.cat.note": "Note",
  "spaceDetail.cat.video": "Video",
  "spaceDetail.cat.link": "Link",
  "spaceDetail.cat.other": "Other",
  "spaceDetail.search": "Search sources…",
  "spaceDetail.grid": "Grid view",
  "spaceDetail.list": "List view",
  "spaceDetail.remove": "Remove from space",
  "spaceDetail.textbookCard": "Textbook: {subject}",
  "spaceDetail.empty": "No sources yet. Add materials for this subject.",
  "spaceDetail.emptyFilter": "No matching sources.",
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

  "hub.title": "Hub",
  "hub.subtitle":
    "Semua hasil kerja anda dalam satu tempat — kad imbas, kuiz, slaid, laporan dan banyak lagi.",
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
  "spaceSources.noUploads": "Belum ada bahan dimuat naik.",
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
  "spaces.textbookMatch": "Buku teks dipadankan",
  "spaces.noTextbookMatch":
    "Tiada buku teks sepadan — anda boleh menambahnya kemudian di Sumber.",
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

  "auth.studentTitle": "Hai, pelajar! 👋",
  "auth.adminTitle": "Pentadbir & KPM",
  "auth.title": "Log masuk",
  "auth.studentSubtitle":
    "Sedia untuk belajar? Masuk dengan ID pelajar atau emel.",
  "auth.adminSubtitle": "Log masuk dengan akaun rasmi pentadbir.",
  "auth.subtitle": "Gunakan emel atau ID anda untuk teruskan.",
  "auth.noAccount": "Belum ada akaun?",
  "auth.newHere": "Baru di sini?",
  "auth.registerMain": "Daftar di laman utama",
  "auth.registerStudent": "Daftar sebagai pelajar",
  "auth.homeLink": "Kembali ke laman utama",
  "auth.headline1": "Satu ruang pembelajaran",
  "auth.headline2": "berkuasa AI untuk",
  "auth.headline3": "seluruh sekolah.",
  "auth.intro":
    "Murid belajar dengan kad imbas, kuiz dan nota pintar; guru merancang pengajaran dan penilaian; pentadbir memantau perkembangan — semuanya dalam satu platform.",
  "auth.benefit1": "Kad imbas, kuiz & nota pintar",
  "auth.benefit2": "Bahan pengajaran & penilaian AI",
  "auth.benefit3": "Analitik & pengurusan sekolah",

  "loginForm.id.student": "ID pelajar atau emel",
  "loginForm.id.teacher": "Emel atau ID",
  "loginForm.id.admin": "Emel atau ID pentadbir",
  "loginForm.id.ph.student": "cth. aiman.hakim atau nama@sekolah.edu.my",
  "loginForm.id.ph.teacher": "cth. nama@sekolah.edu.my atau nama.pengguna",
  "loginForm.password": "Kata laluan",
  "loginForm.password.ph": "Kata laluan anda",
  "loginForm.submit": "Log masuk",
  "loginForm.submit.student": "Jom masuk! 🚀",
  "loginForm.submitting": "Sedang masuk…",
  "loginForm.verifying": "Mengesahkan…",
  "loginForm.remember": "Ingat saya",
  "loginForm.forgot": "Lupa kata laluan?",
  "loginForm.show": "Tunjukkan kata laluan",
  "loginForm.hide": "Sembunyikan kata laluan",
  "loginForm.invalid": "Emel/ID atau kata laluan tidak sah. Sila cuba lagi.",
  "loginForm.connection": "Sambungan gagal. Sila cuba lagi.",
  "loginForm.unverified":
    "Emel anda belum disahkan. Semak peti masuk anda dan klik pautan pengesahan sebelum log masuk.",
  "loginForm.resend": "Hantar semula pautan pengesahan",
  "loginForm.resending": "Sedang menghantar…",
  "loginForm.resent": "Pautan pengesahan baharu telah dihantar.",

  "forgot.title": "Tetapan semula kata laluan",
  "forgot.check": "Semak emel anda",
  "forgot.email": "Emel",
  "forgot.submit": "Hantar pautan",
  "forgot.sending": "Sedang menghantar…",
  "forgot.remember": "Ingat kata laluan anda?",
  "forgot.signIn": "Log masuk",
  "forgot.back": "Kembali ke laman utama",

  "reset.subtitle": "Pilih kata laluan baharu untuk akaun anda.",
  "reset.title": "Kata laluan baharu",
  "reset.passwordLabel": "Kata laluan baharu",
  "reset.passwordPh": "Sekurang-kurangnya 8 aksara",
  "reset.confirmLabel": "Sahkan kata laluan",
  "reset.confirmPh": "Taip semula kata laluan baharu",
  "reset.tooShort": "Kata laluan mesti sekurang-kurangnya 8 aksara.",
  "reset.mismatch": "Kata laluan tidak sepadan.",
  "reset.save": "Simpan kata laluan",
  "reset.saving": "Sedang menyimpan…",
  "reset.updated": "Kata laluan dikemas kini",
  "reset.failed": "Tetapan semula gagal. Sila cuba lagi.",

  "register.studentTitle": "Akaun Pelajar",
  "register.teacherTitle": "Akaun Guru",
  "register.myInfo": "Maklumat anda",
  "register.studentId": "ID pelajar",
  "register.teacherId": "ID guru",
  "register.idPlaceholder": "cth. aiman.hakim",
  "register.idHint": "Gunakan ID ini atau emel anda untuk log masuk nanti.",
  "register.displayNameLabel": "Nama paparan (pilihan)",
  "register.displayNamePlaceholder": "Nama yang dilihat oleh orang lain",
  "register.emailHint": "Kami akan hantar pautan pengesahan ke emel ini.",
  "register.back": "Kembali",
  "register.next": "Seterusnya",
  "register.password": "Kata laluan",
  "register.passwordPh": "Sekurang-kurangnya 8 aksara",
  "register.confirmPassword": "Taip semula kata laluan",
  "register.submit": "Daftar sekarang",
  "register.terms": "Saya menerima terma penggunaan.",
  "register.termsError": "Sila terima terma penggunaan.",
  "register.verifyTitle": "Satu langkah lagi — sahkan emel anda.",
  "register.idTaken": "ID ini telah digunakan. Cuba yang lain.",
  "register.emailExists": "Emel ini sudah didaftarkan. Cuba log masuk.",
  "register.failed":
    "Pendaftaran gagal. Sila semak butiran anda dan cuba lagi.",
  "register.connection": "Sambungan gagal. Sila cuba lagi.",
  "register.badEmail": "Masukkan emel yang sah.",
  "register.enterName": "Masukkan nama penuh anda.",

  "duties.subtitle":
    "Jadual tugas guru — tugasan bertugas, pengawasan dan tugas mingguan anda akan muncul di sini.",
  "duties.empty": "Belum ada tugasan",
  "duties.emptyBody":
    "Tugasan yang diberikan oleh pentadbir sekolah akan dipaparkan di sini mengikut tarikh.",
  "buddy.subtitle":
    "Rakan pembelajaran AI anda — tanya soalan, minta petua ulang kaji dan sambung belajar bersama maskot Pixelspace.",
  "buddy.preparing": "Buddy sedang bersiap",
  "buddy.preparingBody":
    "Sebentar lagi anda boleh berbual dengan Buddy tentang topik yang sedang anda pelajari, minta petua ulang kaji dan ulang kaji bersama-sama.",

  "landing.login": "Log masuk",
  "landing.register": "Daftar",
  "landing.menu": "Buka menu navigasi",
  "landing.nav": "Navigasi utama",
  "landing.heroEyebrow": "Pixelspace AI Classroom",
  "landing.heroTitle1": "Belajar lebih pintar,",
  "landing.heroTitle2": "bersama AI.",

  "spaceDetail.back": "Kembali ke Spaces",
  "spaceDetail.tab.sources": "Sumber",
  "spaceDetail.tab.students": "Pelajar",
  "spaceDetail.tab.analytics": "Analitik",
  "spaceDetail.joined": "Menyertai",
  "spaceDetail.chats": "Sembang",
  "spaceDetail.quizzes": "Kuiz",
  "spaceDetail.lastActive": "Aktif terakhir",
  "spaceDetail.never": "Belum aktif",
  "spaceDetail.noStudents":
    "Belum ada pelajar menyertai. Kongsi kod subjek untuk menjemput mereka.",
  "spaceDetail.activeWeek": "Aktif 7 hari",
  "spaceDetail.engagement": "Penglibatan",
  "spaceDetail.summary.students": "Pelajar",
  "spaceDetail.summary.chats": "Jumlah sembang",
  "spaceDetail.summary.quizzes": "Kuiz dicuba",

  "spaceDetail.shareCode": "Tunjuk kod",
  "spaceDetail.codeBody":
    "Tunjukkan kod ini kepada pelajar — mereka boleh memasukkan kod untuk menyertai.",
  "spaceDetail.copy": "Salin",
  "spaceDetail.copied": "Disalin",
  "spaceDetail.joinWithCode": "Sertai kelas dengan kod",
  "spaceDetail.moreActions": "Tindakan lain",
  "spaceDetail.sourcesSubtitle":
    "Tambah dan urus bahan pembelajaran untuk subjek ini.",
  "spaceDetail.storage": "{used} daripada {quota} digunakan",
  "spaceDetail.addSource": "Tambah sumber",
  "spaceDetail.uploadFile": "Muat naik fail",
  "spaceDetail.addVideo": "Tambah video YouTube",
  "spaceDetail.addLink": "Tambah pautan",
  "spaceDetail.addTextbook": "Buku Teks",
  "spaceDetail.textbookBody":
    "Pilih buku teks untuk ditambah sebagai sumber ruang ini.",
  "spaceDetail.textbookSearch": "Cari buku teks…",
  "spaceDetail.textbookAdd": "Tambah",
  "spaceDetail.textbookAdded": "Ditambah",
  "spaceDetail.textbookEmpty": "Tiada buku teks yang sepadan.",
  "spaceDetail.done": "Selesai",
  "spaceDetail.linkTitle": "Tajuk pautan",
  "spaceDetail.linkUrl": "Pautan (URL)",
  "spaceDetail.invalidUrl": "Pautan tidak sah.",
  "spaceDetail.cat.all": "Semua",
  "spaceDetail.cat.textbook": "Buku Teks",
  "spaceDetail.cat.slides": "Slaid",
  "spaceDetail.cat.note": "Nota",
  "spaceDetail.cat.video": "Video",
  "spaceDetail.cat.link": "Pautan",
  "spaceDetail.cat.other": "Lain-lain",
  "spaceDetail.search": "Cari sumber…",
  "spaceDetail.grid": "Paparan grid",
  "spaceDetail.list": "Paparan senarai",
  "spaceDetail.remove": "Buang daripada ruang",
  "spaceDetail.textbookCard": "Buku Teks: {subject}",
  "spaceDetail.empty": "Belum ada sumber. Tambah bahan untuk subjek ini.",
  "spaceDetail.emptyFilter": "Tiada sumber sepadan.",
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
