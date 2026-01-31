"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INVENTORY_UNITS } from "@/lib/constants";
import { useCart } from "@/lib/cart-context";

const mockProducts = [
    {
        id: "PRD-001",
        name: "NYK Matte Lipstick Red",
        category: "Lipstick",
        price: 15000,
        image: "/mock/product-1.svg",
        description: "Long-lasting matte finish lipstick",
        stock: 50
    },
    {
        id: "PRD-002",
        name: "NYK Foundation Light",
        category: "Foundation",
        price: 25000,
        image: "/mock/product-2.svg",
        description: "Full coverage liquid foundation",
        stock: 30
    },
    {
        id: "PRD-003",
        name: "NYK Eyeshadow Palette",
        category: "Eyeshadow",
        price: 35000,
        image: "/mock/product-3.svg",
        description: "12-color eyeshadow palette",
        stock: 20
    },
    {
        id: "PRD-004",
        name: "NYK Mascara Black",
        category: "Mascara",
        price: 18000,
        image: "/mock/product-4.svg",
        description: "Volumizing mascara",
        stock: 45
    },
    {
        id: "PRD-005",
        name: "NYK Blush Pink",
        category: "Blush",
        price: 12000,
        image: "/mock/product-1.svg",
        description: "Natural pink blush",
        stock: 35
    },
    {
        id: "PRD-006",
        name: "NYK Concealer Medium",
        category: "Concealer",
        price: 20000,
        image: "/mock/product-2.svg",
        description: "High coverage concealer",
        stock: 40
    },
    {
        id: "PRD-007",
        name: "NYK Highlighter Gold",
        category: "Highlighter",
        price: 22000,
        image: "/mock/product-3.svg",
        description: "Shimmery gold highlighter",
        stock: 25
    },
    {
        id: "PRD-008",
        name: "NYK Lip Gloss Clear",
        category: "Lip Gloss",
        price: 10000,
        image: "/mock/product-4.svg",
        description: "Glossy clear lip gloss",
        stock: 60
    }
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function ProductDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { addToCart } = useCart();

    const product = useMemo(() => {
        return mockProducts.find((p) => p.id === params.id);
    }, [params.id]);

    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState<string>(INVENTORY_UNITS.PIECES);
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [customPrice, setCustomPrice] = useState("");
    const unitOptions = [
        { value: INVENTORY_UNITS.PIECES, label: "Pcs" },
        { value: INVENTORY_UNITS.DOZEN, label: "Dozen" },
        { value: INVENTORY_UNITS.PACKAGE, label: "Package" },
        { value: INVENTORY_UNITS.BOX, label: "Box" },
    ];

    const unitMultiplier = useMemo(() => {
        switch (unit) {
            case INVENTORY_UNITS.DOZEN:
                return 12;
            case INVENTORY_UNITS.PACKAGE:
                return 6;
            case INVENTORY_UNITS.BOX:
                return 24;
            default:
                return 1;
        }
    }, [unit]);

    const pricePerSelectedUnit = useMemo(() => {
        if (useCustomPrice && customPrice) {
            const parsed = Number(customPrice);
            if (!Number.isNaN(parsed) && parsed >= 0) {
                return parsed;
            }
        }
        return (product?.price ?? 0) * unitMultiplier;
    }, [customPrice, product?.price, unitMultiplier, useCustomPrice]);

    const handleDecrease = () => {
        setQuantity((prev) => Math.max(1, prev - 1));
    };

    const handleIncrease = () => {
        setQuantity((prev) => Math.min(product?.stock ?? prev + 1, prev + 1));
    };

    if (!product) {
        return (
            <div className="min-h-screen bg-[#FFCDC9] p-6">
                <div className="max-w-3xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Product not found</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" onClick={() => router.back()}>
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
                                        src={product.image}
                                        alt={product.name}
                                        className="w-3/4 h-3/4 object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
                                    {product.category}
                                </p>
                                <h1 className="text-3xl font-semibold text-gray-900">
                                    {product.name}
                                </h1>
                            </div>

                            <div className="space-y-1">
                                <p className="text-2xl font-semibold text-gray-900">
                                    {formatCurrency(pricePerSelectedUnit)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {unit === INVENTORY_UNITS.DOZEN
                                        ? "Price per Dozen"
                                        : unit === INVENTORY_UNITS.PACKAGE
                                        ? "Price per Package"
                                        : unit === INVENTORY_UNITS.BOX
                                        ? "Price per Box"
                                        : "Price per Unit"}
                                </p>
                            </div>

                            <p className="text-sm text-gray-600 leading-relaxed">
                                {product.description}
                            </p>

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Unit Type</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {unitOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setUnit(option.value)}
                                            className={`h-10 rounded-full border text-sm font-medium transition-colors ${
                                                unit === option.value
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
                                            : unit === INVENTORY_UNITS.PACKAGE
                                            ? "Custom price per Package"
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
                                        placeholder={`Default: ${formatCurrency((product.price ?? 0) * unitMultiplier)}`}
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
                                            max={product.stock}
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
                                    onClick={() =>
                                        addToCart(
                                            product.id,
                                            quantity,
                                            unit,
                                            useCustomPrice && customPrice ? Number(customPrice) : undefined,
                                            product.name,
                                            product.price
                                        )
                                    }
                                    className="flex-1 min-w-[180px] h-10 rounded-full text-sm bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                                >
                                    Add to Cart
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.back()}
                                    className="h-10 rounded-full"
                                >
                                    Back
                                </Button>
                            </div>

                            <div className="pt-6 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-800">Detail</p>
                                    <span className="text-gray-300">—</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                    A reliable bodyguard for your skin, with secret uses. This lightweight, long lasting
                                    product provides dependable protection and a comfortable finish for everyday wear.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
