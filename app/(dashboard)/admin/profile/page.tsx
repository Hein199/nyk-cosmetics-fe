"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type UserProfile = {
    id: number;
    username: string;
    role: string;
    phone_number: string | null;
    photo_url: string | null;
    created_at: string;
};

export default function AdminProfilePage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [form, setForm] = useState({
        photo_url: "",
    });

    // System branding state
    const [brandingForm, setBrandingForm] = useState({ system_name: "", system_logo: "" });
    const [brandingSuccess, setBrandingSuccess] = useState<string | null>(null);
    const [brandingError, setBrandingError] = useState<string | null>(null);

    const { data: profile = null, isLoading: loading } = useQuery({
        queryKey: ["admin-profile"],
        queryFn: async () => {
            const [profileData, settingsData] = await Promise.all([
                apiFetch<UserProfile>("/users/me", { token }),
                apiFetch<{ system_name?: string; system_logo?: string }>("/settings", { token }).catch(() => null),
            ]);
            setForm({ photo_url: profileData.photo_url ?? "" });
            if (settingsData) {
                setBrandingForm({
                    system_name: settingsData.system_name ?? "NYK Cosmetics",
                    system_logo: settingsData.system_logo ?? "",
                });
            }
            return profileData;
        },
        enabled: !!token,
    });

    const saveMutation = useMutation({
        mutationFn: () => apiFetch<UserProfile>("/users/me", {
            method: "PATCH",
            token,
            body: { photo_url: form.photo_url },
        }),
        onSuccess: (data) => {
            queryClient.setQueryData(["admin-profile"], data);
            setForm({ photo_url: data.photo_url ?? "" });
            setEditing(false);
            setSuccess("Profile photo updated successfully.");
            setTimeout(() => setSuccess(null), 3000);
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : "Failed to save profile");
        },
    });

    const handleSave = () => {
        if (!token) return;
        setError(null);
        setSuccess(null);
        saveMutation.mutate();
    };
    const saving = saveMutation.isPending;

    const brandingMutation = useMutation({
        mutationFn: () => apiFetch<{ system_name?: string; system_logo?: string }>("/settings", {
            method: "PATCH",
            token,
            body: brandingForm,
        }),
        onSuccess: (data) => {
            setBrandingForm({
                system_name: data.system_name ?? "NYK Cosmetics",
                system_logo: data.system_logo ?? "",
            });
            setBrandingSuccess("System branding updated. Refresh to see changes in sidebar.");
            setTimeout(() => setBrandingSuccess(null), 4000);
        },
        onError: (err) => {
            setBrandingError(err instanceof Error ? err.message : "Failed to save branding");
        },
    });

    const handleBrandingSave = () => {
        if (!token) return;
        setBrandingError(null);
        setBrandingSuccess(null);
        brandingMutation.mutate();
    };
    const brandingSaving = brandingMutation.isPending;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FFCDC9] p-6">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader><CardTitle>Loading profile...</CardTitle></CardHeader>
                    </Card>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#FFCDC9] p-6">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm text-red-600">{error || "Unable to load profile."}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFCDC9] p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                        {success}
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                        {error}
                    </div>
                )}

                <Card className="bg-white">
                    <CardContent className="p-6 space-y-6">
                        {/* Profile Photo */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">Profile Photo</label>
                            {editing ? (
                                <ImageUpload
                                    value={form.photo_url}
                                    onChange={(url) => setForm((f) => ({ ...f, photo_url: url }))}
                                    token={token!}
                                    disabled={saving}
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                                    {profile.photo_url ? (
                                        <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Username (read-only) */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Username</label>
                            <p className="text-sm text-gray-900 py-2 px-3 bg-gray-100 rounded-lg">
                                {profile.username}
                            </p>
                        </div>

                        {/* Phone Number (read-only) */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Phone Number</label>
                            <p className="text-sm text-gray-900 py-2 px-3 bg-gray-100 rounded-lg">
                                {profile.phone_number || "—"}
                            </p>
                        </div>

                        {/* Role (read-only) */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Role</label>
                            <p className="text-sm text-gray-900 py-2 px-3 bg-gray-100 rounded-lg capitalize">
                                {profile.role.toLowerCase()}
                            </p>
                        </div>

                        {/* Account Created Date (read-only) */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Account Created</label>
                            <p className="text-sm text-gray-900 py-2 px-3 bg-gray-100 rounded-lg">
                                {new Date(profile.created_at).toLocaleDateString("en-US", {
                                    timeZone: "Asia/Yangon",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>

                        <p className="text-xs text-gray-400">To edit username, phone number, or role, go to Admin → Users page.</p>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            {editing ? (
                                <>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
                                    >
                                        {saving ? "Saving..." : "Save Photo"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEditing(false);
                                            setError(null);
                                            setForm({ photo_url: profile.photo_url ?? "" });
                                        }}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={() => setEditing(true)}
                                    className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
                                >
                                    Change Photo
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* System Branding (Admin only) */}
                <Card className="bg-white">
                    <CardContent className="p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-gray-900">System Branding</h2>
                        <p className="text-xs text-gray-500">Changes apply system-wide for all users.</p>

                        {brandingSuccess && (
                            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                                {brandingSuccess}
                            </div>
                        )}
                        {brandingError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                                {brandingError}
                            </div>
                        )}

                        {/* System Name */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">System Name</label>
                            <Input
                                value={brandingForm.system_name}
                                onChange={(e) => setBrandingForm((f) => ({ ...f, system_name: e.target.value }))}
                                placeholder="NYK Cosmetics"
                                disabled={brandingSaving}
                            />
                        </div>

                        {/* System Logo */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">System Logo</label>
                            <ImageUpload
                                value={brandingForm.system_logo}
                                onChange={(url) => setBrandingForm((f) => ({ ...f, system_logo: url }))}
                                token={token!}
                                disabled={brandingSaving}
                            />
                        </div>

                        <Button
                            onClick={handleBrandingSave}
                            disabled={brandingSaving}
                            className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
                        >
                            {brandingSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
