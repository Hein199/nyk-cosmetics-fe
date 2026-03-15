"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Category = {
    id: number;
    name: string;
};

type Product = {
    id: number;
    name: string;
    description: string | null;
    category: string;
    unit_price: string | number;
    pcs_per_dozen: string | number;
    pcs_per_box: string | number;
    photo_url: string;
    is_active: boolean;
    inventory: { quantity: number } | null;
};

const emptyForm = {
    name: "",
    description: "",
    category: "",
    unit_price: "",
    stockQuantity: "",
    stockUnit: "PCS" as "PCS" | "BOX",
    pcs_per_dozen: "12",
    pcs_per_box: "24",
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
    // Handle both legacy ENUM_STYLE and new free-text categories
    if (category === category.toUpperCase() && category.includes("_")) {
        return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return category;
}

export default function AdminInventoryPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    const { data: products = [], isLoading: loading, error: queryError } = useQuery({
        queryKey: ["admin-products"],
        queryFn: () => apiFetch<Product[]>("/products", { token }),
        enabled: !!token,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["categories"],
        queryFn: () => apiFetch<Category[]>("/categories", { token }),
        enabled: !!token,
    });

    const [error, setError] = useState<string | null>(queryError?.message ?? null);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Delete state
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Add Category dialog
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [categorySaving, setCategorySaving] = useState(false);
    const [categoryError, setCategoryError] = useState<string | null>(null);
    const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

    async function handleCreateCategory() {
        if (!token || !newCategoryName.trim()) return;
        setCategorySaving(true);
        setCategoryError(null);
        try {
            await apiFetch("/categories", {
                method: "POST",
                token,
                body: { name: newCategoryName.trim() },
            });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            setNewCategoryName("");
        } catch (err) {
            setCategoryError(err instanceof Error ? err.message : "Failed to create category");
        } finally {
            setCategorySaving(false);
        }
    }

    async function handleDeleteCategory(id: number, name: string) {
        if (!token) return;
        const confirmed = window.confirm(`Are you sure you want to delete "${name}"?`);
        if (!confirmed) return;
        setDeletingCategoryId(id);
        setCategoryError(null);
        try {
            await apiFetch(`/categories/${id}`, { method: "DELETE", token });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
        } catch (err) {
            setCategoryError(err instanceof Error ? err.message : "Failed to delete category");
        } finally {
            setDeletingCategoryId(null);
        }
    }

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                categoryFilter === "all" ||
                p.category.toLowerCase() === categoryFilter.toLowerCase();
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, categoryFilter]);

    function openCreate() {
        setEditingProduct(null);
        const defaultCategory = categories[0]?.name ?? "";
        setForm({ ...emptyForm, category: defaultCategory });
        setSaveError(null);
        setDialogOpen(true);
    }

    function openEdit(product: Product) {
        setEditingProduct(product);
        setForm({
            name: product.name,
            description: product.description ?? "",
            category: product.category,
            unit_price: String(product.unit_price),
            stockQuantity: String(product.inventory?.quantity ?? 0),
            stockUnit: "PCS",
            pcs_per_dozen: String(product.pcs_per_dozen),
            pcs_per_box: String(product.pcs_per_box),
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
            const method = editingProduct ? "PATCH" : "POST";
            const path = editingProduct ? `/products/${editingProduct.id}` : "/products";

            const body: Record<string, unknown> = {
                name: form.name,
                description: form.description || null,
                category: form.category,
                unit_price: form.unit_price,
                pcs_per_dozen: form.pcs_per_dozen,
                pcs_per_box: form.pcs_per_box,
                photo_url: form.photo_url,
                is_active: form.is_active,
            };

            // Include stock info
            if (form.stockQuantity) {
                body.stockQuantity = form.stockQuantity;
                body.stockUnit = form.stockUnit;
            }

            await apiFetch(path, { method, token, body });
            setDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to save product");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(product: Product) {
        if (!token) return;
        const confirmed = window.confirm(`Are you sure you want to delete "${product.name}"? This cannot be undone.`);
        if (!confirmed) return;
        setDeletingId(product.id);
        try {
            await apiFetch(`/products/${product.id}`, { method: "DELETE", token });
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete product");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                <p className="text-gray-500 mt-1">Manage product catalogue and inventory stock</p>
            </div>

            {/* Filters + Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Input
                    placeholder="Search products…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-10 px-4 bg-white text-black placeholder:text-gray-400 border-gray-300 rounded-md"
                />
                <select
                    className="h-10 px-4 rounded-md text-sm text-white font-medium bg-gradient-to-r from-pink-500 to-rose-600 border-0 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-400 whitespace-nowrap"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all" className="bg-white text-black">All Categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.name} className="bg-white text-black">{c.name}</option>
                    ))}
                </select>
                <Button
                    className="h-10 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 whitespace-nowrap"
                    onClick={() => { setNewCategoryName(""); setCategoryError(null); setCategoryDialogOpen(true); }}
                >
                    + Add Category
                </Button>
                <Button
                    className="h-10 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 whitespace-nowrap"
                    onClick={openCreate}
                >
                    + Add Product
                </Button>
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
                                    <p className="font-medium text-sm text-black line-clamp-1">{product.name}</p>
                                    <p className="text-xs text-black">{formatCategory(product.category)}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-black">{formatCurrency(Number(product.unit_price))}</span>
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
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDelete(product)}
                                        disabled={deletingId === product.id}
                                    >
                                        {deletingId === product.id ? "…" : "Delete"}
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

            {/* Add Category Dialog */}
            {categoryDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
                        <div className="p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">Manage Categories</h2>

                            {/* New category input */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    New Category Name
                                </label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                                    placeholder="e.g. Skincare, Makeup, Accessories"
                                    className="w-full h-10 px-4 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                    autoFocus
                                />
                            </div>

                            {categoryError && (
                                <p className="text-sm text-red-600">{categoryError}</p>
                            )}

                            {/* Existing categories vertical list */}
                            {categories.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2">Existing Categories</p>
                                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                                        {categories.map((c) => (
                                            <div
                                                key={c.id}
                                                className="flex justify-between items-center py-2 px-3 rounded-md border border-gray-100 bg-gray-50"
                                            >
                                                <span className="text-sm text-gray-800">{c.name}</span>
                                                <button
                                                    onClick={() => handleDeleteCategory(c.id, c.name)}
                                                    disabled={deletingCategoryId === c.id}
                                                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 flex items-center gap-1 font-medium transition-colors"
                                                    title="Delete category"
                                                >
                                                    {deletingCategoryId === c.id ? (
                                                        <span>…</span>
                                                    ) : (
                                                        <span>✓ Delete</span>
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {categories.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-2">No custom categories yet.</p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="h-10 px-4 border-gray-300 text-gray-700"
                                    onClick={() => setCategoryDialogOpen(false)}
                                    disabled={categorySaving}
                                >
                                    Close
                                </Button>
                                <Button
                                    className="h-10 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                                    disabled={!newCategoryName.trim() || categorySaving}
                                    onClick={handleCreateCategory}
                                >
                                    {categorySaving ? "Saving…" : "Create"}
                                </Button>
                            </div>
                        </div>
                    </div>
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

                            {/* Description */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Product Description</label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white text-black resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Optional product description…"
                                    disabled={saving}
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Category *</label>
                                <select
                                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white text-black"
                                    value={form.category}
                                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                                    disabled={saving}
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
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

                            {/* Stock Quantity + Unit */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">
                                    {editingProduct ? "Stock Quantity" : "Opening Stock"}
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        className="flex-1"
                                        value={form.stockQuantity}
                                        onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
                                        placeholder="e.g. 100"
                                        disabled={saving}
                                    />
                                    <select
                                        className="w-24 border border-gray-200 rounded-md px-3 py-2 text-sm bg-white text-black"
                                        value={form.stockUnit}
                                        onChange={(e) => setForm((f) => ({ ...f, stockUnit: e.target.value as "PCS" | "BOX" }))}
                                        disabled={saving}
                                    >
                                        <option value="PCS">PCS</option>
                                        <option value="BOX">BOX</option>
                                    </select>
                                </div>
                                {form.stockUnit === "BOX" && form.stockQuantity && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        = {Math.round(Number(form.stockQuantity) * Number(form.pcs_per_box || 24))} PCS
                                    </p>
                                )}
                            </div>

                            {/* Dozen / Box */}
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
                                    <label className="text-sm font-medium text-gray-700 block mb-1">Pcs per Box</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={form.pcs_per_box}
                                        onChange={(e) => setForm((f) => ({ ...f, pcs_per_box: e.target.value }))}
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

        </div>
    );
}
