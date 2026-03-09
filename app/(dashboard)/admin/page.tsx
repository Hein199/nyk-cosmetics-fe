"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
    totalSales: string | number;
    ordersToday: number;
    pendingOrders: number;
    lowStockCount: number;
    lowStockProducts: { id: number; name: string; stock: number }[];
    recentOrders: {
        id: number;
        customer: string;
        salesperson: string;
        amount: string | number;
        status: string;
        date: string;
        itemCount: number;
    }[];
}

interface ChartPoint { label: string; sales: number }
interface ProductPoint { name: string; value: number }
interface SalespersonData { data: Record<string, string | number>[]; names: string[] }
interface CashFlowPoint { label: string; "Cash In": number; "Cash Out": number }

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
    delivered: "bg-green-100 text-green-700",
    confirmed: "bg-blue-100 text-blue-700",
    pending_admin: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
};

const SALESPERSON_COLORS = ["#ec4899", "#60a5fa", "#34d399", "#f59e0b", "#a78bfa"];

function fmt(amount: number): string {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        notation: amount >= 1_000_000 ? "compact" : "standard",
    }).format(amount);
}

function fmtFull(amount: number): string {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

// ── Shared tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({
    active,
    payload,
    label,
    isQty = false,
}: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
    isQty?: boolean;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm min-w-[140px]">
            <p className="text-gray-500 mb-1 text-xs">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="font-semibold" style={{ color: p.color }}>
                    {payload.length > 1 && <span className="text-xs text-gray-500 mr-1">{p.name}:</span>}
                    {isQty ? `${p.value} pcs` : fmtFull(p.value)}
                </p>
            ))}
        </div>
    );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white border border-gray-200 rounded-xl ${className}`}>
            {children}
        </div>
    );
}

function SectionHeader({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

// Small toggle pill
function Toggle<T extends string>({
    options,
    value,
    onChange,
    labels,
}: {
    options: T[];
    value: T;
    onChange: (v: T) => void;
    labels?: Record<T, string>;
}) {
    return (
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        value === opt
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    {labels?.[opt] ?? opt}
                </button>
            ))}
        </div>
    );
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
    return (
        <div
            className="w-full rounded-lg bg-gray-50 animate-pulse"
            style={{ height }}
        />
    );
}

function ChartEmpty({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center text-sm text-gray-400 py-8">
            {message}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
    const { token } = useAuth();

    // Main stats (recent orders + low stock)
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sales chart
    const [salesData, setSalesData] = useState<ChartPoint[]>([]);
    const [salesLoading, setSalesLoading] = useState(true);
    const [salesError, setSalesError] = useState<string | null>(null);

    // Top products
    const [topMode, setTopMode] = useState<"daily" | "monthly">("daily");
    const [topMetric, setTopMetric] = useState<"revenue" | "qty">("revenue");
    const [topProducts, setTopProducts] = useState<ProductPoint[]>([]);
    const [topLoading, setTopLoading] = useState(true);
    const [topError, setTopError] = useState<string | null>(null);

    // Salesperson performance
    const [salesperson, setSalesperson] = useState<SalespersonData>({ data: [], names: [] });
    const [salespersonLoading, setSalespersonLoading] = useState(true);
    const [salespersonError, setSalespersonError] = useState<string | null>(null);

    // Cash flow
    const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
    const [cashFlowLoading, setCashFlowLoading] = useState(true);
    const [cashFlowError, setCashFlowError] = useState<string | null>(null);

    // ── Fetchers ────────────────────────────────────────────────────────────────

    const fetchStats = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        setStatsLoading(true);
        setError(null);
        try {
            const data = await apiFetch<DashboardStats>("/dashboard/stats", { token, signal });
            setStats(data);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setError(err instanceof Error ? err.message : "Failed to load dashboard stats");
        } finally {
            setStatsLoading(false);
        }
    }, [token]);

    const fetchSalesChart = useCallback(async (mode: "daily" | "monthly", signal?: AbortSignal) => {
        if (!token) return;
        setSalesLoading(true);
        setSalesError(null);
        try {
            const data = await apiFetch<ChartPoint[]>("/dashboard/sales-chart", {
                token,
                signal,
                params: { mode },
            });
            setSalesData(data);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.error("fetchSalesChart error:", err);
            setSalesError(err instanceof Error ? err.message : "Failed to load sales data");
        } finally {
            setSalesLoading(false);
        }
    }, [token]);

    const fetchTopProducts = useCallback(async (
        mode: "daily" | "monthly",
        metric: "revenue" | "qty",
        signal?: AbortSignal,
    ) => {
        if (!token) return;
        setTopLoading(true);
        setTopError(null);
        try {
            const data = await apiFetch<ProductPoint[]>("/dashboard/top-products", {
                token,
                signal,
                params: { mode, metric },
            });
            setTopProducts(data);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.error("fetchTopProducts error:", err);
            setTopError(err instanceof Error ? err.message : "Failed to load product data");
        } finally {
            setTopLoading(false);
        }
    }, [token]);

    const fetchSalesperson = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        setSalespersonLoading(true);
        setSalespersonError(null);
        try {
            const data = await apiFetch<SalespersonData>("/dashboard/salesperson-performance", { token, signal });
            setSalesperson(data);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.error("fetchSalesperson error:", err);
            setSalespersonError(err instanceof Error ? err.message : "Failed to load salesperson data");
        } finally {
            setSalespersonLoading(false);
        }
    }, [token]);

    const fetchCashFlow = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        setCashFlowLoading(true);
        setCashFlowError(null);
        try {
            const data = await apiFetch<CashFlowPoint[]>("/dashboard/cash-flow", { token, signal });
            setCashFlow(data);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.error("fetchCashFlow error:", err);
            setCashFlowError(err instanceof Error ? err.message : "Failed to load cash flow data");
        } finally {
            setCashFlowLoading(false);
        }
    }, [token]);

    // ── Initial load ────────────────────────────────────────────────────────────

    useEffect(() => {
        const ctrl = new AbortController();
        fetchStats(ctrl.signal);
        fetchSalesChart('daily', ctrl.signal);
        fetchTopProducts(topMode, topMetric, ctrl.signal);
        fetchSalesperson(ctrl.signal);
        fetchCashFlow(ctrl.signal);
        return () => ctrl.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Re-fetch top products when mode or metric changes
    useEffect(() => {
        const ctrl = new AbortController();
        fetchTopProducts(topMode, topMetric, ctrl.signal);
        return () => ctrl.abort();
    }, [topMode, topMetric, fetchTopProducts]);

    // ── Refresh all ─────────────────────────────────────────────────────────────

    function refreshAll() {
        fetchStats();
        fetchSalesChart('daily');
        fetchTopProducts(topMode, topMetric);
        fetchSalesperson();
        fetchCashFlow();
    }

    // ── Derived ─────────────────────────────────────────────────────────────────

    const lowStockProducts = stats?.lowStockProducts ?? [];
    const recentOrders = stats?.recentOrders ?? [];
    const hasTopProducts = topProducts.length > 0;
    const hasSalesperson = salesperson.data.length > 0;
    const hasCashFlow = cashFlow.some((d) => d["Cash In"] > 0 || d["Cash Out"] > 0);
    const hasSalesData = useMemo(() => salesData.some((d) => d.sales > 0), [salesData]);

    return (
        <div className="space-y-6">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Business performance overview</p>
                </div>
                <Button variant="outline" size="sm" className="w-fit" onClick={refreshAll}>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* ── Sales Overview ─────────────────────────────────────── */}
            <Section>
                <SectionHeader
                    title="Sales Overview"
                    subtitle="Daily · MMK"
                />
                <div className="px-2 pb-5">
                    {salesLoading ? (
                        <ChartSkeleton height={220} />
                    ) : salesError ? (
                        <ChartEmpty message={salesError} />
                    ) : !hasSalesData ? (
                        <ChartEmpty message="No sales data for this period." />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={salesData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={1} />
                                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={44} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area type="monotone" dataKey="sales" stroke="#ec4899" strokeWidth={2} fill="url(#salesGrad)" dot={false} activeDot={{ r: 4, fill: "#ec4899", strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </Section>

            {/* ── Top Products | Salesperson Performance ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Top Selling Products */}
                <Section>
                    <SectionHeader
                        title="Top Selling Products"
                        subtitle="Top 5 by selected period"
                        action={
                            <div className="flex gap-2">
                                <Toggle
                                    options={["daily", "monthly"] as const}
                                    value={topMode}
                                    onChange={setTopMode}
                                    labels={{ daily: "14d", monthly: "Month" }}
                                />
                                <Toggle
                                    options={["revenue", "qty"] as const}
                                    value={topMetric}
                                    onChange={setTopMetric}
                                    labels={{ revenue: "Revenue", qty: "Qty" }}
                                />
                            </div>
                        }
                    />
                    <div className="px-2 pb-5">
                        {topLoading ? (
                            <ChartSkeleton height={200} />
                        ) : topError ? (
                            <ChartEmpty message={topError} />
                        ) : !hasTopProducts ? (
                            <ChartEmpty message="No product sales data for this period." />
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                    layout="vertical"
                                    data={topProducts}
                                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={topMetric === "revenue"
                                            ? (v) => `${(v / 1_000_000).toFixed(1)}M`
                                            : (v) => `${v}`
                                        }
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 10, fill: "#64748b" }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={90}
                                    />
                                    <Tooltip content={<ChartTooltip isQty={topMetric === "qty"} />} />
                                    <Bar dataKey="value" fill="#a78bfa" radius={[0, 4, 4, 0]} maxBarSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Section>

                {/* Salesperson Performance */}
                <Section>
                    <SectionHeader
                        title="Salesperson Performance"
                        subtitle="Monthly delivered revenue · MMK"
                    />
                    <div className="px-2 pb-5">
                        {salespersonLoading ? (
                            <ChartSkeleton height={200} />
                        ) : salespersonError ? (
                            <ChartEmpty message={salespersonError} />
                        ) : !hasSalesperson ? (
                            <ChartEmpty message="No salesperson data available." />
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={salesperson.data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`} width={44} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                    {salesperson.names.map((name, i) => (
                                        <Bar
                                            key={name}
                                            dataKey={name}
                                            fill={SALESPERSON_COLORS[i % SALESPERSON_COLORS.length]}
                                            radius={[3, 3, 0, 0]}
                                            maxBarSize={18}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Section>
            </div>

            {/* ── Cash Flow ──────────────────────────────────────────── */}
            <Section>
                <SectionHeader
                    title="Cash Flow"
                    subtitle="Last 30 days · confirmed payments vs expenses · MMK"
                />
                <div className="px-2 pb-5">
                    {cashFlowLoading ? (
                        <ChartSkeleton height={220} />
                    ) : cashFlowError ? (
                        <ChartEmpty message={cashFlowError} />
                    ) : !hasCashFlow ? (
                        <ChartEmpty message="No cash flow data for this period." />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={cashFlow} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={4}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                                    width={44}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                                <Line type="monotone" dataKey="Cash In" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="Cash Out" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </Section>

            {/* ── Recent Orders + Low Stock ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Orders */}
                <Section className="lg:col-span-2">
                    <SectionHeader
                        title="Recent Orders"
                        subtitle="Latest orders across all salespersons"
                        action={
                            <Link href="/admin/orders">
                                <Button variant="outline" size="sm" className="text-xs">View All</Button>
                            </Link>
                        }
                    />
                    <div className="px-5 pb-5">
                        {statsLoading ? (
                            <div className="text-center py-10 text-sm text-gray-400">Loading…</div>
                        ) : recentOrders.length === 0 ? (
                            <div className="text-center py-10 text-sm text-gray-400">No orders yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left py-2 px-2 text-xs text-gray-400 font-medium">Customer</th>
                                            <th className="text-left py-2 px-2 text-xs text-gray-400 font-medium">Salesperson</th>
                                            <th className="text-right py-2 px-2 text-xs text-gray-400 font-medium">Amount</th>
                                            <th className="text-center py-2 px-2 text-xs text-gray-400 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {recentOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-2 text-gray-800 font-medium">{order.customer}</td>
                                                <td className="py-3 px-2 text-gray-500">{order.salesperson}</td>
                                                <td className="py-3 px-2 text-right font-semibold text-gray-900">{fmt(Number(order.amount))}</td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                        {order.status.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Section>

                {/* Low Stock */}
                <Section>
                    <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Low Stock</h2>
                            <p className="text-xs text-gray-400">Below 20 pcs</p>
                        </div>
                    </div>
                    <div className="px-5 pb-5">
                        {statsLoading ? (
                            <div className="text-center py-6 text-sm text-gray-400">Loading…</div>
                        ) : lowStockProducts.length === 0 ? (
                            <p className="text-sm text-gray-400 py-6 text-center">All products stocked.</p>
                        ) : (
                            <ul className="space-y-2">
                                {lowStockProducts.map((item) => (
                                    <li key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-sm text-gray-700 truncate pr-2">{item.name}</span>
                                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${item.stock <= 5 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                            {item.stock} left
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                    </div>
                </Section>
            </div>
        </div>
    );
}
