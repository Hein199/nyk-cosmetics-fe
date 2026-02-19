"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

interface DashboardStats {
    totalSales: string | number;
    ordersToday: number;
    pendingOrders: number;
    lowStockCount: number;
    lowStockProducts: { id: string; name: string; stock: number }[];
    recentOrders: {
        id: string;
        customer: string;
        salesperson: string;
        amount: string | number;
        status: string;
        date: string;
        itemCount: number;
    }[];
}

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
    }).format(amount);
}

export default function AdminPage() {
    const { token } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<DashboardStats>("/dashboard/stats", { token, signal });
            setStats(data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        fetchStats(controller.signal);
        return () => controller.abort();
    }, [fetchStats]);

    const totalSales = stats ? Number(stats.totalSales) : 0;
    const ordersToday = stats?.ordersToday ?? 0;
    const pendingOrders = stats?.pendingOrders ?? 0;
    const lowStockCount = stats?.lowStockCount ?? 0;
    const lowStockProducts = stats?.lowStockProducts ?? [];
    const recentOrders = stats?.recentOrders ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 mt-1">Overview of your business performance</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={fetchStats}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        </svg>
                        Refresh
                    </Button>
                    <Link href="/admin/products">
                        <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Product
                        </Button>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Sales</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? "..." : formatCurrency(totalSales)}</p>
                                <p className="text-sm text-gray-500 mt-1">Delivered orders</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <p className="text-sm font-medium text-gray-500">Orders Today</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? "..." : ordersToday}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                                <p className="text-3xl font-bold text-yellow-600 mt-1">{loading ? "..." : pendingOrders}</p>
                                <p className="text-sm text-gray-500 mt-1">Requires attention</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Low Stock</p>
                                <p className="text-3xl font-bold text-red-600 mt-1">{loading ? "..." : lowStockCount}</p>
                                <p className="text-sm text-red-600 mt-1">Products below 20 pcs</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Recent Orders</CardTitle>
                                <CardDescription>Latest orders across all salespersons</CardDescription>
                            </div>
                            <Link href="/admin/orders"><Button variant="outline" size="sm">View All</Button></Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading...</div>
                        ) : recentOrders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No orders yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Customer</th>
                                            <th className="text-left py-3 px-2 font-medium text-gray-500">Salesperson</th>
                                            <th className="text-right py-3 px-2 font-medium text-gray-500">Amount</th>
                                            <th className="text-center py-3 px-2 font-medium text-gray-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map((order) => (
                                            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-2 text-gray-900">{order.customer}</td>
                                                <td className="py-3 px-2 text-gray-600">{order.salesperson}</td>
                                                <td className="py-3 px-2 text-right font-medium text-gray-900">{formatCurrency(Number(order.amount))}</td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                                                        {order.status.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Low Stock Alerts */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Low Stock Alerts
                        </CardTitle>
                        <CardDescription>Products that need restocking</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-4 text-gray-500">Loading...</div>
                        ) : lowStockProducts.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">All products stocked.</div>
                        ) : (
                            <div className="space-y-3">
                                {lowStockProducts.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                        <span className="ml-2 px-2 py-1 text-xs font-bold text-red-700 bg-red-200 rounded">{item.stock} left</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Link href="/admin/products"><Button variant="outline" className="w-full mt-4" size="sm">View All Products</Button></Link>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Link href="/admin/users" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center group">
                            <div className="w-10 h-10 mx-auto bg-pink-100 rounded-full flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p className="mt-2 text-sm font-medium text-gray-700">Manage Users</p>
                        </Link>
                        <Link href="/admin/employees" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center group">
                            <div className="w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="mt-2 text-sm font-medium text-gray-700">Employees</p>
                        </Link>
                        <Link href="/admin/expenses" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center group">
                            <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="mt-2 text-sm font-medium text-gray-700">Expenses</p>
                        </Link>
                        <Link href="/admin/outstanding" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center group">
                            <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="mt-2 text-sm font-medium text-gray-700">Payments</p>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
