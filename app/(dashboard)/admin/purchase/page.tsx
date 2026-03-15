"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { INVENTORY_UNITS } from "@/lib/constants";
import { thaiToday } from "@/lib/utils";

type Product = {
    id: number;
    name: string;
    category: string;
    unit_price: string | number;
    pcs_per_dozen: string | number;
    pcs_per_box: string | number;
    photo_url: string;
    is_active: boolean;
    inventory?: { quantity: number } | null;
};

type Supplier = {
    id: number;
    name: string;
    phone_number: string;
    address: string;
};

type PurchaseUnitType =
    | typeof INVENTORY_UNITS.PIECES
    | typeof INVENTORY_UNITS.DOZEN
    | typeof INVENTORY_UNITS.BOX;

type PurchaseLine = {
    product_id: number;
    name: string;
    category: string;
    photo_url: string;
    current_stock: number;
    base_unit_price: string;
    unit_price: string;
    quantity: string;
    unit_type: PurchaseUnitType;
    pcs_per_dozen: number;
    pcs_per_box: number;
};

type PurchaseResponse = {
    expense_code: string;
    supplier_name: string;
    total_amount: string;
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatCategory(category: string) {
    if (category === category.toUpperCase() && category.includes("_")) {
        return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return category;
}

function toPositiveNumber(value: number | string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getUnitLabel(unitType: PurchaseUnitType) {
    if (unitType === INVENTORY_UNITS.DOZEN) return "Dozen";
    if (unitType === INVENTORY_UNITS.BOX) return "Box";
    return "Pcs";
}

function getUnitMultiplier(line: Pick<PurchaseLine, "unit_type" | "pcs_per_dozen" | "pcs_per_box">) {
    if (line.unit_type === INVENTORY_UNITS.DOZEN) {
        return toPositiveNumber(line.pcs_per_dozen, 12);
    }
    if (line.unit_type === INVENTORY_UNITS.BOX) {
        return toPositiveNumber(line.pcs_per_box, 24);
    }
    return 1;
}

export default function AdminPurchasePage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [purchaseDate, setPurchaseDate] = useState(thaiToday());
    const [description, setDescription] = useState("");
    const [lineItems, setLineItems] = useState<PurchaseLine[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const {
        data: products = [],
        isLoading: loadingProducts,
        error: queryError,
        refetch,
    } = useQuery({
        queryKey: ["purchase-products"],
        queryFn: () => apiFetch<Product[]>("/products", { token }),
        enabled: !!token,
    });

    const {
        data: suppliers = [],
        error: suppliersQueryError,
    } = useQuery({
        queryKey: ["admin-suppliers"],
        queryFn: () => apiFetch<Supplier[]>("/suppliers", { token }),
        enabled: !!token,
    });

    useEffect(() => {
        if (!selectedSupplierId && suppliers.length > 0) {
            setSelectedSupplierId(String(suppliers[0].id));
        }
    }, [selectedSupplierId, suppliers]);

    const categories = useMemo(() => {
        const values = Array.from(new Set(products.map((product) => product.category)));
        return ["all", ...values];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch =
                !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                selectedCategory === "all" || product.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    const totalAmount = useMemo(() => {
        return lineItems.reduce((sum, line) => {
            const unitPrice = Number(line.unit_price);
            const quantity = Number(line.quantity);
            if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) {
                return sum;
            }
            return sum + unitPrice * quantity;
        }, 0);
    }, [lineItems]);

    const purchaseMutation = useMutation({
        mutationFn: async () => {
            if (!token) {
                throw new Error("Authentication required");
            }

            if (!selectedSupplierId) {
                throw new Error("Select a supplier before saving purchase");
            }

            if (lineItems.length === 0) {
                throw new Error("Add at least one product to the purchase list");
            }

            const payloadItems = lineItems.map((line) => {
                const quantity = Number(line.quantity);
                const unitPrice = Number(line.unit_price);

                if (!Number.isInteger(quantity) || quantity <= 0) {
                    throw new Error(`Quantity for ${line.name} must be a whole number greater than 0`);
                }

                if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
                    throw new Error(`Purchase price for ${line.name} must be greater than 0`);
                }

                return {
                    product_id: line.product_id,
                    quantity,
                    unit_type: line.unit_type,
                    unit_price: line.unit_price,
                };
            });

            return apiFetch<PurchaseResponse>("/purchases", {
                method: "POST",
                token,
                body: {
                    supplier_id: Number(selectedSupplierId),
                    purchase_date: purchaseDate,
                    description: description || undefined,
                    items: payloadItems,
                },
            });
        },
        onSuccess: (data) => {
            setSuccess(`Purchase saved successfully (${data.expense_code}) for ${data.supplier_name}.`);
            setError(null);
            setLineItems([]);
            setDescription("");

            queryClient.invalidateQueries({ queryKey: ["purchase-products"] });
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["ledger"] });
        },
        onError: (mutationError) => {
            setSuccess(null);
            setError(mutationError instanceof Error ? mutationError.message : "Failed to save purchase");
        },
    });

    function addProductToList(product: Product) {
        setSuccess(null);
        setError(null);

        setLineItems((current) => {
            const existingIndex = current.findIndex((line) => line.product_id === product.id);
            if (existingIndex >= 0) {
                const next = [...current];
                const previousQty = Number(next[existingIndex].quantity) || 0;
                next[existingIndex] = {
                    ...next[existingIndex],
                    quantity: String(previousQty + 1),
                };
                return next;
            }

            return [
                ...current,
                {
                    product_id: product.id,
                    name: product.name,
                    category: product.category,
                    photo_url: product.photo_url,
                    current_stock: product.inventory?.quantity ?? 0,
                    base_unit_price: String(product.unit_price),
                    unit_price: String(product.unit_price),
                    quantity: "1",
                    unit_type: INVENTORY_UNITS.PIECES,
                    pcs_per_dozen: toPositiveNumber(product.pcs_per_dozen, 12),
                    pcs_per_box: toPositiveNumber(product.pcs_per_box, 24),
                },
            ];
        });
    }

    function updateLineItem(productId: number, field: "unit_price" | "quantity", value: string) {
        setSuccess(null);
        setError(null);

        setLineItems((current) =>
            current.map((line) =>
                line.product_id === productId
                    ? {
                        ...line,
                        [field]: value,
                    }
                    : line,
            ),
        );
    }

    function updateLineUnitType(productId: number, unitType: PurchaseUnitType) {
        setSuccess(null);
        setError(null);

        setLineItems((current) =>
            current.map((line) => {
                if (line.product_id !== productId) {
                    return line;
                }

                const multiplier = getUnitMultiplier({
                    unit_type: unitType,
                    pcs_per_dozen: line.pcs_per_dozen,
                    pcs_per_box: line.pcs_per_box,
                });
                const baseUnitPrice = Number(line.base_unit_price);
                const nextUnitPrice = Number.isFinite(baseUnitPrice)
                    ? String(baseUnitPrice * multiplier)
                    : line.unit_price;

                return {
                    ...line,
                    unit_type: unitType,
                    unit_price: nextUnitPrice,
                };
            }),
        );
    }

    function removeLineItem(productId: number) {
        setSuccess(null);
        setError(null);
        setLineItems((current) => current.filter((line) => line.product_id !== productId));
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Purchase</h1>
                    <p className="text-gray-600 mt-1">
                        Add purchased products to inventory and record total amount as cash out.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link href="/admin/inventory">
                        <Button
                            variant="outline"
                            className="border-pink-200 text-pink-700 hover:bg-pink-50"
                        >
                            + Create New Product
                        </Button>
                    </Link>
                    <Link href="/admin/suppliers">
                        <Button
                            variant="outline"
                            className="border-pink-200 text-pink-700 hover:bg-pink-50"
                        >
                            + Manage Suppliers
                        </Button>
                    </Link>
                </div>
            </div>

            {(error || queryError || suppliersQueryError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error
                        ?? (queryError instanceof Error ? queryError.message : null)
                        ?? (suppliersQueryError instanceof Error ? suppliersQueryError.message : "Failed to load data")}
                </div>
            )}

            {success && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6 items-start">
                <Card>
                    <CardHeader className="space-y-4">
                        <CardTitle className="text-lg">Product Database</CardTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="h-10 bg-white"
                            />
                            <select
                                value={selectedCategory}
                                onChange={(event) => setSelectedCategory(event.target.value)}
                                className="h-10 px-4 rounded-md text-sm text-black border border-gray-300 bg-white"
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category === "all" ? "All Categories" : formatCategory(category)}
                                    </option>
                                ))}
                            </select>
                            <Button
                                variant="outline"
                                className="h-10"
                                onClick={() => {
                                    void refetch();
                                }}
                            >
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingProducts ? (
                            <p className="text-sm text-gray-500">Loading products...</p>
                        ) : filteredProducts.length === 0 ? (
                            <p className="text-sm text-gray-500">No products found.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredProducts.map((product) => {
                                    const alreadyAdded = lineItems.some((line) => line.product_id === product.id);
                                    return (
                                        <div
                                            key={product.id}
                                            className="rounded-lg border border-gray-200 bg-white p-3 space-y-3"
                                        >
                                            <div className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                                                <img
                                                    src={product.photo_url || "/mock/product-1.svg"}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(event) => {
                                                        event.currentTarget.src = "/mock/product-1.svg";
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                                    {product.name}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    {formatCategory(product.category)}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-700">
                                                <span>Stock: {product.inventory?.quantity ?? 0}</span>
                                                <span className="font-medium">
                                                    {formatCurrency(Number(product.unit_price))}
                                                </span>
                                            </div>
                                            <Button
                                                className="w-full h-9 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                                                onClick={() => addProductToList(product)}
                                            >
                                                {alreadyAdded ? "Add +1 More" : "Add to Purchase"}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:sticky xl:top-20">
                    <CardHeader className="space-y-3">
                        <CardTitle className="text-lg">Purchase List</CardTitle>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                Supplier
                            </label>
                            <select
                                value={selectedSupplierId}
                                onChange={(event) => setSelectedSupplierId(event.target.value)}
                                className="w-full h-10 px-3 text-sm text-black border border-gray-300 rounded-md bg-white"
                            >
                                {suppliers.length === 0 && <option value="">No suppliers available</option>}
                                {suppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                Purchase Date
                            </label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(event) => setPurchaseDate(event.target.value)}
                                className="w-full h-10 px-3 text-sm text-black border border-gray-300 rounded-md bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">
                                Description (optional)
                            </label>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="Optional note for this purchase"
                                className="w-full px-3 py-2 text-sm text-black border border-gray-300 rounded-md bg-white resize-none"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {lineItems.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                No products selected yet.
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                                {lineItems.map((line) => {
                                    const quantity = Number(line.quantity);
                                    const multiplier = getUnitMultiplier(line);
                                    const pcsToAdd = Math.round(quantity * multiplier);
                                    const unitLabel = getUnitLabel(line.unit_type);
                                    const lineTotal = Number(line.unit_price) * quantity;
                                    return (
                                        <div
                                            key={line.product_id}
                                            className="rounded-lg border border-gray-200 p-3 space-y-2 bg-white"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                                        {line.name}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        Current stock: {line.current_stock}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Adds: {Number.isFinite(pcsToAdd) ? pcsToAdd : 0} Pcs
                                                    </p>
                                                </div>
                                                <button
                                                    className="text-xs text-red-600 hover:text-red-700"
                                                    onClick={() => removeLineItem(line.product_id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">
                                                        Purchase Price / {unitLabel}
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={line.unit_price}
                                                        onChange={(event) =>
                                                            updateLineItem(line.product_id, "unit_price", event.target.value)
                                                        }
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">
                                                        Quantity ({unitLabel})
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        step="1"
                                                        value={line.quantity}
                                                        onChange={(event) =>
                                                            updateLineItem(line.product_id, "quantity", event.target.value)
                                                        }
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 block mb-1">
                                                        Quantity Type
                                                    </label>
                                                    <select
                                                        value={line.unit_type}
                                                        onChange={(event) =>
                                                            updateLineUnitType(line.product_id, event.target.value as PurchaseUnitType)
                                                        }
                                                        className="w-full h-9 px-2 rounded-md text-sm text-black border border-gray-300 bg-white"
                                                    >
                                                        <option value={INVENTORY_UNITS.PIECES}>Pcs</option>
                                                        <option value={INVENTORY_UNITS.DOZEN}>Dozen</option>
                                                        <option value={INVENTORY_UNITS.BOX}>Box</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <p className="text-xs font-medium text-gray-700 text-right">
                                                Line Total: {formatCurrency(Number.isFinite(lineTotal) ? lineTotal : 0)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="rounded-lg border border-pink-200 bg-pink-50 p-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">Products</span>
                                <span className="font-semibold text-gray-900">{lineItems.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-base mt-1">
                                <span className="text-gray-700">Total Purchase Amount</span>
                                <span className="font-bold text-pink-700">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>

                        <Button
                            className="w-full h-10 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                            disabled={lineItems.length === 0 || !selectedSupplierId || purchaseMutation.isPending}
                            onClick={() => {
                                setError(null);
                                setSuccess(null);
                                purchaseMutation.mutate();
                            }}
                        >
                            {purchaseMutation.isPending ? "Saving Purchase..." : "Save Purchase"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
