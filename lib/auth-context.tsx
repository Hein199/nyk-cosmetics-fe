"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/constants";

export type AuthUser = {
    id: string;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
        clearStoredAuth();
        setUser(null);
        setToken(null);
    }, []);

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