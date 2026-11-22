import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ auth */
/* Shapes match better-auth's expectations (same as paic-v2's schema). */

/** Schools — the org unit every student/teacher belongs to. */
export const schools = pgTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("secondary"),
  state: text("state"),
  district: text("district"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** "My school isn't listed" requests from the registration flow. */
export const schoolRequests = pgTable(
  "school_requests",
  {
    id: text("id").primaryKey(),
    schoolName: text("school_name").notNull(),
    state: text("state"),
    note: text("note"),
    requestedBy: text("requested_by"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("school_requests_status_idx").on(table.status)],
);

/** Auth audit trail (register/login/reset) — feeds KPM analytics. */
export const authEvents = pgTable(
  "auth_events",
  {
    id: text("id").primaryKey(),
    event: text("event").notNull(),
    userId: text("user_id"),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("auth_events_user_idx").on(table.userId),
    index("auth_events_created_idx").on(table.createdAt),
  ],
);

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** better-auth username plugin (login by ID or email). */
  username: text("username").unique(),
  displayUsername: text("display_username"),
  /** student | teacher | kpm | superadmin */
  role: text("role").notNull().default("student"),
  schoolId: text("school_id").references(() => schools.id),
  displayName: text("display_name"),
  yearLabel: text("year_label"),
  className: text("class_name"),
  status: text("status").notNull().default("active"),
  language: text("language").notNull().default("bm"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

/* --------------------------------------------------------------- app data */

/** One chat thread per row; piConversationId maps it to the harness. */
export const threads = pgTable(
  "threads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    piConversationId: text("pi_conversation_id"),
    title: text("title"),
    /** Set when this thread is the AI edit session for a deck artifact. */
    deckId: text("deck_id"),
    /** Set when the thread was started from inside a space (space Hub). */
    spaceId: text("space_id"),
    status: text("status").notNull().default("regular"),
    /**
     * Run state of the latest turn: idle | running | done | error | stopped.
     * Persisted so a chat that is still executing server-side is visible
     * after a refresh, and flips when the relay settles.
     */
    runStatus: text("run_status").notNull().default("idle"),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("threads_user_id_idx").on(table.userId)],
);

/** Files the agent shared (url) and decks it designed (spec). */
export const artifacts = pgTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: text("thread_id"),
    title: text("title").notNull(),
    type: text("type").notNull(),
    kind: text("kind").notNull().default("file"),
    url: text("url"),
    path: text("path"),
    spec: jsonb("spec"),
    dedupeKey: text("dedupe_key"),
    pinned: boolean("pinned").notNull().default(false),
    favorite: boolean("favorite").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("artifacts_user_id_idx").on(table.userId)],
);

/** Subject spaces teachers add (e.g. Matematik Tambahan T4) for their school. */
export const spaces = pgTable(
  "spaces",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: text("school_id").references(() => schools.id),
    name: text("name").notNull(),
    level: text("level").notNull().default("Umum"),
    description: text("description"),
    accent: text("accent").notNull().default("teal"),
    /** Short join code students use to enter the subject. */
    code: text("code").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("spaces_user_idx").on(table.userId),
    index("spaces_school_idx").on(table.schoolId),
    uniqueIndex("spaces_code_idx").on(table.code),
  ],
);

/** Students who joined a subject space via its code. */
export const spaceMembers = pgTable(
  "space_members",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("space_members_unique_idx").on(table.spaceId, table.userId),
    index("space_members_user_idx").on(table.userId),
  ],
);

/** Teacher teaching materials (uploaded PDFs, docs, slides, sheets, images). */
export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    ext: text("ext").notNull(),
    mime: text("mime").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    path: text("path").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("sources_user_idx").on(table.userId)],
);

export type FeedbackAttachment = {
  /** Original file name, as the submitter saw it. */
  name: string;
  mime: string;
  size: number;
  /** Stored file name on disk (see lib/feedback/store.ts). */
  file: string;
};

/**
 * Feedback teachers and KPM submit to admins via Help & support. Identity is
 * snapshotted at submit time so the inbox shows who and which school even if
 * the account later changes.
 */
export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: text("school_id").references(() => schools.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    schoolName: text("school_name"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    attachments: jsonb("attachments")
      .$type<FeedbackAttachment[]>()
      .notNull()
      .default([]),
    /** baru | dibaca | selesai */
    status: text("status").notNull().default("baru"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("feedback_user_idx").on(table.userId)],
);

/** Per-account mastery for a deck: which card indices are "dikuasai". */
export const deckProgress = pgTable(
  "deck_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deckId: text("deck_id").notNull(),
    knownIndices: jsonb("known_indices").notNull().default([]),
    total: text("total").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("deck_progress_user_idx").on(table.userId),
    index("deck_progress_deck_idx").on(table.userId, table.deckId),
  ],
);

/** Per-account quiz results: question index → "correct" | "wrong". */
export const quizProgress = pgTable(
  "quiz_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: text("quiz_id").notNull(),
    results: jsonb("results").notNull().default({}),
    total: text("total").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("quiz_progress_user_idx").on(table.userId),
    index("quiz_progress_quiz_idx").on(table.userId, table.quizId),
  ],
);

/** Per-account learning-map mastery: node id → level/streak/schedule. */
export const mindmapProgress = pgTable(
  "mindmap_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mapId: text("map_id").notNull(),
    nodeState: jsonb("node_state").notNull().default({}),
    total: text("total").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("mindmap_progress_user_idx").on(table.userId),
    index("mindmap_progress_map_idx").on(table.userId, table.mapId),
  ],
);

/** Per-account study-notes checklist progress: section id → checked indices. */
export const notesProgress = pgTable(
  "notes_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notesId: text("notes_id").notNull(),
    done: jsonb("done").notNull().default({}),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("notes_progress_user_idx").on(table.userId),
    index("notes_progress_notes_idx").on(table.userId, table.notesId),
  ],
);

/** Gallery documents (scratch decks, local slides, etc.), per account. */
export const docs = pgTable(
  "docs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    favorite: boolean("favorite").notNull().default(false),
    content: jsonb("content"),
    slides: jsonb("slides"),
    originArtifactId: text("origin_artifact_id"),
    downloads: jsonb("downloads"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("docs_user_id_idx").on(table.userId)],
);

/** Textbook/upload sources attached to a space (subject). */
export const spaceSources = pgTable(
  "space_sources",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    /** "textbook" (vector-db book id) or "upload" (sources.id). */
    kind: text("kind").notNull(),
    refId: text("ref_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("space_sources_space_idx").on(table.spaceId)],
);
