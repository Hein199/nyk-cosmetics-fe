"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

interface User {
    id: string;
    username: string;
    role: string;
    created_at: string;
    salesperson?: {
        id: string;
        name: string;
        monthly_target: string | number;
    } | null;
}

export default function UsersPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"ADMIN" | "SALESPERSON">("SALESPERSON");
    const [salespersonName, setSalespersonName] = useState("");
    const [monthlyTarget, setMonthlyTarget] = useState("");

    const fetchUsers = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await apiFetch<User[]>("/users", { token, signal });
            setUsers(data);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setError(
                err instanceof Error ? err.message : "Failed to load users"
            );
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        fetchUsers(controller.signal);
        return () => controller.abort();
    }, [fetchUsers]);

    const resetForm = () => {
        setUsername("");
        setPassword("");
        setRole("SALESPERSON");
        setSalespersonName("");
        setMonthlyTarget("");
    };

    const openCreate = () => {
        resetForm();
        setEditUser(null);
        setIsCreateOpen(true);
    };

    const openEdit = (u: User) => {
        setEditUser(u);
        setUsername(u.username);
        setPassword("");
        setRole(u.role as "ADMIN" | "SALESPERSON");
        setSalespersonName(u.salesperson?.name ?? "");
        setMonthlyTarget(
            u.salesperson?.monthly_target
                ? String(u.salesperson.monthly_target)
                : ""
        );
        setIsCreateOpen(true);
    };

    const handleSubmit = async () => {
        if (!token) return;
        setSaving(true);
        setError(null);
        try {
            if (editUser) {
                const body: Record<string, unknown> = { username, role };
                if (password) body.password = password;
                if (role === "SALESPERSON") {
                    body.salesperson_name = salespersonName;
                    body.monthly_target = monthlyTarget;
                }
                await apiFetch(`/users/${editUser.id}`, {
                    method: "PATCH",
                    token,
                    body,
                });
            } else {
                const body: Record<string, unknown> = {
                    username,
                    password,
                    role,
                };
                if (role === "SALESPERSON") {
                    body.salesperson_name = salespersonName;
                    body.monthly_target = monthlyTarget;
                }
                await apiFetch("/users", {
                    method: "POST",
                    token,
                    body,
                });
            }
            setIsCreateOpen(false);
            resetForm();
            await fetchUsers();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to save user"
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        User Management
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Manage system users and salespersons
                    </p>
                </div>
                <Button
                    onClick={openCreate}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                    + Add User
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <CardDescription>
                        {users.length} users total
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            Loading users...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Username
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Role
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Salesperson Name
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Monthly Target
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Created
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr
                                            key={u.id}
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <td className="py-3 px-4 font-medium text-gray-900">
                                                {u.username}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span
                                                    className={`px-2 py-1 text-xs font-bold rounded border ${u.role === "ADMIN" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}
                                                >
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-700">
                                                {u.salesperson?.name ?? "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-700">
                                                {u.salesperson?.monthly_target
                                                    ? new Intl.NumberFormat(
                                                        "en-MM",
                                                        {
                                                            style: "currency",
                                                            currency: "MMK",
                                                            minimumFractionDigits: 0,
                                                        }
                                                    ).format(
                                                        Number(
                                                            u.salesperson
                                                                .monthly_target
                                                        )
                                                    )
                                                    : "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm text-gray-500">
                                                {new Date(
                                                    u.created_at
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEdit(u)}
                                                >
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsCreateOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editUser ? "Edit User" : "Add New User"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password{" "}
                                {editUser && "(leave blank to keep current)"}
                            </label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={
                                    editUser
                                        ? "Leave blank to keep"
                                        : "Min 6 characters"
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) =>
                                    setRole(
                                        e.target.value as "ADMIN" | "SALESPERSON"
                                    )
                                }
                                className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg bg-white shadow-sm"
                            >
                                <option value="SALESPERSON">SALESPERSON</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                        {role === "SALESPERSON" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Salesperson Name
                                    </label>
                                    <Input
                                        value={salespersonName}
                                        onChange={(e) =>
                                            setSalespersonName(e.target.value)
                                        }
                                        placeholder="Full name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monthly Target (MMK)
                                    </label>
                                    <Input
                                        type="number"
                                        value={monthlyTarget}
                                        onChange={(e) =>
                                            setMonthlyTarget(e.target.value)
                                        }
                                        placeholder="e.g. 1000000"
                                    />
                                </div>
                            </>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={saving || !username || (!editUser && !password)}
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                            >
                                {saving
                                    ? "Saving..."
                                    : editUser
                                        ? "Update"
                                        : "Create"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
