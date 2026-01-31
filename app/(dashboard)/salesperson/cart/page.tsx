"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useCart } from "@/lib/cart-context";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/constants";

type Customer = {
    id: string;
    name: string;
    address: string;
    phone_number: string;
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function CartPage() {
    const router = useRouter();
    const { token } = useAuth();
    const {
        cart,
        cartSummary,
        removeFromCart,
        clearCart,
        selectedCustomer,
        customerSearch,
        setSelectedCustomer,
        setCustomerSearch,
        orderDate,
        paymentType,
        remark,
        setOrderDate,
        setPaymentType,
        setRemark
    } = useCart();

    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);
    const [customerError, setCustomerError] = useState<string | null>(null);
    const [orderError, setOrderError] = useState<string | null>(null);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (!token) {
            return;
        }

        let isMounted = true;
        const fetchCustomers = async () => {
            setLoadingCustomers(true);
            setCustomerError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/_api/customers`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) {
                    const message = await response.text();
                    throw new Error(message || "Failed to load customers");
                }
                const data = (await response.json()) as Customer[];
                if (isMounted) {
                    setCustomers(data);
                }
            } catch (err) {
                if (isMounted) {
                    const message = err instanceof Error ? err.message : "Failed to load customers";
                    setCustomerError(message);
                }
            } finally {
                if (isMounted) {
                    setLoadingCustomers(false);
                }
            }
        };

        fetchCustomers();

        return () => {
            isMounted = false;
        };
    }, [token]);

    // Filter customers based on search
    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(customerSearch.toLowerCase())
        );
    }, [customerSearch, customers]);

    // Get selected customer details
    const selectedCustomerDetails = useMemo(() => {
        return customers.find(c => c.id === selectedCustomer);
    }, [selectedCustomer]);

    const createOrder = async () => {
        if (!selectedCustomer || cart.length === 0 || !token) return;

        setOrderError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/_api/orders`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    customer_id: selectedCustomer,
                    order_date: orderDate,
                    payment_type: paymentType,
                    remark,
                    items: cart.map((item) => ({
                        product_id: item.id,
                        quantity: item.quantity,
                        unit_price: String(item.customPrice ?? item.price),
                    })),
                }),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Failed to create order");
            }

            clearCart();
            setRemark("");
            router.push('/salesperson/products');
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create order";
            setOrderError(message);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFCDC9] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
                        <p className="text-gray-600 mt-1">Review your order and select customer</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Order Receipt Section */}
                    <div className="lg:col-span-1">
                        <Card className="bg-white">
                            <CardHeader>
                                <h2 className="text-lg font-semibold text-gray-900">Order Receipt</h2>
                            </CardHeader>
                            <CardContent>
                                {/* Customer Selection */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Customer
                                    </label>
                                    <div className="relative" ref={customerDropdownRef}>
                                        <Input
                                            placeholder="Search customers..."
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerDropdown(true);
                                            }}
                                            onFocus={() => setShowCustomerDropdown(true)}
                                            className="w-full text-black font-medium"
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
                                                                setSelectedCustomer(customer.id);
                                                                setCustomerSearch(customer.name);
                                                                setShowCustomerDropdown(false);
                                                            }}
                                                            className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                                        >
                                                            <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                                                            <div className="text-xs text-gray-700">{customer.phone_number}</div>
                                                            <div className="text-xs text-gray-600 truncate">{customer.address}</div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected Customer Display */}
                                    {selectedCustomerDetails && (
                                        <div className="mt-2 p-2 bg-pink-50 border border-pink-200 rounded-md">
                                            <div className="text-sm font-medium text-gray-900">{selectedCustomerDetails.name}</div>
                                            <div className="text-xs text-gray-800">{selectedCustomerDetails.phone_number}</div>
                                            <div className="text-xs text-gray-700 truncate">{selectedCustomerDetails.address}</div>
                                        </div>
                                    )}
                                    {customerError && (
                                        <div className="mt-2 text-sm text-red-600">
                                            {customerError}
                                        </div>
                                    )}
                                </div>

                                {/* Voucher Date Selection */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Voucher Date
                                    </label>
                                    <Input
                                        type="date"
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                        className="w-full h-10 text-black font-medium"
                                    />
                                </div>

                                {/* Cart Summary */}
                                {cart.length > 0 && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="space-y-2 text-sm mb-4">
                                            <div className="flex justify-between">
                                                <span className="text-gray-800">Subtotal ({cartSummary.itemCount} items)</span>
                                                <span className="font-medium text-black">{formatCurrency(cartSummary.subtotal)}</span>
                                            </div>
                                            <div className="border-t border-gray-300 pt-2">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-gray-900">Total</span>
                                                    <span className="font-bold text-lg text-black">{formatCurrency(cartSummary.total)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Button
                                                onClick={createOrder}
                                                disabled={!selectedCustomer || cart.length === 0}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                Create Order
                                            </Button>
                                            {orderError && (
                                                <div className="text-sm text-red-600">
                                                    {orderError}
                                                </div>
                                            )}
                                            <Button
                                                onClick={clearCart}
                                                variant="outline"
                                                className="w-full"
                                            >
                                                Clear Cart
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cart Items Section */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Cart Items ({cart.length})
                                    </h2>
                                    <Button
                                        onClick={() => router.push('/salesperson/products')}
                                        className="bg-pink-600 hover:bg-pink-700 text-white"
                                    >
                                        Add More Products
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {cart.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6H19" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                                        <p className="text-gray-600 mb-4">Add some products to get started</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {cart.map((item, index) => (
                                            <div key={`${item.id}-${item.unit}-${index}`} className="bg-gray-50 rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                                                            {item.name}
                                                        </h4>
                                                        <div className="flex items-center gap-4 text-sm text-gray-700 mb-2">
                                                            <span>
                                                                Quantity: <span className="text-black font-semibold">{item.quantity}</span> {item.unit}
                                                            </span>
                                                            <span>
                                                                Price: <span className="text-black font-semibold">{formatCurrency(item.customPrice || item.price)}</span>
                                                                {item.customPrice && (
                                                                    <span className="ml-1 text-orange-800 font-medium">(Custom Price)</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        {item.customPrice && (
                                                            <div className="text-sm text-gray-600 mb-2">
                                                                Original Price: <span className="text-black font-semibold">{formatCurrency(item.price)}</span>
                                                            </div>
                                                        )}
                                                        <div className="text-xl font-bold text-black">
                                                            Total: {formatCurrency(item.total)}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => removeFromCart(index)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="ml-4 text-red-600 border-red-600 hover:bg-red-50"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}