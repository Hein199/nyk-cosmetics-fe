"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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

// Mock data for outstanding payments - this will come from API later
const mockOutstandingPayments = [
    {
        id: "INV-001",
        customer: "Beauty Store A",
        customerPhone: "+95 9123456789",
        amount: 125000,
        dueDate: "2026-01-31",
        voucherDate: "2026-01-31",
        items: 1,
        status: "PAID",
        priority: "high"
    },
    {
        id: "INV-002",
        customer: "Modern Salon",
        customerPhone: "+95 9234567890",
        amount: 89000,
        dueDate: "2026-01-31",
        voucherDate: "2026-01-31",
        items: 1,
        status: "UNPAID",
        priority: "medium"
    },
    {
        id: "INV-003",
        customer: "Glamour Shop G",
        customerPhone: "+95 9345678901",
        amount: 234000,
        dueDate: "2026-01-30",
        voucherDate: "2026-01-30",
        items: 3,
        status: "PAID",
        priority: "low"
    },
    {
        id: "INV-004",
        customer: "Elite Beauty K",
        customerPhone: "+95 9456789012",
        amount: 156000,
        dueDate: "2026-01-29",
        voucherDate: "2026-01-29",
        items: 2,
        status: "UNPAID",
        priority: "high"
    },
    {
        id: "INV-005",
        customer: "Cosmetics Shop B",
        customerPhone: "+95 9567890123",
        amount: 67000,
        dueDate: "2026-01-28",
        voucherDate: "2026-01-28",
        items: 1,
        status: "PAID",
        priority: "low"
    },
    {
        id: "INV-006",
        customer: "Beauty Hub Z",
        customerPhone: "+95 9678901234",
        amount: 98000,
        dueDate: "2026-02-04",
        voucherDate: "2026-02-04",
        items: 2,
        status: "PAID",
        priority: "medium"
    }
];

const mockOrderDetails = [
    {
        id: "INV-001",
        date: "2026-01-31",
        time: "17:25",
        staff: "salesperson",
        status: "PAID",
        amount: 31000,
        customer: {
            name: "Alice Kyaw",
            phone: "091111111",
            address: "Yangon",
        },
        items: [
            {
                name: "Rose Lipstick",
                category: "COSMETIC",
                qty: 2,
                unitPrice: 15500,
                total: 31000,
                id: "a9568f71-141b-416c-86ba-112879a45447",
            },
        ],
        subtotal: 31000,
        total: 31000,
    },
    {
        id: "INV-002",
        date: "2026-01-31",
        time: "14:33",
        staff: "salesperson",
        status: "UNPAID",
        amount: 46000,
        customer: {
            name: "Alice Kyaw",
            phone: "091111111",
            address: "Yangon",
        },
        items: [
            {
                name: "Matte Lipstick",
                category: "COSMETIC",
                qty: 1,
                unitPrice: 46000,
                total: 46000,
                id: "b1f2a3c4-1111-2222-3333-444455556666",
            },
        ],
        subtotal: 46000,
        total: 46000,
    },
    {
        id: "INV-006",
        date: "2026-02-04",
        time: "10:15",
        staff: "salesperson",
        status: "PAID",
        amount: 98000,
        customer: {
            name: "Beauty Hub Z",
            phone: "099999999",
            address: "Mandalay",
        },
        items: [
            {
                name: "Glow Foundation",
                category: "COSMETIC",
                qty: 1,
                unitPrice: 98000,
                total: 98000,
                id: "c2f2a3c4-7777-8888-9999-000011112222",
            },
        ],
        subtotal: 98000,
        total: 98000,
    },
];

type PaymentEvent = {
    id: string;
    orderId: string;
    customer: string;
    orderDate: string;
    paymentDate: string;
    amount: number;
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

export default function OutstandingPage() {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [fromDate, setFromDate] = useState("2026-01-31");
    const [toDate, setToDate] = useState("2026-01-31");
    const [paymentDate, setPaymentDate] = useState("");
    const [collectedPayments, setCollectedPayments] = useState<Set<string>>(new Set());
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
    const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({});
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
    const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
    const [paymentDateNotice, setPaymentDateNotice] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const raw = localStorage.getItem("nyk-payment-events");
        if (!raw) {
            return;
        }
        try {
            const parsed = JSON.parse(raw) as Array<Partial<PaymentEvent> & { orderId?: string; date?: string }>;
            if (Array.isArray(parsed)) {
                const normalized = parsed
                    .map((event) => {
                        if (!event.orderId || !event.amount) {
                            return null;
                        }
                        const fallback = mockOutstandingPayments.find((item) => item.id === event.orderId);
                        const paymentDate = event.paymentDate ?? event.date ?? new Date().toISOString().split("T")[0];
                        const orderDate = event.orderDate ?? fallback?.voucherDate ?? fallback?.dueDate ?? paymentDate;
                        const customer = event.customer ?? fallback?.customer ?? "-";
                        return {
                            id: event.id ?? `${event.orderId}-${paymentDate}-${Date.now()}`,
                            orderId: event.orderId,
                            customer,
                            orderDate,
                            paymentDate,
                            amount: event.amount,
                        } satisfies PaymentEvent;
                    })
                    .filter((item): item is PaymentEvent => Boolean(item));
                setPaymentEvents(normalized);
            }
        } catch {
            // ignore malformed cache
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        localStorage.setItem("nyk-payment-events", JSON.stringify(paymentEvents));
    }, [paymentEvents]);

    // Filter outstanding payments
    const filteredPayments = useMemo(() => {
        return mockOutstandingPayments.filter((payment) => {
            const alreadyPaid = paidAmounts[payment.id] ?? 0;
            const remaining = Math.max(payment.amount - alreadyPaid, 0);
            const isPaid = remaining === 0;
            
            // Status filter
            const matchesStatus = statusFilter === "all"
                ? true
                : statusFilter === "PAID"
                    ? isPaid
                    : !isPaid;

            // Date range filter
            const matchesDateRange = payment.dueDate >= fromDate && payment.dueDate <= toDate;
            
            // Search filter
            const matchesSearch = searchQuery === "" || 
                payment.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.customerPhone.includes(searchQuery);
            
            return matchesStatus && matchesDateRange && matchesSearch;
        });
    }, [searchQuery, statusFilter, fromDate, toDate, paidAmounts]);

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const totalOutstanding = mockOutstandingPayments.filter(p => !collectedPayments.has(p.id));
        const totalAmount = totalOutstanding.reduce((sum, payment) => {
            const alreadyPaid = paidAmounts[payment.id] ?? 0;
            return sum + Math.max(payment.amount - alreadyPaid, 0);
        }, 0);
        const overdue = totalOutstanding.filter(p => p.daysPastDue > 0).length;
        const highPriority = totalOutstanding.filter(p => p.priority === "high").length;
        
        return {
            totalCount: totalOutstanding.length,
            totalAmount,
            overdue,
            highPriority
        };
    }, [collectedPayments, paidAmounts]);

    const handleMarkAsCollected = (paymentId: string) => {
        setCollectedPayments(prev => new Set(prev).add(paymentId));
    };

    const getRemainingAmount = (paymentId: string, original: number) => {
        const alreadyPaid = paidAmounts[paymentId] ?? 0;
        return Math.max(original - alreadyPaid, 0);
    };

    const handlePaymentChange = (paymentId: string, originalAmount: number, value: string) => {
        const raw = value.replace(/[^ -\u007F]/g, "");
        const parsed = Number(raw);
        if (Number.isNaN(parsed) || parsed < 0) {
            setPaymentInputs((prev) => ({ ...prev, [paymentId]: value }));
            return;
        }
        const remaining = getRemainingAmount(paymentId, originalAmount);
        const clamped = Math.min(parsed, remaining);
        setPaymentInputs((prev) => ({ ...prev, [paymentId]: clamped === 0 ? "" : String(clamped) }));
    };

    const handleCollectPayment = (paymentId: string, originalAmount: number) => {
        const inputValue = paymentInputs[paymentId];
        const parsed = Number(inputValue);
        if (!inputValue || Number.isNaN(parsed) || parsed <= 0) {
            return;
        }
        const payment = mockOutstandingPayments.find((item) => item.id === paymentId);
        const orderDate = payment?.voucherDate || payment?.dueDate;
        const selectedPaymentDate = paymentDate || new Date().toISOString().split("T")[0];
        if (orderDate && selectedPaymentDate < orderDate) {
            setPaymentDateNotice("Payment date cannot be earlier than order date.");
            return;
        }

        setPaymentDateNotice(null);
        const remaining = getRemainingAmount(paymentId, originalAmount);
        const applied = Math.min(parsed, remaining);
        const nextPaid = (paidAmounts[paymentId] ?? 0) + applied;

        setPaidAmounts((prev) => ({ ...prev, [paymentId]: nextPaid }));
        setPaymentInputs((prev) => ({ ...prev, [paymentId]: "" }));
        if (payment) {
            setPaymentEvents((prev) => [
                ...prev,
                {
                    id: `${paymentId}-${selectedPaymentDate}-${Date.now()}`,
                    orderId: paymentId,
                    customer: payment.customer,
                    orderDate: orderDate ?? selectedPaymentDate,
                    paymentDate: selectedPaymentDate,
                    amount: applied,
                },
            ]);
        }
    };

    const statusOptions = [
        { value: "all", label: "All Orders" },
        { value: "PAID", label: "Paid" },
        { value: "UNPAID", label: "Unpaid" },
    ];

    const formatDateRange = (from: string, to: string) => {
        if (from === to) {
            return formatDate(from);
        }
        return `${formatDate(from)} - ${formatDate(to)}`;
    };

    const isTodayOnly = fromDate === toDate && fromDate === new Date().toISOString().split("T")[0];
    const paymentListDateLabel = isTodayOnly ? formatDate(fromDate) : formatDateRange(fromDate, toDate);

    const printTimestamp = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const getPaidAmountForPrint = (payment: (typeof mockOutstandingPayments)[number]) => {
        const paid = paidAmounts[payment.id] ?? 0;
        if (paid > 0) {
            return Math.min(paid, payment.amount);
        }
        if (payment.status === "PAID") {
            return payment.amount;
        }
        return 0;
    };

    const printablePayments = useMemo(() => {
        const rangeFrom = paymentDate || fromDate;
        const rangeTo = paymentDate || toDate;

        return paymentEvents
            .filter((event) => event.paymentDate >= rangeFrom && event.paymentDate <= rangeTo)
            .map((event) => ({
                id: event.orderId,
                customer: event.customer,
                orderDate: event.orderDate,
                paidAmount: event.amount,
                paymentDate: event.paymentDate,
            }));
    }, [fromDate, toDate, paymentDate, paymentEvents]);

    const printableGroups = useMemo(() => {
        const grouped = new Map<string, typeof printablePayments>();
        printablePayments.forEach((payment) => {
            const key = payment.paymentDate;
            const list = grouped.get(key) ?? [];
            list.push(payment);
            grouped.set(key, list);
        });
        return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [printablePayments]);

    const totalPrintableAmount = useMemo(() => {
        return printablePayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    }, [printablePayments]);

    const selectedOrder = useMemo(() => {
        if (!selectedOrderId) return null;
        return mockOrderDetails.find((order) => order.id === selectedOrderId) || null;
    }, [selectedOrderId]);

    return (
        <div className="space-y-6">
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .printable, .printable * {
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

            <div className="printable print-only">
                <div className="p-6">
                    <div className="mb-6">
                        <div className="text-2xl font-semibold text-gray-900">Payments by Day</div>
                        <div className="text-base font-medium text-black">
                            Date: {paymentDate ? formatDate(paymentDate) : paymentListDateLabel}
                        </div>
                        <div className="text-base font-medium text-black">
                            Salesperson: {user?.username ?? "-"}
                        </div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto border border-gray-200 rounded-md text-black max-w-[90%] mx-auto">
                        <table className="w-full text-sm border-collapse text-black">
                            <thead>
                                <tr className="bg-blue-600 text-white">
                                    <th className="border border-blue-500 text-center py-2 px-3">Order ID</th>
                                    <th className="border border-blue-500 text-center py-2 px-3">Customer</th>
                                    <th className="border border-blue-500 text-center py-2 px-3">Order Date</th>
                                    <th className="border border-blue-500 text-center py-2 px-3">Payment Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {printableGroups.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="border border-blue-500 py-4 text-center text-gray-500">
                                            No payments recorded for selected dates.
                                        </td>
                                    </tr>
                                ) : (
                                    printableGroups.map(([dateKey, payments]) => (
                                        <Fragment key={dateKey}>
                                            {payments.map((payment, idx) => (
                                                <tr key={`${payment.id}-${payment.paymentDate}-${idx}`}>
                                                    <td className="border border-blue-500 py-2 px-3">{payment.id}</td>
                                                    <td className="border border-blue-500 py-2 px-3">{payment.customer}</td>
                                                    <td className="border border-blue-500 py-2 px-3">{formatDate(payment.orderDate)}</td>
                                                    <td className="border border-blue-500 py-2 px-3 text-right">{formatCurrency(payment.paidAmount)}</td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 max-w-[90%] mx-auto flex gap-4">
                        <div className="border border-blue-600 bg-blue-50 h-24 w-1/2">
                            <div className="text-xs text-blue-700 px-2 pt-2">Payment Accept by</div>
                        </div>
                        <div className="border border-blue-600 bg-blue-50 h-24 w-1/2">
                            <div className="text-xs text-blue-700 px-2 pt-2">Total Payment Amount</div>
                            <div className="px-2 pt-2 text-base font-semibold text-black">
                                {formatCurrency(totalPrintableAmount)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="no-print">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-500 mt-1">
                        Track and collect unpaid customer vouchers
                    </p>
                </div>
                </div>

                {/* Filters and Outstanding List */}
                <Card>
                <CardHeader className="pb-6">
                    <div className="flex flex-col space-y-4">
                        <div>
                            <CardTitle className="text-xl">Order Payments</CardTitle>
                            <CardDescription>Track all order payments (paid, partial, unpaid)</CardDescription>
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
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                />
                                {paymentDateNotice && (
                                    <div className="mt-2 text-xs text-red-600">
                                        {paymentDateNotice}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date Range
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <label htmlFor="from-date" className="text-xs text-gray-500 mb-1">
                                        From
                                    </label>
                                    <input
                                        id="from-date"
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label htmlFor="to-date" className="text-xs text-gray-500 mb-1">
                                        To
                                    </label>
                                    <input
                                        id="to-date"
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
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
                                                const today = new Date().toISOString().split("T")[0];
                                                setFromDate(today);
                                                setToDate(today);
                                            }}
                                            className="text-xs h-10 w-16"
                                        >
                                            Today
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setFromDate("2000-01-01");
                                                setToDate("2100-12-31");
                                            }}
                                            className="text-xs h-10 w-16"
                                        >
                                            All
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-transparent mb-1">.</label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.location.reload()}
                                        aria-label="Refresh"
                                        title="Refresh"
                                        className="h-10 w-10 p-0"
                                    >
                                        <svg
                                            aria-hidden="true"
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
                                Found {filteredPayments.length} orders for {formatDateRange(fromDate, toDate)}
                            </p>
                        </div>
                        
                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by Order ID or Customer name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10"
                                />
                            </div>
                            
                            <div className="sm:w-48">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Mobile: Card layout */}
                    <div className="block sm:hidden space-y-4">
                        {filteredPayments.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No outstanding payments found matching your criteria.</p>
                            </div>
                        ) : (
                            filteredPayments.map((payment) => (
                                <div key={payment.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">{payment.id}</span>
                                        <span className="px-2 py-1 text-xs font-bold rounded border bg-red-50 text-red-600 border-red-200">
                                            {payment.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{payment.customer}</p>
                                        <p className="text-sm text-gray-500">{formatDate(payment.dueDate)} • {payment.time}</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bold text-gray-900">
                                            {formatCurrency(getRemainingAmount(payment.id, payment.amount))}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Paid: {formatCurrency(paidAmounts[payment.id] ?? 0)}
                                        </span>
                                    </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={getRemainingAmount(payment.id, payment.amount)}
                                                value={paymentInputs[payment.id] ?? ""}
                                                onChange={(e) => handlePaymentChange(payment.id, payment.amount, e.target.value)}
                                                placeholder="Payment"
                                                className="h-9 text-sm text-black"
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-green-500 text-green-700 hover:bg-green-50"
                                                onClick={() => handleCollectPayment(payment.id, payment.amount)}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="w-28 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600">Order ID</th>
                                    <th className="w-40 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600">Customer</th>
                                    <th className="w-28 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600">Order Date</th>
                                    <th className="w-28 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600">Amount</th>
                                    <th className="w-24 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600">Status</th>
                                    <th className="w-56 text-center py-3 px-3 text-sm font-medium text-white bg-blue-600">Make Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-500">
                                            No outstanding payments found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 text-center font-medium text-gray-900">
                                                {payment.id}
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-900">
                                                {payment.customer}
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-900">
                                                {formatDate(payment.dueDate)}
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-gray-900">
                                                <div>{formatCurrency(getRemainingAmount(payment.id, payment.amount))}</div>
                                                <div className="text-xs text-gray-500">
                                                    Paid: {formatCurrency(paidAmounts[payment.id] ?? 0)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center justify-center h-9 w-20 px-2 text-xs font-bold rounded border ${
                                                    getRemainingAmount(payment.id, payment.amount) === 0
                                                        ? "bg-green-50 text-green-600 border-green-200"
                                                        : "bg-red-50 text-red-600 border-red-200"
                                                }`}>
                                                    {getRemainingAmount(payment.id, payment.amount) === 0 ? "PAID" : "UNPAID"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={getRemainingAmount(payment.id, payment.amount)}
                                                        value={paymentInputs[payment.id] ?? ""}
                                                        onChange={(e) => handlePaymentChange(payment.id, payment.amount, e.target.value)}
                                                        placeholder="Payment"
                                                        className="h-9 w-32 text-sm text-black"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-green-500 text-green-700 hover:bg-green-50 h-9 w-20"
                                                        onClick={() => handleCollectPayment(payment.id, payment.amount)}
                                                    >
                                                        Save
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                </Card>

                <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                    <DialogContent className="w-[794px] h-[1123px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="space-y-1 text-left">
                            <DialogTitle className="text-2xl font-semibold text-gray-900">Payments by Day</DialogTitle>
                            <div className="text-base font-medium text-black">
                                Date: {paymentDate ? formatDate(paymentDate) : paymentListDateLabel}
                            </div>
                            <div className="text-base font-medium text-black">
                                Salesperson: {user?.username ?? "-"}
                            </div>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="max-h-[60vh] overflow-y-auto border border-gray-200 rounded-md text-black max-w-[90%] mx-auto">
                                <table className="w-full text-sm border-collapse text-black">
                                    <thead>
                                        <tr className="bg-blue-600 text-white">
                                            <th className="border border-blue-500 text-center py-2 px-3">Order ID</th>
                                            <th className="border border-blue-500 text-center py-2 px-3">Customer</th>
                                            <th className="border border-blue-500 text-center py-2 px-3">Order Date</th>
                                            <th className="border border-blue-500 text-center py-2 px-3">Payment Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printableGroups.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="border border-blue-500 py-4 text-center text-gray-500">
                                                    No payments recorded for selected dates.
                                                </td>
                                            </tr>
                                        ) : (
                                            printableGroups.map(([dateKey, payments]) => (
                                                <Fragment key={dateKey}>
                                                    {payments.map((payment, idx) => (
                                                        <tr key={`${payment.id}-${payment.paymentDate}-${idx}`}>
                                                            <td className="border border-blue-500 py-2 px-3">{payment.id}</td>
                                                            <td className="border border-blue-500 py-2 px-3">{payment.customer}</td>
                                                            <td className="border border-blue-500 py-2 px-3">{formatDate(payment.orderDate)}</td>
                                                            <td className="border border-blue-500 py-2 px-3 text-right">{formatCurrency(payment.paidAmount)}</td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6 max-w-[90%] mx-auto flex gap-4">
                                <div className="border border-blue-600 bg-blue-50 h-24 w-1/2">
                                    <div className="text-xs text-blue-700 px-2 pt-2">Payment Accept by</div>
                                </div>
                                <div className="border border-blue-600 bg-blue-50 h-24 w-1/2">
                                    <div className="text-xs text-blue-700 px-2 pt-2">Total Payment Amount for Today</div>
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

                <Dialog open={Boolean(selectedOrderId)} onOpenChange={() => setSelectedOrderId(null)}>
                <DialogContent className="max-w-5xl">
                    {selectedOrder && (
                        <div className="space-y-6">
                            <DialogHeader>
                                <DialogTitle>Order #{selectedOrder.id}</DialogTitle>
                            </DialogHeader>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                                        <div>
                                            <div className="grid grid-cols-[80px_1fr] gap-y-2 text-sm text-gray-600">
                                                <span>Date:</span>
                                                <span className="text-gray-900">{formatDate(selectedOrder.date)}</span>
                                                <span>Time:</span>
                                                <span className="text-gray-900">{selectedOrder.time}</span>
                                                <span>Staff:</span>
                                                <span className="text-gray-900">{selectedOrder.staff}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-block px-3 py-1 text-xs font-bold rounded border ${
                                                selectedOrder.status === "PAID"
                                                    ? "bg-green-50 text-green-600 border-green-200"
                                                    : "bg-red-50 text-red-600 border-red-200"
                                            }`}>
                                                {selectedOrder.status}
                                            </span>
                                            <div className="mt-3 text-2xl font-bold text-gray-900">
                                                {formatCurrency(selectedOrder.amount)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
                                <div className="mt-3 border-t border-gray-200 pt-4 text-sm text-gray-700 space-y-2">
                                    <div className="grid grid-cols-[80px_1fr]">
                                        <span>Name:</span>
                                        <span className="text-gray-900">{selectedOrder.customer.name}</span>
                                    </div>
                                    <div className="grid grid-cols-[80px_1fr]">
                                        <span>Phone:</span>
                                        <span className="text-gray-900">{selectedOrder.customer.phone}</span>
                                    </div>
                                    <div className="grid grid-cols-[80px_1fr]">
                                        <span>Address:</span>
                                        <span className="text-gray-900">{selectedOrder.customer.address}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Items Ordered</h2>
                                <div className="mt-4 border-2 border-blue-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-blue-600 text-white">
                                            <tr>
                                                <th className="py-3 px-4 text-left">No.</th>
                                                <th className="py-3 px-4 text-left">Product</th>
                                                <th className="py-3 px-4 text-left">Category</th>
                                                <th className="py-3 px-4 text-center">Qty</th>
                                                <th className="py-3 px-4 text-center">Unit Price</th>
                                                <th className="py-3 px-4 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-blue-50">
                                            {selectedOrder.items.map((item, index) => (
                                                <tr key={item.id} className="border-t border-blue-200">
                                                    <td className="py-3 px-4 text-gray-900">{index + 1}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-gray-900">{item.name}</div>
                                                        <div className="text-xs text-gray-500">{item.id}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-700">{item.category}</td>
                                                    <td className="py-3 px-4 text-center text-gray-900">{item.qty}</td>
                                                    <td className="py-3 px-4 text-center text-gray-900">
                                                        {formatCurrency(item.unitPrice)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                                                        {formatCurrency(item.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Payment Summary</h2>
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardContent className="pt-6 space-y-3 text-sm text-gray-700">
                                            <div className="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span className="text-gray-900">{formatCurrency(selectedOrder.subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold text-gray-900">
                                                <span>Total:</span>
                                                <span>{formatCurrency(selectedOrder.total)}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Signature</h3>
                                            <div className="h-24 border border-gray-200 rounded-lg bg-gray-50" />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}