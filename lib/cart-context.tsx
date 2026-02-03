"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
    id: string;
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
    addToCart: (productId: string, quantity: number, unit: string, customPrice?: number, productName?: string, productPrice?: number) => void;
    removeFromCart: (index: number) => void;
    clearCart: () => void;
    setSelectedCustomer: (customerId: string) => void;
    setCustomerSearch: (search: string) => void;
    setOrderDate: (date: string) => void;
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

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem('salesperson-cart');
        const savedCustomer = localStorage.getItem('salesperson-selected-customer');
        const savedCustomerSearch = localStorage.getItem('salesperson-customer-search');
        const savedOrderDate = localStorage.getItem('salesperson-order-date');
        
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
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('salesperson-cart', JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        localStorage.setItem('salesperson-selected-customer', selectedCustomer);
    }, [selectedCustomer]);

    useEffect(() => {
        localStorage.setItem('salesperson-customer-search', customerSearch);
    }, [customerSearch]);

    useEffect(() => {
        localStorage.setItem('salesperson-order-date', orderDate);
    }, [orderDate]);

    const addToCart = (productId: string, quantity: number, unit: string, customPrice?: number, productName?: string, productPrice?: number) => {
        if (!productName || !productPrice) return;

        const finalPrice = customPrice !== undefined ? customPrice : productPrice;
        const total = quantity * finalPrice;

        const newItem: CartItem = {
            id: productId,
            name: productName,
            price: productPrice,
            customPrice,
            quantity,
            unit,
            total
        };

        setCart(prevCart => [...prevCart, newItem]);
    };

    const removeFromCart = (index: number) => {
        setCart(prevCart => prevCart.filter((_, i) => i !== index));
    };

    const clearCart = () => {
        setCart([]);
        setSelectedCustomer("");
        setCustomerSearch("");
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
                addToCart,
                removeFromCart,
                clearCart,
                setSelectedCustomer,
                setCustomerSearch,
                setOrderDate,
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