"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LoginFormData {
    username: string;
    password: string;
    rememberMe: boolean;
}

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { login, user, loading } = useAuth();
    const router = useRouter();

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
        defaultValues: {
            username: "",
            password: "",
            rememberMe: false,
        },
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
        <div className="w-full max-w-md mx-auto px-4">
            <Card>
                <CardHeader className="text-center">
                    {/* NYK Cosmetics Logo/Branding */}
                    <div className="mb-4">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">NYK</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        NYK Cosmetics
                    </CardTitle>
                    <p className="text-gray-500 mt-2">Sign in to your account</p>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {errorMessage && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                                {errorMessage}
                            </div>
                        )}
                        <Input
                            label="Username"
                            type="text"
                            placeholder="your username"
                            error={errors.username?.message}
                            {...register("username", {
                                required: "Username is required",
                                minLength: {
                                    value: 3,
                                    message: "Username must be at least 3 characters",
                                },
                            })}
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            error={errors.password?.message}
                            {...register("password", {
                                required: "Password is required",
                                minLength: {
                                    value: 6,
                                    message: "Password must be at least 6 characters",
                                },
                            })}
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                                    {...register("rememberMe")}
                                />
                                <span className="text-sm text-gray-600">Remember me</span>
                            </label>

                            <a
                                href="#"
                                className="text-sm text-pink-600 hover:text-pink-700 hover:underline"
                            >
                                Forgot password?
                            </a>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                            size="lg"
                            isLoading={isLoading}
                        >
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Don&apos;t have an account?{" "}
                            <a
                                href="#"
                                className="text-pink-600 hover:text-pink-700 font-medium hover:underline"
                            >
                                Contact Admin
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <p className="mt-8 text-center text-sm text-gray-400">
                © {new Date().getFullYear()} NYK Cosmetics. All rights reserved.
            </p>
        </div>
    );
}
