"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface Expense {
    id: string;
    description: string;
    amount: string | number;
    category: string;
    payment_method: string;
    remark?: string | null;
    created_at: string;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function ExpensesPage() {
    const { token } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Form
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [remark, setRemark] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK">(
        "CASH"
    );

    const fetchExpenses = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await apiFetch<Expense[]>("/expenses", { token });
            setExpenses(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load expenses"
            );
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        if (!q) return expenses;
        return expenses.filter(
            (e) =>
                e.description.toLowerCase().includes(q) ||
                e.category.toLowerCase().includes(q)
        );
    }, [expenses, searchQuery]);

    const totalExpenses = useMemo(
        () => filtered.reduce((sum, e) => sum + Number(e.amount), 0),
        [filtered]
    );

    const handleCreate = async () => {
        if (!token || !description || !amount || !category) return;
        setSaving(true);
        setError(null);
        try {
            await apiFetch("/expenses", {
                method: "POST",
                token,
                body: {
                    description,
                    amount,
                    category,
                    payment_method: paymentMethod,
                    remark: remark || undefined,
                },
            });
            setIsCreateOpen(false);
            setDescription("");
            setAmount("");
            setCategory("");
            setRemark("");
            setPaymentMethod("CASH");
            await fetchExpenses();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to create expense"
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
                        Expenses
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Track and manage business expenses
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                    + Add Expense
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>All Expenses</CardTitle>
                    <CardDescription>
                        {filtered.length} expenses — Total:{" "}
                        {formatCurrency(totalExpenses)}
                    </CardDescription>
                    <div className="pt-2">
                        <Input
                            placeholder="Search by description or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-md"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            Loading expenses...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Date
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Description
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Category
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Amount
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Payment
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Remark
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="text-center py-8 text-gray-500"
                                            >
                                                No expenses found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((e) => (
                                            <tr
                                                key={e.id}
                                                className="border-b border-gray-100 hover:bg-gray-50"
                                            >
                                                <td className="py-3 px-4 text-sm text-gray-500">
                                                    {new Date(
                                                        e.created_at
                                                    ).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-gray-900">
                                                    {e.description}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                                                        {e.category}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-semibold text-red-600">
                                                    {formatCurrency(
                                                        Number(e.amount)
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center text-sm text-gray-700">
                                                    {e.payment_method}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500">
                                                    {e.remark ?? "-"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Expense Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Add New Expense</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What was this expense for?"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount (MMK)
                                </label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g. 50000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <Input
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="e.g. Rent, Utilities"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Method
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) =>
                                    setPaymentMethod(
                                        e.target.value as "CASH" | "BANK"
                                    )
                                }
                                className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg bg-white shadow-sm"
                            >
                                <option value="CASH">CASH</option>
                                <option value="BANK">BANK</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Remark
                            </label>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Optional notes..."
                                rows={3}
                                className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={
                                    saving ||
                                    !description ||
                                    !amount ||
                                    !category
                                }
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                            >
                                {saving ? "Saving..." : "Create"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
