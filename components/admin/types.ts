export type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  state: string | null;
  district: string | null;
  isActive: boolean;
  createdAt: string;
  userCount: number;
};

export type UserRow = {
  id: string;
  name: string;
  displayName: string | null;
  email: string;
  username: string | null;
  role: string;
  schoolId: string | null;
  schoolName: string | null;
  status: string;
  emailVerified: boolean;
  yearLabel: string | null;
  createdAt: string;
};

export type SchoolRequestRow = {
  id: string;
  schoolName: string;
  state: string | null;
  note: string | null;
  requestedBy: string | null;
  status: string;
  createdAt: string;
};

export type FeedbackAttachmentRow = {
  name: string;
  mime: string;
  size: number;
  url: string;
};

export type FeedbackRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  schoolId: string | null;
  schoolName: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  attachments: FeedbackAttachmentRow[];
};
