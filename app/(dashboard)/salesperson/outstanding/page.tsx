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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatId, thaiToday, toBangkokDateStr } from "@/lib/utils";

interface OutstandingOrder {
    id: number;
    created_at: string;
    total_amount: string | number;
    status: string;
    customer: { id: number; name: string; phone_number: string };
    salesperson: { id: number; username: string } | null;
    loan: {
        id: number;
        original_amount: string | number;
        remaining_amount: string | number;
        status: string;
    } | null;
    items: {
        id: number;
        quantity: number;
        unit_price: string | number;
        product: { name: string; category: string };
    }[];
    payments: {
        id: number;
        amount_paid: string | number;
        status: string;
    }[];
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

export default function OutstandingPage() {
    const { user, token } = useAuth();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>(
        {}
    );
    const [savingPayment, setSavingPayment] = useState<number | null>(null);
    const [paymentDateNotice, setPaymentDateNotice] = useState<string | null>(
        null
    );
    const [selectedOrder, setSelectedOrder] = useState<OutstandingOrder | null>(
        null
    );
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
    const [recentPayments, setRecentPayments] = useState<
        {
            orderId: number;
            customer: string;
            orderDate: string;
            paymentDate: string;
            amount: number;
        }[]
    >([]);

    const { data: orders = [], isLoading: loading, error: queryError } = useQuery({
        queryKey: ["sp-outstanding"],
        queryFn: () => apiFetch<OutstandingOrder[]>("/orders/outstanding", { token }),
        enabled: !!token,
    });
    const displayError = error ?? (queryError?.message ?? null);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const remaining = Number(order.loan?.remaining_amount ?? 0);
            const isCompleted = remaining === 0;
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "COMPLETED" ? isCompleted : !isCompleted);
            const orderDate = toBangkokDateStr(order.created_at);
            const matchesFrom = !fromDate || orderDate >= fromDate;
            const matchesTo = !toDate || orderDate <= toDate;
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                !q ||
                order.customer.name.toLowerCase().includes(q) ||
                String(order.id).includes(q) ||
                (order.customer.phone_number ?? "").includes(q);
            return matchesStatus && matchesFrom && matchesTo && matchesSearch;
        });
    }, [orders, searchQuery, statusFilter, fromDate, toDate]);

    const handlePaymentChange = (
        orderId: string,
        maxAmount: number,
        value: string
    ) => {
        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed < 0) {
            setPaymentInputs((prev) => ({ ...prev, [orderId]: value }));
            return;
        }
        const clamped = Math.min(parsed, maxAmount);
        setPaymentInputs((prev) => ({
            ...prev,
            [orderId]: clamped === 0 ? "" : String(clamped),
        }));
    };

    const handleCollectPayment = async (order: OutstandingOrder) => {
        const inputValue = paymentInputs[order.id];
        const parsed = Number(inputValue);
        if (!inputValue || Number.isNaN(parsed) || parsed <= 0 || !token)
            return;

        const orderDate = toBangkokDateStr(order.created_at);
        const selectedPaymentDate =
            paymentDate || thaiToday();
        if (selectedPaymentDate < orderDate) {
            setPaymentDateNotice(
                "Payment date cannot be earlier than order date."
            );
            return;
        }
        setPaymentDateNotice(null);
        setSavingPayment(order.id);
        try {
            const payment = await apiFetch<{ id: number }>("/payments", {
                method: "POST",
                token,
                body: {
                    customer_id: order.customer.id,
                    order_id: order.id,
                    amount_paid: String(parsed),
                    payment_type: "CASH",
                },
            });
            // If admin, auto-confirm the payment
            if (user?.role === "admin") {
                try {
                    await apiFetch(`/payments/${payment.id}/confirm`, {
                        method: "POST",
                        token,
                    });
                } catch {
                    // payment created but not confirmed - still OK
                }
            }
            setPaymentInputs((prev) => ({ ...prev, [String(order.id)]: "" }));
            setRecentPayments((prev) => [
                ...prev,
                {
                    orderId: order.id,
                    customer: order.customer.name,
                    orderDate: toBangkokDateStr(order.created_at),
                    paymentDate: selectedPaymentDate,
                    amount: parsed,
                },
            ]);
            await queryClient.invalidateQueries({ queryKey: ["sp-outstanding"] });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to create payment"
            );
        } finally {
            setSavingPayment(null);
        }
    };

    const statusOptions = [
        { value: "all", label: "All Orders" },
        { value: "UNPAID", label: "Unpaid" },
        { value: "COMPLETED", label: "Completed" },
    ];

    const formatDateRange = (from: string, to: string) => {
        if (!from && !to) return "All dates";
        if (from === to) return formatDate(from);
        if (from && to) return `${formatDate(from)} - ${formatDate(to)}`;
        if (from) return `From ${formatDate(from)}`;
        return `Until ${formatDate(to)}`;
    };

    const printablePayments = useMemo(() => {
        const rangeFrom = paymentDate || fromDate;
        const rangeTo = paymentDate || toDate;
        return recentPayments.filter(
            (e) =>
                (!rangeFrom || e.paymentDate >= rangeFrom) &&
                (!rangeTo || e.paymentDate <= rangeTo)
        );
    }, [fromDate, toDate, paymentDate, recentPayments]);

    const totalPrintableAmount = useMemo(
        () => printablePayments.reduce((sum, p) => sum + p.amount, 0),
        [printablePayments]
    );

    return (
        <div className="space-y-6">
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .printable,
                    .printable * {
                        visibility: visible !important;
                    }
                    .printable {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                .print-only {
                    display: none;
                }
                @media print {
                    .print-only {
                        display: block;
                    }
                }
            `}</style>

            {/* Hidden print-only section */}
            <div className="printable print-only">
                <div className="p-6">
                    <div className="mb-6">
                        <div className="text-2xl font-semibold text-gray-900">
                            Payments by Day
                        </div>
                        <div className="text-base font-medium text-black">
                            Date:{" "}
                            {paymentDate
                                ? formatDate(paymentDate)
                                : formatDateRange(fromDate, toDate)}
                        </div>
                        <div className="text-base font-medium text-black">
                            User: {user?.username ?? "-"}
                        </div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto border border-gray-200 rounded-md text-black max-w-[90%] mx-auto">
                        <table className="w-full text-sm border-collapse text-black">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="border border-blue-500 text-center py-2 px-3">
                                        Order ID
                                    </th>
                                    <th className="border border-blue-500 text-center py-2 px-3">
                                        Customer
                                    </th>
                                    <th className="border border-blue-500 text-center py-2 px-3">
                                        Order Date
                                    </th>
                                    <th className="border border-blue-500 text-center py-2 px-3">
                                        Payment Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {printablePayments.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="border border-blue-500 py-4 text-center text-gray-500"
                                        >
                                            No payments recorded for selected
                                            dates.
                                        </td>
                                    </tr>
                                ) : (
                                    printablePayments.map((p, i) => (
                                        <tr key={`${p.orderId}-${i}`}>
                                            <td className="border border-blue-500 py-2 px-3">
                                                {formatId('ORD', p.orderId)}
                                            </td>
                                            <td className="border border-blue-500 py-2 px-3">
                                                {p.customer}
                                            </td>
                                            <td className="border border-blue-500 py-2 px-3">
                                                {formatDate(p.orderDate)}
                                            </td>
                                            <td className="border border-blue-500 py-2 px-3 text-right">
                                                {formatCurrency(p.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 max-w-[90%] mx-auto flex gap-4">
                        <div className="border border-blue-600 bg-blue-50 h-24 w-1/2">
                            <div className="text-xs text-blue-700 px-2 pt-2">
                                Payment Accept by
                            </div>
                        </div>
                        <div className="border border-blue-600 bg-blue-50 h-24 w-1/2">
                            <div className="text-xs text-blue-700 px-2 pt-2">
                                Total Payment Amount
                            </div>
                            <div className="px-2 pt-2 text-base font-semibold text-black">
                                {formatCurrency(totalPrintableAmount)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="no-print">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Payments
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Track and collect outstanding order payments
                        </p>
                    </div>
                </div>

                {displayError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                        {displayError}
                    </div>
                )}

                <Card>
                    <CardHeader className="pb-6">
                        <div className="flex flex-col space-y-4">
                            <div>
                                <CardTitle className="text-xl">
                                    Order Payments
                                </CardTitle>
                                <CardDescription>
                                    Track all order payments (paid, partial,
                                    unpaid)
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsPrintDialogOpen(true)}
                                >
                                    Payment List
                                </Button>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="sm:w-48">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Payment Date
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentDate}
                                        onChange={(e) =>
                                            setPaymentDate(e.target.value)
                                        }
                                        className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                    />
                                    {paymentDateNotice && (
                                        <div className="mt-2 text-xs text-red-600">
                                            {paymentDateNotice}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Date Range
                                </label>
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
                                            className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
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
                                            className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
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
                                    <div className="flex flex-col">
                                        <label className="text-xs text-transparent mb-1">
                                            .
                                        </label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => queryClient.invalidateQueries({ queryKey: ["sp-outstanding"] })}
                                            className="h-10 w-10 p-0"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M21 12a9 9 0 1 1-3-6.7" />
                                                <path d="M21 3v6h-6" />
                                            </svg>
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Found {filteredOrders.length} orders{" "}
                                    {fromDate || toDate
                                        ? `for ${formatDateRange(fromDate, toDate)}`
                                        : ""}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search by Order ID or Customer name..."
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
                                        className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                    >
                                        {statusOptions.map((o) => (
                                            <option
                                                key={o.value}
                                                value={o.value}
                                            >
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">
                                Loading outstanding orders...
                            </div>
                        ) : (
                            <>
                                {/* Mobile view */}
                                <div className="block sm:hidden space-y-4">
                                    {filteredOrders.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500">
                                                No outstanding payments found.
                                            </p>
                                        </div>
                                    ) : (
                                        filteredOrders.map((order) => {
                                            const remaining = Number(
                                                order.loan
                                                    ?.remaining_amount ?? 0
                                            );
                                            const original = Number(
                                                order.loan?.original_amount ??
                                                order.total_amount
                                            );
                                            const paid = original - remaining;
                                            return (
                                                <div
                                                    key={order.id}
                                                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-gray-900">
                                                            {formatId('ORD', order.id)}
                                                        </span>
                                                        <span
                                                            className={`px-2 py-1 text-xs font-bold rounded border ${remaining === 0
                                                                ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                                                                : "bg-red-50 text-red-600 border-red-200"
                                                                }`}
                                                        >
                                                            {remaining === 0
                                                                ? "COMPLETED"
                                                                : "UNPAID"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {
                                                                order.customer
                                                                    .name
                                                            }
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {formatDate(
                                                                order.created_at
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-lg font-bold text-gray-900">
                                                            {formatCurrency(
                                                                remaining
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            Paid:{" "}
                                                            {formatCurrency(
                                                                paid
                                                            )}
                                                        </span>
                                                    </div>
                                                    {remaining > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={remaining}
                                                                value={
                                                                    paymentInputs[
                                                                    String(order.id)
                                                                    ] ?? ""
                                                                }
                                                                onChange={(e) =>
                                                                    handlePaymentChange(
                                                                        String(order.id),
                                                                        remaining,
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                placeholder="Payment"
                                                                className="h-9 text-sm text-black"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-green-500 text-green-700 hover:bg-green-50"
                                                                disabled={
                                                                    savingPayment ===
                                                                    order.id
                                                                }
                                                                onClick={() =>
                                                                    handleCollectPayment(
                                                                        order
                                                                    )
                                                                }
                                                            >
                                                                {savingPayment ===
                                                                    order.id
                                                                    ? "..."
                                                                    : "Save"}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Desktop table */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full table-fixed">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="w-28 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                    Order ID
                                                </th>
                                                <th className="w-40 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                    Customer
                                                </th>
                                                <th className="w-28 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                    Order Date
                                                </th>
                                                <th className="w-28 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                    Amount
                                                </th>
                                                <th className="w-24 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                    Status
                                                </th>
                                                <th className="w-44 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                    Make Payment
                                                </th>
                                                <th className="w-20 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600 border-l border-blue-500">
                                                    Save
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredOrders.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="text-center py-8 text-gray-500"
                                                    >
                                                        No outstanding payments
                                                        found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredOrders.map((order) => {
                                                    const remaining = Number(
                                                        order.loan
                                                            ?.remaining_amount ??
                                                        0
                                                    );
                                                    const original = Number(
                                                        order.loan
                                                            ?.original_amount ??
                                                        order.total_amount
                                                    );
                                                    const paid =
                                                        original - remaining;
                                                    return (
                                                        <tr
                                                            key={order.id}
                                                            className="border-b border-gray-100 hover:bg-gray-50"
                                                        >
                                                            <td
                                                                className="py-3 px-4 text-center font-medium text-gray-900 border-l border-gray-200 cursor-pointer hover:text-blue-600"
                                                                onClick={() =>
                                                                    setSelectedOrder(
                                                                        order
                                                                    )
                                                                }
                                                            >
                                                                {formatId('ORD', order.id)}
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-gray-900 border-l border-gray-200">
                                                                {
                                                                    order
                                                                        .customer
                                                                        .name
                                                                }
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-gray-900 border-l border-gray-200">
                                                                {formatDate(
                                                                    order.created_at
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-center font-semibold text-gray-900 border-l border-gray-200">
                                                                <div>
                                                                    {formatCurrency(
                                                                        remaining
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    Paid:{" "}
                                                                    {formatCurrency(
                                                                        paid
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-center border-l border-gray-200">
                                                                <span
                                                                    className={`inline-flex items-center justify-center h-9 w-24 px-2 text-xs font-bold rounded border ${remaining === 0
                                                                        ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                                                                        : "bg-red-50 text-red-600 border-red-200"
                                                                        }`}
                                                                >
                                                                    {remaining ===
                                                                        0
                                                                        ? "COMPLETED"
                                                                        : "UNPAID"}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-center border-l border-gray-200">
                                                                {remaining >
                                                                    0 && (
                                                                        <div className="flex items-center justify-center">
                                                                            <Input
                                                                                type="number"
                                                                                min={
                                                                                    0
                                                                                }
                                                                                max={
                                                                                    remaining
                                                                                }
                                                                                value={
                                                                                    paymentInputs[
                                                                                    String(order
                                                                                        .id)
                                                                                    ] ??
                                                                                    ""
                                                                                }
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
                                                                                    handlePaymentChange(
                                                                                        String(order.id),
                                                                                        remaining,
                                                                                        e
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                                placeholder="Payment"
                                                                                className="h-9 w-40 text-sm text-black"
                                                                            />
                                                                        </div>
                                                                    )}
                                                            </td>
                                                            <td className="py-3 px-4 text-center border-l border-gray-200">
                                                                {remaining >
                                                                    0 && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="border-green-500 text-green-700 hover:bg-green-50 h-9 w-20"
                                                                            disabled={
                                                                                savingPayment ===
                                                                                order.id
                                                                            }
                                                                            onClick={() =>
                                                                                handleCollectPayment(
                                                                                    order
                                                                                )
                                                                            }
                                                                        >
                                                                            {savingPayment ===
                                                                                order.id
                                                                                ? "..."
                                                                                : "Save"}
                                                                        </Button>
                                                                    )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Print Dialog */}
                <Dialog
                    open={isPrintDialogOpen}
                    onOpenChange={setIsPrintDialogOpen}
                >
                    <DialogContent className="w-[794px] h-[1123px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="space-y-1 text-left">
                            <DialogTitle className="text-2xl font-semibold text-gray-900">
                                Payments by Day
                            </DialogTitle>
                            <div className="text-base font-medium text-black">
                                Date:{" "}
                                {paymentDate
                                    ? formatDate(paymentDate)
                                    : formatDateRange(fromDate, toDate)}
                            </div>
                            <div className="text-base font-medium text-black">
                                User: {user?.username ?? "-"}
                            </div>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="max-h-[60vh] overflow-y-auto border border-gray-200 rounded-md text-black max-w-[90%] mx-auto">
                                <table className="w-full text-sm border-collapse text-black">
                                    <thead>
                                        <tr className="bg-blue-600 text-white">
                                            <th className="border border-blue-500 text-center py-2 px-3">
                                                Order ID
                                            </th>
                                            <th className="border border-blue-500 text-center py-2 px-3">
                                                Customer
                                            </th>
                                            <th className="border border-blue-500 text-center py-2 px-3">
                                                Order Date
                                            </th>
                                            <th className="border border-blue-500 text-center py-2 px-3">
                                                Payment Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printablePayments.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="border border-blue-500 py-4 text-center text-gray-500"
                                                >
                                                    No payments recorded for
                                                    selected dates.
                                                </td>
                                            </tr>
                                        ) : (
                                            printablePayments.map((p, i) => (
                                                <tr key={`${p.orderId}-${i}`}>
                                                    <td className="border border-blue-500 py-2 px-3">
                                                        {formatId('ORD', p.orderId)}
                                                    </td>
                                                    <td className="border border-blue-500 py-2 px-3">
                                                        {p.customer}
                                                    </td>
                                                    <td className="border border-blue-500 py-2 px-3">
                                                        {formatDate(
                                                            p.orderDate
                                                        )}
                                                    </td>
                                                    <td className="border border-blue-500 py-2 px-3 text-right">
                                                        {formatCurrency(
                                                            p.amount
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6 max-w-[90%] mx-auto flex gap-4">
                                <div className="border border-blue-600 bg-blue-50 h-24 w-1/2">
                                    <div className="text-xs text-blue-700 px-2 pt-2">
                                        Payment Accept by
                                    </div>
                                </div>
                                <div className="border border-blue-600 bg-blue-50 h-24 w-1/2">
                                    <div className="text-xs text-blue-700 px-2 pt-2">
                                        Total Payment Amount
                                    </div>
                                    <div className="px-2 pt-2 text-base font-semibold text-black">
                                        {formatCurrency(totalPrintableAmount)}
                                    </div>
                                </div>
                            </div>
                            <div className="max-w-[90%] mx-auto flex items-center justify-end gap-2">
                                <Button
                                    variant="outline"
                                    className="h-9 w-24"
                                    onClick={() => setIsPrintDialogOpen(false)}
                                >
                                    Close
                                </Button>
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-24"
                                    onClick={() => {
                                        setIsPrintDialogOpen(false);
                                        window.print();
                                    }}
                                >
                                    Print
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Order Detail Dialog */}
                <Dialog
                    open={Boolean(selectedOrder)}
                    onOpenChange={() => setSelectedOrder(null)}
                >
                    <DialogContent className="max-w-5xl">
                        {selectedOrder && (
                            <div className="space-y-6">
                                <DialogHeader>
                                    <DialogTitle>
                                        Order {formatId('ORD', selectedOrder.id)}
                                    </DialogTitle>
                                </DialogHeader>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                                            <div className="grid grid-cols-[80px_1fr] gap-y-2 text-sm text-gray-600">
                                                <span>Date:</span>
                                                <span className="text-gray-900">
                                                    {formatDate(
                                                        selectedOrder.created_at
                                                    )}
                                                </span>
                                                <span>Staff:</span>
                                                <span className="text-gray-900">
                                                    {selectedOrder.salesperson
                                                        ?.username ?? "-"}
                                                </span>
                                                <span>Customer:</span>
                                                <span className="text-gray-900">
                                                    {
                                                        selectedOrder.customer
                                                            .name
                                                    }
                                                </span>
                                                <span>Phone:</span>
                                                <span className="text-gray-900">
                                                    {
                                                        selectedOrder.customer
                                                            .phone_number
                                                    }
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span
                                                    className={`inline-block px-3 py-1 text-xs font-bold rounded border ${Number(selectedOrder.loan?.remaining_amount ?? 0) === 0 ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}
                                                >
                                                    {Number(
                                                        selectedOrder.loan
                                                            ?.remaining_amount ??
                                                        0
                                                    ) === 0
                                                        ? "PAID"
                                                        : "UNPAID"}
                                                </span>
                                                <div className="mt-3 text-2xl font-bold text-gray-900">
                                                    {formatCurrency(
                                                        Number(
                                                            selectedOrder.total_amount
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Items Ordered
                                    </h2>
                                    <div className="mt-4 border-2 border-blue-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-blue-600 text-white">
                                                <tr>
                                                    <th className="py-3 px-4 text-left">
                                                        No.
                                                    </th>
                                                    <th className="py-3 px-4 text-left">
                                                        Product
                                                    </th>
                                                    <th className="py-3 px-4 text-left">
                                                        Category
                                                    </th>
                                                    <th className="py-3 px-4 text-center">
                                                        Qty
                                                    </th>
                                                    <th className="py-3 px-4 text-center">
                                                        Unit Price
                                                    </th>
                                                    <th className="py-3 px-4 text-right">
                                                        Total
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-blue-50">
                                                {selectedOrder.items.map(
                                                    (item, i) => (
                                                        <tr
                                                            key={item.id}
                                                            className="border-t border-blue-200"
                                                        >
                                                            <td className="py-3 px-4 text-gray-900">
                                                                {i + 1}
                                                            </td>
                                                            <td className="py-3 px-4 font-medium text-gray-900">
                                                                {
                                                                    item.product
                                                                        .name
                                                                }
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700">
                                                                {
                                                                    item.product
                                                                        .category
                                                                }
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-gray-900">
                                                                {item.quantity}
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-gray-900">
                                                                {formatCurrency(
                                                                    Number(
                                                                        item.unit_price
                                                                    )
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-semibold text-gray-900">
                                                                {formatCurrency(
                                                                    item.quantity *
                                                                    Number(
                                                                        item.unit_price
                                                                    )
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <Card>
                                    <CardContent className="pt-6 space-y-3 text-sm text-gray-700">
                                        <div className="flex justify-between">
                                            <span>Total:</span>
                                            <span className="font-semibold text-gray-900">
                                                {formatCurrency(
                                                    Number(
                                                        selectedOrder.total_amount
                                                    )
                                                )}
                                            </span>
                                        </div>
                                        {selectedOrder.loan && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>
                                                        Loan Remaining:
                                                    </span>
                                                    <span className="font-semibold text-red-600">
                                                        {formatCurrency(
                                                            Number(
                                                                selectedOrder
                                                                    .loan
                                                                    .remaining_amount
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Paid:</span>
                                                    <span className="font-semibold text-green-600">
                                                        {formatCurrency(
                                                            Number(
                                                                selectedOrder
                                                                    .loan
                                                                    .original_amount
                                                            ) -
                                                            Number(
                                                                selectedOrder
                                                                    .loan
                                                                    .remaining_amount
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
