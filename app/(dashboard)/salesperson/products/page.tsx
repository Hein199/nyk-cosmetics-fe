"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { INVENTORY_UNITS } from "@/lib/constants";
import { useCart } from "@/lib/cart-context";

// Mock customer data
const mockCustomers = [
    { id: "CUST-001", name: "Beauty Store A", address: "123 Main Street, Yangon", phone: "09-123-456-789" },
    { id: "CUST-002", name: "Cosmetics Shop B", address: "456 Market Road, Mandalay", phone: "09-987-654-321" },
    { id: "CUST-003", name: "Salon C", address: "789 Beauty Lane, Yangon", phone: "09-111-222-333" },
    { id: "CUST-004", name: "Retail Store D", address: "321 Shopping Center, Naypyidaw", phone: "09-444-555-666" },
    { id: "CUST-005", name: "Beauty Outlet E", address: "555 Fashion Street, Yangon", phone: "09-777-888-999" },
    { id: "CUST-006", name: "Makeup Corner F", address: "666 Style Avenue, Mandalay", phone: "09-222-333-444" },
    { id: "CUST-007", name: "Glam Studio G", address: "777 Glamour Road, Yangon", phone: "09-555-666-777" },
    { id: "CUST-008", name: "Style Shop H", address: "888 Fashion Plaza, Naypyidaw", phone: "09-888-999-000" }
];

// Mock product data
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

interface CartItem {
    id: string;
    name: string;
    price: number;
    customPrice?: number;
    quantity: number;
    unit: string;
    total: number;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function ProductsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [paymentType, setPaymentType] = useState("cash");
    const [remark, setRemark] = useState("");
    
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    
    // Use global cart context
    const {
        cart,
        selectedCustomer,
        customerSearch,
        addToCart,
        removeFromCart,
        clearCart,
        setSelectedCustomer,
        setCustomerSearch,
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
        return mockProducts.filter((product) => {
            const matchesSearch = searchQuery === "" || 
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.category.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesCategory = selectedCategory === "all" || 
                product.category === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = Array.from(new Set(mockProducts.map(p => p.category)));
        return ["all", ...cats];
    }, []);

    // Filter customers based on search
    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return mockCustomers;
        return mockCustomers.filter(customer =>
            customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            customer.phone.includes(customerSearch)
        );
    }, [customerSearch]);

    // Get selected customer details
    const selectedCustomerDetails = useMemo(() => {
        return mockCustomers.find(c => c.id === selectedCustomer);
    }, [selectedCustomer]);

    // Local add to cart function that uses global context
    const localAddToCart = (productId: string) => {
        const product = mockProducts.find(p => p.id === productId);
        if (!product) return;

        addToCart(productId, 1, INVENTORY_UNITS.PIECES, undefined, product.name, product.price);
    };

    return (
        <div className="min-h-screen bg-[#FFCDC9] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                        <p className="text-gray-600 mt-1">Select products and customer to add to cart</p>
                    </div>
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
                                        {filteredCustomers.length === 0 ? (
                                            <div className="p-3 text-sm text-gray-800">No customers found</div>
                                        ) : (
                                            filteredCustomers.map((customer) => (
                                                <button
                                                    key={customer.id}
                                                    onClick={() => {
                                                        setSelectedCustomer(customer.id);
                                                        setCustomerSearch(customer.name);
                                                        setShowCustomerDropdown(false);
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                                >
                                                    <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                                                    <div className="text-sm text-gray-700">{customer.phone}</div>
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
                                        setSelectedCustomer(null);
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
                                    <div className="text-sm text-gray-800">{selectedCustomerDetails.phone}</div>
                                    <div className="text-sm text-gray-700 truncate">{selectedCustomerDetails.address}</div>
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
                                <option value="cash">Cash</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="credit">Credit</option>
                                <option value="mobile">Mobile Payment</option>
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
                                        {category === "all" ? "All Categories" : category}
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

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={localAddToCart}
                        />
                    ))}
                </div>

                {filteredProducts.length === 0 && (
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
    product: typeof mockProducts[0];
    onAddToCart: (productId: string) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <Link href={`/salesperson/products/${product.id}`} className="block">
                <div className="aspect-square bg-gray-100 relative">
                    <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <CardHeader className="pb-2 border-b-0">
                    <CardTitle className="text-sm line-clamp-2">{product.name}</CardTitle>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{product.category}</span>
                        <span className="text-sm font-normal text-black">
                            {formatCurrency(product.price)}
                        </span>
                    </div>
                </CardHeader>
            </Link>
            <CardContent className="pt-0">
                <Button
                    type="button"
                    onClick={() => onAddToCart(product.id)}
                    className="w-full text-sm bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                    aria-label="Add to cart"
                >
                    Add to Cart
                </Button>
            </CardContent>
        </Card>
    );
}