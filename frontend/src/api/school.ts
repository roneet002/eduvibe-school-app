import Constants from "expo-constants";

import type { DashboardData } from "@/src/types/school";

export type User = {
  user_id: string;
  email: string;
  name: string;
  role: "student" | "admin";
  picture?: string | null;
  student_profile?: Record<string, unknown> | null;
};

export type ContentEntry = {
  id: string;
  module_key: string;
  title: string;
  subtitle?: string;
  value?: string;
  meta?: Record<string, unknown>;
  created_at?: string;
};

export type LeaveItem = {
  id: string;
  user_id: string;
  student_name?: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
};

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function getApiBaseUrl() {
  const configured = Constants.expoConfig?.extra?.backendUrl as string | undefined;
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? process.env.EXPO_BACKEND_URL;
  const baseUrl = configured ?? envUrl;
  if (!baseUrl) throw new Error("Backend URL is not configured");
  return `${baseUrl.replace(/\/$/, "")}/api`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) message = body.detail;
    } catch {}
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export const api = {
  // auth
  register: (payload: { email: string; password: string; name: string; role: "student" | "admin" }) =>
    request<{ session_token: string; user: User }>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<{ session_token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  session: (session_id: string) =>
    request<{ session_token: string; user: User }>("/auth/session", { method: "POST", body: JSON.stringify({ session_id }) }),
  me: () => request<{ user: User }>("/auth/me"),
  logout: () => request<{ status: string }>("/auth/logout", { method: "POST" }),

  // student
  dashboard: () => request<DashboardData>("/student/dashboard"),
  submitLeave: (payload: { start_date: string; end_date: string; reason: string }) =>
    request<{ leave: LeaveItem }>("/student/leaves", { method: "POST", body: JSON.stringify(payload) }),
  myLeaves: () => request<{ leaves: LeaveItem[] }>("/student/leaves"),
  content: (moduleKey: string) => request<{ entries: ContentEntry[] }>(`/content/${moduleKey}`),

  // admin
  adminStats: () => request<{ students: number; admins: number; pending_leaves: number; content_entries: number }>("/admin/stats"),
  adminCreate: (moduleKey: string, payload: { title: string; subtitle?: string; value?: string; meta?: Record<string, unknown> }) =>
    request<{ entry: ContentEntry }>(`/admin/content/${moduleKey}`, { method: "POST", body: JSON.stringify(payload) }),
  adminUpdate: (moduleKey: string, id: string, payload: { title: string; subtitle?: string; value?: string; meta?: Record<string, unknown> }) =>
    request<{ entry: ContentEntry }>(`/admin/content/${moduleKey}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  adminDelete: (moduleKey: string, id: string) =>
    request<{ status: string }>(`/admin/content/${moduleKey}/${id}`, { method: "DELETE" }),
  adminLeaves: () => request<{ leaves: LeaveItem[] }>("/admin/leaves"),
  adminUpdateLeave: (id: string, status: string) =>
    request<{ status: string }>(`/admin/leaves/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
};

// Legacy exports kept for existing callers
export const fetchDashboard = api.dashboard;
export const submitLeave = api.submitLeave;
