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

// Mock data for outstanding payments - this will come from API later
const mockOutstandingPayments = [
    {
        id: "INV-001",
        customer: "Beauty Store A",
        customerPhone: "+95 9123456789",
        amount: 125000,
        dueDate: "2025-12-10",
        daysPastDue: 8,
        voucherDate: "2025-11-25",
        items: "NYK Lipstick x5, Foundation x3",
        priority: "high"
    },
    {
        id: "INV-002",
        customer: "Modern Salon",
        customerPhone: "+95 9234567890",
        amount: 89000,
        dueDate: "2025-12-15",
        daysPastDue: 3,
        voucherDate: "2025-12-01",
        items: "Hair Products x2, Nail Polish x4",
        priority: "medium"
    },
    {
        id: "INV-003",
        customer: "Glamour Shop G",
        customerPhone: "+95 9345678901",
        amount: 234000,
        dueDate: "2025-12-20",
        daysPastDue: 0,
        voucherDate: "2025-12-05",
        items: "Makeup Set x3, Skincare x5",
        priority: "low"
    },
    {
        id: "INV-004",
        customer: "Elite Beauty K",
        customerPhone: "+95 9456789012",
        amount: 156000,
        dueDate: "2025-12-08",
        daysPastDue: 10,
        voucherDate: "2025-11-20",
        items: "Premium Foundation x4, Mascara x6",
        priority: "high"
    },
    {
        id: "INV-005",
        customer: "Cosmetics Shop B",
        customerPhone: "+95 9567890123",
        amount: 67000,
        dueDate: "2025-12-25",
        daysPastDue: 0,
        voucherDate: "2025-12-10",
        items: "Lip Care x3, Eye Shadow x2",
        priority: "low"
    }
];

const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200",
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
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [collectedPayments, setCollectedPayments] = useState<Set<string>>(new Set());

    // Filter outstanding payments
    const filteredPayments = useMemo(() => {
        return mockOutstandingPayments.filter((payment) => {
            // Skip already collected payments
            if (collectedPayments.has(payment.id)) return false;
            
            // Priority filter
            const matchesPriority = priorityFilter === "all" || payment.priority === priorityFilter;
            
            // Search filter
            const matchesSearch = searchQuery === "" || 
                payment.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payment.customerPhone.includes(searchQuery);
            
            return matchesPriority && matchesSearch;
        });
    }, [searchQuery, priorityFilter, collectedPayments]);

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

    const priorityOptions = [
        { value: "all", label: "All Priorities" },
        { value: "high", label: "High Priority" },
        { value: "medium", label: "Medium Priority" },
        { value: "low", label: "Low Priority" },
    ];

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

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {summaryStats.totalCount}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">
                                    {formatCurrency(summaryStats.totalAmount)}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Overdue</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">
                                    {summaryStats.overdue}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">High Priority</p>
                                <p className="text-2xl font-bold text-orange-600 mt-1">
                                    {summaryStats.highPriority}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Outstanding List */}
            <Card>
                <CardHeader className="pb-6">
                    <div className="flex flex-col space-y-4">
                        <div>
                            <CardTitle className="text-xl">Outstanding Payments</CardTitle>
                            <CardDescription>Manage customer payments and mark collections</CardDescription>
                        </div>
                        
                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by customer name, invoice ID, or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            
                            <div className="sm:w-48">
                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                >
                                    {priorityOptions.map((option) => (
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
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColors[payment.priority]}`}>
                                            {payment.priority.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div>
                                        <p className="font-medium text-gray-900">{payment.customer}</p>
                                        <p className="text-sm text-gray-500">{payment.customerPhone}</p>
                                    </div>
                                    
                                    <div className="text-sm text-gray-600">
                                        <p><strong>Items:</strong> {payment.items}</p>
                                        <p><strong>Due:</strong> {formatDate(payment.dueDate)} 
                                            {payment.daysPastDue > 0 && (
                                                <span className="text-red-600 ml-1">({payment.daysPastDue} days overdue)</span>
                                            )}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bold text-gray-900">
                                            {formatCurrency(payment.amount)}
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={() => handleMarkAsCollected(payment.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            Mark Collected
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Invoice ID</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Phone</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Due Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Priority</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">
                                            No outstanding payments found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900">{payment.id}</div>
                                                <div className="text-xs text-gray-500">Voucher: {formatDate(payment.voucherDate)}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-gray-900">{payment.customer}</div>
                                                <div className="text-xs text-gray-500">{payment.items}</div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {payment.customerPhone}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-gray-900">
                                                    {formatCurrency(payment.amount)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-sm text-gray-600">{formatDate(payment.dueDate)}</div>
                                                {payment.daysPastDue > 0 && (
                                                    <div className="text-xs text-red-600 font-medium">
                                                        {payment.daysPastDue} days overdue
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityColors[payment.priority]}`}>
                                                    {payment.priority.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleMarkAsCollected(payment.id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                >
                                                    Mark Collected
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
        </div>
    );
}