"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogClose,
} from "@/components/ui/dialog";
import { SystemLogo } from "@/components/ui/system-logo";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { MAX_DECIMAL_12_2_INTEGER, MAX_INT_32 } from "@/lib/constants";
import { formatId, thaiToday, formatThaiDate, toBangkokDateStr } from "@/lib/utils";

type OrderListItem = {
    id: number;
    created_at: string;
    status: string;
    total_amount: string | number;
    customer: { name: string };
    items: Array<{ id: number }>;
    salesperson?: { id: number; username: string } | null;
};

type OrderDetail = {
    id: number;
    created_at: string;
    status: string;
    total_amount: string | number;
    customer: { name: string; phone_number: string; address: string };
    items: Array<{
        id: number;
        quantity: number;
        unit_type: string;
        unit_price: string | number;
        product?: { name: string; category?: string | null } | null;
    }>;
    salesperson?: { id: number; username: string } | null;
};

function unitTypeLabel(unit: string) {
    switch (unit) {
        case "D": return "Dozen";
        case "P": return "Box";
        default: return "Pcs";
    }
}

const statusColors: Record<string, string> = {
    delivered: "bg-green-100 text-green-800",
    confirmed: "bg-blue-100 text-blue-800",
    pending_admin: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
};

const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "pending_admin", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(amount);
}

// Format date for display
function formatDate(dateString: string) {
    return formatThaiDate(dateString);
}

function formatStatusLabel(status: string) {
    const normalized = status.toLowerCase();
    if (normalized === "pending_admin") {
        return "pending";
    }
    return normalized.replace("_", " ");
}

function formatOrderTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function getOrderUnitMultiplier(unitType: string) {
    if (unitType === "D") return 12;
    if (unitType === "P") return 24;
    return 1;
}

function getMaxOrderQuantityForUnit(unitType: string) {
    return Math.floor(MAX_INT_32 / Math.max(getOrderUnitMultiplier(unitType), 1));
}

export default function OrdersPage() {
    const router = useRouter();
    const { token, user } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [ordersError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedItems, setEditedItems] = useState<Record<number, { quantity: number; unit_price: number; unit_type: string }>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const normalizeNonNegativeIntegerInput = (value: string, max: number = MAX_INT_32) => {
        const digitsOnly = value.replace(/\D/g, "");
        if (digitsOnly === "") {
            return 0;
        }
        const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
        const parsed = Number(normalized);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return 0;
        }

        return Math.min(max, parsed);
    };

    const preventNegativeQuantityKeys = (event: KeyboardEvent<HTMLInputElement>) => {
        const allowedControlKeys = [
            "Backspace",
            "Delete",
            "ArrowLeft",
            "ArrowRight",
            "Tab",
            "Home",
            "End",
        ];

        if (event.ctrlKey || event.metaKey) {
            return;
        }

        if (allowedControlKeys.includes(event.key)) {
            return;
        }

        if (!/^\d$/.test(event.key)) {
            event.preventDefault();
        }
    };

    const preventNegativePriceKeys = (event: KeyboardEvent<HTMLInputElement>) => {
        const allowedControlKeys = [
            "Backspace",
            "Delete",
            "ArrowLeft",
            "ArrowRight",
            "Tab",
            "Home",
            "End",
        ];

        if (event.ctrlKey || event.metaKey) {
            return;
        }

        if (allowedControlKeys.includes(event.key)) {
            return;
        }

        if (!/^\d$/.test(event.key)) {
            event.preventDefault();
        }
    };

    const dateRangeKey = useMemo(() => `nyk-orders-date-range:${user?.id ?? "anon"}`, [user?.id]);
    const todayDate = thaiToday();

    const loadDateRange = () => {
        if (typeof window === "undefined") return null;
        const raw = sessionStorage.getItem(dateRangeKey);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as { fromDate: string; toDate: string };
            if (!parsed.fromDate || !parsed.toDate) return null;
            return parsed;
        } catch { return null; }
    };
    const getStatusBadgeClass = (status: string) => {
        const key = status.toLowerCase();
        if (key === "delivered") return "bg-green-50 text-green-700 border-green-200";
        if (key === "confirmed") return "bg-blue-50 text-blue-700 border-blue-200";
        if (key === "pending_admin") return "bg-yellow-50 text-yellow-700 border-yellow-200";
        return "bg-red-50 text-red-700 border-red-200";
    };

    const saveDateRange = (from: string, to: string) => {
        if (typeof window === "undefined") return;
        sessionStorage.setItem(dateRangeKey, JSON.stringify({ fromDate: from, toDate: to }));
    };

    const normalizeDateRange = (from: string, to: string) => {
        const normalizedTo = !to ? todayDate : to > todayDate ? todayDate : to;
        const candidateFrom = from || normalizedTo;
        const normalizedFrom = candidateFrom > normalizedTo ? normalizedTo : candidateFrom;
        return { fromDate: normalizedFrom, toDate: normalizedTo };
    };

    // Date range selection state
    const [fromDate, setFromDate] = useState(() => {
        const stored = loadDateRange();
        return normalizeDateRange(stored?.fromDate ?? todayDate, stored?.toDate ?? todayDate).fromDate;
    });
    const [toDate, setToDate] = useState(() => {
        const stored = loadDateRange();
        return normalizeDateRange(stored?.fromDate ?? todayDate, stored?.toDate ?? todayDate).toDate;
    });
    const isDateRangeInvalid = fromDate > toDate || toDate > todayDate;

    // Dialog state for order details
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [, setSelectedOrder] = useState<number | null>(null);
    const [orderDetails, setOrderDetails] = useState<OrderDetail | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    // Orders data via React Query
    const { data: orders = [], isLoading: ordersLoading, dataUpdatedAt } = useQuery({
        queryKey: ["sp-orders"],
        queryFn: () => apiFetch<OrderListItem[]>("/orders", { token }),
        enabled: !!token && !isDateRangeInvalid,
    });
    const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

    // Save date range preference
    const handleFromDate = (v: string) => {
        const normalized = normalizeDateRange(v, toDate);
        setFromDate(normalized.fromDate);
        setToDate(normalized.toDate);
        saveDateRange(normalized.fromDate, normalized.toDate);
    };
    const handleToDate = (v: string) => {
        const normalized = normalizeDateRange(fromDate, v);
        setFromDate(normalized.fromDate);
        setToDate(normalized.toDate);
        saveDateRange(normalized.fromDate, normalized.toDate);
    };

    const handleTodayDateRange = () => {
        setFromDate(todayDate);
        setToDate(todayDate);
        saveDateRange(todayDate, todayDate);
    };

    const openOrderDetails = async (orderId: number, mode: "view" | "edit") => {
        setIsEditMode(mode === "edit");
        setEditedItems({});
        setSaveError(null);
        setSelectedOrder(orderId);
        setIsDialogOpen(true);
        if (!token) return;

        setDetailsLoading(true);
        setDetailsError(null);
        try {
            const data = await apiFetch<OrderDetail>(`/orders/${orderId}`, { token });
            setOrderDetails(data);
            if (mode === "edit") {
                const initial: Record<number, { quantity: number; unit_price: number; unit_type: string }> = {};
                for (const item of data.items) {
                    const unitMultiplier = getOrderUnitMultiplier(item.unit_type);
                    initial[item.id] = {
                        quantity: item.quantity,
                        unit_price: Number(item.unit_price) / Math.max(unitMultiplier, 1),
                        unit_type: item.unit_type,
                    };
                }
                setEditedItems(initial);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load order details";
            setDetailsError(message);
            setOrderDetails(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleViewDetails = (orderId: number) => openOrderDetails(orderId, "view");
    const handleEditOrder = (orderId: number) => openOrderDetails(orderId, "edit");

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditedItems({});
        setSaveError(null);
    };

    const handleSaveEdit = async () => {
        if (!orderDetails || !token) return;
        setIsSaving(true);
        setSaveError(null);
        try {
            const items: Array<{ id: number; quantity: number; unit_price: string; unit_type: string }> = [];
            let nextTotal = 0;

            for (const [id, vals] of Object.entries(editedItems)) {
                const quantity = Number(vals.quantity);
                const unitPrice = Number(vals.unit_price);
                const unitType = vals.unit_type;
                const unitMultiplier = getOrderUnitMultiplier(unitType);
                const maxQuantityForUnit = getMaxOrderQuantityForUnit(unitType);
                const requiredPcs = quantity * unitMultiplier;

                if (!Number.isInteger(quantity) || quantity < 0) {
                    throw new Error("Quantity must be a whole number greater than or equal to 0");
                }
                if (quantity > maxQuantityForUnit) {
                    throw new Error(`Quantity is too large for ${unitTypeLabel(unitType)} (max ${maxQuantityForUnit.toLocaleString()})`);
                }
                if (!Number.isFinite(requiredPcs) || requiredPcs > MAX_INT_32) {
                    throw new Error("Quantity exceeds inventory limit");
                }

                if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                    throw new Error("Unit price must be greater than or equal to 0");
                }
                if (unitPrice > MAX_DECIMAL_12_2_INTEGER) {
                    throw new Error(`Unit price must not exceed ${MAX_DECIMAL_12_2_INTEGER.toLocaleString()} MMK`);
                }

                const payloadUnitPrice = unitPrice * unitMultiplier;
                if (!Number.isFinite(payloadUnitPrice) || payloadUnitPrice > MAX_DECIMAL_12_2_INTEGER) {
                    throw new Error(`Unit price is too high for ${unitTypeLabel(unitType)}`);
                }

                const lineTotal = unitPrice * requiredPcs;
                if (!Number.isFinite(lineTotal) || lineTotal > MAX_DECIMAL_12_2_INTEGER) {
                    throw new Error("Line total is too large");
                }

                nextTotal += lineTotal;
                if (!Number.isFinite(nextTotal) || nextTotal > MAX_DECIMAL_12_2_INTEGER) {
                    throw new Error(`Order total must not exceed ${MAX_DECIMAL_12_2_INTEGER.toLocaleString()} MMK`);
                }

                items.push({
                    id: Number(id),
                    quantity,
                    unit_price: String(payloadUnitPrice),
                    unit_type: unitType,
                });
            }

            const updated = await apiFetch<OrderDetail>(`/orders/${orderDetails.id}/items`, {
                method: "PATCH",
                token,
                body: { items },
            });
            setOrderDetails(updated);
            setIsEditMode(false);
            setEditedItems({});
            queryClient.invalidateQueries({ queryKey: ["sp-orders"] });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save changes";
            setSaveError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const getEditedItemDefaults = (itemId: number) => {
        const sourceItem = orderDetails?.items.find((item) => item.id === itemId);
        const sourceUnitType = sourceItem?.unit_type ?? "Pcs";
        const unitMultiplier = getOrderUnitMultiplier(sourceUnitType);

        return {
            quantity: sourceItem?.quantity ?? 0,
            unit_price: sourceItem ? Number(sourceItem.unit_price) / Math.max(unitMultiplier, 1) : 0,
            unit_type: sourceUnitType,
        };
    };

    const updateEditedItem = (itemId: number, field: "quantity" | "unit_price" | "unit_type", value: number | string) => {
        setEditedItems((prev) => ({
            ...prev,
            [itemId]: { ...(prev[itemId] ?? getEditedItemDefaults(itemId)), [field]: value },
        }));
    };

    const handleEditedUnitTypeChange = (itemId: number, unitType: string) => {
        setEditedItems((prev) => {
            const currentItem = prev[itemId];
            if (!currentItem) {
                return prev;
            }

            const maxQuantity = getMaxOrderQuantityForUnit(unitType);

            return {
                ...prev,
                [itemId]: {
                    ...currentItem,
                    unit_type: unitType,
                    quantity: Math.min(maxQuantity, Math.max(0, currentItem.quantity)),
                },
            };
        });
    };

    // Filter and search orders
    const filteredOrders = useMemo(() => {
        if (isDateRangeInvalid) {
            return [];
        }
        const [rangeFrom, rangeTo] = fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
        return orders.filter((order) => {
            const orderDate = toBangkokDateStr(order.created_at);
            // Date range filter
            const matchesDateRange = orderDate >= rangeFrom && orderDate <= rangeTo;

            // Status filter
            const matchesStatus = statusFilter === "all" || order.status.toLowerCase() === statusFilter;

            // Search filter
            const matchesSearch = searchQuery === "" ||
                String(order.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.customer.name.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesDateRange && matchesStatus && matchesSearch;
        });
    }, [fromDate, toDate, searchQuery, statusFilter, orders, isDateRangeInvalid]);

    // Format date range for display
    const formatDateRange = (from: string, to: string) => {
        const [start, end] = from <= to ? [from, to] : [to, from];
        if (start === end) {
            return formatDate(start);
        }
        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                    <p className="text-gray-500 mt-1">
                        Viewing orders for {formatDateRange(fromDate, toDate)}
                    </p>
                    {lastUpdated && (
                        <p className="text-xs text-gray-400 mt-2">
                            Last updated {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        size="sm"
                        className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-sm"
                        onClick={() => router.push("/salesperson/products")}
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Order
                    </Button>
                </div>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>Filter and search through your orders</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Date Range Filter */}
                    <div className="mb-6">
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
                                    onChange={(e) => handleFromDate(e.target.value)}
                                    max={toDate || todayDate}
                                    className={`w-40 px-3 py-2 text-sm text-black border rounded-lg focus:outline-none focus:ring-2 bg-white shadow-sm ${isDateRangeInvalid
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
                                    max={todayDate}
                                    className={`w-40 px-3 py-2 text-sm text-black border rounded-lg focus:outline-none focus:ring-2 bg-white shadow-sm ${isDateRangeInvalid
                                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                                        : "border-gray-300 focus:ring-pink-500 focus:border-pink-500"}`}
                                    min={fromDate}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-transparent mb-1">.</label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleTodayDateRange}
                                    className="text-xs h-10"
                                >
                                    Today
                                </Button>
                            </div>
                        </div>
                        {isDateRangeInvalid && (
                            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                Invalid date range
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Found {filteredOrders.length} orders for {formatDateRange(fromDate, toDate)}
                        </p>
                    </div>
                    {ordersError && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                            {ordersError}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        {/* Search */}
                        <div className="flex-1">
                            <Input
                                placeholder="Search by Order ID or Customer name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10"
                                disabled={isDateRangeInvalid}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="sm:w-48">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                disabled={isDateRangeInvalid}
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Mobile: Card layout */}
                    <div className="block sm:hidden space-y-4">
                        {ordersLoading ? (
                            <div className="text-center py-8 text-gray-500">Loading orders...</div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No orders found matching your criteria.</p>
                            </div>
                        ) : (
                            filteredOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">{formatId('ORD', order.id)}</span>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status.toLowerCase()] ?? "bg-gray-100 text-gray-800"}`}
                                        >
                                            {formatStatusLabel(order.status)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{order.customer.name}</p>
                                        <p className="text-sm text-gray-500">{order.items.length} items</p>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div>
                                            <p className="text-gray-500">{formatDate(order.created_at)}</p>
                                            <p className="text-gray-500">
                                                {formatOrderTime(order.created_at)}
                                            </p>
                                        </div>
                                        <span className="font-semibold text-gray-900 text-lg">
                                            {formatCurrency(Number(order.total_amount))}
                                        </span>
                                    </div>
                                    <div className="pt-3">
                                        {order.status.toLowerCase() === "pending_admin" ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => handleEditOrder(order.id)}
                                            >
                                                Edit
                                            </Button>
                                        ) : order.status.toLowerCase() === "confirmed" ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => handleViewDetails(order.id)}
                                            >
                                                View
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => handleViewDetails(order.id)}
                                            >
                                                View
                                            </Button>
                                        )}
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
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Items
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Status
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordersLoading ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-8 text-gray-500">
                                                Loading orders...
                                            </td>
                                        </tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-8 text-gray-500">
                                                No orders found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order, index) => (
                                            <tr
                                                key={order.id}
                                                className={`border-b border-gray-300 ${index % 2 === 0 ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-gray-50"
                                                    } transition-colors`}
                                            >
                                                <td className="py-3 px-4 text-center font-semibold text-gray-900 border-r border-gray-300">
                                                    {formatId('ORD', order.id)}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {order.customer.name}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {formatDate(order.created_at)}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {formatOrderTime(order.created_at)}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-gray-900 border-r border-gray-300">
                                                    {formatCurrency(Number(order.total_amount))}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {order.items.length}
                                                </td>
                                                <td className="py-3 px-4 text-center border-r border-gray-300">
                                                    <span
                                                        className={`px-2 py-1 text-xs font-bold rounded border ${getStatusBadgeClass(order.status)}`}
                                                    >
                                                        {formatStatusLabel(order.status)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {order.status.toLowerCase() === "pending_admin" ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditOrder(order.id)}
                                                            className="text-xs"
                                                        >
                                                            Edit
                                                        </Button>
                                                    ) : order.status.toLowerCase() === "confirmed" ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewDetails(order.id)}
                                                            className="text-xs"
                                                        >
                                                            View
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewDetails(order.id)}
                                                            className="text-xs"
                                                        >
                                                            View
                                                        </Button>
                                                    )}
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

            {/* Order Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="relative max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <SystemLogo
                                    size="lg"
                                    showName
                                    subtitle="Beauty & Cosmetics"
                                    nameClassName="text-2xl font-bold text-gray-900"
                                    subtitleClassName="text-base text-gray-600"
                                />
                            </div>
                            <DialogClose
                                onClick={() => setIsDialogOpen(false)}
                                className="absolute right-4 top-4 rounded-md p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </DialogClose>
                        </div>
                    </DialogHeader>

                    {(detailsLoading || detailsError || orderDetails) && (
                        <div className="p-6 space-y-6">
                            {/* Order Header */}
                            <div className="border border-gray-200 rounded p-4 bg-white">
                                {detailsLoading && (
                                    <div className="text-sm text-gray-500">Loading order details...</div>
                                )}
                                {detailsError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                                        {detailsError}
                                    </div>
                                )}
                                {orderDetails && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                                Order #{orderDetails.id}
                                            </h3>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex">
                                                    <span className="w-24 text-gray-600">Date:</span>
                                                    <span className="text-gray-900">{formatDate(orderDetails.created_at)}</span>
                                                </div>
                                                <div className="flex">
                                                    <span className="w-24 text-gray-600">Time:</span>
                                                    <span className="text-gray-900">
                                                        {formatOrderTime(orderDetails.created_at)}
                                                    </span>
                                                </div>
                                                <div className="flex">
                                                    <span className="w-24 text-gray-600">Staff:</span>
                                                    <span className="text-gray-900">{orderDetails.salesperson?.username ?? "-"}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="mb-3">
                                                <span
                                                    className={`px-3 py-1 text-sm font-medium rounded border ${getStatusBadgeClass(orderDetails.status)}`}
                                                >
                                                    {formatStatusLabel(orderDetails.status)}
                                                </span>
                                            </div>
                                            {isEditMode && (
                                                <span className="px-3 py-1 text-xs font-semibold rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                                                    Edit Mode
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Customer Information */}
                            {orderDetails && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                        Customer Details
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex">
                                                <span className="w-16 text-gray-600">Name:</span>
                                                <span className="text-gray-900 font-medium">{orderDetails.customer.name}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-gray-600">Phone:</span>
                                                <span className="text-gray-900">{orderDetails.customer.phone_number}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-16 text-gray-600">Address:</span>
                                                <span className="text-gray-900">{orderDetails.customer.address}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Order Items */}
                            {orderDetails && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                        Items Ordered
                                    </h4>
                                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="bg-blue-600 text-white">
                                                <tr>
                                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500 w-12">
                                                        NO.
                                                    </th>
                                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                                        Product
                                                    </th>
                                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                                        Category
                                                    </th>
                                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500 w-20">
                                                        Qty Type
                                                    </th>
                                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500 w-16">
                                                        Qty
                                                    </th>
                                                    <th className="text-center py-3 px-4 font-bold border-r border-blue-500 w-24">
                                                        Unit Price
                                                    </th>
                                                    <th className="text-center py-3 px-4 font-bold w-28">
                                                        Total
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orderDetails.items.map((item, index) => {
                                                    const edited = editedItems[item.id];
                                                    const qty = isEditMode ? (edited?.quantity ?? item.quantity) : item.quantity;
                                                    const unitPrice = isEditMode ? (edited?.unit_price ?? Number(item.unit_price)) : Number(item.unit_price);
                                                    const unitType = isEditMode ? (edited?.unit_type ?? item.unit_type) : item.unit_type;
                                                    const total = isEditMode
                                                        ? unitPrice * qty * getOrderUnitMultiplier(unitType)
                                                        : unitPrice * qty;
                                                    return (
                                                        <tr key={item.id} className={`border-b border-gray-300 ${index % 2 === 0
                                                            ? "bg-blue-50 hover:bg-blue-100"
                                                            : "bg-white hover:bg-gray-50"
                                                            }`}>
                                                            <td className="py-3 px-4 text-center text-gray-800 font-semibold border-r border-gray-300">
                                                                {index + 1}
                                                            </td>
                                                            <td className="py-3 px-4 border-r border-gray-300">
                                                                <div>
                                                                    <p className="font-semibold text-gray-900">{item.product?.name ?? "-"}</p>
                                                                    {/* <p className="text-xs text-gray-600 font-medium">{item.id}</p> */}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-gray-700 font-medium border-r border-gray-300">
                                                                {item.product?.category ?? "-"}
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-gray-700 font-medium border-r border-gray-300">
                                                                {isEditMode ? (
                                                                    <select
                                                                        value={unitType ?? "Pcs"}
                                                                        onChange={(e) => handleEditedUnitTypeChange(item.id, e.target.value)}
                                                                        className="h-8 w-24 rounded border border-gray-300 bg-white px-2 text-xs text-gray-900"
                                                                    >
                                                                        <option value="Pcs">Pcs</option>
                                                                        <option value="D">Dozen</option>
                                                                        <option value="P">Box</option>
                                                                    </select>
                                                                ) : (
                                                                    unitTypeLabel(unitType)
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-center text-gray-900 font-semibold border-r border-gray-300">
                                                                {isEditMode ? (
                                                                    <Input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        value={qty}
                                                                        onChange={(e) => updateEditedItem(
                                                                            item.id,
                                                                            "quantity",
                                                                            normalizeNonNegativeIntegerInput(
                                                                                e.target.value,
                                                                                getMaxOrderQuantityForUnit(unitType),
                                                                            ),
                                                                        )}
                                                                        onKeyDown={preventNegativeQuantityKeys}
                                                                        className="h-8 w-20 text-center mx-auto"
                                                                    />
                                                                ) : (
                                                                    qty
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-right text-gray-900 font-medium border-r border-gray-300">
                                                                {isEditMode ? (
                                                                    <Input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        pattern="[0-9]*"
                                                                        value={unitPrice}
                                                                        onChange={(e) => updateEditedItem(
                                                                            item.id,
                                                                            "unit_price",
                                                                            normalizeNonNegativeIntegerInput(e.target.value, MAX_DECIMAL_12_2_INTEGER),
                                                                        )}
                                                                        onKeyDown={preventNegativePriceKeys}
                                                                        className="h-8 w-28 text-right ml-auto"
                                                                    />
                                                                ) : (
                                                                    formatCurrency(unitPrice)
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-bold text-gray-900">
                                                                {formatCurrency(total)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Order Summary */}
                            {orderDetails && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                        Payment Summary
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Payment Details */}
                                        <div className="border border-gray-200 rounded p-4 bg-white">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Subtotal:</span>
                                                    <span className="text-gray-900 font-medium">
                                                        {formatCurrency(
                                                            orderDetails.items.reduce(
                                                                (sum, item) => {
                                                                    const edited = isEditMode ? editedItems[item.id] : undefined;
                                                                    const qty = edited?.quantity ?? item.quantity;
                                                                    const up = edited?.unit_price ?? Number(item.unit_price);
                                                                    const unitType = edited?.unit_type ?? item.unit_type;
                                                                    const multiplier = isEditMode ? getOrderUnitMultiplier(unitType) : 1;
                                                                    return sum + up * qty * multiplier;
                                                                },
                                                                0
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="border-t border-gray-300 pt-2 mt-3">
                                                    <div className="flex justify-between text-base font-bold">
                                                        <span className="text-gray-900">Total Amount:</span>
                                                        <span className="text-gray-900">
                                                            {formatCurrency(
                                                                isEditMode
                                                                    ? orderDetails.items.reduce((sum, item) => {
                                                                        const edited = editedItems[item.id];
                                                                        const qty = edited?.quantity ?? item.quantity;
                                                                        const up = edited?.unit_price ?? Number(item.unit_price);
                                                                        const unitType = edited?.unit_type ?? item.unit_type;
                                                                        return sum + up * qty * getOrderUnitMultiplier(unitType);
                                                                    }, 0)
                                                                    : Number(orderDetails.total_amount)
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer Signature */}
                                        <div className="border border-gray-200 rounded p-4 bg-white">
                                            <div className="h-full flex flex-col">
                                                <h5 className="text-sm font-medium text-gray-700 mb-2">Customer Signature</h5>
                                                <div className="flex-1 min-h-[80px] border border-gray-300 rounded bg-gray-50 mb-3">
                                                    {/* Signature area */}
                                                </div>
                                                <div className="text-xs text-gray-500 text-center">
                                                    Signature confirms receipt of goods
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {orderDetails && (
                                <div className="mt-4 flex items-center justify-end gap-3">
                                    {isEditMode ? (
                                        <>
                                            {saveError && (
                                                <span className="text-sm text-red-600 mr-2">{saveError}</span>
                                            )}
                                            <Button
                                                variant="outline"
                                                className="h-10 w-28"
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className="h-10 w-28 bg-blue-600 hover:bg-blue-700 text-white"
                                                onClick={handleSaveEdit}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? "Saving..." : "Save"}
                                            </Button>
                                        </>
                                    ) : (
                                        orderDetails.status.toLowerCase() === "pending_admin" && (
                                            <Button
                                                variant="outline"
                                                className="h-10 w-28"
                                                onClick={() => handleEditOrder(orderDetails.id)}
                                            >
                                                Edit
                                            </Button>
                                        )
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}