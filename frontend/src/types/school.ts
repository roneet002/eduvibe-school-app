export type ModuleItem = {
  key: string;
  title: string;
  hi: string;
  icon: string;
  category: string;
  badge?: string | null;
};

export type DashboardData = {
  student: { name: string; initials: string; student_id: string; class_name: string; roll_no: string; house: string; school: string };
  stats: { attendance: number; fees_paid: number; fees_due: number; homework_due: number };
  upcoming_class: { subject: string; teacher: string; time: string; room: string; minutes_left: number };
  modules: ModuleItem[];
  circulars: Array<{ title: string; date: string; type: string; unread: boolean }>;
  schedule: Array<{ time: string; subject: string; teacher: string; room: string }>;
  attendance: { percentage: number; present: number; absent: number; working_days: number; month: string; log: Array<{ date: string; status: string }> };
  homework: Array<{ subject: string; title: string; due: string; teacher: string; status: string }>;
  fees: { paid: number; due: number; total: number; items: Array<{ name: string; amount: number; status: string }> };
  library: { active: Array<{ title: string; author: string; due: string }>; new_books: number; requests: Array<{ title: string; status: string }> };
  exams: Array<{ subject: string; date: string; time: string; room: string }>;
  transport: { route: string; driver: string; phone: string; stop: string; morning: string; evening: string; status: string };
  leaves: Array<{ start_date: string; end_date: string; reason: string; status: string }>;
  diary: Array<{ title: string; from: string; date: string; read: boolean }>;
  messages: Array<{ title: string; from: string; date: string; preview: string; unread: boolean }>;
  sms_history: Array<{ title: string; date: string; status: string }>;
  timetable: Array<{ day: string; items: string[] }>;
  teachers: Array<{ name: string; subject: string; initials: string }>;
  projects: Array<{ title: string; subject: string; status: string; due: string }>;
  events: Array<{ title: string; date: string; location: string }>;
  syllabus: Array<{ subject: string; progress: number }>;
  notifications: Array<{ title: string; date: string; type: string }>;
  help: { contact: string; phone: string; topics: string[] };
};