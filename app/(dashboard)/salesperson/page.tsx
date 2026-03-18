"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatId, thaiToday, thaiOffsetDay, formatThaiDate } from "@/lib/utils";

type OrderListItem = {
    id: number;
    created_at: string;
    status: string;
    total_amount: string | number;
    customer: { name: string } | null;
};

type DashboardOrder = {
    id: number;
    customer: string;
    amount: number;
    status: string;
    date: string;
    time: string;
    createdAt: string;
};

const statusColors: Record<string, string> = {
    delivered: "bg-green-100 text-green-800",
    confirmed: "bg-blue-100 text-blue-800",
    pending_admin: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(amount);
}

function normalizeStatus(status: string) {
    return status.toLowerCase();
}

function formatStatusLabel(status: string) {
    const normalized = normalizeStatus(status);
    if (normalized === "pending_admin") {
        return "pending";
    }
    return normalized.replace("_", " ");
}

function getStatusBadgeClass(status: string) {
    const key = normalizeStatus(status);
    if (key === "delivered") {
        return "bg-green-50 text-green-700 border-green-200";
    }
    if (key === "confirmed") {
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (key === "pending_admin") {
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }
    return "bg-red-50 text-red-700 border-red-200";
}

function parseAmount(amount: string | number) {
    if (typeof amount === "number") {
        return Number.isFinite(amount) ? amount : 0;
    }
    const parsed = Number.parseFloat(amount);
    return Number.isFinite(parsed) ? parsed : 0;
}

function toDateKey(dateString: string) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function SalespersonPage() {
    const router = useRouter();
    const { token, user } = useAuth();
    const todayDate = thaiToday();

    // Date range selection state
    const [fromDate, setFromDate] = useState(todayDate);
    const [toDate, setToDate] = useState(todayDate);

    const normalizeDateRange = (from: string, to: string) => {
        const normalizedTo = !to ? todayDate : to > todayDate ? todayDate : to;
        const candidateFrom = from || normalizedTo;
        const normalizedFrom = candidateFrom > normalizedTo ? normalizedTo : candidateFrom;
        return { fromDate: normalizedFrom, toDate: normalizedTo };
    };

    const isDateRangeInvalid = fromDate > toDate || toDate > todayDate;

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

    // Monthly target state
    const [selectedYear, setSelectedYear] = useState("2025");
    const [selectedMonthNum, setSelectedMonthNum] = useState("12");
    const [monthlyTarget, setMonthlyTarget] = useState<number>(0);

    // Fetch salesperson's monthly target from backend
    const { data: meData } = useQuery({
        queryKey: ["users-me"],
        queryFn: () => apiFetch<{ salesperson?: { monthly_target?: number } }>("/users/me", { token }),
        enabled: !!token,
    });
    useEffect(() => {
        if (meData?.salesperson?.monthly_target != null) {
            setMonthlyTarget(Number(meData.salesperson.monthly_target));
        }
    }, [meData]);

    // Orders data via React Query
    const { data: orders = [], isLoading: ordersLoading, dataUpdatedAt, error: ordersQueryError } = useQuery({
        queryKey: ["sp-orders"],
        queryFn: () => apiFetch<OrderListItem[]>("/orders", { token }),
        enabled: !!token && !isDateRangeInvalid,
    });
    const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

    // Combine year and month for monthly targets
    const selectedMonth = `${selectedYear}-${selectedMonthNum.padStart(2, '0')}`;

    // Filter orders by date range
    const filteredOrders = useMemo(() => {
        if (isDateRangeInvalid) {
            return [];
        }
        return orders
            .map((order) => {
                const dateKey = toDateKey(order.created_at);
                const timeLabel = new Date(order.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                });
                return {
                    id: order.id,
                    customer: order.customer?.name ?? "Unknown customer",
                    amount: parseAmount(order.total_amount),
                    status: normalizeStatus(order.status),
                    date: dateKey,
                    time: timeLabel,
                    createdAt: order.created_at,
                } as DashboardOrder;
            })
            .filter((order) => order.date >= fromDate && order.date <= toDate)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }, [orders, fromDate, toDate, isDateRangeInvalid]);

    // Calculate statistics for the date range
    const rangeStats = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const completedOrders = filteredOrders.filter(o => o.status === "delivered").length;
        const cancelledOrders = filteredOrders.filter(o => o.status === "cancelled").length;
        const totalSales = filteredOrders
            .filter(o => o.status === "delivered")
            .reduce((sum, order) => sum + order.amount, 0);

        return {
            totalOrders,
            completedOrders,
            cancelledOrders,
            totalSales
        };
    }, [filteredOrders]);

    // Calculate monthly statistics
    const monthlyStats = useMemo(() => {
        const target = monthlyTarget;
        const achieved = orders
            .map((order) => ({
                status: normalizeStatus(order.status),
                amount: parseAmount(order.total_amount),
                dateKey: toDateKey(order.created_at),
            }))
            .filter((order) => order.dateKey.startsWith(selectedMonth) && order.status === "delivered")
            .reduce((sum, order) => sum + order.amount, 0);
        const progressPercentage = target > 0
            ? Math.round((achieved / target) * 100)
            : 0;

        return {
            target,
            achieved,
            progressPercentage
        };
    }, [orders, selectedMonth, monthlyTarget]);

    // Get recent orders for the table (limit to 5)
    const recentOrdersForDisplay = filteredOrders.slice(0, 5);

    // Format date for display
    const formatDate = (dateString: string) => {
        return formatThaiDate(dateString);
    };

    // Format date range for display
    const formatDateRange = (from: string, to: string) => {
        if (from === to) {
            return formatDate(from);
        }
        const [start, end] = from <= to ? [from, to] : [to, from];
        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    // Format month for display
    const formatMonth = (monthString: string) => {
        const [year, month] = monthString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    };

    // Helper function to set preset date ranges quickly
    const setPresetRange = (type: string) => {
        const todayStr = thaiToday();
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);

        switch (type) {
            case 'today':
                setFromDate(todayStr);
                setToDate(todayStr);
                break;
            case 'yesterday': {
                const y = thaiOffsetDay(-1);
                setFromDate(y);
                setToDate(y);
                break;
            }
            case 'thisWeek': {
                // Sunday = day 0 in local timezone.
                setFromDate(thaiOffsetDay(-todayLocal.getDay()));
                setToDate(todayStr);
                break;
            }
            case 'thisMonth': {
                const [y, m] = todayStr.split('-');
                setFromDate(`${y}-${m}-01`);
                setToDate(todayStr);
                break;
            }
            case 'last7days': {
                setFromDate(thaiOffsetDay(-6));
                setToDate(todayStr);
                break;
            }
            case 'last30days': {
                setFromDate(thaiOffsetDay(-29));
                setToDate(todayStr);
                break;
            }
            default:
                setFromDate(todayDate);
                setToDate(todayDate);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {user?.username ?? "there"}!
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Viewing data for {formatDateRange(fromDate, toDate)}
                    </p>
                    {lastUpdated && (
                        <p className="text-xs text-gray-400 mt-2">
                            Last updated {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                    {ordersQueryError && (
                        <p className="text-xs text-red-600 mt-2">{ordersQueryError.message}</p>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        size="sm"
                        className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-sm"
                        onClick={() => router.push("/salesperson/products")}
                    >
                        <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        New Order
                    </Button>
                </div>
            </div>





            {/* Monthly Target Card */}
            <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl text-gray-800">Monthly Target - {formatMonth(selectedMonth)}</CardTitle>
                            <CardDescription className="text-gray-600">Sales performance against monthly target</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label htmlFor="year-filter" className="text-sm font-medium text-gray-700">
                                    Year:
                                </label>
                                <select
                                    id="year-filter"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                >
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="month-filter" className="text-sm font-medium text-gray-700">
                                    Month:
                                </label>
                                <select
                                    id="month-filter"
                                    value={selectedMonthNum}
                                    onChange={(e) => setSelectedMonthNum(e.target.value)}
                                    className="px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                >
                                    <option value="01">January</option>
                                    <option value="02">February</option>
                                    <option value="03">March</option>
                                    <option value="04">April</option>
                                    <option value="05">May</option>
                                    <option value="06">June</option>
                                    <option value="07">July</option>
                                    <option value="08">August</option>
                                    <option value="09">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">Progress</div>
                            <div className="text-sm font-medium text-gray-900">
                                {monthlyStats.progressPercentage}%
                            </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-pink-500 to-rose-600 h-3 rounded-full transition-all"
                                style={{ width: `${Math.min(monthlyStats.progressPercentage, 100)}%` }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <p className="text-sm text-gray-500">Target</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {formatCurrency(monthlyStats.target)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Achieved</p>
                                <p className="text-lg font-bold text-green-600">
                                    {formatCurrency(monthlyStats.achieved)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders */}
            <Card>
                <CardHeader className="pb-6">
                    <div className="flex flex-col space-y-6">
                        <div className="flex flex-col space-y-4">
                            <div>
                                <CardTitle className="text-xl mb-3">Orders</CardTitle>
                                <CardDescription className="mb-4">Your order activity for {formatDateRange(fromDate, toDate)}</CardDescription>

                                {/* Order Statistics - moved under title */}
                                <div className="flex flex-wrap items-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                        <span className="text-gray-600">Total:</span>
                                        <span className="font-semibold text-gray-900">{rangeStats.totalOrders}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="text-gray-600">Completed:</span>
                                        <span className="font-semibold text-green-600">{rangeStats.completedOrders}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <span className="text-gray-600">Cancelled:</span>
                                        <span className="font-semibold text-red-600">{rangeStats.cancelledOrders}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="text-gray-600">Sales:</span>
                                        <span className="font-semibold text-blue-600">{formatCurrency(rangeStats.totalSales)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600 font-medium">{filteredOrders.length} orders found</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-start gap-6 pt-2 border-t border-gray-100">
                            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 mb-2">
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
                                                onChange={(e) => handleFromDate(e.target.value)}
                                                lang="en-US"
                                                max={toDate || todayDate}
                                                className={`w-36 h-9 px-3 text-sm text-black border rounded-lg focus:outline-none focus:ring-2 bg-white shadow-sm ${isDateRangeInvalid
                                                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                                    : "border-gray-300 focus:ring-pink-500 focus:border-pink-500"}`}
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
                                                onChange={(e) => handleToDate(e.target.value)}
                                                lang="en-US"
                                                max={todayDate}
                                                className={`w-36 h-9 px-3 text-sm text-black border rounded-lg focus:outline-none focus:ring-2 bg-white shadow-sm ${isDateRangeInvalid
                                                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                                    : "border-gray-300 focus:ring-pink-500 focus:border-pink-500"}`}
                                                min={fromDate}
                                            />
                                        </div>
                                    </div>
                                    {isDateRangeInvalid && (
                                        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                            Invalid date range
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-nowrap gap-3 pt-6">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPresetRange('today')}
                                    className="text-xs px-3 py-1.5 rounded-lg hover:bg-pink-50 hover:border-pink-300 h-9 w-36"
                                >
                                    Today
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPresetRange('last7days')}
                                    className="text-xs px-3 py-1.5 rounded-lg hover:bg-pink-50 hover:border-pink-300 h-9 w-36"
                                >
                                    Last 7 Days
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPresetRange('thisMonth')}
                                    className="text-xs px-3 py-1.5 rounded-lg hover:bg-pink-50 hover:border-pink-300 h-9 w-36"
                                >
                                    This Month
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPresetRange('last30days')}
                                    className="text-xs px-3 py-1.5 rounded-lg hover:bg-pink-50 hover:border-pink-300 h-9 w-36"
                                >
                                    Last 30 Days
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 h-9 w-36"
                                    onClick={() => router.push("/salesperson/orders")}
                                >
                                    View All Orders
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Mobile: Card layout */}
                    <div className="block sm:hidden space-y-4">
                        {ordersLoading ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">Loading orders...</p>
                            </div>
                        ) : ordersQueryError ? (
                            <div className="text-center py-8">
                                <p className="text-red-600">{ordersQueryError.message}</p>
                            </div>
                        ) : recentOrdersForDisplay.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No orders found for {formatDateRange(fromDate, toDate)}.</p>
                            </div>
                        ) : (
                            recentOrdersForDisplay.map((order) => (
                                <div
                                    key={order.id}
                                    className="border border-gray-200 rounded-lg p-4 space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">{formatId('ORD', order.id)}</span>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status] ?? "bg-gray-100 text-gray-800"}`}
                                        >
                                            {formatStatusLabel(order.status)}
                                        </span>
                                    </div>
                                    <p className="text-gray-600">{order.customer}</p>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{order.date}</span>
                                        <span className="font-semibold text-gray-900">
                                            {formatCurrency(order.amount)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden sm:block">
                        <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-blue-600 text-white">
                                    <tr>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Order ID
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Customer
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Date
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Time
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Amount
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordersLoading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-500 border-r border-gray-300">
                                                Loading orders...
                                            </td>
                                        </tr>
                                    ) : ordersQueryError ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-red-600 border-r border-gray-300">
                                                {ordersQueryError.message}
                                            </td>
                                        </tr>
                                    ) : recentOrdersForDisplay.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-500 border-r border-gray-300">
                                                No orders found for {formatDateRange(fromDate, toDate)}.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentOrdersForDisplay.map((order, index) => (
                                            <tr
                                                key={order.id}
                                                className={`border-b border-gray-300 ${index % 2 === 0 ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-gray-50"
                                                    } transition-colors`}
                                            >
                                                <td className="py-3 px-4 text-center font-semibold text-gray-900 border-r border-gray-300">
                                                    {formatId('ORD', order.id)}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-gray-900 border-r border-gray-300">
                                                    {order.customer}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {order.date}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {order.time}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-gray-900 border-r border-gray-300">
                                                    {formatCurrency(order.amount)}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span
                                                        className={`px-2 py-1 text-xs font-bold rounded border ${getStatusBadgeClass(order.status)}`}
                                                    >
                                                        {formatStatusLabel(order.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}