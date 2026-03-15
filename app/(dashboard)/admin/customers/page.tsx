"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Customer = {
    id: number;
    name: string;
    phone_number: string;
    address: string;
    status: "ACTIVE" | "INACTIVE";
    outstanding_amount: number;
    notes?: string;
};

type CustomerOrder = {
    id: number;
    date: string;
    status: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
};

type CustomerOrderDetail = {
    id: number;
    created_at: string;
    status: string;
    total_amount: string | number;
    payment_type?: string | null;
    remark?: string | null;
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

type CustomerForm = {
    name: string;
    phone_number: string;
    address: string;
    status: "ACTIVE" | "INACTIVE";
};

const emptyForm: CustomerForm = {
    name: "",
    phone_number: "",
    address: "",
    status: "ACTIVE",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat("en-MM", { style: "currency", currency: "MMK", maximumFractionDigits: 0 }).format(n);

const outstandingColor = (n: number) =>
    n > 500000 ? "text-red-600" : n > 0 ? "text-orange-500" : "text-green-600";

const statusBadge = (status: string) =>
    status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";

const orderStatusLabel = (status: string) =>
    status.toLowerCase() === "pending_admin" ? "pending" : status.toLowerCase().replace("_", " ");

const unitTypeLabel = (unit: string) => {
    if (unit === "D") return "Dozen";
    if (unit === "P") return "Box";
    return "Pcs";
};

// ─── Customer Modal (Add & Edit) ──────────────────────────────────────────────

function CustomerModal({
    initial,
    title,
    onClose,
    onSave,
}: {
    initial?: Partial<CustomerForm>;
    title: string;
    onClose: () => void;
    onSave: (form: CustomerForm) => Promise<void>;
}) {
    const [form, setForm] = useState<CustomerForm>({ ...emptyForm, ...initial });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const set =
        (key: keyof CustomerForm) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                setForm((prev) => ({ ...prev, [key]: e.target.value }));

    async function handleSave() {
        if (!form.name.trim()) return setError("Name is required.");
        if (!form.phone_number.trim()) return setError("Phone number is required.");
        if (!form.address.trim()) return setError("Address is required.");
        setError("");
        setLoading(true);
        try {
            await onSave(form);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    const labelCls = "block text-xs font-medium text-gray-600 mb-1";
    const inputCls =
        "w-full border border-gray-300 rounded-md px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">
                        ✕
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div>
                        <label className={labelCls}>
                            Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            className={inputCls}
                            placeholder="e.g. Beauty Corner Shop"
                            value={form.name}
                            onChange={set("name")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className={inputCls}
                                placeholder="09xxxxxxxxx"
                                value={form.phone_number}
                                onChange={set("phone_number")}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Status</label>
                            <select
                                className={inputCls}
                                value={form.status}
                                onChange={set("status")}
                                style={{ color: "#111827" }}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>
                            Address <span className="text-red-500">*</span>
                        </label>
                        <Input
                            className={inputCls}
                            placeholder="Street, Township, City..."
                            value={form.address}
                            onChange={set("address")}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-pink-600 hover:bg-pink-700 text-white"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save Customer"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    const { data: customers = [], isLoading: loading, error: customersError } = useQuery({
        queryKey: ["admin-customers"],
        queryFn: () => apiFetch<Customer[]>("/customers", { token }),
        enabled: !!token,
    });
    const fetchError = customersError?.message ?? "";

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [addOpen, setAddOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(false);
    const [deletingCustomer, setDeletingCustomer] = useState(false);
    const [notes, setNotes] = useState("");
    const [notesSaving, setNotesSaving] = useState(false);
    const [notesSaved, setNotesSaved] = useState(false);
    const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [orderDialogOpen, setOrderDialogOpen] = useState(false);
    const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
    const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState<CustomerOrderDetail | null>(null);

    const filtered = customers.filter((c) => {
        const q = search.toLowerCase();
        const matchesSearch =
            c.name.toLowerCase().includes(q) ||
            c.phone_number.includes(q) ||
            c.address.toLowerCase().includes(q);
        const matchesStatus = !statusFilter || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalOutstanding = customers.reduce((s, c) => s + c.outstanding_amount, 0);

    // Fetch orders + seed notes whenever a customer is selected
    useEffect(() => {
        if (!selectedCustomer) {
            setCustomerOrders([]);
            setOrderDialogOpen(false);
            setOrderDetailsError(null);
            setSelectedOrderDetails(null);
            return;
        }
        setNotes(selectedCustomer.notes ?? "");
        setNotesSaved(false);
        let cancelled = false;
        setOrdersLoading(true);
        apiFetch<CustomerOrder[]>(`/customers/${selectedCustomer.id}/orders`, { token })
            .then((data) => { if (!cancelled) setCustomerOrders(data); })
            .catch(() => { if (!cancelled) setCustomerOrders([]); })
            .finally(() => { if (!cancelled) setOrdersLoading(false); });
        return () => { cancelled = true; };
    }, [selectedCustomer, token]);

    const handleViewOrderDetails = async (orderId: number) => {
        if (!token) {
            return;
        }

        setOrderDialogOpen(true);
        setOrderDetailsLoading(true);
        setOrderDetailsError(null);
        setSelectedOrderDetails(null);

        try {
            const data = await apiFetch<CustomerOrderDetail>(`/orders/${orderId}`, { token });
            setSelectedOrderDetails(data);
        } catch (error) {
            setOrderDetailsError(error instanceof Error ? error.message : "Failed to load order details");
        } finally {
            setOrderDetailsLoading(false);
        }
    };

    // ── Customer Profile View ─────────────────────────────────────────────────
    if (selectedCustomer) {
        const c = selectedCustomer;
        return (
            <div className="p-6 space-y-6">
                <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                    ← Back to Customers
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{c.address}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingCustomer(true)}>
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setDeletingCustomer(true)}
                        >
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-sm font-semibold text-gray-700">Customer Info</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-100">
                        {[
                            { label: "Name", value: c.name },
                            { label: "Phone", value: c.phone_number },
                            { label: "Address", value: c.address },
                            {
                                label: "Status",
                                value: c.status === "ACTIVE" ? "Active" : "Inactive",
                                cls: c.status === "ACTIVE" ? "text-green-600" : "text-gray-400",
                            },
                            {
                                label: "Outstanding",
                                value: fmt(c.outstanding_amount),
                                cls: outstandingColor(c.outstanding_amount),
                            },
                        ].map((item) => (
                            <div key={item.label} className="px-4 py-3">
                                <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                                <p className={`text-sm font-medium ${item.cls ?? "text-gray-900"}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes Card */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
                    </div>
                    <div className="p-4 space-y-3">
                        <textarea
                            value={notes}
                            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                            rows={4}
                            className="w-full text-sm text-gray-700 border border-gray-200 rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                            placeholder="Add notes about this customer (e.g. payment behavior, special requests)…"
                        />
                        <div className="flex items-center gap-3">
                            <Button
                                size="sm"
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                                disabled={notesSaving}
                                onClick={async () => {
                                    setNotesSaving(true);
                                    try {
                                        await apiFetch(`/customers/${c.id}/notes`, {
                                            method: "PATCH",
                                            body: { notes },
                                            token,
                                        });
                                        setNotesSaved(true);
                                        setSelectedCustomer((prev) => (prev ? { ...prev, notes } : prev));
                                    } finally {
                                        setNotesSaving(false);
                                    }
                                }}
                            >
                                {notesSaving ? "Saving…" : "Save Notes"}
                            </Button>
                            {notesSaved && <span className="text-xs text-green-600">Saved</span>}
                        </div>
                    </div>
                </div>

                {/* Customer Orders */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Customer Orders</h2>
                        <span className="text-sm text-gray-600">
                            Total Outstanding:{" "}
                            <span className={`font-semibold ${outstandingColor(c.outstanding_amount)}`}>
                                {fmt(c.outstanding_amount)}
                            </span>
                        </span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                {["Date", "Order ID", "Total", "Paid", "Remaining", "Actions"].map((h, i) => (
                                    <th
                                        key={h}
                                        className={`py-2.5 px-4 text-sm font-medium text-white bg-blue-600 ${i !== 0 ? "border-l border-blue-500/40" : ""
                                            } ${h === "Actions" ? "text-center" : "text-left"}`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ordersLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-400">Loading orders…</td>
                                </tr>
                            ) : customerOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-400">No orders found.</td>
                                </tr>
                            ) : (
                                customerOrders.map((o) => (
                                    <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-2.5 px-4 text-gray-600">{o.date}</td>
                                        <td className="py-2.5 px-4 font-mono text-gray-700 border-l border-gray-200">OR-{o.id}</td>
                                        <td className="py-2.5 px-4 text-gray-900 border-l border-gray-200">{fmt(o.total_amount)}</td>
                                        <td className="py-2.5 px-4 text-green-600 border-l border-gray-200">{fmt(o.paid_amount)}</td>
                                        <td className={`py-2.5 px-4 border-l border-gray-200 font-medium ${outstandingColor(o.remaining_amount)}`}>
                                            {fmt(o.remaining_amount)}
                                        </td>
                                        <td className="py-2.5 px-4 border-l border-gray-200 text-center">
                                            <Button size="sm" variant="outline" onClick={() => handleViewOrderDetails(o.id)}>
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
                    <DialogContent className="relative max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center justify-between pr-8">
                                <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
                            </div>
                            <DialogClose onClick={() => setOrderDialogOpen(false)} className="text-gray-500 hover:text-gray-700">
                                ✕
                            </DialogClose>
                        </DialogHeader>

                        <div className="p-6 space-y-4">
                            {orderDetailsLoading && (
                                <p className="text-sm text-gray-500">Loading order details...</p>
                            )}

                            {orderDetailsError && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                    {orderDetailsError}
                                </p>
                            )}

                            {selectedOrderDetails && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Order ID</p>
                                            <p className="font-semibold text-gray-900">OR-{selectedOrderDetails.id}</p>
                                        </div>
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Status</p>
                                            <p className="font-semibold text-gray-900 capitalize">{orderStatusLabel(selectedOrderDetails.status)}</p>
                                        </div>
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Date</p>
                                            <p className="font-semibold text-gray-900">
                                                {new Date(selectedOrderDetails.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                                            <p className="font-semibold text-gray-900">{fmt(Number(selectedOrderDetails.total_amount))}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-md border border-gray-200 overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr>
                                                    {["Product", "Qty", "Unit", "Unit Price", "Total"].map((header, index) => (
                                                        <th
                                                            key={header}
                                                            className={`py-2.5 px-3 text-sm font-medium text-white bg-blue-600 ${index !== 0 ? "border-l border-blue-500/40" : ""} text-left`}
                                                        >
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedOrderDetails.items.map((item) => {
                                                    const lineTotal = Number(item.unit_price) * item.quantity;
                                                    return (
                                                        <tr key={item.id} className="border-b border-gray-100">
                                                            <td className="py-2.5 px-3 text-gray-900">{item.product?.name ?? "-"}</td>
                                                            <td className="py-2.5 px-3 text-gray-700 border-l border-gray-200">{item.quantity}</td>
                                                            <td className="py-2.5 px-3 text-gray-700 border-l border-gray-200">{unitTypeLabel(item.unit_type)}</td>
                                                            <td className="py-2.5 px-3 text-gray-700 border-l border-gray-200">{fmt(Number(item.unit_price))}</td>
                                                            <td className="py-2.5 px-3 text-gray-900 border-l border-gray-200 font-medium">{fmt(lineTotal)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {selectedOrderDetails.remark && (
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Remark</p>
                                            <p className="text-sm text-gray-800">{selectedOrderDetails.remark}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {editingCustomer && (
                    <CustomerModal
                        title="Edit Customer"
                        initial={{
                            name: c.name,
                            phone_number: c.phone_number,
                            address: c.address,
                            status: c.status,
                        }}
                        onClose={() => setEditingCustomer(false)}
                        onSave={async (form) => {
                            await apiFetch(`/customers/${c.id}`, {
                                method: "PATCH",
                                body: form,
                                token,
                            });
                            queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
                            setSelectedCustomer((prev) => (prev ? { ...prev, ...form } : prev));
                            setEditingCustomer(false);
                        }}
                    />
                )}

                {deletingCustomer && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
                            <h2 className="text-base font-semibold text-gray-900">Delete Customer</h2>
                            <p className="text-sm text-gray-600">
                                Are you sure you want to delete{" "}
                                <span className="font-semibold">{c.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeletingCustomer(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => {
                                        setDeletingCustomer(false);
                                        setSelectedCustomer(null);
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── All Customers View ────────────────────────────────────────────────────
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage customer accounts and orders</p>
                </div>
                <Button className="bg-pink-600 hover:bg-pink-700 text-white" onClick={() => setAddOpen(true)}>
                    + Add Customer
                </Button>
            </div>

            {!loading && !fetchError && (
                <p className="text-sm text-gray-600">
                    Customers: <span className="font-semibold text-gray-900">{customers.length}</span>
                    <span className="mx-2 text-gray-300">|</span>
                    Total Outstanding:{" "}
                    <span className={`font-semibold ${outstandingColor(totalOutstanding)}`}>
                        {fmt(totalOutstanding)}
                    </span>
                </p>
            )}

            <div className="flex gap-3">
                <Input
                    placeholder="Search by name, phone, or address..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-white"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                    style={{ color: statusFilter ? "#111827" : "#6b7280" }}
                >
                    <option value="" style={{ color: "#6b7280" }}>All Statuses</option>
                    <option value="ACTIVE" style={{ color: "#111827" }}>Active</option>
                    <option value="INACTIVE" style={{ color: "#111827" }}>Inactive</option>
                </select>
            </div>

            {fetchError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                    {fetchError}
                </p>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            {["Customer", "Phone", "Address", "Status", "Outstanding", "Actions"].map((h, i) => (
                                <th
                                    key={h}
                                    className={`py-3 px-4 text-sm font-medium text-white bg-blue-600 first:rounded-tl last:rounded-tr ${i !== 0 ? "border-l border-blue-500/40" : ""
                                        } ${h === "Actions" ? "text-center" : "text-left"}`}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center text-gray-400">
                                    Loading customers...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center text-gray-400">
                                    No customers found.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((c) => (
                                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => setSelectedCustomer(c)}
                                            className="font-medium text-blue-600 hover:underline text-left"
                                        >
                                            {c.name}
                                        </button>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 border-l border-gray-200">
                                        {c.phone_number}
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 border-l border-gray-200 max-w-[220px] truncate">
                                        {c.address}
                                    </td>
                                    <td className="py-3 px-4 border-l border-gray-200">
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge(
                                                c.status
                                            )}`}
                                        >
                                            {c.status === "ACTIVE" ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td
                                        className={`py-3 px-4 font-semibold border-l border-gray-200 ${outstandingColor(
                                            c.outstanding_amount
                                        )}`}
                                    >
                                        {fmt(c.outstanding_amount)}
                                    </td>
                                    <td className="py-3 px-4 border-l border-gray-200 text-center">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                            onClick={() => setSelectedCustomer(c)}
                                        >
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {addOpen && (
                <CustomerModal
                    title="Add Customer"
                    onClose={() => setAddOpen(false)}
                    onSave={async (form) => {
                        await apiFetch("/customers", { method: "POST", body: form, token });
                        queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
                        setAddOpen(false);
                    }}
                />
            )}
        </div>
    );
}
