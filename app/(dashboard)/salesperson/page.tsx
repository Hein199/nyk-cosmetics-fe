"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

// Mock data - replace with actual API calls
const mockUser = {
    name: "Thiri",
};

// Enhanced mock orders with more data for filtering
const mockOrders = [
    // Current date orders (December 2025)
    { id: "ORD-001", customer: "Beauty Store A", amount: 125000, status: "completed", date: "2025-12-05", time: "10:30 AM" },
    { id: "ORD-002", customer: "Cosmetics Shop B", amount: 89000, status: "pending", date: "2025-12-05", time: "02:15 PM" },
    { id: "ORD-003", customer: "Modern Salon", amount: 156000, status: "processing", date: "2025-12-05", time: "04:20 PM" },
    
    // Recent past dates (December 2025)
    { id: "ORD-004", customer: "Salon C", amount: 234000, status: "processing", date: "2025-12-04", time: "11:45 AM" },
    { id: "ORD-005", customer: "Retail Store D", amount: 156000, status: "completed", date: "2025-12-04", time: "04:20 PM" },
    { id: "ORD-006", customer: "Beauty Outlet E", amount: 78000, status: "cancelled", date: "2025-12-03", time: "09:00 AM" },
    { id: "ORD-007", customer: "Makeup Corner F", amount: 189000, status: "completed", date: "2025-12-02", time: "03:30 PM" },
    { id: "ORD-008", customer: "Glamour Shop G", amount: 245000, status: "completed", date: "2025-12-01", time: "11:00 AM" },
    
    // March 2025 orders (example for date filtering)
    { id: "ORD-009", customer: "Glam Studio G", amount: 195000, status: "completed", date: "2025-03-08", time: "01:15 PM" },
    { id: "ORD-010", customer: "Style Shop H", amount: 267000, status: "completed", date: "2025-03-08", time: "05:45 PM" },
    { id: "ORD-011", customer: "Beauty Haven I", amount: 134000, status: "pending", date: "2025-03-07", time: "10:00 AM" },
    { id: "ORD-012", customer: "Charm Boutique J", amount: 198000, status: "cancelled", date: "2025-03-06", time: "02:30 PM" },
    { id: "ORD-013", customer: "Elite Beauty K", amount: 445000, status: "completed", date: "2025-03-05", time: "11:15 AM" },
    { id: "ORD-014", customer: "Luxury Salon L", amount: 312000, status: "processing", date: "2025-03-04", time: "04:00 PM" },
    
    // November 2024 orders
    { id: "ORD-015", customer: "Beauty Central M", amount: 178000, status: "completed", date: "2024-11-30", time: "09:30 AM" },
    { id: "ORD-016", customer: "Glamour Point N", amount: 256000, status: "completed", date: "2024-11-29", time: "01:45 PM" },
    { id: "ORD-017", customer: "Style Center O", amount: 89000, status: "pending", date: "2024-11-28", time: "03:20 PM" },
    
    // October 2024 orders (more test data)
    { id: "ORD-018", customer: "Beauty World P", amount: 167000, status: "completed", date: "2024-10-15", time: "10:15 AM" },
    { id: "ORD-019", customer: "Cosmetic Hub Q", amount: 298000, status: "completed", date: "2024-10-15", time: "02:30 PM" },
    { id: "ORD-020", customer: "Style Palace R", amount: 123000, status: "pending", date: "2024-10-14", time: "11:45 AM" },
];

// Monthly target data
const monthlyTargets: Record<string, { target: number; achieved: number }> = {
    // 2024 data
    "2024-01": { target: 2800000, achieved: 2650000 },
    "2024-02": { target: 2900000, achieved: 2750000 },
    "2024-03": { target: 3100000, achieved: 2980000 },
    "2024-04": { target: 3200000, achieved: 3050000 },
    "2024-05": { target: 3300000, achieved: 3150000 },
    "2024-06": { target: 3400000, achieved: 3200000 },
    "2024-07": { target: 3500000, achieved: 3300000 },
    "2024-08": { target: 3600000, achieved: 3400000 },
    "2024-09": { target: 3700000, achieved: 3500000 },
    "2024-10": { target: 3800000, achieved: 3600000 },
    "2024-11": { target: 3900000, achieved: 3700000 },
    "2024-12": { target: 4000000, achieved: 3800000 },
    
    // 2025 data
    "2025-01": { target: 4100000, achieved: 3900000 },
    "2025-02": { target: 4200000, achieved: 4000000 },
    "2025-03": { target: 4300000, achieved: 4100000 },
    "2025-04": { target: 4400000, achieved: 4200000 },
    "2025-05": { target: 4500000, achieved: 4300000 },
    "2025-06": { target: 4600000, achieved: 4400000 },
    "2025-07": { target: 4700000, achieved: 4500000 },
    "2025-08": { target: 4800000, achieved: 4600000 },
    "2025-09": { target: 4900000, achieved: 4700000 },
    "2025-10": { target: 5000000, achieved: 4800000 },
    "2025-11": { target: 5100000, achieved: 4900000 },
    "2025-12": { target: 5200000, achieved: 1551000 }, // Current month - partial data
};

const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    processing: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function SalespersonPage() {
    const router = useRouter();
    
    // Date range selection state
    const [fromDate, setFromDate] = useState("2025-12-01");
    const [toDate, setToDate] = useState("2025-12-05");
    
    // Monthly target state
    const [selectedYear, setSelectedYear] = useState("2025");
    const [selectedMonthNum, setSelectedMonthNum] = useState("12");
    
    // Combine year and month for monthly targets
    const selectedMonth = `${selectedYear}-${selectedMonthNum.padStart(2, '0')}`;
    
    // Filter orders by date range
    const filteredOrders = useMemo(() => {
        return mockOrders.filter(order => {
            const orderDate = order.date;
            return orderDate >= fromDate && orderDate <= toDate;
        });
    }, [fromDate, toDate]);
    
    // Calculate statistics for the date range
    const rangeStats = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const completedOrders = filteredOrders.filter(o => o.status === "completed").length;
        const cancelledOrders = filteredOrders.filter(o => o.status === "cancelled").length;
        const totalSales = filteredOrders
            .filter(o => o.status === "completed")
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
        const monthlyData = monthlyTargets[selectedMonth] || { target: 0, achieved: 0 };
        const progressPercentage = monthlyData.target > 0 
            ? Math.round((monthlyData.achieved / monthlyData.target) * 100) 
            : 0;
        
        return {
            ...monthlyData,
            progressPercentage
        };
    }, [selectedMonth]);
    
    // Get recent orders for the table (limit to 5)
    const recentOrdersForDisplay = filteredOrders.slice(0, 5);
    
    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    // Format date range for display
    const formatDateRange = (from: string, to: string) => {
        if (from === to) {
            return formatDate(from);
        }
        return `${formatDate(from)} - ${formatDate(to)}`;
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
    
    // Get number of days in a month
    const getDaysInMonth = (year: string, month: string) => {
        return new Date(parseInt(year), parseInt(month), 0).getDate();
    };

    // Helper function to set preset date ranges quickly
    const setPresetRange = (type: string) => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        switch(type) {
            case 'today':
                setFromDate(todayStr);
                setToDate(todayStr);
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                setFromDate(yesterdayStr);
                setToDate(yesterdayStr);
                break;
            case 'thisWeek':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekStartStr = weekStart.toISOString().split('T')[0];
                setFromDate(weekStartStr);
                setToDate(todayStr);
                break;
            case 'thisMonth':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthStartStr = monthStart.toISOString().split('T')[0];
                setFromDate(monthStartStr);
                setToDate(todayStr);
                break;
            case 'last7days':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];
                setFromDate(sevenDaysStr);
                setToDate(todayStr);
                break;
            case 'last30days':
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
                const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];
                setFromDate(thirtyDaysStr);
                setToDate(todayStr);
                break;
            default:
                // Default to current period (December 1-5, 2025)
                setFromDate("2025-12-01");
                setToDate("2025-12-05");
        }
    };
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {mockUser.name}!
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Viewing data for {formatDateRange(fromDate, toDate)}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        size="lg"
                        className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                        onClick={() => router.push("/salesperson/products")}
                    >
                        <svg
                            className="w-5 h-5 mr-2"
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
                        
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pt-2 border-t border-gray-100">
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
                                                onChange={(e) => setFromDate(e.target.value)}
                                                lang="en-US"
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
                                                lang="en-US"
                                                className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                                min={fromDate}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-3 pt-6">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPresetRange('today')}
                                    className="text-xs px-3 py-2 rounded-lg hover:bg-pink-50 hover:border-pink-300 h-10 w-full"
                                >
                                    Today
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPresetRange('last7days')}
                                    className="text-xs px-3 py-2 rounded-lg hover:bg-pink-50 hover:border-pink-300 h-10 w-full"
                                >
                                    Last 7 Days
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPresetRange('thisMonth')}
                                    className="text-xs px-3 py-2 rounded-lg hover:bg-pink-50 hover:border-pink-300 h-10 w-full"
                                >
                                    This Month
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPresetRange('last30days')}
                                    className="text-xs px-3 py-2 rounded-lg hover:bg-pink-50 hover:border-pink-300 h-10 w-full"
                                >
                                    Last 30 Days
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs px-3 py-2 rounded-lg hover:bg-gray-50 h-10 w-full"
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
                        {recentOrdersForDisplay.length === 0 ? (
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
                                    <span className="font-medium text-gray-900">{order.id}</span>
                                    <span
                                        className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}
                                    >
                                        {order.status}
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
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                        Order ID
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                        Customer
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                        Date
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                        Time
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                        Amount
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrdersForDisplay.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">
                                            No orders found for {formatDateRange(fromDate, toDate)}.
                                        </td>
                                    </tr>
                                ) : (
                                    recentOrdersForDisplay.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                            {order.id}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {order.customer}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-500">
                                            {order.date}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-500">
                                            {order.time}
                                        </td>
                                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                            {formatCurrency(order.amount)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}
                                            >
                                                {order.status}
                                            </span>
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