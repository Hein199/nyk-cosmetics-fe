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
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

interface Payment {
    id: string;
    created_at: string;
    amount_paid: string | number;
    payment_type: string;
    status: string;
    customer: { id: string; name: string; phone_number: string } | null;
    order: { id: string; total_amount: string | number; created_at: string } | null;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function PaymentHistoryPage() {
    const { token } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchPayments = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<Payment[]>("/payments", { token, signal });
            setPayments(data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setError(
                err instanceof Error ? err.message : "Failed to load payments"
            );
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        fetchPayments(controller.signal);
        return () => controller.abort();
    }, [fetchPayments]);

    const filteredPayments = useMemo(() => {
        return payments.filter((p) => {
            const pDate = p.created_at.split("T")[0];
            const matchesFrom = !fromDate || pDate >= fromDate;
            const matchesTo = !toDate || pDate <= toDate;
            const matchesStatus =
                statusFilter === "all" ||
                p.status.toLowerCase() === statusFilter.toLowerCase();
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                (p.customer?.name ?? "").toLowerCase().includes(q) ||
                p.id.toLowerCase().includes(q) ||
                (p.order?.id ?? "").toLowerCase().includes(q);
            return matchesFrom && matchesTo && matchesStatus && matchesSearch;
        });
    }, [payments, searchQuery, fromDate, toDate, statusFilter]);

    const totalAmount = useMemo(
        () => filteredPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0),
        [filteredPayments]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Payment History
                    </h1>
                    <p className="text-gray-500 mt-1">
                        View all payment records
                    </p>
                </div>
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
                            <CardTitle className="text-xl">
                                All Payments
                            </CardTitle>
                            <CardDescription>
                                Showing {filteredPayments.length} payments
                                {filteredPayments.length > 0 &&
                                    ` — Total: ${formatCurrency(totalAmount)}`}
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
                                        onChange={(e) =>
                                            setFromDate(e.target.value)
                                        }
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
                                        onChange={(e) =>
                                            setToDate(e.target.value)
                                        }
                                        className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
                                        min={fromDate}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-transparent mb-1">
                                        .
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const t = new Date()
                                                    .toISOString()
                                                    .split("T")[0];
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
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by customer, order ID..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="w-full h-10"
                                />
                            </div>
                            <div className="sm:w-48">
                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                    className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
                                >
                                    <option value="all">All Status</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="PENDING">Pending</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            Loading payments...
                        </div>
                    ) : (
                        <>
                            {/* Mobile */}
                            <div className="block sm:hidden space-y-4">
                                {filteredPayments.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No payments found.
                                    </div>
                                ) : (
                                    filteredPayments.map((p) => (
                                        <div
                                            key={p.id}
                                            className="border border-gray-200 rounded-lg p-4 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-900">
                                                    {p.id.slice(0, 8)}
                                                </span>
                                                <span
                                                    className={`px-2 py-1 text-xs font-bold rounded border ${p.status === "CONFIRMED" ? "bg-green-50 text-green-600 border-green-200" : "bg-yellow-50 text-yellow-600 border-yellow-200"}`}
                                                >
                                                    {p.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700">
                                                {p.customer?.name ?? "N/A"}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">
                                                    {formatDate(p.created_at)}
                                                </span>
                                                <span className="font-bold text-gray-900">
                                                    {formatCurrency(
                                                        Number(p.amount_paid)
                                                    )}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {p.payment_type} — Order:{" "}
                                                {p.order?.id.slice(0, 8) ?? "-"}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Desktop */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                Payment ID
                                            </th>
                                            <th className="text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                Date
                                            </th>
                                            <th className="text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                Customer
                                            </th>
                                            <th className="text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                Order ID
                                            </th>
                                            <th className="text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                Amount
                                            </th>
                                            <th className="text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                Type
                                            </th>
                                            <th className="text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="text-center py-8 text-gray-500"
                                                >
                                                    No payments found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPayments.map((p) => (
                                                <tr
                                                    key={p.id}
                                                    className="border-b border-gray-100 hover:bg-gray-50"
                                                >
                                                    <td className="py-3 px-4 text-center text-sm font-medium text-gray-900 border-l border-gray-200">
                                                        {p.id.slice(0, 8)}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-sm text-gray-900 border-l border-gray-200">
                                                        {formatDate(
                                                            p.created_at
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-sm text-gray-900 border-l border-gray-200">
                                                        {p.customer?.name ??
                                                            "N/A"}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-sm text-gray-900 border-l border-gray-200">
                                                        {p.order?.id.slice(
                                                            0,
                                                            8
                                                        ) ?? "-"}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-sm font-semibold text-gray-900 border-l border-gray-200">
                                                        {formatCurrency(
                                                            Number(
                                                                p.amount_paid
                                                            )
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-sm text-gray-700 border-l border-gray-200">
                                                        {p.payment_type}
                                                    </td>
                                                    <td className="py-3 px-4 text-center border-l border-gray-200">
                                                        <span
                                                            className={`px-2 py-1 text-xs font-bold rounded border ${p.status === "CONFIRMED" ? "bg-green-50 text-green-600 border-green-200" : "bg-yellow-50 text-yellow-600 border-yellow-200"}`}
                                                        >
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
