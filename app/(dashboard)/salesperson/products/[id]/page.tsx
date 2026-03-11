"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INVENTORY_UNITS } from "@/lib/constants";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Product = {
    id: number;
    name: string;
    description: string | null;
    category: string;
    unit_price: string | number;
    pcs_per_dozen: string | number;
    pcs_per_box: string | number;
    photo_url: string;
    inventory?: { quantity: number } | null;
    is_active: boolean;
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
    return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { addToCart, cart } = useCart();
    const { token } = useAuth();
    const [product, setProduct] = useState<Product | null>(null);

    const { isLoading: loading, error: queryError } = useQuery({
        queryKey: ["sp-product", params.id],
        queryFn: async () => {
            const data = await apiFetch<Product>(`/products/${params.id}`, { token });
            setProduct(data);
            return data;
        },
        enabled: !!token && !!params.id,
    });

    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState<string>(INVENTORY_UNITS.PIECES);
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [customPrice, setCustomPrice] = useState("");
    const [stockError, setStockError] = useState<string | null>(null);
    const productImageRef = useRef<HTMLImageElement | null>(null);
    const unitOptions = [
        { value: INVENTORY_UNITS.PIECES, label: "Pcs" },
        { value: INVENTORY_UNITS.DOZEN, label: "Dozen" },
        { value: INVENTORY_UNITS.BOX, label: "Box" },
    ];

    const unitMultiplier = useMemo(() => {
        switch (unit) {
            case INVENTORY_UNITS.DOZEN:
                return Number(product?.pcs_per_dozen ?? 12);
            case INVENTORY_UNITS.BOX:
                return Number(product?.pcs_per_box ?? 24);
            default:
                return 1;
        }
    }, [unit, product?.pcs_per_dozen, product?.pcs_per_box]);

    const pricePerSelectedUnit = useMemo(() => {
        if (useCustomPrice && customPrice) {
            const parsed = Number(customPrice);
            if (!Number.isNaN(parsed) && parsed >= 0) {
                return parsed;
            }
        }
        return Number(product?.unit_price ?? 0) * unitMultiplier;
    }, [customPrice, product?.unit_price, unitMultiplier, useCustomPrice]);

    const existingCartPieces = useMemo(() => {
        if (!product) return 0;
        return cart
            .filter(item => item.id === product.id)
            .reduce((total, cartItem) => {
                const mult = cartItem.unit === INVENTORY_UNITS.DOZEN
                    ? Number(product.pcs_per_dozen)
                    : cartItem.unit === INVENTORY_UNITS.BOX
                        ? Number(product.pcs_per_box)
                        : 1;
                return total + cartItem.quantity * mult;
            }, 0);
    }, [cart, product]);

    const maxQuantity = useMemo(() => {
        const stock = product?.inventory?.quantity ?? Number.MAX_SAFE_INTEGER;
        const remaining = Math.max(0, stock - existingCartPieces);
        return Math.max(0, Math.floor(remaining / unitMultiplier));
    }, [product, existingCartPieces, unitMultiplier]);

    const handleDecrease = () => {
        setQuantity((prev) => Math.max(1, prev - 1));
    };

    const handleIncrease = () => {
        setQuantity((prev) => Math.min(maxQuantity, prev + 1));
    };

    const animateToCart = () => {
        if (typeof window === "undefined") {
            return;
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const imageEl = productImageRef.current;
        const cartButton = document.getElementById("salesperson-cart-button");
        if (!imageEl || !cartButton) {
            return;
        }

        const imageRect = imageEl.getBoundingClientRect();
        const cartRect = cartButton.getBoundingClientRect();

        const clone = imageEl.cloneNode(true) as HTMLImageElement;
        clone.style.position = "fixed";
        clone.style.left = `${imageRect.left}px`;
        clone.style.top = `${imageRect.top}px`;
        clone.style.width = `${imageRect.width}px`;
        clone.style.height = `${imageRect.height}px`;
        clone.style.objectFit = "contain";
        clone.style.transition = "transform 600ms ease, opacity 600ms ease";
        clone.style.zIndex = "9999";
        clone.style.pointerEvents = "none";

        document.body.appendChild(clone);

        const deltaX = cartRect.left + cartRect.width / 2 - (imageRect.left + imageRect.width / 2);
        const deltaY = cartRect.top + cartRect.height / 2 - (imageRect.top + imageRect.height / 2);

        requestAnimationFrame(() => {
            clone.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2)`;
            clone.style.opacity = "0.2";
        });

        window.setTimeout(() => {
            clone.remove();
        }, 650);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FFCDC9] p-6">
                <div className="max-w-3xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Loading product...</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        );
    }

    if (!product || !product.is_active) {
        return (
            <div className="min-h-screen bg-[#FFCDC9] p-6">
                <div className="max-w-3xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Product not found</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {queryError && (
                                <p className="text-sm text-red-600 mb-4">{queryError.message}</p>
                            )}
                            <Button variant="outline" onClick={() => router.push("/salesperson/products")}>
                                Back
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFCDC9] p-6">
            <div className="max-w-6xl mx-auto">
                <Card className="overflow-hidden bg-white/80 backdrop-blur">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 p-6 lg:p-10">
                        <div className="bg-[#F7F7F3] rounded-2xl p-6 flex items-center justify-center">
                            <div className="relative w-full max-w-md">
                                <div className="aspect-square rounded-xl bg-white/40 flex items-center justify-center">
                                    <img
                                        src={product.photo_url || "/mock/product-1.svg"}
                                        alt={product.name}
                                        ref={productImageRef}
                                        className="w-3/4 h-3/4 object-contain"
                                        onError={(e) => { e.currentTarget.src = "/mock/product-1.svg"; }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                                    {formatCategory(product.category)}
                                </p>
                                <h1 className="text-3xl font-semibold text-gray-900">
                                    {product.name}
                                </h1>
                            </div>

                            <div className="space-y-1">
                                <p className="text-2xl font-semibold text-gray-900">
                                    {formatCurrency(pricePerSelectedUnit * quantity)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {quantity > 1 && (
                                        <span className="mr-1">
                                            {formatCurrency(pricePerSelectedUnit)} ×{" "}{quantity} ={" "}
                                        </span>
                                    )}
                                    {unit === INVENTORY_UNITS.DOZEN
                                        ? "Price per Dozen"
                                        : unit === INVENTORY_UNITS.BOX
                                            ? "Price per Box"
                                            : "Price per Unit"}
                                </p>
                            </div>

                            {product.description && (
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {product.description}
                                </p>
                            )}

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Unit Type</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {unitOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => { setUnit(option.value); setQuantity(1); setStockError(null); }}
                                            className={`h-10 rounded-full border text-sm font-medium transition-colors ${unit === option.value
                                                ? "bg-pink-100 border-pink-300 text-pink-700"
                                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="use-custom-price"
                                        checked={useCustomPrice}
                                        onChange={(e) => setUseCustomPrice(e.target.checked)}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    <label htmlFor="use-custom-price" className="text-sm text-gray-700">
                                        {unit === INVENTORY_UNITS.DOZEN
                                            ? "Custom price per Dozen"
                                            : unit === INVENTORY_UNITS.BOX
                                                ? "Custom price per Box"
                                                : "Custom price per Unit"}
                                    </label>
                                </div>
                                {useCustomPrice && (
                                    <Input
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={customPrice}
                                        onChange={(e) => setCustomPrice(e.target.value)}
                                        placeholder={`Default: ${formatCurrency(Number(product.unit_price ?? 0) * unitMultiplier)}`}
                                        className="h-9 text-sm text-black font-medium"
                                    />
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center border border-gray-300 rounded-full h-10 overflow-hidden bg-white">
                                    <button
                                        type="button"
                                        onClick={handleDecrease}
                                        className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                                    >
                                        −
                                    </button>
                                    <div className="w-16">
                                        <Input
                                            type="number"
                                            min="1"
                                            max={maxQuantity}
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
                                            className="h-10 w-16 border-0 text-center text-sm font-medium text-gray-900 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleIncrease}
                                        className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                                    >
                                        +
                                    </button>
                                </div>
                                <Button
                                    onClick={() => {
                                        const inventoryQty = product.inventory?.quantity ?? Number.MAX_SAFE_INTEGER;
                                        const newPieces = quantity * unitMultiplier;
                                        if (existingCartPieces + newPieces > inventoryQty) {
                                            setStockError(`Insufficient stock.`);
                                            return;
                                        }
                                        setStockError(null);
                                        animateToCart();
                                        addToCart(
                                            product.id,
                                            quantity,
                                            unit,
                                            useCustomPrice && customPrice ? Number(customPrice) : undefined,
                                            product.name,
                                            Number(product.unit_price) * unitMultiplier
                                        );
                                    }}
                                    disabled={maxQuantity === 0}
                                    className="flex-1 min-w-[180px] h-10 rounded-full text-sm bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add to Cart
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/salesperson/products")}
                                    className="h-10 rounded-full"
                                >
                                    Back
                                </Button>
                            </div>
                            {stockError && (
                                <p className="text-sm font-medium text-red-600">{stockError}</p>
                            )}

                            <div className="pt-6 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-800">Product Description</p>
                                    <span className="text-gray-300">—</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                    {product.description || "No description available."}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
