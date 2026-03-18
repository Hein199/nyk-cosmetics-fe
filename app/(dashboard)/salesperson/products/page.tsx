"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { apiFetch } from "@/lib/api";
import { thaiToday } from "@/lib/utils";

type Customer = {
    id: number;
    name: string;
    address: string;
    phone_number: string;
};

type Product = {
    id: number;
    name: string;
    category: string;
    unit_price: string | number;
    photo_url: string;
    inventory?: { quantity: number } | null;
    is_active: boolean;
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(amount);
}

function formatCategory(category: string) {
    return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductsPage() {
    const { token } = useAuth();
    const todayDate = thaiToday();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    const { data: allProducts = [], isLoading: loadingProducts, error: productQueryError } = useQuery({
        queryKey: ["sp-products"],
        queryFn: () => apiFetch<Product[]>("/products", { token }),
        enabled: !!token,
        select: (data) =>
            data.filter((product) => {
                const stockQty = product.inventory?.quantity ?? 0;
                return product.is_active && stockQty > 0;
            }),
    });
    const products = allProducts;
    const productError = productQueryError?.message ?? null;

    const { data: customers = [], isLoading: loadingCustomers, error: customerQueryError } = useQuery({
        queryKey: ["sp-customers"],
        queryFn: () => apiFetch<Customer[]>("/customers", { token }),
        enabled: !!token,
    });
    const customerError = customerQueryError?.message ?? null;

    // Use global cart context
    const {
        cart,
        selectedCustomer,
        customerSearch,
        orderDate,
        paymentType,
        remark,
        setSelectedCustomer,
        setCustomerSearch,
        setOrderDate,
        setPaymentType,
        setRemark,
        cartSummary
    } = useCart();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
                setShowCustomerDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Product filtering
    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch = searchQuery === "" ||
                product.name.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = selectedCategory === "all" ||
                product.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory, products]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = Array.from(new Set(products.map(p => p.category)));
        return ["all", ...cats];
    }, [products]);

    // Filter customers based on search
    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(customerSearch.toLowerCase())
        );
    }, [customerSearch, customers]);

    // Get selected customer details
    const selectedCustomerDetails = useMemo(() => {
        return customers.find(c => String(c.id) === selectedCustomer);
    }, [selectedCustomer, customers]);

    return (
        <div className="min-h-screen bg-[#FFCDC9] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                        <p className="text-gray-600 mt-1">Select products and customer to add to cart</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {cart.length > 0 && (
                            <div className="text-right">
                                <div className="text-sm text-gray-600">
                                    {cartSummary.itemCount} items in cart
                                </div>
                                <div className="text-lg font-semibold text-gray-900">
                                    Total: {formatCurrency(cartSummary.total)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Selection Card */}
                <Card className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-start">
                        <div>
                            <label htmlFor="order-date" className="block text-sm font-medium text-gray-900 mb-2">
                                Order Date
                            </label>
                            <input
                                id="order-date"
                                type="date"
                                value={orderDate}
                                max={todayDate}
                                onChange={(e) => {
                                    const nextDate = e.target.value;
                                    setOrderDate(nextDate > todayDate ? todayDate : nextDate);
                                }}
                                lang="en-US"
                                className="w-full h-9 px-3 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                            />
                        </div>
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Customer
                            </label>
                            <div className="flex items-center gap-2" ref={customerDropdownRef}>
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="Search customers..."
                                        value={customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerDropdown(true);
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        className="w-full h-9 text-black font-medium"
                                    />

                                    {/* Customer Dropdown */}
                                    {showCustomerDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {loadingCustomers ? (
                                                <div className="p-3 text-sm text-gray-800">Loading customers...</div>
                                            ) : filteredCustomers.length === 0 ? (
                                                <div className="p-3 text-sm text-gray-800">No customers found</div>
                                            ) : (
                                                filteredCustomers.map((customer) => (
                                                    <button
                                                        key={customer.id}
                                                        onClick={() => {
                                                            setSelectedCustomer(String(customer.id));
                                                            setCustomerSearch(customer.name);
                                                            setShowCustomerDropdown(false);
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                                    >
                                                        <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                                                        <div className="text-sm text-gray-700">{customer.phone_number}</div>
                                                        <div className="text-sm text-gray-600 truncate">{customer.address}</div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 text-xs"
                                    onClick={() => {
                                        setCustomerSearch("");
                                        setSelectedCustomer("");
                                        setShowCustomerDropdown(false);
                                    }}
                                >
                                    Clear
                                </Button>
                            </div>

                            {/* Selected Customer Display */}
                            {selectedCustomerDetails && (
                                <div className="mt-2 p-3 bg-pink-50 border border-pink-200 rounded-md">
                                    <div className="text-sm font-medium text-gray-900">{selectedCustomerDetails.name}</div>
                                    <div className="text-sm text-gray-800">{selectedCustomerDetails.phone_number}</div>
                                    <div className="text-sm text-gray-700 truncate">{selectedCustomerDetails.address}</div>
                                </div>
                            )}
                            {customerError && (
                                <div className="mt-2 text-sm text-red-600">
                                    {customerError}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
                        <div>
                            <label htmlFor="payment-type" className="block text-sm font-medium text-gray-900 mb-2">
                                Payment Type
                            </label>
                            <select
                                id="payment-type"
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                                className="w-full h-9 px-3 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                            >
                                <option value="CASH">Cash</option>
                                <option value="BANK">Bank Transfer</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="remark" className="block text-sm font-medium text-gray-900 mb-2">
                                Remark
                            </label>
                            <textarea
                                id="remark"
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                rows={1}
                                placeholder="Add remark..."
                                className="w-full h-9 px-3 py-2 text-sm text-black font-medium placeholder:text-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm resize-none"
                            />
                        </div>
                    </div>

                    {/* Product Filters */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                All Categories
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full h-9 px-3 text-sm text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 font-medium"
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category === "all" ? "All Categories" : formatCategory(category)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Search Product
                            </label>
                            <Input
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 text-black font-medium"
                            />
                        </div>
                    </div>
                </Card>

                {productError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                        {productError}
                    </div>
                )}

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {loadingProducts ? (
                        <div className="col-span-full text-center text-gray-500">Loading products...</div>
                    ) : (
                        filteredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                            />
                        ))
                    )}
                </div>

                {!loadingProducts && filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <p className="text-gray-500">No products found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Product Card Component
interface ProductCardProps {
    product: Product;
}

function ProductCard({ product }: ProductCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <Link href={`/salesperson/products/${product.id}`} className="block">
                <div className="aspect-square bg-gray-100 relative">
                    <img
                        src={product.photo_url || "/mock/product-1.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = "/mock/product-1.svg"; }}
                    />
                </div>
                <CardHeader className="pb-2 border-b-0">
                    <CardTitle className="text-sm line-clamp-2">{product.name}</CardTitle>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{formatCategory(product.category)}</span>
                        <span className="text-sm font-normal text-black">
                            {formatCurrency(Number(product.unit_price))}
                        </span>
                    </div>
                </CardHeader>
            </Link>
        </Card>
    );
}