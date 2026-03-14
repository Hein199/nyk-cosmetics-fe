"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { thaiToday, toBangkokDateStr } from "@/lib/utils";

interface Expense {
    id: number;
    expenseCode: string;
    description: string;
    amount: string | number;
    payment_method: string;
    remark?: string | null;
    created_at: string;
}

function todayStr() {
    return thaiToday();
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
    const queryClient = useQueryClient();

    const { data: expenses = [], isLoading: loading, error: queryError } = useQuery({
        queryKey: ["expenses"],
        queryFn: () => apiFetch<Expense[]>("/expenses", { token }),
        enabled: !!token,
    });

    const [error, setError] = useState<string | null>(queryError?.message ?? null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Form
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [remark, setRemark] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK">(
        "CASH"
    );
    const [expenseDate, setExpenseDate] = useState(todayStr());

    const filtered = useMemo(() => {
        return expenses.filter((e) => {
            const eDate = toBangkokDateStr(e.created_at);
            const matchesFrom = !fromDate || eDate >= fromDate;
            const matchesTo = !toDate || eDate <= toDate;
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                e.description.toLowerCase().includes(q);
            return matchesFrom && matchesTo && matchesSearch;
        });
    }, [expenses, searchQuery, fromDate, toDate]);

    const totalExpenses = useMemo(
        () => filtered.reduce((sum, e) => sum + Number(e.amount), 0),
        [filtered]
    );

    const createMutation = useMutation({
        mutationFn: () => apiFetch("/expenses", {
            method: "POST",
            token,
            body: {
                description,
                amount,
                payment_method: paymentMethod,
                remark: remark || undefined,
                expense_date: expenseDate,
            },
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            setIsCreateOpen(false);
            setDescription("");
            setAmount("");
            setRemark("");
            setPaymentMethod("CASH");
            setExpenseDate(todayStr());
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : "Failed to create expense");
        },
    });

    const handleCreate = () => {
        if (!token || !description || !amount) return;
        setError(null);
        createMutation.mutate();
    };
    const saving = createMutation.isPending;

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
                <CardHeader className="pb-4">
                    <div className="flex flex-col space-y-4">
                        <div>
                            <CardTitle className="text-xl">All Expenses</CardTitle>
                            <CardDescription>
                                Showing {filtered.length} expenses
                                {filtered.length > 0 &&
                                    ` — Total: ${formatCurrency(totalExpenses)}`}
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-500 mb-1">
                                        From
                                    </label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-500 mb-1">
                                        To
                                    </label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
                                        min={fromDate}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-transparent mb-1">.</label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const t = thaiToday();
                                                setFromDate(t);
                                                setToDate(t);
                                            }}
                                            className="text-xs h-10 w-16"
                                        >
                                            Today
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setFromDate("");
                                                setToDate("");
                                            }}
                                            className="text-xs h-10 w-16"
                                        >
                                            All
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <Input
                                placeholder="Search by description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10"
                            />
                        </div>
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
                                    <tr className="divide-x divide-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Expense ID
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Date
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Description
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
                                        <tr className="divide-x divide-gray-200">
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
                                                className="border-b border-gray-100 hover:bg-gray-50 divide-x divide-gray-200"
                                            >
                                                <td className="py-3 px-4 text-sm text-gray-700">
                                                    {e.expenseCode}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500">
                                                    {new Date(
                                                        e.created_at
                                                    ).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-gray-900">
                                                    {e.description}
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
                <DialogContent className="sm:max-w-lg rounded-lg shadow-lg p-0 gap-0">
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200">
                        <DialogTitle className="text-lg font-semibold text-gray-900">
                            Add New Expense
                        </DialogTitle>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {/* Row 1: Date */}
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    className="w-full h-10 px-3 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                />
                            </div>
                        </div>

                        {/* Row 2: Amount + Payment Method */}
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
                                    className="h-10 rounded-md px-3 border-gray-300"
                                />
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
                                    className="w-full h-10 px-3 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                >
                                    <option value="CASH">CASH</option>
                                    <option value="BANK">BANK</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 3: Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What was this expense for?"
                                className="h-10 rounded-md px-3 border-gray-300"
                            />
                        </div>

                        {/* Row 4: Remark */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Remark
                            </label>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Optional notes..."
                                className="w-full min-h-[90px] px-3 py-2 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                            className="h-10 px-4 border-gray-300 text-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={
                                saving ||
                                !description ||
                                !amount
                            }
                            className="h-10 px-4 bg-pink-600 hover:bg-pink-700 text-white"
                        >
                            {saving ? "Saving..." : "Create"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
