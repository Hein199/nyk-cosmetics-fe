"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { formatId, thaiToday, formatThaiDate, toBangkokDateStr } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollectedBy {
    id: number;
    role: "ADMIN" | "SALESPERSON";
    salesperson: { name: string } | null;
}

interface Payment {
    id: number;
    created_at: string;
    amount_paid: string | number;
    payment_type: string;
    status: "PENDING" | "CONFIRMED" | "REJECTED";
    customer: { id: number; name: string; phone_number: string } | null;
    order: { id: number; total_amount: string | number; created_at: string } | null;
    collected_by: CollectedBy;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
    const safeAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(safeAmount);
}

function getCreatedByLabel(collected_by: CollectedBy): string {
    if (collected_by.role === "ADMIN") return "Admin";
    return collected_by.salesperson?.name ?? "Salesperson";
}

function statusBadge(status: Payment["status"]) {
    const styles: Record<Payment["status"], string> = {
        CONFIRMED: "bg-green-50 text-green-600 border-green-200",
        PENDING: "bg-yellow-50 text-yellow-600 border-yellow-200",
        REJECTED: "bg-red-50 text-red-600 border-red-200",
    };
    return (
        <span className={`px-2 py-1 text-xs font-bold rounded border ${styles[status]}`}>
            {status}
        </span>
    );
}

/** A salesperson-created payment that is still awaiting admin decision */
function needsAction(p: Payment): boolean {
    return p.status === "PENDING" && p.collected_by.role === "SALESPERSON";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentHistoryPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const todayDate = thaiToday();

    const normalizeDateRange = (from: string, to: string) => {
        const normalizedTo = !to ? "" : to > todayDate ? todayDate : to;
        if (!from || !normalizedTo) {
            return { fromDate: from, toDate: normalizedTo };
        }
        const normalizedFrom = from > normalizedTo ? normalizedTo : from;
        return { fromDate: normalizedFrom, toDate: normalizedTo };
    };

    const isDateRangeInvalid = Boolean(
        (fromDate && toDate && fromDate > toDate) ||
        (toDate && toDate > todayDate)
    );

    const handleFromDate = (value: string) => {
        const normalized = normalizeDateRange(value, toDate);
        setFromDate(normalized.fromDate);
        setToDate(normalized.toDate);
    };

    const handleToDate = (value: string) => {
        const normalized = normalizeDateRange(fromDate, value);
        setFromDate(normalized.fromDate);
        setToDate(normalized.toDate);
    };

    const handleTodayDateRange = () => {
        setFromDate(todayDate);
        setToDate(todayDate);
    };

    const handleAllDateRange = () => {
        setFromDate("");
        setToDate("");
    };

    const { data: payments = [], isLoading: loading, error: queryError } = useQuery({
        queryKey: ["admin-payments"],
        queryFn: () => apiFetch<Payment[]>("/payments", { token }),
        enabled: !!token && !isDateRangeInvalid,
    });
    const [error, setError] = useState<string | null>(queryError?.message ?? null);

    // Per-row action loading: { [paymentId]: 'confirm' | 'reject' | null }
    const [actionLoading, setActionLoading] = useState<Record<number, "confirm" | "reject" | null>>({});

    // ── Actions ──────────────────────────────────────────────────────────────

    async function handleAction(paymentId: number, action: "confirm" | "reject") {
        if (!token) return;
        setActionLoading((prev) => ({ ...prev, [paymentId]: action }));
        try {
            await apiFetch(`/payments/${paymentId}/${action}`, {
                token,
                method: "POST",
            });
            // Optimistically update local cache
            queryClient.setQueryData<Payment[]>(["admin-payments"], (old) =>
                (old ?? []).map((p) =>
                    p.id === paymentId
                        ? { ...p, status: action === "confirm" ? "CONFIRMED" : "REJECTED" }
                        : p
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${action} payment`);
        } finally {
            setActionLoading((prev) => ({ ...prev, [paymentId]: null }));
        }
    }

    // ── Filtering ────────────────────────────────────────────────────────────

    const filteredPayments = useMemo(() => {
        if (isDateRangeInvalid) {
            return [];
        }
        return payments.filter((p) => {
            const pDate = toBangkokDateStr(p.created_at);
            const matchesFrom = !fromDate || pDate >= fromDate;
            const matchesTo = !toDate || pDate <= toDate;
            const matchesStatus =
                statusFilter === "all" ||
                p.status.toLowerCase() === statusFilter.toLowerCase();
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                (p.customer?.name ?? "").toLowerCase().includes(q) ||
                String(p.id).includes(q) ||
                (p.order ? String(p.order.id) : "").includes(q) ||
                getCreatedByLabel(p.collected_by).toLowerCase().includes(q);
            return matchesFrom && matchesTo && matchesStatus && matchesSearch;
        });
    }, [payments, searchQuery, fromDate, toDate, statusFilter, isDateRangeInvalid]);

    const formatDateRange = (from: string, to: string) => {
        if (!from && !to) return "All dates";
        if (from === to) return formatThaiDate(from);
        if (from && to) {
            const [start, end] = from <= to ? [from, to] : [to, from];
            return `${formatThaiDate(start)} - ${formatThaiDate(end)}`;
        }
        if (from) return `From ${formatThaiDate(from)}`;
        return `Until ${formatThaiDate(to)}`;
    };

    const totalAmount = useMemo(
        () =>
            filteredPayments
                .filter((p) => p.status === "CONFIRMED")
                .reduce((sum, p) => sum + Number(p.amount_paid), 0),
        [filteredPayments]
    );

    const pendingCount = useMemo(
        () => payments.filter(needsAction).length,
        [payments]
    );

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
                    <p className="text-gray-500 mt-1">Review, confirm, or reject salesperson payments</p>
                </div>
                {pendingCount > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        {pendingCount} pending approval
                    </div>
                )}
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
                            <CardTitle className="text-xl">All Payments</CardTitle>
                            <CardDescription>
                                Showing {filteredPayments.length} payment
                                {filteredPayments.length !== 1 ? "s" : ""}
                                {totalAmount > 0 &&
                                    ` — Confirmed total: ${formatCurrency(totalAmount)}`}
                            </CardDescription>
                        </div>

                        {/* Date filters */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full sm:w-auto">
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-500 mb-1">From</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => handleFromDate(e.target.value)}
                                        max={toDate || todayDate}
                                        className={`w-full sm:w-40 px-3 py-2 text-sm text-black border rounded-lg focus:outline-none focus:ring-2 bg-white shadow-sm ${isDateRangeInvalid
                                            ? "border-red-300 focus:ring-red-500"
                                            : "border-gray-300 focus:ring-pink-500"}`}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-500 mb-1">To</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => handleToDate(e.target.value)}
                                        max={todayDate}
                                        className={`w-full sm:w-40 px-3 py-2 text-sm text-black border rounded-lg focus:outline-none focus:ring-2 bg-white shadow-sm ${isDateRangeInvalid
                                            ? "border-red-300 focus:ring-red-500"
                                            : "border-gray-300 focus:ring-pink-500"}`}
                                        min={fromDate}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-transparent mb-1">.</label>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleTodayDateRange}
                                        className="text-xs h-10 w-full sm:w-16"
                                    >
                                        Today
                                    </Button>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-transparent mb-1">.</label>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleAllDateRange}
                                        className="text-xs h-10 w-full sm:w-16"
                                    >
                                        All
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {isDateRangeInvalid && (
                            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                Invalid date range
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Found {filteredPayments.length} payments{" "}
                            {fromDate || toDate
                                ? `for ${formatDateRange(fromDate, toDate)}`
                                : ""}
                        </p>

                        {/* Search + status filter */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by customer, order ID, created by..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10"
                                    disabled={isDateRangeInvalid}
                                />
                            </div>
                            <div className="sm:w-48">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
                                    disabled={isDateRangeInvalid}
                                >
                                    <option value="all">All Status</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading payments...</div>
                    ) : (
                        <>
                            {/* ── Mobile cards ─────────────────────────────── */}
                            <div className="block sm:hidden space-y-4">
                                {filteredPayments.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">No payments found.</div>
                                ) : (
                                    filteredPayments.map((p) => (
                                        <div
                                            key={p.id}
                                            className="border border-gray-200 rounded-lg p-4 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-gray-900">
                                                    {formatId("PAY", p.id)}
                                                </span>
                                                {statusBadge(p.status)}
                                            </div>
                                            <p className="text-sm text-gray-700">
                                                {p.customer?.name ?? "N/A"}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500">
                                                    {formatThaiDate(p.created_at)}
                                                </span>
                                                <span className="font-bold text-gray-900">
                                                    {formatCurrency(Number(p.amount_paid))}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {p.payment_type} — Order:{" "}
                                                {p.order ? formatId("ORD", p.order.id) : "-"}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                By: {getCreatedByLabel(p.collected_by)}
                                            </p>
                                            {needsAction(p) && (
                                                <div className="flex gap-2 pt-1">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                                                        disabled={!!actionLoading[p.id]}
                                                        onClick={() => handleAction(p.id, "confirm")}
                                                    >
                                                        {actionLoading[p.id] === "confirm"
                                                            ? "Confirming…"
                                                            : "Confirm"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 text-xs h-8"
                                                        disabled={!!actionLoading[p.id]}
                                                        onClick={() => handleAction(p.id, "reject")}
                                                    >
                                                        {actionLoading[p.id] === "reject"
                                                            ? "Rejecting…"
                                                            : "Reject"}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* ── Desktop table ─────────────────────────────── */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            {[
                                                "Date",
                                                "Payment ID",
                                                "Order ID",
                                                "Customer",
                                                "Amount",
                                                "Created By",
                                                "Status",
                                                "Action",
                                            ].map((col) => (
                                                <th
                                                    key={col}
                                                    className="text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500"
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={8}
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
                                                    {/* Date */}
                                                    <td className="py-3 px-4 text-center text-sm text-gray-900 border-l border-gray-200 whitespace-nowrap">
                                                        {formatThaiDate(p.created_at)}
                                                    </td>
                                                    {/* Payment ID */}
                                                    <td className="py-3 px-4 text-center text-sm font-medium text-gray-900 border-l border-gray-200">
                                                        {formatId("PAY", p.id)}
                                                    </td>
                                                    {/* Order ID */}
                                                    <td className="py-3 px-4 text-center text-sm text-gray-900 border-l border-gray-200">
                                                        {p.order ? formatId("ORD", p.order.id) : "-"}
                                                    </td>
                                                    {/* Customer */}
                                                    <td className="py-3 px-4 text-center text-sm text-gray-900 border-l border-gray-200">
                                                        {p.customer?.name ?? "N/A"}
                                                    </td>
                                                    {/* Amount */}
                                                    <td className="py-3 px-4 text-center text-sm font-semibold text-gray-900 border-l border-gray-200">
                                                        {formatCurrency(Number(p.amount_paid))}
                                                    </td>
                                                    {/* Created By */}
                                                    <td className="py-3 px-4 text-center text-sm text-gray-700 border-l border-gray-200">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-xs font-medium ${p.collected_by.role === "ADMIN"
                                                                ? "bg-blue-50 text-blue-600"
                                                                : "bg-purple-50 text-purple-600"
                                                                }`}
                                                        >
                                                            {getCreatedByLabel(p.collected_by)}
                                                        </span>
                                                    </td>
                                                    {/* Status */}
                                                    <td className="py-3 px-4 text-center border-l border-gray-200">
                                                        {statusBadge(p.status)}
                                                    </td>
                                                    {/* Action */}
                                                    <td className="py-3 px-4 text-center border-l border-gray-200">
                                                        {needsAction(p) ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                                                                    disabled={!!actionLoading[p.id]}
                                                                    onClick={() =>
                                                                        handleAction(p.id, "confirm")
                                                                    }
                                                                >
                                                                    {actionLoading[p.id] === "confirm"
                                                                        ? "…"
                                                                        : "Confirm"}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="border-red-300 text-red-600 hover:bg-red-50 text-xs h-7 px-3"
                                                                    disabled={!!actionLoading[p.id]}
                                                                    onClick={() =>
                                                                        handleAction(p.id, "reject")
                                                                    }
                                                                >
                                                                    {actionLoading[p.id] === "reject"
                                                                        ? "…"
                                                                        : "Reject"}
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
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
