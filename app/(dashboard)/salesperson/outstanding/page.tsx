"use client";

import { useState, useMemo } from "react";
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
];

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
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [fromDate, setFromDate] = useState("2026-01-31");
    const [toDate, setToDate] = useState("2026-01-31");
    const [collectedPayments, setCollectedPayments] = useState<Set<string>>(new Set());
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    // Filter outstanding payments
    const filteredPayments = useMemo(() => {
        return mockOutstandingPayments.filter((payment) => {
            // Skip already collected payments
            if (collectedPayments.has(payment.id)) return false;
            
            // Status filter
            const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

            // Date range filter
            const matchesDateRange = payment.dueDate >= fromDate && payment.dueDate <= toDate;
            
            // Search filter
            const matchesSearch = searchQuery === "" || 
                payment.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.customerPhone.includes(searchQuery);
            
            return matchesStatus && matchesDateRange && matchesSearch;
        });
    }, [searchQuery, statusFilter, fromDate, toDate, collectedPayments]);

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const totalOutstanding = mockOutstandingPayments.filter(p => !collectedPayments.has(p.id));
        const totalAmount = totalOutstanding.reduce((sum, payment) => sum + payment.amount, 0);
        const overdue = totalOutstanding.filter(p => p.daysPastDue > 0).length;
        const highPriority = totalOutstanding.filter(p => p.priority === "high").length;
        
        return {
            totalCount: totalOutstanding.length,
            totalAmount,
            overdue,
            highPriority
        };
    }, [collectedPayments]);

    const handleMarkAsCollected = (paymentId: string) => {
        setCollectedPayments(prev => new Set(prev).add(paymentId));
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

    const selectedOrder = useMemo(() => {
        if (!selectedOrderId) return null;
        return mockOrderDetails.find((order) => order.id === selectedOrderId) || null;
    }, [selectedOrderId]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Outstanding Payments</h1>
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
                            <CardTitle className="text-xl">Outstanding Payments</CardTitle>
                            <CardDescription>Manage customer payments and mark collections</CardDescription>
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
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const today = new Date().toISOString().split("T")[0];
                                            setFromDate(today);
                                            setToDate(today);
                                        }}
                                        className="text-xs h-10"
                                    >
                                        Today
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
                                    className="w-full"
                                />
                            </div>
                            
                            <div className="sm:w-48">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
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
                                            {formatCurrency(payment.amount)}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                        >
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">Order ID</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">Customer</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">Date</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">Amount</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">Status</th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">Actions</th>
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
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-3 py-1 text-xs font-bold rounded border ${
                                                    payment.status === "PAID"
                                                        ? "bg-green-50 text-green-600 border-green-200"
                                                        : "bg-red-50 text-red-600 border-red-200"
                                                }`}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => setSelectedOrderId(payment.id)}
                                                >
                                                    View Details
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

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
    );
}