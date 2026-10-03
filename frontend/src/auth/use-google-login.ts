import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/src/auth/auth-context";

WebBrowser.maybeCompleteAuthSession();

const AUTH_URL = "https://auth.emergentagent.com/";

function extractSessionId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/[?#&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useGoogleLogin() {
  const { completeGoogleSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consumed = useRef<Set<string>>(new Set());

  const consume = async (sessionId: string | null) => {
    if (!sessionId || consumed.current.has(sessionId)) return;
    consumed.current.add(sessionId);
    try {
      await completeGoogleSession(sessionId);
    } catch (e) {
      setError((e as Error).message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === "web") {
      const url = typeof window !== "undefined" ? window.location.href : "";
      const sid = extractSessionId(url);
      if (sid) {
        const timer = setTimeout(() => {
          void consume(sid).then(() => {
            try {
              const hash = window.location.hash.replace(/session_id=[^&]+&?/g, "").replace(/^#/, "");
              const search = window.location.search.replace(/[?&]session_id=[^&]+/g, "");
              window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}${hash ? "#" + hash : ""}`);
            } catch {}
          });
        }, 0);
        return () => clearTimeout(timer);
      }
      return;
    }
    (async () => {
      const initial = await Linking.getInitialURL();
      const sid = extractSessionId(initial);
      if (sid) {
        await consume(sid);
      }
    })();
    const sub = Linking.addEventListener("url", (event) => {
      const sid = extractSessionId(event.url);
      if (sid) {
        void consume(sid);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const redirectUrl = Platform.OS === "web"
        ? (typeof window !== "undefined" ? `${window.location.origin}/` : "")
        : Linking.createURL("");
      const url = `${AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
      if (Platform.OS === "web") {
        window.location.href = url;
        return;
      }
      const sub = Linking.addEventListener("url", (event) => {
        const sid = extractSessionId(event.url);
        if (sid) {
          void consume(sid);
        }
      });
      try {
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
        const sidFromResult = result.type === "success" ? extractSessionId((result as { url?: string }).url) : null;
        if (sidFromResult) {
          await consume(sidFromResult);
        } else {
          const initial = await Linking.getInitialURL();
          const sidInit = extractSessionId(initial);
          if (sidInit) await consume(sidInit);
          else setLoading(false);
        }
      } finally {
        sub.remove();
      }
    } catch (e) {
      setError((e as Error).message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return { signIn, loading, error };
}
