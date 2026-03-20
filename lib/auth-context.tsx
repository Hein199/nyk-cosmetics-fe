"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/constants";

export type AuthUser = {
    id: number;
    username: string;
    role: "admin" | "salesperson";
};

type LoginPayload = {
    username: string;
    password: string;
    rememberMe?: boolean;
};

type AuthContextValue = {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    login: (payload: LoginPayload) => Promise<AuthUser>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEYS = {
    token: "nyk-auth-token",
    user: "nyk-auth-user",
};

const getStoredAuth = () => {
    if (typeof window === "undefined") {
        return { token: null, user: null };
    }

    const sessionToken = sessionStorage.getItem(STORAGE_KEYS.token);
    const sessionUser = sessionStorage.getItem(STORAGE_KEYS.user);
    if (sessionToken && sessionUser) {
        return {
            token: sessionToken,
            user: JSON.parse(sessionUser) as AuthUser,
        };
    }

    const localToken = localStorage.getItem(STORAGE_KEYS.token);
    const localUser = localStorage.getItem(STORAGE_KEYS.user);
    if (localToken && localUser) {
        return {
            token: localToken,
            user: JSON.parse(localUser) as AuthUser,
        };
    }

    return { token: null, user: null };
};

const persistAuth = (token: string, user: AuthUser, rememberMe?: boolean) => {
    if (typeof window === "undefined") {
        return;
    }

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.token, token);
    storage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem(STORAGE_KEYS.token);
    otherStorage.removeItem(STORAGE_KEYS.user);
};

const clearStoredAuth = () => {
    if (typeof window === "undefined") {
        return;
    }
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    sessionStorage.removeItem(STORAGE_KEYS.token);
    sessionStorage.removeItem(STORAGE_KEYS.user);
};

const normalizeRole = (role: string): AuthUser["role"] => {
    const normalized = role.toLowerCase();
    return normalized === "admin" ? "admin" : "salesperson";
};

const syncStoredUser = (user: AuthUser) => {
    if (typeof window === "undefined") {
        return;
    }

    if (sessionStorage.getItem(STORAGE_KEYS.token)) {
        sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    }
    if (localStorage.getItem(STORAGE_KEYS.token)) {
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const forceLogout = useCallback(() => {
        clearStoredAuth();
        setUser(null);
        setToken(null);
    }, []);

    useEffect(() => {
        const stored = getStoredAuth();
        setUser(stored.user);
        setToken(stored.token);
        setLoading(false);
    }, []);

    const login = useCallback(async ({ username, password, rememberMe }: LoginPayload) => {
        const response = await fetch(`${API_BASE_URL}/_api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            let message = "Login failed";
            try {
                const errorBody = await response.json();
                const rawMessage = errorBody?.message;
                if (Array.isArray(rawMessage)) {
                    message = rawMessage.join(" ");
                } else if (rawMessage) {
                    message = rawMessage;
                }
            } catch {
                const text = await response.text();
                if (text) {
                    message = text;
                }
            }
            throw new Error(message);
        }

        const data = (await response.json()) as {
            access_token: string;
            user: AuthUser;
        };

        const normalizedUser = {
            ...data.user,
            role: normalizeRole(data.user.role),
        };

        persistAuth(data.access_token, normalizedUser, rememberMe);
        setUser(normalizedUser);
        setToken(data.access_token);
        return normalizedUser;
    }, []);

    const logout = useCallback(() => {
        forceLogout();
    }, [forceLogout]);

    const validateCurrentSession = useCallback(async () => {
        if (!token || !user) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/_api/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    forceLogout();
                }
                return;
            }

            const data = (await response.json()) as {
                username?: string;
                role?: string;
            };

            const nextRole = normalizeRole(data.role ?? user.role);
            if (nextRole !== user.role) {
                forceLogout();
                return;
            }

            const nextUsername = data.username?.trim() || user.username;
            if (nextUsername !== user.username) {
                const nextUser: AuthUser = {
                    ...user,
                    username: nextUsername,
                    role: nextRole,
                };
                setUser(nextUser);
                syncStoredUser(nextUser);
            }
        } catch {
            // Ignore transient network errors and retry on next cycle/focus.
        }
    }, [token, user, forceLogout]);

    useEffect(() => {
        if (!token || !user || typeof window === "undefined") {
            return;
        }

        void validateCurrentSession();

        const intervalId = window.setInterval(() => {
            void validateCurrentSession();
        }, 30_000);

        const handleWindowFocus = () => {
            void validateCurrentSession();
        };

        window.addEventListener("focus", handleWindowFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, [token, user, validateCurrentSession]);

    const value = useMemo(
        () => ({ user, token, loading, login, logout }),
        [user, token, loading, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}