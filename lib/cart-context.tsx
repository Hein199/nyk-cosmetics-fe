"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
    id: number;
    name: string;
    price: number;
    customPrice?: number;
    quantity: number;
    unit: string;
    total: number;
}

interface CartContextType {
    cart: CartItem[];
    selectedCustomer: string;
    customerSearch: string;
    orderDate: string;
    paymentType: string;
    remark: string;
    addToCart: (productId: number, quantity: number, unit: string, customPrice?: number, productName?: string, productPrice?: number) => void;
    removeFromCart: (index: number) => void;
    clearCart: () => void;
    setSelectedCustomer: (customerId: string) => void;
    setCustomerSearch: (search: string) => void;
    setOrderDate: (date: string) => void;
    setPaymentType: (type: string) => void;
    setRemark: (remark: string) => void;
    cartSummary: {
        subtotal: number;
        total: number;
        itemCount: number;
    };
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [paymentType, setPaymentType] = useState("CASH");
    const [remark, setRemark] = useState("");

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('salesperson-cart');
        const savedCustomer = localStorage.getItem('salesperson-selected-customer');
        const savedCustomerSearch = localStorage.getItem('salesperson-customer-search');
        const savedOrderDate = localStorage.getItem('salesperson-order-date');
        const savedPaymentType = localStorage.getItem('salesperson-payment-type');
        const savedRemark = localStorage.getItem('salesperson-remark');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (error) {
                console.error('Error loading cart from localStorage:', error);
            }
        }

        if (savedCustomer) {
            setSelectedCustomer(savedCustomer);
        }

        if (savedCustomerSearch) {
            setCustomerSearch(savedCustomerSearch);
        }

        if (savedOrderDate) {
            setOrderDate(savedOrderDate);
        }
        if (savedPaymentType) {
            setPaymentType(savedPaymentType);
        }

        if (savedRemark) {
            setRemark(savedRemark);
        }
    }, []);

    // Save all cart state to localStorage whenever any of it changes
    useEffect(() => {
        localStorage.setItem('salesperson-cart', JSON.stringify(cart));
        localStorage.setItem('salesperson-selected-customer', selectedCustomer);
        localStorage.setItem('salesperson-customer-search', customerSearch);
        localStorage.setItem('salesperson-order-date', orderDate);
        localStorage.setItem('salesperson-payment-type', paymentType);
        localStorage.setItem('salesperson-remark', remark);
    }, [cart, selectedCustomer, customerSearch, orderDate, paymentType, remark]);
    const addToCart = (productId: number, quantity: number, unit: string, customPrice?: number, productName?: string, productPrice?: number) => {
        if (!productName || !productPrice) return;

        const finalPrice = customPrice !== undefined ? customPrice : productPrice;

        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(
                (item) => item.id === productId
            );

            if (existingIndex === -1) {
                const newItem: CartItem = {
                    id: productId,
                    name: productName,
                    price: productPrice,
                    customPrice,
                    quantity,
                    unit,
                    total: quantity * finalPrice,
                };
                return [...prevCart, newItem];
            }

            return prevCart.map((item, index) => {
                if (index !== existingIndex) return item;
                const nextQuantity = item.quantity + quantity;
                const nextTotal = nextQuantity * (item.customPrice ?? item.price);
                return {
                    ...item,
                    quantity: nextQuantity,
                    total: nextTotal,
                };
            });
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prevCart => prevCart.filter((_, i) => i !== index));
    };

    const clearCart = () => {
        setCart([]);
        setSelectedCustomer("");
        setCustomerSearch("");
        setRemark("");
    };

    const cartSummary = {
        subtotal: cart.reduce((sum, item) => sum + item.total, 0),
        total: cart.reduce((sum, item) => sum + item.total, 0),
        itemCount: cart.length
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                selectedCustomer,
                customerSearch,
                orderDate,
                paymentType,
                remark,
                addToCart,
                removeFromCart,
                clearCart,
                setSelectedCustomer,
                setCustomerSearch,
                setOrderDate,
                setPaymentType,
                setRemark,
                cartSummary
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}