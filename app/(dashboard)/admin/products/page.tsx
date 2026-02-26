"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { INVENTORY_UNITS } from "@/lib/constants";
import { useCart } from "@/lib/cart-context";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/lib/auth-context";

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

export default function ProductsPage() {
    const { token, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [productError, setProductError] = useState<string | null>(null);
    const [customerError, setCustomerError] = useState<string | null>(null);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    const productsCacheKey = useMemo(() => `nyk-products-cache:${user?.id ?? "anon"}`, [user?.id]);
    const customersCacheKey = useMemo(() => `nyk-products-customers-cache:${user?.id ?? "anon"}`, [user?.id]);

    const loadCache = <T,>(key: string) => {
        if (typeof window === "undefined") {
            return null;
        }
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as { data: T[] };
            if (!Array.isArray(parsed.data)) return null;
            return parsed.data;
        } catch {
            return null;
        }
    };

    const saveCache = <T,>(key: string, data: T[]) => {
        if (typeof window === "undefined") {
            return;
        }
        sessionStorage.setItem(key, JSON.stringify({ data }));
    };

    // Use global cart context
    const {
        cart,
        selectedCustomer,
        customerSearch,
        orderDate,
        paymentType,
        remark,
        addToCart,
        setSelectedCustomer,
        setCustomerSearch,
        setOrderDate,
        setPaymentType,
        setRemark,
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

    const fetchProducts = useCallback(async (force = false, signal?: AbortSignal) => {
        if (!token) {
            return;
        }

        if (!force) {
            const cached = loadCache<Product>(productsCacheKey);
            if (cached) {
                setProducts(cached.filter((product) => product.is_active));
                setLoadingProducts(false);
                return;
            }
        }

        setLoadingProducts(true);
        setProductError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/_api/products`, {
                headers: { Authorization: `Bearer ${token}` },
                signal,
            });
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Failed to load products");
            }
            const data = (await response.json()) as Product[];
            const activeProducts = data.filter((product) => product.is_active);
            setProducts(activeProducts);
            saveCache(productsCacheKey, activeProducts);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            const message = err instanceof Error ? err.message : "Failed to load products";
            setProductError(message);
        } finally {
            setLoadingProducts(false);
        }
    }, [token, productsCacheKey]);

    useEffect(() => {
        const controller = new AbortController();
        fetchProducts(false, controller.signal);
        return () => controller.abort();
    }, [fetchProducts]);

    const fetchCustomers = useCallback(async (force = false, signal?: AbortSignal) => {
        if (!token) {
            return;
        }

        if (!force) {
            const cached = loadCache<Customer>(customersCacheKey);
            if (cached) {
                setCustomers(cached);
                setLoadingCustomers(false);
                return;
            }
        }

        setLoadingCustomers(true);
        setCustomerError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/_api/customers`, {
                headers: { Authorization: `Bearer ${token}` },
                signal,
            });
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Failed to load customers");
            }
            const data = (await response.json()) as Customer[];
            setCustomers(data);
            saveCache(customersCacheKey, data);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            const message = err instanceof Error ? err.message : "Failed to load customers";
            setCustomerError(message);
        } finally {
            setLoadingCustomers(false);
        }
    }, [token, customersCacheKey]);

    useEffect(() => {
        const controller = new AbortController();
        fetchCustomers(false, controller.signal);
        return () => controller.abort();
    }, [fetchCustomers]);

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
        return customers.find(c => c.id === Number(selectedCustomer));
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
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => {
                                fetchProducts(true);
                                fetchCustomers(true);
                            }}
                            aria-label="Refresh"
                            title="Refresh"
                            className="h-11 w-11 p-0"
                        >
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 12a9 9 0 1 1-3-6.7" />
                                <path d="M21 3v6h-6" />
                            </svg>
                        </Button>

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
                                onChange={(e) => setOrderDate(e.target.value)}
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
            <Link href={`/admin/products/${product.id}`} className="block">
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
