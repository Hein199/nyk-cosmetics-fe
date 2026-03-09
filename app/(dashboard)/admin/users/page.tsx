"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Salesperson {
    id: number;
    name: string;
    region: string | null;
    monthly_target: number | null;
}

interface User {
    id: number;
    username: string;
    role: "ADMIN" | "SALESPERSON";
    phone_number: string | null;
    is_active: boolean;
    remark: string | null;
    created_at: string;
    salesperson: Salesperson | null;
}

const emptyForm = {
    username: "",
    password: "",
    confirmPassword: "",
    role: "SALESPERSON" as "ADMIN" | "SALESPERSON",
    phone: "",
    region: "",
    target: "",
    remark: "",
};

type FormState = typeof emptyForm;


export default function UsersPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const [form, setForm] = useState<FormState>(emptyForm);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError("");
        try {
            const data = await apiFetch("/users", { token });
            setUsers(data as User[]);
        } catch {
            setError("Failed to load users.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter((u) => {
        const q = search.toLowerCase();
        return (
            u.username.toLowerCase().includes(q) ||
            (u.salesperson?.name ?? "").toLowerCase().includes(q) ||
            (u.phone_number ?? "").toLowerCase().includes(q)
        );
    });

    function openCreate() {
        setForm(emptyForm);
        setFormError("");
        setCreateOpen(true);
    }

    function openEdit(u: User) {
        setSelectedUser(u);
        setForm({
            username: u.username,
            password: "",
            confirmPassword: "",
            role: u.role,
            phone: u.phone_number ?? "",
            region: u.salesperson?.region ?? "",
            target: u.salesperson?.monthly_target?.toString() ?? "",
            remark: u.remark ?? "",
        });
        setFormError("");
        setEditOpen(true);
    }

    function validateForm(isEdit: boolean): boolean {
        if (!form.username.trim()) {
            setFormError("Username is required.");
            return false;
        }
        if (!isEdit && !form.password) {
            setFormError("Password is required.");
            return false;
        }
        if (!isEdit && form.password !== form.confirmPassword) {
            setFormError("Passwords do not match.");
            return false;
        }
        return true;
    }

    async function handleSubmit(isEdit: boolean) {
        if (!validateForm(isEdit)) return;
        setSubmitting(true);
        setFormError("");
        try {
            const payload: Record<string, unknown> = {
                username: form.username,
                role: form.role,
                phone_number: form.phone || undefined,
                remark: form.remark || undefined,
            };
            if (!isEdit && form.password) payload.password = form.password;
            if (form.role === "SALESPERSON") payload.salesperson_name = form.username;
            if (form.role === "SALESPERSON") {
                if (form.region) payload.region = form.region;
                if (form.target) payload.monthly_target = form.target;
            }

            if (isEdit && selectedUser) {
                await apiFetch(`/users/${selectedUser.id}`, {
                    method: "PATCH",
                    token,
                    body: payload,
                });
            } else {
                await apiFetch("/users", {
                    method: "POST",
                    token,
                    body: payload,
                });
            }
            await fetchUsers();
            setCreateOpen(false);
            setEditOpen(false);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Operation failed.";
            setFormError(msg);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!selectedUser) return;
        setSubmitting(true);
        try {
            await apiFetch(`/users/${selectedUser.id}`, {
                method: "DELETE",
                token,
            });
            setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
            setDeleteOpen(false);
            setEditOpen(false);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Delete failed.";
            setFormError(msg);
        } finally {
            setSubmitting(false);
        }
    }

    function formFields(isEdit: boolean) {
        return (
            <div className="space-y-4">
                {formError && (
                    <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2 border border-red-200">
                        {formError}
                    </p>
                )}

                {/* Username */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <Input
                        placeholder="Enter username"
                        value={form.username}
                        onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                        className="w-full"
                    />
                </div>

                {/* Password + Confirm Password (create only) */}
                {!isEdit && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <Input
                                type="password"
                                placeholder="Enter password"
                                value={form.password}
                                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <Input
                                type="password"
                                placeholder="Re-enter password"
                                value={form.confirmPassword}
                                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                {/* Role + Phone */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            value={form.role}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    role: e.target.value as "ADMIN" | "SALESPERSON",
                                }))
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="SALESPERSON">Salesperson</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <Input
                            placeholder="08xxxxxxxxxx"
                            value={form.phone}
                            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Region + Monthly Target (salesperson only) */}
                {form.role === "SALESPERSON" && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                            <Input
                                placeholder="e.g. Yangon"
                                value={form.region}
                                onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Target (MMK)</label>
                            <Input
                                placeholder="e.g. 50000000"
                                value={form.target}
                                onChange={(e) => setForm((prev) => ({ ...prev, target: e.target.value }))}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                {/* Remark */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                    <Input
                        placeholder="Optional note"
                        value={form.remark}
                        onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
                        className="w-full"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage admin and salesperson accounts
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={openCreate}>+ Add User</Button>
                </div>
            </div>

            {/* Search */}
            <Input
                placeholder="Search by username, name, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white"
            />

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                {loading ? (
                    <p className="p-6 text-gray-500">Loading…</p>
                ) : error ? (
                    <p className="p-6 text-red-500">{error}</p>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr>
                                {[
                                    "ID",
                                    "Username",
                                    "Role",
                                    "Phone",
                                    "Region",
                                    "Actions",
                                ].map((h, idx) => (
                                    <th
                                        key={h}
                                        className={`py-3 px-4 text-sm font-medium text-white bg-blue-600 first:rounded-tl last:rounded-tr ${idx !== 0 ? "border-l border-blue-500/40" : ""} ${h === "Actions" ? "text-center" : "text-left"}`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="border-b border-gray-100 hover:bg-gray-50"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-400 font-mono">
                                            #{u.id}
                                        </td>
                                        <td className="py-3 px-4 text-sm font-medium text-gray-900 border-l border-gray-200">
                                            {u.username}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 border-l border-gray-200">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                    u.role === "ADMIN"
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-blue-100 text-blue-700"
                                                }`}
                                            >
                                                {u.role === "ADMIN" ? "Admin" : "Salesperson"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 border-l border-gray-200">
                                            {u.phone_number ?? "—"}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 border-l border-gray-200">
                                            {u.salesperson?.region ?? "—"}
                                        </td>
                                        <td className="py-3 px-4 border-l border-gray-200 text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full sm:w-auto"
                                                onClick={() => openEdit(u)}
                                            >
                                                Edit
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-gray-900">Add New User</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        {formFields(false)}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                            >
                                {submitting ? "Saving…" : "Create User"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-gray-900">Edit User</DialogTitle>
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={() => setEditOpen(false)}
                                className="text-gray-500 hover:text-gray-900"
                            >
                                ✕
                            </button>
                        </div>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        {formFields(true)}
                        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                                onClick={() => setDeleteOpen(true)}
                                disabled={submitting}
                            >
                                Delete User
                            </Button>
                            <Button
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                            >
                                {submitting ? "Saving…" : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle className="text-gray-900">
                            Delete User
                        </DialogTitle>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                        <p className="text-sm text-gray-600 mt-2">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold">
                                {selectedUser?.username}
                            </span>
                            ? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={submitting}
                            >
                                {submitting ? "Deleting…" : "Yes, Delete"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
