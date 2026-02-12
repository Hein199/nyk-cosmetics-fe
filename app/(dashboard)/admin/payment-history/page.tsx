"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PaymentEvent {
    id: string;
    orderId: string;
    customer: string;
    orderDate: string;
    paymentDate: string;
    amount: number;
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
    const today = new Date().toISOString().split("T")[0];
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [searchQuery, setSearchQuery] = useState("");
    const [events, setEvents] = useState<PaymentEvent[]>([]);

    const reloadEvents = () => {
        if (typeof window === "undefined") {
            return;
        }
        const raw = localStorage.getItem("nyk-payment-events");
        if (!raw) {
            setEvents([]);
            return;
        }
        try {
            const parsed = JSON.parse(raw) as PaymentEvent[];
            if (Array.isArray(parsed)) {
                setEvents(parsed);
            }
        } catch {
            setEvents([]);
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        reloadEvents();
        const handleStorage = () => reloadEvents();
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            const matchesDate = event.paymentDate >= fromDate && event.paymentDate <= toDate;
            const matchesSearch = searchQuery === "" || event.customer.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesDate && matchesSearch;
        });
    }, [events, fromDate, toDate, searchQuery]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={reloadEvents}
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

            <Card>
                <CardHeader className="pb-6">
                    <CardTitle className="text-xl">Search Payments</CardTitle>
                    <div className="mt-4 space-y-4">
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
                                    className="w-40 h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
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
                                    className="w-40 h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
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
                        </div>
                        <div>
                            <label htmlFor="search" className="text-xs text-gray-500 mb-1 block">
                                Customer
                            </label>
                            <Input
                                id="search"
                                placeholder="Search by customer name"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500">Order ID</th>
                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500">Customer</th>
                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500">Order Date</th>
                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500">Payment Date</th>
                                    <th className="text-center py-3 px-4 font-bold">Payment Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-gray-500">
                                            No payments found for the selected range.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEvents.map((event, index) => (
                                        <tr
                                            key={event.id}
                                            className={`border-b border-gray-300 ${index % 2 === 0 ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-gray-50"} transition-colors`}
                                        >
                                            <td className="py-3 px-4 text-center font-semibold text-gray-900 border-r border-gray-300">
                                                {event.orderId}
                                            </td>
                                            <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                {event.customer}
                                            </td>
                                            <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                {formatDate(event.orderDate)}
                                            </td>
                                            <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                {formatDate(event.paymentDate)}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-gray-900">
                                                {formatCurrency(event.amount)}
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
