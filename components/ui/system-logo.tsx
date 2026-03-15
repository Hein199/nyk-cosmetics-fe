"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type BrandingSettings = {
    system_name?: string;
    system_logo?: string;
};

type SystemLogoProps = {
    size?: "sm" | "md" | "lg";
    showName?: boolean;
    subtitle?: string;
    className?: string;
    logoClassName?: string;
    nameClassName?: string;
    subtitleClassName?: string;
};

const sizeMap: Record<NonNullable<SystemLogoProps["size"]>, string> = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-xl",
};

export function SystemLogo({
    size = "md",
    showName = false,
    subtitle,
    className,
    logoClassName,
    nameClassName,
    subtitleClassName,
}: SystemLogoProps) {
    const [systemName, setSystemName] = useState("NYK Cosmetics");
    const [systemLogo, setSystemLogo] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        apiFetch<BrandingSettings>("/settings")
            .then((data) => {
                if (!mounted) return;
                if (data?.system_name) {
                    setSystemName(data.system_name);
                }
                if (data?.system_logo) {
                    setSystemLogo(data.system_logo);
                } else {
                    setSystemLogo(null);
                }
            })
            .catch(() => {
                // Keep default branding values on fetch failure.
            });

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className={cn("flex items-center space-x-3", className)}>
            <div
                className={cn(
                    "rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 text-white font-bold",
                    sizeMap[size],
                    logoClassName,
                )}
            >
                {systemLogo ? (
                    <img src={systemLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <span>{systemName.charAt(0)}</span>
                )}
            </div>

            {showName && (
                <div>
                    <h2 className={cn("text-lg font-semibold text-gray-900", nameClassName)}>{systemName}</h2>
                    {subtitle ? (
                        <p className={cn("text-sm text-gray-600", subtitleClassName)}>{subtitle}</p>
                    ) : null}
                </div>
            )}
        </div>
    );
}
