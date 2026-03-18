"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
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
    last_purchase_price: string | number | null;
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
    purchase_price_per_pcs: string;
    quantity: string;
    unit_type: PurchaseUnitType;
};

type PurchaseResponse = {
    expense_code: string;
    supplier_name: string;
    total_amount: string;
};

type PurchaseHistoryItem = {
    id: number;
    product_id: number;
    quantity: number;
    unit_type: string;
    multiplier: number;
    purchase_price_per_pcs: string | number;
    total_price: string | number;
    unit_price: string | number;
    line_total: string | number;
    created_at: string;
    expense_date: string | null;
    supplier_name: string | null;
};

function formatCurrency(amount: number) {
    const safeAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(safeAmount);
}

function formatCategory(category: string) {
    if (category === category.toUpperCase() && category.includes("_")) {
        return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return category;
}

function getUnitLabel(unitType: PurchaseUnitType) {
    if (unitType === INVENTORY_UNITS.DOZEN) return "Dozen";
    if (unitType === INVENTORY_UNITS.BOX) return "Box";
    return "Pcs";
}

function getHistoryUnitLabel(unitType: string) {
    if (unitType === INVENTORY_UNITS.DOZEN) return "Dozen";
    if (unitType === INVENTORY_UNITS.BOX) return "Box";
    return "Pcs";
}

function formatHistoryDate(createdAt: string, expenseDate?: string | null) {
    const dateValue = expenseDate ?? createdAt;
    return new Date(dateValue).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function getUnitMultiplier(unitType: PurchaseUnitType) {
    if (unitType === INVENTORY_UNITS.DOZEN) return 12;
    if (unitType === INVENTORY_UNITS.BOX) return 24;
    return 1;
}

function calculateLineTotal(purchasePricePerPcs: number, quantity: number, unitType: PurchaseUnitType) {
    if (!Number.isFinite(purchasePricePerPcs) || !Number.isFinite(quantity)) {
        return 0;
    }
    if (purchasePricePerPcs <= 0 || quantity <= 0) {
        return 0;
    }
    return purchasePricePerPcs * quantity * getUnitMultiplier(unitType);
}

function normalizeNumericInput(value: string, options?: { integer?: boolean }) {
    if (value === "") {
        return "";
    }

    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly === "") {
        return "";
    }

    const withoutLeadingZeros = digitsOnly.replace(/^0+/, "");
    const cleaned = withoutLeadingZeros === "" ? "0" : withoutLeadingZeros;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return "0";
    }

    const normalized = options?.integer ? Math.trunc(parsed) : parsed;
    return String(normalized);
}

function normalizeLineInput(field: "purchase_price_per_pcs" | "quantity", value: string) {
    return normalizeNumericInput(value, { integer: field === "quantity" });
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
    const [selectedTab, setSelectedTab] = useState<"purchase" | "history">("purchase");
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const todayDate = thaiToday();

    const preventInvalidAmountKeys = (event: KeyboardEvent<HTMLInputElement>) => {
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

    const {
        data: products = [],
        isLoading: loadingProducts,
        error: queryError,
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

    const {
        data: historyItems = [],
        isLoading: historyLoading,
        error: historyError,
    } = useQuery({
        queryKey: ["purchase-price-history", selectedProductId],
        queryFn: () => apiFetch<PurchaseHistoryItem[]>(`/purchase-items/product/${selectedProductId}`, {
            token,
            params: { limit: "10" },
        }),
        enabled: !!token && selectedTab === "history" && selectedProductId !== null,
    });

    useEffect(() => {
        if (!selectedSupplierId && suppliers.length > 0) {
            setSelectedSupplierId(String(suppliers[0].id));
        }
    }, [selectedSupplierId, suppliers]);

    useEffect(() => {
        const hasSelectedProduct = selectedProductId !== null
            && products.some((product) => product.id === selectedProductId);

        if (!hasSelectedProduct) {
            setSelectedProductId(products[0]?.id ?? null);
        }
    }, [products, selectedProductId]);

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
            const purchasePricePerPcs = Number(line.purchase_price_per_pcs);
            const quantity = Number(line.quantity);
            if (!Number.isFinite(purchasePricePerPcs) || !Number.isFinite(quantity)) {
                return sum;
            }
            return sum + calculateLineTotal(purchasePricePerPcs, quantity, line.unit_type);
        }, 0);
    }, [lineItems]);

    const hasInvalidPurchaseInputs = useMemo(() => {
        return lineItems.some((line) => {
            const purchasePricePerPcs = Number(line.purchase_price_per_pcs);
            const quantity = Number(line.quantity);
            return !Number.isFinite(purchasePricePerPcs)
                || !Number.isFinite(quantity)
                || purchasePricePerPcs <= 0
                || quantity <= 0;
        });
    }, [lineItems]);

    const hasFuturePurchaseDate = useMemo(() => {
        return purchaseDate !== "" && purchaseDate > todayDate;
    }, [purchaseDate, todayDate]);

    const selectedHistoryProductName = useMemo(() => {
        if (selectedProductId == null) return "";
        return products.find((product) => product.id === selectedProductId)?.name ?? "";
    }, [products, selectedProductId]);

    const bestPriceInfo = useMemo(() => {
        let best: { supplierName: string | null; price: number } | null = null;

        for (const item of historyItems) {
            const price = Number(item.purchase_price_per_pcs ?? item.unit_price);
            if (!Number.isFinite(price)) continue;

            if (!best || price < best.price) {
                best = { supplierName: item.supplier_name, price };
            }
        }

        return best;
    }, [historyItems]);

    const purchaseMutation = useMutation({
        mutationFn: async () => {
            if (!token) {
                throw new Error("Authentication required");
            }

            if (purchaseDate > todayDate) {
                throw new Error("Purchase date must not be greater than today");
            }

            if (!selectedSupplierId) {
                throw new Error("Select a supplier before saving purchase");
            }

            if (lineItems.length === 0) {
                throw new Error("Add at least one product to the purchase list");
            }

            const payloadItems = lineItems.map((line) => {
                const quantity = Number(line.quantity);
                const purchasePricePerPcs = Number(line.purchase_price_per_pcs);

                if (!Number.isInteger(quantity) || quantity <= 0) {
                    throw new Error(`Quantity for ${line.name} must be a whole number greater than 0`);
                }

                if (!Number.isFinite(purchasePricePerPcs) || purchasePricePerPcs <= 0) {
                    throw new Error("Amount must be greater than 0");
                }

                return {
                    product_id: line.product_id,
                    quantity,
                    unit_type: line.unit_type,
                    purchase_price_per_pcs: line.purchase_price_per_pcs,
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
            queryClient.invalidateQueries({ queryKey: ["stock-history"] });
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
        setSelectedProductId(product.id);

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
                    purchase_price_per_pcs: String(Number(product.last_purchase_price ?? 0)),
                    quantity: "1",
                    unit_type: INVENTORY_UNITS.PIECES,
                },
            ];
        });
    }

    function updateLineItem(productId: number, field: "purchase_price_per_pcs" | "quantity", value: string) {
        setSuccess(null);
        setError(null);

        const sanitizedValue = normalizeLineInput(field, value);

        setLineItems((current) =>
            current.map((line) =>
                line.product_id === productId
                    ? {
                        ...line,
                        [field]: sanitizedValue,
                    }
                    : line,
            ),
        );
    }

    function handleLineItemBlur(productId: number, field: "purchase_price_per_pcs" | "quantity") {
        setLineItems((current) =>
            current.map((line) => {
                if (line.product_id !== productId) {
                    return line;
                }

                const currentValue = field === "purchase_price_per_pcs"
                    ? line.purchase_price_per_pcs
                    : line.quantity;

                const normalizedValue = currentValue === ""
                    ? "0"
                    : normalizeLineInput(field, currentValue);

                return {
                    ...line,
                    [field]: normalizedValue,
                };
            }),
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

                return {
                    ...line,
                    unit_type: unitType,
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
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
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
                                                    Last Cost: {formatCurrency(Number(product.last_purchase_price ?? 0))} / Pcs
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="h-9"
                                                    onClick={() => {
                                                        setSelectedProductId(product.id);
                                                        setSelectedTab("history");
                                                    }}
                                                >
                                                    View History
                                                </Button>
                                                <Button
                                                    className="h-9 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                                                    onClick={() => addProductToList(product)}
                                                >
                                                    {alreadyAdded ? "Add +1" : "Add"}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:sticky xl:top-20">
                    <CardHeader className="space-y-3">
                        <CardTitle className="text-lg">Purchase Panel</CardTitle>
                        <div className="inline-flex rounded-lg bg-gray-100 p-1">
                            <button
                                type="button"
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedTab === "purchase"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-800"
                                    }`}
                                onClick={() => setSelectedTab("purchase")}
                            >
                                Purchase
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${selectedTab === "history"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-800"
                                    }`}
                                onClick={() => setSelectedTab("history")}
                            >
                                Price History
                            </button>
                        </div>

                        {selectedTab === "purchase" && (
                            <>
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
                                        max={todayDate}
                                        onChange={(event) => {
                                            const nextDate = event.target.value;
                                            if (nextDate > todayDate) {
                                                setError("Purchase date must not be greater than today");
                                                return;
                                            }
                                            setError(null);
                                            setPurchaseDate(nextDate);
                                        }}
                                        className="w-full h-10 px-3 text-sm text-black border border-gray-300 rounded-md bg-white"
                                    />
                                    {hasFuturePurchaseDate && (
                                        <p className="text-xs text-red-600">Purchase date must not be greater than today</p>
                                    )}
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
                            </>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedTab === "purchase" ? (
                            <>
                                {lineItems.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        No products selected yet.
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                                        {lineItems.map((line) => {
                                            const quantity = Number(line.quantity);
                                            const multiplier = getUnitMultiplier(line.unit_type);
                                            const pcsToAdd = Math.round(quantity * multiplier);
                                            const unitLabel = getUnitLabel(line.unit_type);
                                            const purchasePricePerPcs = Number(line.purchase_price_per_pcs);
                                            const priceInvalid = !Number.isFinite(purchasePricePerPcs) || purchasePricePerPcs <= 0;
                                            const quantityInvalid = !Number.isFinite(quantity) || quantity <= 0;
                                            const lineTotal = calculateLineTotal(purchasePricePerPcs, quantity, line.unit_type);
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
                                                                Current stock: {line.current_stock} / Adds: {Number.isFinite(pcsToAdd) ? pcsToAdd : 0} Pcs
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
                                                                Purchase Price / Pcs
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                inputMode="numeric"
                                                                pattern="[0-9]*"
                                                                value={line.purchase_price_per_pcs}
                                                                onChange={(event) =>
                                                                    updateLineItem(line.product_id, "purchase_price_per_pcs", event.target.value)
                                                                }
                                                                onBlur={() => handleLineItemBlur(line.product_id, "purchase_price_per_pcs")}
                                                                onKeyDown={preventInvalidAmountKeys}
                                                                className={`h-9 ${priceInvalid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                                            />
                                                            {priceInvalid && (
                                                                <p className="text-[11px] text-red-600 mt-1">
                                                                    Amount must be greater than 0
                                                                </p>
                                                            )}
                                                            <p className="text-[11px] text-gray-500 mt-1">
                                                                1 Dozen = {formatCurrency((Number.isFinite(purchasePricePerPcs) ? purchasePricePerPcs : 0) * 12)}
                                                            </p>
                                                            <p className="text-[11px] text-gray-500">
                                                                1 Box = {formatCurrency((Number.isFinite(purchasePricePerPcs) ? purchasePricePerPcs : 0) * 24)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500 block mb-1">
                                                                Quantity ({unitLabel})
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                inputMode="numeric"
                                                                pattern="[0-9]*"
                                                                value={line.quantity}
                                                                onChange={(event) =>
                                                                    updateLineItem(line.product_id, "quantity", event.target.value)
                                                                }
                                                                onBlur={() => handleLineItemBlur(line.product_id, "quantity")}
                                                                onKeyDown={preventInvalidAmountKeys}
                                                                className={`h-9 ${quantityInvalid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                                            />
                                                            {quantityInvalid && (
                                                                <p className="text-[11px] text-red-600 mt-1">
                                                                    Quantity must be greater than 0
                                                                </p>
                                                            )}
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
                                                        Total: {formatCurrency(Number.isFinite(lineTotal) ? lineTotal : 0)}
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
                                    disabled={lineItems.length === 0 || !selectedSupplierId || purchaseMutation.isPending || hasInvalidPurchaseInputs || hasFuturePurchaseDate}
                                    onClick={() => {
                                        setError(null);
                                        setSuccess(null);
                                        purchaseMutation.mutate();
                                    }}
                                >
                                    {purchaseMutation.isPending ? "Saving Purchase..." : "Save Purchase"}
                                </Button>
                            </>
                        ) : (
                            <div className="space-y-3">
                                {products.length === 0 ? (
                                    <p className="text-sm text-gray-500">No products available.</p>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 block">Selected Product</label>
                                            <select
                                                value={selectedProductId ?? ""}
                                                onChange={(event) => setSelectedProductId(Number(event.target.value))}
                                                className="w-full h-10 px-3 text-sm text-black border border-gray-300 rounded-md bg-white"
                                            >
                                                {products.map((product) => (
                                                    <option key={product.id} value={product.id}>
                                                        {product.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedHistoryProductName && (
                                            <p className="text-xs text-gray-600">
                                                Showing latest purchase records for <span className="font-semibold">{selectedHistoryProductName}</span>
                                            </p>
                                        )}

                                        {historyLoading ? (
                                            <p className="text-sm text-gray-500">Loading purchase history...</p>
                                        ) : historyError ? (
                                            <p className="text-sm text-red-600">{(historyError as Error).message}</p>
                                        ) : historyItems.length === 0 ? (
                                            <p className="text-sm text-gray-500">No purchase history available</p>
                                        ) : (
                                            <>
                                                {bestPriceInfo && (
                                                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                                        Best Price: {bestPriceInfo.supplierName ?? "Unknown Supplier"} ({formatCurrency(bestPriceInfo.price)} / Pcs)
                                                    </div>
                                                )}
                                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-50 text-gray-700">
                                                                <tr>
                                                                    <th className="text-left px-3 py-2">Date</th>
                                                                    <th className="text-right px-3 py-2">Purchase Price</th>
                                                                    <th className="text-right px-3 py-2">Qty</th>
                                                                    <th className="text-right px-3 py-2">Total Price</th>
                                                                    <th className="text-left px-3 py-2">Supplier</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {historyItems.map((item, index) => {
                                                                    const currentPrice = Number(item.purchase_price_per_pcs ?? item.unit_price);
                                                                    const previousPrice = Number(historyItems[index + 1]?.purchase_price_per_pcs ?? historyItems[index + 1]?.unit_price);
                                                                    const hasDiff = Number.isFinite(currentPrice) && Number.isFinite(previousPrice) && currentPrice !== previousPrice;
                                                                    const diff = hasDiff ? currentPrice - previousPrice : 0;

                                                                    return (
                                                                        <tr
                                                                            key={item.id}
                                                                            className={`border-t border-gray-100 ${index === 0 ? "bg-pink-50 font-semibold" : "bg-white"}`}
                                                                        >
                                                                            <td className="px-3 py-2 text-gray-700">
                                                                                {formatHistoryDate(item.created_at, item.expense_date)}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-gray-800 whitespace-nowrap">
                                                                                {formatCurrency(currentPrice)}
                                                                                {hasDiff && (
                                                                                    <span className={`ml-2 text-xs ${diff > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                                                        {diff > 0 ? "↑" : "↓"} {formatCurrency(Math.abs(diff))}
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                                {item.quantity} {getHistoryUnitLabel(item.unit_type)}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-gray-800">
                                                                                {formatCurrency(Number(item.total_price ?? item.line_total))}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-gray-700">
                                                                                {item.supplier_name ?? "-"}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
