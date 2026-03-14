"use client";

import { useForm } from "react-hook-form";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/constants";

interface LoginFormData {
    username: string;
    password: string;
    rememberMe: boolean;
}

// Gold shimmer divider
function GoldDivider() {
    return (
        <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #d4af37, transparent)" }} />
            <span style={{ color: "#d4af37", fontSize: 10, letterSpacing: "0.2em" }}>✦</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #d4af37, transparent)" }} />
        </div>
    );
}

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [systemName, setSystemName] = useState("NYK Cosmetics");
    const [systemLogo, setSystemLogo] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const { login, user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetch(`${API_BASE_URL}/_api/settings`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.system_name) setSystemName(data.system_name);
                if (data?.system_logo) setSystemLogo(data.system_logo);
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (!loading && user) {
            const destination = user.role === "admin" ? "/admin" : "/salesperson";
            router.replace(destination);
        }
    }, [loading, user, router]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        defaultValues: { username: "", password: "", rememberMe: false },
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const loggedInUser = await login({
                username: data.username,
                password: data.password,
                rememberMe: data.rememberMe,
            });
            const destination = loggedInUser.role === "admin" ? "/admin" : "/salesperson";
            router.replace(destination);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Login failed";
            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            {/* Card */}
            <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                    background: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(20px)",
                    boxShadow:
                        "0 8px 40px rgba(212,175,55,0.13), 0 2px 12px rgba(255,160,180,0.18), 0 0 0 1px rgba(212,175,55,0.18)",
                }}
            >
                {/* Gold top accent bar */}
                <div
                    className="h-1 w-full"
                    style={{
                        background: "linear-gradient(90deg, #f9a8c9, #d4af37, #f9c784, #d4af37, #f9a8c9)",
                    }}
                />

                <div className="px-10 pt-10 pb-10">
                    {/* Logo + Brand */}
                    <div className="flex flex-col items-center mb-2">
                        {/* Logo circle */}
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden mb-5"
                            style={{
                                background: "linear-gradient(135deg, #f9a8c9 0%, #e879a0 40%, #d4af37 100%)",
                                boxShadow: "0 4px 20px rgba(212,175,55,0.30), 0 2px 8px rgba(232,121,160,0.35)",
                                border: "3px solid rgba(255,255,255,0.9)",
                            }}
                        >
                            {systemLogo ? (
                                <img src={systemLogo} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <span
                                    className="font-bold text-white"
                                    style={{ fontSize: 28, textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
                                >
                                    {systemName.charAt(0)}
                                </span>
                            )}
                        </div>

                        {/* Brand name */}
                        <h1
                            className="text-2xl font-bold tracking-wide text-center"
                            style={{
                                background: "linear-gradient(135deg, #c0547a 0%, #9a3a5c 50%, #b8963e 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                letterSpacing: "0.04em",
                            }}
                        >
                            {systemName}
                        </h1>

                        {/* Tagline */}
                        <p
                            className="text-xs mt-1 tracking-widest uppercase"
                            style={{ color: "#d4af37", letterSpacing: "0.22em" }}
                        >
                            Management System
                        </p>
                    </div>

                    <GoldDivider />

                    <p className="text-center text-sm mb-7" style={{ color: "#a07080" }}>
                        Welcome back — please sign in to continue
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Error alert */}
                        {errorMessage && (
                            <div
                                className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                                style={{
                                    background: "rgba(255,240,245,0.9)",
                                    border: "1px solid rgba(220,80,100,0.25)",
                                    color: "#c0394d",
                                }}
                            >
                                <span>✕</span>
                                {errorMessage}
                            </div>
                        )}

                        {/* Username */}
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-xs font-semibold mb-1.5 tracking-wider uppercase"
                                style={{ color: "#b8963e" }}
                            >
                                Username
                            </label>
                            <div className="relative">
                                <span
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: "#d4af37", fontSize: 15 }}
                                >
                                    ✦
                                </span>
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                    className="w-full pl-9 pr-4 py-3 rounded-xl text-sm transition-all outline-none"
                                    style={{
                                        background: "rgba(255,248,252,0.8)",
                                        border: errors.username
                                            ? "1.5px solid rgba(220,80,100,0.5)"
                                            : "1.5px solid rgba(212,175,55,0.25)",
                                        color: "#4a2535",
                                        boxShadow: "0 1px 4px rgba(212,175,55,0.07)",
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.border = "1.5px solid rgba(212,175,55,0.7)";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.10)";
                                    }}
                                    {...register("username", {
                                        required: "Username is required",
                                        minLength: { value: 3, message: "Min 3 characters" },
                                        onBlur: (e) => {
                                            e.currentTarget.style.border = errors.username
                                                ? "1.5px solid rgba(220,80,100,0.5)"
                                                : "1.5px solid rgba(212,175,55,0.25)";
                                            e.currentTarget.style.boxShadow = "0 1px 4px rgba(212,175,55,0.07)";
                                        },
                                    })}
                                />
                            </div>
                            {errors.username && (
                                <p className="mt-1.5 text-xs" style={{ color: "#c0394d" }}>
                                    {errors.username.message}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-xs font-semibold mb-1.5 tracking-wider uppercase"
                                style={{ color: "#b8963e" }}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <span
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: "#d4af37", fontSize: 15 }}
                                >
                                    ✦
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full pl-9 pr-11 py-3 rounded-xl text-sm transition-all outline-none"
                                    style={{
                                        background: "rgba(255,248,252,0.8)",
                                        border: errors.password
                                            ? "1.5px solid rgba(220,80,100,0.5)"
                                            : "1.5px solid rgba(212,175,55,0.25)",
                                        color: "#4a2535",
                                        boxShadow: "0 1px 4px rgba(212,175,55,0.07)",
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.border = "1.5px solid rgba(212,175,55,0.7)";
                                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,175,55,0.10)";
                                    }}
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: { value: 6, message: "Min 6 characters" },
                                        onBlur: (e) => {
                                            e.currentTarget.style.border = errors.password
                                                ? "1.5px solid rgba(220,80,100,0.5)"
                                                : "1.5px solid rgba(212,175,55,0.25)";
                                            e.currentTarget.style.boxShadow = "0 1px 4px rgba(212,175,55,0.07)";
                                        },
                                    })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs transition-opacity"
                                    style={{ color: "#c0a0b0", opacity: 0.8 }}
                                    tabIndex={-1}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1.5 text-xs" style={{ color: "#c0394d" }}>
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Remember me */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded accent-pink-400"
                                    {...register("rememberMe")}
                                />
                                <span className="text-xs" style={{ color: "#a07080" }}>Remember me</span>
                            </label>
                            <a
                                href="#"
                                className="text-xs hover:underline transition-colors"
                                style={{ color: "#b8963e" }}
                            >
                                Forgot password?
                            </a>
                        </div>

                        {/* Sign In button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-xl font-semibold text-sm text-white tracking-wider uppercase transition-all active:scale-[0.98]"
                            style={{
                                background: isLoading
                                    ? "linear-gradient(135deg, #f0b8cc, #e8c878)"
                                    : "linear-gradient(135deg, #f472b6 0%, #e879a0 30%, #c0547a 65%, #b8963e 100%)",
                                boxShadow: isLoading
                                    ? "none"
                                    : "0 4px 18px rgba(212,175,55,0.28), 0 2px 8px rgba(232,121,160,0.35)",
                                letterSpacing: "0.12em",
                            }}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="animate-spin w-4 h-4 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Signing In…
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    {/* Contact admin */}
                    <p className="text-center text-xs mt-7" style={{ color: "#c0a0b0" }}>
                        Don&apos;t have an account?{" "}
                        <a href="#" className="font-semibold hover:underline" style={{ color: "#b8963e" }}>
                            Contact Admin
                        </a>
                    </p>
                </div>

                {/* Gold bottom accent bar */}
                <div
                    className="h-0.5 w-full"
                    style={{
                        background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)",
                    }}
                />
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-xs" style={{ color: "rgba(160,112,128,0.65)" }}>
                © {new Date().getFullYear()}{" "}
                <span style={{ color: "rgba(184,150,62,0.75)" }}>{systemName}</span>. All rights reserved.
            </p>
        </div>
    );
}
