"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";

// Mock data for orders - same as dashboard
const mockOrders = [
    // Current date orders (December 2025) 
    { id: "ORD-001", customer: "Beauty Store A", amount: 125000, status: "completed", date: "2025-12-05", time: "10:30 AM", items: 5, salesperson: "Thiri" },

    { id: "ORD-003", customer: "Modern Salon", amount: 156000, status: "processing", date: "2025-12-05", time: "04:20 PM", items: 4, salesperson: "Thiri" },
    
    // Recent past dates (December 2025)
    { id: "ORD-004", customer: "Salon C", amount: 234000, status: "processing", date: "2025-12-04", time: "11:45 AM", items: 8, salesperson: "Thiri" },
    { id: "ORD-005", customer: "Retail Store D", amount: 156000, status: "completed", date: "2025-12-04", time: "04:20 PM", items: 6, salesperson: "Thiri" },
    { id: "ORD-006", customer: "Beauty Outlet E", amount: 78000, status: "cancelled", date: "2025-12-03", time: "09:00 AM", items: 4, salesperson: "Thiri" },
    { id: "ORD-007", customer: "Makeup Corner F", amount: 189000, status: "completed", date: "2025-12-02", time: "03:30 PM", items: 7, salesperson: "Thiri" },
    { id: "ORD-008", customer: "Glamour Shop G", amount: 245000, status: "completed", date: "2025-12-01", time: "11:00 AM", items: 5, salesperson: "Thiri" },
    
    // March 2025 orders
    { id: "ORD-009", customer: "Glam Studio G", amount: 195000, status: "completed", date: "2025-03-08", time: "01:15 PM", items: 6, salesperson: "Thiri" },
    { id: "ORD-010", customer: "Style Shop H", amount: 267000, status: "completed", date: "2025-03-08", time: "05:45 PM", items: 9, salesperson: "Thiri" },

    { id: "ORD-012", customer: "Charm Boutique J", amount: 198000, status: "cancelled", date: "2025-03-06", time: "02:30 PM", items: 6, salesperson: "Thiri" },
    { id: "ORD-013", customer: "Elite Beauty K", amount: 445000, status: "completed", date: "2025-03-05", time: "11:15 AM", items: 8, salesperson: "Thiri" },
    
    // November 2024 orders
    { id: "ORD-014", customer: "Beauty Central M", amount: 178000, status: "completed", date: "2024-11-30", time: "09:30 AM", items: 5, salesperson: "Thiri" },
    { id: "ORD-015", customer: "Glamour Point N", amount: 256000, status: "completed", date: "2024-11-29", time: "01:45 PM", items: 7, salesperson: "Thiri" },

    
    // October 2024 orders
    { id: "ORD-017", customer: "Beauty World P", amount: 167000, status: "completed", date: "2024-10-15", time: "10:15 AM", items: 4, salesperson: "Thiri" },
    { id: "ORD-018", customer: "Cosmetic Hub Q", amount: 298000, status: "completed", date: "2024-10-15", time: "02:30 PM", items: 8, salesperson: "Thiri" },

];

// Mock data for detailed order information (voucher details)
const mockOrderDetails: Record<string, {
    id: string;
    customer: string;
    customerPhone: string;
    customerAddress: string;
    amount: number;
    status: string;
    date: string;
    time: string;
    items: Array<{
        id: string;
        name: string;
        category: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    salesperson: string;
    paymentMethod: string;
    discount: number;
    tax: number;
    notes?: string;
}> = {
    "ORD-001": {
        id: "ORD-001",
        customer: "Beauty Store A",
        customerPhone: "+95 9 123 456 789",
        customerAddress: "No. 123, Main Street, Yangon",
        amount: 125000,
        status: "completed",
        date: "2025-12-05",
        time: "10:30 AM",
        salesperson: "Thiri",
        paymentMethod: "Cash",
        discount: 5000,
        tax: 0,
        items: [
            { id: "P001", name: "NYK Lipstick - Red Passion", category: "Lipstick", quantity: 3, unitPrice: 15000, total: 45000 },
            { id: "P002", name: "NYK Foundation - Natural Beige", category: "Foundation", quantity: 2, unitPrice: 25000, total: 50000 },
            { id: "P003", name: "NYK Mascara - Volume Max", category: "Mascara", quantity: 1, unitPrice: 18000, total: 18000 },
            { id: "P004", name: "NYK Eyeshadow Palette - Sunset", category: "Eyeshadow", quantity: 1, unitPrice: 35000, total: 35000 },
            { id: "P005", name: "NYK Blush - Pink Glow", category: "Blush", quantity: 1, unitPrice: 12000, total: 12000 }
        ],
        notes: "Customer requested express delivery"
    },
    "ORD-003": {
        id: "ORD-003",
        customer: "Modern Salon",
        customerPhone: "+95 9 987 654 321",
        customerAddress: "No. 456, Beauty Lane, Mandalay",
        amount: 156000,
        status: "processing",
        date: "2025-12-05",
        time: "04:20 PM",
        salesperson: "Thiri",
        paymentMethod: "Bank Transfer",
        discount: 10000,
        tax: 0,
        items: [
            { id: "P006", name: "NYK Professional Concealer", category: "Concealer", quantity: 2, unitPrice: 20000, total: 40000 },
            { id: "P007", name: "NYK Setting Powder - Translucent", category: "Powder", quantity: 3, unitPrice: 22000, total: 66000 },
            { id: "P008", name: "NYK Eyeliner - Waterproof Black", category: "Eyeliner", quantity: 2, unitPrice: 14000, total: 28000 },
            { id: "P009", name: "NYK Lip Gloss - Crystal Clear", category: "Lip Gloss", quantity: 2, unitPrice: 16000, total: 32000 }
        ]
    },
    "ORD-004": {
        id: "ORD-004",
        customer: "Salon C",
        customerPhone: "+95 9 555 666 777",
        customerAddress: "No. 789, Beauty Plaza, Yangon",
        amount: 234000,
        status: "processing",
        date: "2025-12-04",
        time: "11:45 AM",
        salesperson: "Thiri",
        paymentMethod: "Credit Card",
        discount: 15000,
        tax: 0,
        items: [
            { id: "P010", name: "NYK BB Cream - Light", category: "Foundation", quantity: 3, unitPrice: 28000, total: 84000 },
            { id: "P011", name: "NYK Highlighter - Golden Glow", category: "Highlighter", quantity: 2, unitPrice: 32000, total: 64000 },
            { id: "P012", name: "NYK Bronzer - Sun Kissed", category: "Bronzer", quantity: 1, unitPrice: 26000, total: 26000 },
            { id: "P013", name: "NYK Lip Liner - Nude Pink", category: "Lip Liner", quantity: 4, unitPrice: 13000, total: 52000 },
            { id: "P014", name: "NYK Face Primer", category: "Primer", quantity: 1, unitPrice: 23000, total: 23000 }
        ],
        notes: "Bulk order for salon opening"
    },
    "ORD-005": {
        id: "ORD-005",
        customer: "Retail Store D",
        customerPhone: "+95 9 111 222 333",
        customerAddress: "No. 321, Shopping Center, Naypyidaw",
        amount: 156000,
        status: "completed",
        date: "2025-12-04",
        time: "04:20 PM",
        salesperson: "Thiri",
        paymentMethod: "Cash",
        discount: 0,
        tax: 0,
        items: [
            { id: "P015", name: "NYK Nail Polish - Ruby Red", category: "Nail Polish", quantity: 6, unitPrice: 8000, total: 48000 },
            { id: "P016", name: "NYK Makeup Remover", category: "Skincare", quantity: 4, unitPrice: 15000, total: 60000 },
            { id: "P017", name: "NYK Face Mist - Hydrating", category: "Skincare", quantity: 3, unitPrice: 16000, total: 48000 }
        ]
    }
};

const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    processing: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
};

const statusOptions = [
    { value: "all", label: "All Orders" },
    { value: "completed", label: "Completed" },
    { value: "processing", label: "Processing" },
    { value: "cancelled", label: "Cancelled" },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

// Format date for display
function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Get number of days in a month
function getDaysInMonth(year: string, month: string) {
    return new Date(parseInt(year), parseInt(month), 0).getDate();
}

export default function OrdersPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    
    // Date range selection state
    const [fromDate, setFromDate] = useState("2025-12-01");
    const [toDate, setToDate] = useState("2025-12-05");
    
    // Dialog state for order details
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    
    // Handle view details click
    const handleViewDetails = (orderId: string) => {
        setSelectedOrder(orderId);
        setIsDialogOpen(true);
    };
    
    // Get selected order details
    const orderDetails = selectedOrder ? mockOrderDetails[selectedOrder] : null;

    // Filter and search orders
    const filteredOrders = useMemo(() => {
        return mockOrders.filter((order) => {
            // Date range filter
            const matchesDateRange = order.date >= fromDate && order.date <= toDate;
            
            // Status filter
            const matchesStatus = statusFilter === "all" || order.status === statusFilter;
            
            // Search filter
            const matchesSearch = searchQuery === "" || 
                order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.customer.toLowerCase().includes(searchQuery.toLowerCase());
            
            return matchesDateRange && matchesStatus && matchesSearch;
        });
    }, [fromDate, toDate, searchQuery, statusFilter]);

    // Calculate summary stats
    const orderStats = useMemo(() => {
        const total = mockOrders.length;
        const completed = mockOrders.filter(o => o.status === "completed").length;
        const processing = mockOrders.filter(o => o.status === "processing").length;
        
        return { total, completed, processing };
    }, []);

    // Format date range for display
    const formatDateRange = (from: string, to: string) => {
        if (from === to) {
            return formatDate(from);
        }
        return `${formatDate(from)} - ${formatDate(to)}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                    <p className="text-gray-500 mt-1">
                        Viewing orders for {formatDateRange(fromDate, toDate)}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        size="lg"
                        className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                        onClick={() => router.push("/salesperson/products")}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Order
                    </Button>
                </div>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>Filter and search through your orders</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Date Range Filter */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date Range
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <label htmlFor="from-date" className="text-xs text-gray-500 mb-1">
                                    From
                                </label>
                                <input
                                    id="from-date"
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor="to-date" className="text-xs text-gray-500 mb-1">
                                    To
                                </label>
                                <input
                                    id="to-date"
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-40 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                    min={fromDate}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-transparent mb-1">.</label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        const today = new Date().toISOString().split('T')[0];
                                        setFromDate(today);
                                        setToDate(today);
                                    }}
                                    className="text-xs h-10"
                                >
                                    Today
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Found {filteredOrders.length} orders for {formatDateRange(fromDate, toDate)}
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        {/* Search */}
                        <div className="flex-1">
                            <Input
                                placeholder="Search by Order ID or Customer name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10"
                            />
                        </div>
                        
                        {/* Status Filter */}
                        <div className="sm:w-48">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Mobile: Card layout */}
                    <div className="block sm:hidden space-y-4">
                        {filteredOrders.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No orders found matching your criteria.</p>
                            </div>
                        ) : (
                            filteredOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">{order.id}</span>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}
                                        >
                                            {order.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{order.customer}</p>
                                        <p className="text-sm text-gray-500">{order.items} items</p>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div>
                                            <p className="text-gray-500">{order.date}</p>
                                            <p className="text-gray-500">{order.time}</p>
                                        </div>
                                        <span className="font-semibold text-gray-900 text-lg">
                                            {formatCurrency(order.amount)}
                                        </span>
                                    </div>
                                    <div className="pt-3">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full"
                                            onClick={() => handleViewDetails(order.id)}
                                        >
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden sm:block">
                        <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-blue-600 text-white">
                                    <tr>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Order ID
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Customer
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Date
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Time
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Amount
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Items
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                            Status
                                        </th>
                                        <th className="text-center py-3 px-4 font-bold">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-8 text-gray-500">
                                                No orders found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order, index) => (
                                            <tr
                                                key={order.id}
                                                className={`border-b border-gray-300 ${
                                                    index % 2 === 0 ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-gray-50"
                                                } transition-colors`}
                                            >
                                                <td className="py-3 px-4 text-center font-semibold text-gray-900 border-r border-gray-300">
                                                    {order.id}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {order.customer}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {order.date}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {order.time}
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-gray-900 border-r border-gray-300">
                                                    {formatCurrency(order.amount)}
                                                </td>
                                                <td className="py-3 px-4 text-center font-medium text-gray-900 border-r border-gray-300">
                                                    {order.items}
                                                </td>
                                                <td className="py-3 px-4 text-center border-r border-gray-300">
                                                    <span
                                                        className={`px-2 py-1 text-xs font-bold rounded border ${
                                                            order.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            order.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            order.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                            'bg-red-50 text-red-700 border-red-200'
                                                        }`}
                                                    >
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => handleViewDetails(order.id)}
                                                        className="text-xs"
                                                    >
                                                        View Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Order Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {/* NYK Cosmetics Logo */}
                                <div className="flex items-center space-x-3">
                                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                        NYK
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">NYK Cosmetics</h2>
                                        <p className="text-base text-gray-600">Beauty & Cosmetics</p>
                                    </div>
                                </div>
                            </div>
                            <DialogClose onClick={() => setIsDialogOpen(false)}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </DialogClose>
                        </div>
                    </DialogHeader>
                    
                    {orderDetails && (
                        <div className="p-6 space-y-6">
                            {/* Order Header */}
                            <div className="border border-gray-200 rounded p-4 bg-white">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                                            Order #{orderDetails.id}
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex">
                                                <span className="w-24 text-gray-600">Date:</span>
                                                <span className="text-gray-900">{formatDate(orderDetails.date)}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-24 text-gray-600">Time:</span>
                                                <span className="text-gray-900">{orderDetails.time}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-24 text-gray-600">Staff:</span>
                                                <span className="text-gray-900">{orderDetails.salesperson}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-24 text-gray-600">Payment:</span>
                                                <span className="text-gray-900">{orderDetails.paymentMethod}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="mb-3">
                                            <span className={`px-3 py-1 text-sm font-medium rounded border ${
                                                orderDetails.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                orderDetails.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                                {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
                                            </span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(orderDetails.amount)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Customer Information */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                    Customer Details
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex">
                                            <span className="w-16 text-gray-600">Name:</span>
                                            <span className="text-gray-900 font-medium">{orderDetails.customer}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-gray-600">Phone:</span>
                                            <span className="text-gray-900">{orderDetails.customerPhone}</span>
                                        </div>
                                        <div className="flex">
                                            <span className="w-16 text-gray-600">Address:</span>
                                            <span className="text-gray-900">{orderDetails.customerAddress}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Order Items */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                    Items Ordered
                                </h4>
                                <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-blue-600 text-white">
                                            <tr>
                                                <th className="text-center py-3 px-4 font-bold border-r border-blue-500 w-12">
                                                    NO.
                                                </th>
                                                <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                                    Product
                                                </th>
                                                <th className="text-center py-3 px-4 font-bold border-r border-blue-500">
                                                    Category
                                                </th>
                                                <th className="text-center py-3 px-4 font-bold border-r border-blue-500 w-16">
                                                    Qty
                                                </th>
                                                <th className="text-center py-3 px-4 font-bold border-r border-blue-500 w-24">
                                                    Unit Price
                                                </th>
                                                <th className="text-center py-3 px-4 font-bold w-28">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orderDetails.items.map((item, index) => (
                                                <tr key={item.id} className={`border-b border-gray-300 ${
                                                    index % 2 === 0 
                                                        ? "bg-blue-50 hover:bg-blue-100" 
                                                        : "bg-white hover:bg-gray-50"
                                                }`}>
                                                    <td className="py-3 px-4 text-center text-gray-800 font-semibold border-r border-gray-300">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-3 px-4 border-r border-gray-300">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                                            <p className="text-xs text-gray-600 font-medium">{item.id}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-700 font-medium border-r border-gray-300">
                                                        {item.category}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-gray-900 font-semibold border-r border-gray-300">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-gray-900 font-medium border-r border-gray-300">
                                                        {formatCurrency(item.unitPrice)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                                                        {formatCurrency(item.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Order Summary */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                    Payment Summary
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Payment Details */}
                                    <div className="border border-gray-200 rounded p-4 bg-white">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Subtotal:</span>
                                                <span className="text-gray-900 font-medium">
                                                    {formatCurrency(orderDetails.items.reduce((sum, item) => sum + item.total, 0))}
                                                </span>
                                            </div>
                                            {orderDetails.discount > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Discount:</span>
                                                    <span className="text-red-600">-{formatCurrency(orderDetails.discount)}</span>
                                                </div>
                                            )}
                                            {orderDetails.tax > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Tax:</span>
                                                    <span className="text-gray-900">{formatCurrency(orderDetails.tax)}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-gray-300 pt-2 mt-3">
                                                <div className="flex justify-between text-base font-bold">
                                                    <span className="text-gray-900">Total Amount:</span>
                                                    <span className="text-gray-900">{formatCurrency(orderDetails.amount)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Customer Signature */}
                                    <div className="border border-gray-200 rounded p-4 bg-white">
                                        <div className="h-full flex flex-col">
                                            <h5 className="text-sm font-medium text-gray-700 mb-2">Customer Signature</h5>
                                            <div className="flex-1 min-h-[80px] border border-gray-300 rounded bg-gray-50 mb-3">
                                                {/* Signature area */}
                                            </div>
                                            <div className="text-xs text-gray-500 text-center">
                                                Signature confirms receipt of goods
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Notes */}
                            {orderDetails.notes && (
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                                        Special Instructions
                                    </h4>
                                    <div className="border border-gray-200 rounded p-4 bg-gray-50">
                                        <p className="text-sm text-gray-700">{orderDetails.notes}</p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="pt-6 border-t border-gray-200" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}