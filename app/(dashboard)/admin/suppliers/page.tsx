"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Supplier = {
    id: number;
    name: string;
    phone_number: string;
    address: string;
};

type SupplierForm = {
    name: string;
    phone_number: string;
    address: string;
};

type SupplierPurchase = {
    id: number;
    date: string;
    expense_code: string;
    category: string | null;
    description: string;
    amount: number;
    payment_method: string;
};

type SupplierPurchaseDetailItem = {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_type: string;
    quantity_pcs: number;
    unit_price: number;
    line_total: number;
};

type SupplierPurchaseDetail = SupplierPurchase & {
    items: SupplierPurchaseDetailItem[];
};

const emptyForm: SupplierForm = {
    name: "",
    phone_number: "",
    address: "",
};

const fmt = (n: number) =>
    new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(n);

function formatPaymentMethod(value: string) {
    const normalized = value.toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function unitTypeLabel(unit: string) {
    if (unit === "D") return "Dozen";
    if (unit === "P") return "Box";
    return "Pcs";
}

function SupplierModal({
    title,
    initial,
    onClose,
    onSave,
}: {
    title: string;
    initial?: Partial<SupplierForm>;
    onClose: () => void;
    onSave: (form: SupplierForm) => Promise<void>;
}) {
    const [form, setForm] = useState<SupplierForm>({ ...emptyForm, ...initial });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const set =
        (key: keyof SupplierForm) =>
            (event: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, [key]: event.target.value }));

    async function handleSave() {
        if (!form.name.trim()) return setError("Supplier name is required.");
        if (!form.phone_number.trim()) return setError("Phone number is required.");
        if (!form.address.trim()) return setError("Address is required.");

        setError("");
        setSaving(true);
        try {
            await onSave(form);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save supplier");
        } finally {
            setSaving(false);
        }
    }

    const labelClass = "block text-xs font-medium text-gray-600 mb-1";
    const inputClass =
        "w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

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
                        <label className={labelClass}>Supplier Name *</label>
                        <Input
                            className={inputClass}
                            value={form.name}
                            onChange={set("name")}
                            placeholder="e.g. Golden Beauty Wholesales"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Phone Number *</label>
                        <Input
                            className={inputClass}
                            value={form.phone_number}
                            onChange={set("phone_number")}
                            placeholder="09xxxxxxxxx"
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Address *</label>
                        <Input
                            className={inputClass}
                            value={form.address}
                            onChange={set("address")}
                            placeholder="Street, Township, City..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button className="bg-pink-600 hover:bg-pink-700 text-white" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Supplier"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function SuppliersPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierPurchases, setSupplierPurchases] = useState<SupplierPurchase[]>([]);
    const [purchasesLoading, setPurchasesLoading] = useState(false);
    const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<SupplierPurchaseDetail | null>(null);
    const [purchaseDetailLoading, setPurchaseDetailLoading] = useState(false);
    const [purchaseDetailError, setPurchaseDetailError] = useState<string | null>(null);

    const { data: suppliers = [], isLoading: loading, error: suppliersError } = useQuery({
        queryKey: ["admin-suppliers"],
        queryFn: () => apiFetch<Supplier[]>("/suppliers", { token }),
        enabled: !!token,
    });
    const fetchError = suppliersError?.message ?? "";

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return suppliers;
        return suppliers.filter((supplier) =>
            supplier.name.toLowerCase().includes(query) ||
            supplier.phone_number.toLowerCase().includes(query) ||
            supplier.address.toLowerCase().includes(query),
        );
    }, [suppliers, search]);

    useEffect(() => {
        if (!selectedSupplier) {
            setSupplierPurchases([]);
            setPurchaseDialogOpen(false);
            setSelectedPurchase(null);
            return;
        }

        let cancelled = false;
        setPurchasesLoading(true);
        apiFetch<SupplierPurchase[]>(`/suppliers/${selectedSupplier.id}/purchases`, { token })
            .then((data) => {
                if (!cancelled) {
                    setSupplierPurchases(data);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSupplierPurchases([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setPurchasesLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [selectedSupplier, token]);

    const handleViewPurchaseDetails = (purchase: SupplierPurchase) => {
        if (!selectedSupplier || !token) {
            return;
        }

        setPurchaseDialogOpen(true);
        setPurchaseDetailLoading(true);
        setPurchaseDetailError(null);
        setSelectedPurchase(null);

        apiFetch<SupplierPurchaseDetail>(`/suppliers/${selectedSupplier.id}/purchases/${purchase.id}`, { token })
            .then((data) => {
                setSelectedPurchase(data);
            })
            .catch((error) => {
                setPurchaseDetailError(error instanceof Error ? error.message : "Failed to load purchase details");
            })
            .finally(() => {
                setPurchaseDetailLoading(false);
            });
    };

    if (selectedSupplier) {
        const totalPurchasesAmount = supplierPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

        return (
            <div className="p-6 space-y-6">
                <button
                    onClick={() => setSelectedSupplier(null)}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                    ← Back to Suppliers
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{selectedSupplier.name}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Supplier Profile</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingSupplier(selectedSupplier)}>
                            Edit
                        </Button>
                        <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setDeletingSupplier(selectedSupplier)}
                        >
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-sm font-semibold text-gray-700">Supplier Info</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-400 mb-0.5">Name</p>
                            <p className="text-sm font-medium text-gray-900">{selectedSupplier.name}</p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{selectedSupplier.phone_number}</p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-gray-400 mb-0.5">Address</p>
                            <p className="text-sm font-medium text-gray-900">{selectedSupplier.address}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-700">Purchase History</h2>
                        <span className="text-sm text-gray-600">
                            Total Purchases: <span className="font-semibold text-gray-900">{fmt(totalPurchasesAmount)}</span>
                        </span>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                {["Date", "Purchase Code", "Category", "Description", "Amount", "Payment", "Actions"].map((header, index) => (
                                    <th
                                        key={header}
                                        className={`py-2.5 px-4 text-sm font-medium text-white bg-blue-600 ${index !== 0 ? "border-l border-blue-500/40" : ""} ${header === "Actions" ? "text-center" : "text-left"}`}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {purchasesLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-400">Loading purchase history...</td>
                                </tr>
                            ) : supplierPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-400">No purchase history found.</td>
                                </tr>
                            ) : (
                                supplierPurchases.map((purchase) => (
                                    <tr key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-2.5 px-4 text-gray-600">{purchase.date}</td>
                                        <td className="py-2.5 px-4 font-mono text-gray-700 border-l border-gray-200">{purchase.expense_code}</td>
                                        <td className="py-2.5 px-4 text-gray-700 border-l border-gray-200">{purchase.category ?? "-"}</td>
                                        <td className="py-2.5 px-4 text-gray-700 border-l border-gray-200 max-w-[320px] truncate" title={purchase.description}>
                                            {purchase.description}
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-900 border-l border-gray-200 font-medium">{fmt(purchase.amount)}</td>
                                        <td className="py-2.5 px-4 text-gray-700 border-l border-gray-200">{formatPaymentMethod(purchase.payment_method)}</td>
                                        <td className="py-2.5 px-4 border-l border-gray-200 text-center">
                                            <Button size="sm" variant="outline" onClick={() => handleViewPurchaseDetails(purchase)}>
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
                    <DialogContent className="relative max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center justify-between pr-8">
                                <h3 className="text-lg font-semibold text-gray-900">Purchase Details</h3>
                            </div>
                            <DialogClose onClick={() => setPurchaseDialogOpen(false)} className="text-gray-500 hover:text-gray-700">
                                ✕
                            </DialogClose>
                        </DialogHeader>

                        <div className="p-6 space-y-4">
                            {purchaseDetailLoading && (
                                <p className="text-sm text-gray-500">Loading purchase details...</p>
                            )}

                            {purchaseDetailError && (
                                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                    {purchaseDetailError}
                                </p>
                            )}

                            {selectedPurchase && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Supplier</p>
                                            <p className="font-semibold text-gray-900">{selectedSupplier.name}</p>
                                        </div>
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Purchase Code</p>
                                            <p className="font-semibold text-gray-900">{selectedPurchase.expense_code}</p>
                                        </div>
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Date</p>
                                            <p className="font-semibold text-gray-900">{selectedPurchase.date}</p>
                                        </div>
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Amount</p>
                                            <p className="font-semibold text-gray-900">{fmt(selectedPurchase.amount)}</p>
                                        </div>
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                                            <p className="font-semibold text-gray-900">{formatPaymentMethod(selectedPurchase.payment_method)}</p>
                                        </div>
                                        <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                            <p className="text-xs text-gray-500 mb-1">Category</p>
                                            <p className="font-semibold text-gray-900">{selectedPurchase.category ?? "-"}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                                        <p className="text-xs text-gray-500 mb-1">Description</p>
                                        <p className="text-sm text-gray-800">{selectedPurchase.description}</p>
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
                                                {selectedPurchase.items.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-6 text-center text-gray-400">No product lines found.</td>
                                                    </tr>
                                                ) : (
                                                    selectedPurchase.items.map((item) => (
                                                        <tr key={item.id} className="border-b border-gray-100">
                                                            <td className="py-2.5 px-3 text-gray-900">{item.product_name}</td>
                                                            <td className="py-2.5 px-3 text-gray-700 border-l border-gray-200">{item.quantity}</td>
                                                            <td className="py-2.5 px-3 text-gray-700 border-l border-gray-200">{unitTypeLabel(item.unit_type)}</td>
                                                            <td className="py-2.5 px-3 text-gray-700 border-l border-gray-200">{fmt(item.unit_price)}</td>
                                                            <td className="py-2.5 px-3 text-gray-900 border-l border-gray-200 font-medium">{fmt(item.line_total)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {editingSupplier && (
                    <SupplierModal
                        title="Edit Supplier"
                        initial={{
                            name: editingSupplier.name,
                            phone_number: editingSupplier.phone_number,
                            address: editingSupplier.address,
                        }}
                        onClose={() => setEditingSupplier(null)}
                        onSave={async (form) => {
                            await apiFetch(`/suppliers/${editingSupplier.id}`, {
                                method: "PATCH",
                                body: form,
                                token,
                            });
                            queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
                            setSelectedSupplier((prev) => (prev ? { ...prev, ...form } : prev));
                            setEditingSupplier(null);
                        }}
                    />
                )}

                {deletingSupplier && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
                            <h2 className="text-base font-semibold text-gray-900">Delete Supplier</h2>
                            <p className="text-sm text-gray-600">
                                Are you sure you want to delete <span className="font-semibold">{deletingSupplier.name}</span>?
                            </p>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" onClick={() => setDeletingSupplier(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={async () => {
                                        await apiFetch(`/suppliers/${deletingSupplier.id}`, {
                                            method: "DELETE",
                                            token,
                                        });
                                        queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
                                        setDeletingSupplier(null);
                                        setSelectedSupplier(null);
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage supplier information for purchases</p>
                </div>
                <Button className="bg-pink-600 hover:bg-pink-700 text-white" onClick={() => setAddOpen(true)}>
                    + Add Supplier
                </Button>
            </div>

            {!loading && !fetchError && (
                <p className="text-sm text-gray-600">
                    Suppliers: <span className="font-semibold text-gray-900">{suppliers.length}</span>
                </p>
            )}

            <Input
                placeholder="Search by name, phone, or address..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-white"
            />

            {fetchError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                    {fetchError}
                </p>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            {["ID", "Supplier", "Phone", "Address", "Actions"].map((header, index) => (
                                <th
                                    key={header}
                                    className={`py-3 px-4 text-sm font-medium text-white bg-blue-600 ${index !== 0 ? "border-l border-blue-500/40" : ""} ${header === "Actions" ? "text-center" : "text-left"}`}
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-10 text-center text-gray-400">
                                    Loading suppliers...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-10 text-center text-gray-400">
                                    No suppliers found.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((supplier) => (
                                <tr key={supplier.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 text-gray-700">{supplier.id}</td>
                                    <td className="py-3 px-4 border-l border-gray-200">
                                        <button
                                            className="font-medium text-blue-600 hover:underline text-left"
                                            onClick={() => setSelectedSupplier(supplier)}
                                        >
                                            {supplier.name}
                                        </button>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 border-l border-gray-200">{supplier.phone_number}</td>
                                    <td className="py-3 px-4 text-gray-600 border-l border-gray-200 max-w-[260px] truncate">{supplier.address}</td>
                                    <td className="py-3 px-4 border-l border-gray-200 text-center">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedSupplier(supplier)}>
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
                <SupplierModal
                    title="Add Supplier"
                    onClose={() => setAddOpen(false)}
                    onSave={async (form) => {
                        await apiFetch("/suppliers", {
                            method: "POST",
                            body: form,
                            token,
                        });
                        queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
                        setAddOpen(false);
                    }}
                />
            )}
        </div>
    );
}
