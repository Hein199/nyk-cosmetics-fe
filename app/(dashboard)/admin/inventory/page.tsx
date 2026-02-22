"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/constants";

type ProductCategory = "COSMETIC" | "SKINCARE" | "ACCESSORY" | "OTHER";

type Product = {
    id: number;
    name: string;
    category: ProductCategory;
    unit_price: string | number;
    pcs_per_dozen: string | number;
    pcs_per_pack: string | number;
    photo_url: string;
    is_active: boolean;
    inventory: { quantity: number } | null;
};

const CATEGORIES: { value: ProductCategory; label: string }[] = [
    { value: "COSMETIC", label: "Cosmetic" },
    { value: "SKINCARE", label: "Skincare" },
    { value: "ACCESSORY", label: "Accessory" },
    { value: "OTHER", label: "Other" },
];

const emptyForm = {
    name: "",
    category: "COSMETIC" as ProductCategory,
    unit_price: "",
    pcs_per_dozen: "12",
    pcs_per_pack: "12",
    photo_url: "",
    is_active: true,
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatCategory(category: string) {
    return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminInventoryPage() {
    const { token } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Inventory dialog
    const [stockDialogOpen, setStockDialogOpen] = useState(false);
    const [stockProduct, setStockProduct] = useState<Product | null>(null);
    const [stockQty, setStockQty] = useState("");
    const [savingStock, setSavingStock] = useState(false);

    const fetchProducts = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/_api/products`, {
                headers: { Authorization: `Bearer ${token}` },
                signal,
            });
            if (!res.ok) throw new Error(await res.text());
            const data = (await res.json()) as Product[];
            setProducts(data);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setError(err instanceof Error ? err.message : "Failed to load products");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        fetchProducts(controller.signal);
        return () => controller.abort();
    }, [fetchProducts]);

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, categoryFilter]);

    function openCreate() {
        setEditingProduct(null);
        setForm(emptyForm);
        setSaveError(null);
        setDialogOpen(true);
    }

    function openEdit(product: Product) {
        setEditingProduct(product);
        setForm({
            name: product.name,
            category: product.category,
            unit_price: String(product.unit_price),
            pcs_per_dozen: String(product.pcs_per_dozen),
            pcs_per_pack: String(product.pcs_per_pack),
            photo_url: product.photo_url,
            is_active: product.is_active,
        });
        setSaveError(null);
        setDialogOpen(true);
    }

    async function handleSave() {
        if (!token) return;
        if (!form.name.trim() || !form.unit_price) {
            setSaveError("Name and unit price are required.");
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            const url = editingProduct
                ? `${API_BASE_URL}/_api/products/${editingProduct.id}`
                : `${API_BASE_URL}/_api/products`;
            const method = editingProduct ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(await res.text());
            setDialogOpen(false);
            await fetchProducts();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save product");
        } finally {
            setSaving(false);
        }
    }

    function openStockEdit(product: Product) {
        setStockProduct(product);
        setStockQty(String(product.inventory?.quantity ?? 0));
        setStockDialogOpen(true);
    }

    async function handleSaveStock() {
        if (!token || !stockProduct) return;
        setSavingStock(true);
        try {
            const res = await fetch(`${API_BASE_URL}/_api/inventory/${stockProduct.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ quantity: Number(stockQty) }),
            });
            if (!res.ok) throw new Error(await res.text());
            setStockDialogOpen(false);
            await fetchProducts();
        } catch (err) {
            console.error(err);
        } finally {
            setSavingStock(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-500 mt-1">Manage product catalogue and inventory stock</p>
                </div>
                <Button
                    className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                    onClick={openCreate}
                >
                    + Add Product
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Input
                    placeholder="Search products…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="sm:w-64"
                />
                <select
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all">All categories</option>
                    {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
            </div>

            {/* Content */}
            {loading ? (
                <p className="text-gray-400 text-sm">Loading products…</p>
            ) : error ? (
                <p className="text-red-500 text-sm">{error}</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map((product) => (
                        <Card key={product.id} className={`overflow-hidden ${!product.is_active ? "opacity-50" : ""}`}>
                            {/* Image */}
                            <div className="aspect-square bg-gray-100">
                                <img
                                    src={product.photo_url || "/mock/product-1.svg"}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.src = "/mock/product-1.svg"; }}
                                />
                            </div>
                            <CardContent className="p-3 space-y-2">
                                <div>
                                    <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                                    <p className="text-xs text-gray-500">{formatCategory(product.category)}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">{formatCurrency(Number(product.unit_price))}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${(product.inventory?.quantity ?? 0) > 10
                                            ? "bg-green-100 text-green-700"
                                            : (product.inventory?.quantity ?? 0) > 0
                                                ? "bg-yellow-100 text-yellow-700"
                                                : "bg-red-100 text-red-700"
                                        }`}>
                                        Stock: {product.inventory?.quantity ?? 0}
                                    </span>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openEdit(product)}>
                                        Edit
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openStockEdit(product)}>
                                        Stock
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredProducts.length === 0 && (
                        <p className="text-gray-400 text-sm col-span-full text-center py-12">
                            No products found.
                        </p>
                    )}
                </div>
            )}

            {/* Create / Edit Dialog */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-5">
                            <h2 className="text-lg font-semibold">
                                {editingProduct ? "Edit Product" : "Add Product"}
                            </h2>

                            {/* Image upload */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Product Image</label>
                                <ImageUpload
                                    value={form.photo_url}
                                    onChange={(url) => setForm((f) => ({ ...f, photo_url: url }))}
                                    token={token!}
                                    disabled={saving}
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Product Name *</label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Lip Gloss Shine"
                                    disabled={saving}
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Category *</label>
                                <select
                                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                                    value={form.category}
                                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ProductCategory }))}
                                    disabled={saving}
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit price */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Unit Price (MMK) *</label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.unit_price}
                                    onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
                                    placeholder="e.g. 5000"
                                    disabled={saving}
                                />
                            </div>

                            {/* Dozen / Pack */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Pcs per Dozen</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={form.pcs_per_dozen}
                                        onChange={(e) => setForm((f) => ({ ...f, pcs_per_dozen: e.target.value }))}
                                        disabled={saving}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Pcs per Pack</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={form.pcs_per_pack}
                                        onChange={(e) => setForm((f) => ({ ...f, pcs_per_pack: e.target.value }))}
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={form.is_active}
                                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                                    disabled={saving}
                                    className="w-4 h-4 accent-pink-500"
                                />
                                <label htmlFor="is_active" className="text-sm text-gray-700">Active (visible to salespersons)</label>
                            </div>

                            {saveError && <p className="text-sm text-red-500">{saveError}</p>}

                            <div className="flex gap-3 pt-1">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? "Saving…" : editingProduct ? "Save Changes" : "Add Product"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Edit Dialog */}
            {stockDialogOpen && stockProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6 space-y-4">
                        <h2 className="text-lg font-semibold">Update Stock</h2>
                        <p className="text-sm text-gray-600">{stockProduct.name}</p>
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Quantity</label>
                            <Input
                                type="number"
                                min={0}
                                value={stockQty}
                                onChange={(e) => setStockQty(e.target.value)}
                                disabled={savingStock}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setStockDialogOpen(false)} disabled={savingStock}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                                onClick={handleSaveStock}
                                disabled={savingStock}
                            >
                                {savingStock ? "Saving…" : "Save"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
