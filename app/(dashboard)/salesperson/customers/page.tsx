"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Mock customer data
const mockCustomers = [
    {
        id: "1",
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1 (555) 123-4567",
        totalOrders: 12,
        totalSpent: 2450.00,
        lastOrder: "2024-12-20",
        status: "Active",
        location: "New York, NY",
        joinedDate: "2023-06-15",
        todayPurchase: 125.50,
        outstanding: 245.00
    },
    {
        id: "2", 
        name: "Michael Chen",
        email: "michael.chen@email.com",
        phone: "+1 (555) 987-6543",
        totalOrders: 8,
        totalSpent: 1890.00,
        lastOrder: "2024-12-18",
        status: "Active",
        location: "Los Angeles, CA",
        joinedDate: "2023-08-22",
        todayPurchase: 0.00,
        outstanding: 189.00
    },

    {
        id: "4",
        name: "James Wilson",
        email: "james.wilson@email.com",
        phone: "+1 (555) 321-0987",
        totalOrders: 5,
        totalSpent: 850.00,
        lastOrder: "2024-12-15",
        status: "Active",
        location: "Houston, TX",
        joinedDate: "2023-11-05",
        todayPurchase: 85.25,
        outstanding: 0.00
    },
    {
        id: "5",
        name: "Lisa Rodriguez",
        email: "lisa.rodriguez@email.com",
        phone: "+1 (555) 654-3210",
        totalOrders: 3,
        totalSpent: 420.00,
        lastOrder: "2024-12-10",
        status: "New",
        location: "Phoenix, AZ",
        joinedDate: "2024-01-20",
        todayPurchase: 0.00,
        outstanding: 42.00
    },

    {
        id: "7",
        name: "Amanda Thompson",
        email: "amanda.thompson@email.com",
        phone: "+1 (555) 147-2580",
        totalOrders: 1,
        totalSpent: 125.00,
        lastOrder: "2024-11-28",
        status: "Inactive",
        location: "Denver, CO",
        joinedDate: "2024-02-14",
        todayPurchase: 0.00,
        outstanding: 125.00
    },
    {
        id: "8",
        name: "Robert Martinez",
        email: "robert.martinez@email.com",
        phone: "+1 (555) 369-2580",
        totalOrders: 7,
        totalSpent: 1650.00,
        lastOrder: "2024-12-19",
        status: "Active",
        location: "Miami, FL",
        joinedDate: "2023-09-18",
        todayPurchase: 156.30,
        outstanding: 165.00
    }
];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK"
    }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
};

const getOutstandingColor = (amount: number) => {
    if (amount > 1000000) {
        return "text-red-600";
    }
    if (amount <= 10000) {
        return "text-green-600";
    }
    return "text-orange-600";
};

const getStatusColor = (status: string) => {
    switch (status) {
        case "Active":
            return "bg-green-100 text-green-800";
        case "New":
            return "bg-blue-100 text-blue-800";
        case "Inactive":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    
    // Add New Customer form state
    const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        shopName: "",
        phoneNumber: "",
        location: ""
    });

    const handleAddCustomer = () => {
        // Create new customer object with all required fields
        const customerToAdd = {
            id: Date.now().toString(), // Simple ID generation
            name: newCustomer.shopName, // Using shopName as customer name
            email: "", // Empty email for now
            phone: newCustomer.phoneNumber,
            totalOrders: 0,
            totalSpent: 0,
            lastOrder: "",
            status: "Active",
            location: newCustomer.location,
            joinedDate: new Date().toISOString().split('T')[0], // Today's date
            todayPurchase: 0,
            outstanding: 0 // New customers start with no outstanding amount
        };
        
        // Add to customers array (in a real app, this would be an API call)
        mockCustomers.push(customerToAdd);
        
        // Reset form
        setNewCustomer({
            shopName: "",
            phoneNumber: "",
            location: ""
        });
        
        // Close form
        setShowAddCustomerForm(false);
    };

    const filteredCustomers = useMemo(() => {
        return mockCustomers.filter(customer => {
            const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                customer.phone.includes(searchTerm);
            
            const matchesStatus = statusFilter === "All" || customer.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, statusFilter]);

    const customerStats = useMemo(() => {
        const total = mockCustomers.length;
        const active = mockCustomers.filter(c => c.status === "Active").length;
        const newCustomers = mockCustomers.filter(c => c.status === "New").length;
        const inactive = mockCustomers.filter(c => c.status === "Inactive").length;
        const totalOutstanding = mockCustomers.reduce((sum, customer) => sum + customer.outstanding, 0);

        return { total, active, newCustomers, inactive, totalOutstanding };
    }, []);
    
    return (
        <div className="min-h-screen bg-[#FFCDC9] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                        <p className="text-gray-500 mt-1">Manage and view customer information</p>
                    </div>
                    <Button 
                        size="md"
                        className="bg-pink-600 hover:bg-pink-700 text-white"
                        onClick={() => setShowAddCustomerForm(true)}
                    >
                        Add New Customer
                    </Button>
                </div>

                {/* Stats Cards */}
                <Card className="bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Total Outstanding to Collect</div>
                            <div className={`text-3xl font-bold ${getOutstandingColor(customerStats.totalOutstanding)}`}>
                                {formatCurrency(customerStats.totalOutstanding)}
                            </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                            <div>From {customerStats.total} customers</div>
                            <div>{customerStats.active} Active • {customerStats.inactive} Inactive</div>
                        </div>
                    </div>
                </Card>

                {/* Customer List */}
                <Card className="bg-white">
                    <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Customer List ({filteredCustomers.length})
                            </h2>
                            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                <div className="flex-1 min-w-[260px]">
                                    <Input
                                        type="text"
                                        placeholder="Search by name"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-10"
                                    />
                                </div>
                                <div className="sm:w-48">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm"
                                    >
                                        <option value="All">All Status</option>
                                        <option value="Active">Active</option>
                                        <option value="New">New</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {filteredCustomers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No customers found matching your criteria.
                            </div>
                        ) : (
                            <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                <table className="w-full border-collapse text-sm">
                                    <thead className="bg-blue-600 text-white">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-bold border-r border-blue-500">Customer</th>
                                            <th className="text-left py-3 px-4 font-bold border-r border-blue-500">Contact</th>
                                            <th className="text-center py-3 px-4 font-bold border-r border-blue-500">Orders</th>
                                            <th className="text-center py-3 px-4 font-bold border-r border-blue-500">Status</th>
                                            <th className="text-center py-3 px-4 font-bold">Outstanding</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((customer, index) => (
                                            <tr key={customer.id} className={`border-b border-gray-300 ${
                                                index % 2 === 0 ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-gray-50"
                                            } transition-colors`}>
                                                <td className="py-3 px-4 border-r border-gray-300">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{customer.name}</div>
                                                        <div className="text-xs text-gray-600">{customer.location}</div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-gray-900 font-medium border-r border-gray-300">
                                                    {customer.phone}
                                                </td>
                                                <td className="py-3 px-4 text-center font-semibold text-gray-900 border-r border-gray-300">
                                                    {customer.totalOrders}
                                                </td>
                                                <td className="py-3 px-4 text-center border-r border-gray-300">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${
                                                        customer.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        customer.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                        {customer.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className={`font-bold ${customer.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {formatCurrency(customer.outstanding)}
                                                    </div>
                                                    {customer.outstanding > 0 && (
                                                        <div className="text-xs text-red-600 font-medium">Pending</div>
                                                    )}
                                                    {customer.outstanding === 0 && (
                                                        <div className="text-xs text-green-600 font-medium">Paid</div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Customer Detail Modal (placeholder for future implementation) */}
                {selectedCustomer && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <Card className="bg-white max-w-2xl w-full max-h-[90vh] overflow-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Customer Details</h3>
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedCustomer(null)}
                                    >
                                        Close
                                    </Button>
                                </div>
                                <div className="text-gray-600">
                                    Customer detail view will be implemented here.
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Add New Customer Popup */}
                {showAddCustomerForm && (
                    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
                        <Card className="bg-white p-6 w-full max-w-md mx-4">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAddCustomerForm(false)}
                                    >
                                        ✕
                                    </Button>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Customer Shop Name
                                        </label>
                                        <Input
                                            type="text"
                                            value={newCustomer.shopName}
                                            onChange={(e) => setNewCustomer({...newCustomer, shopName: e.target.value})}
                                            placeholder="Enter shop name"
                                            className="w-full"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number
                                        </label>
                                        <Input
                                            type="tel"
                                            value={newCustomer.phoneNumber}
                                            onChange={(e) => setNewCustomer({...newCustomer, phoneNumber: e.target.value})}
                                            placeholder="Enter phone number"
                                            className="w-full"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Location
                                        </label>
                                        <Input
                                            type="text"
                                            value={newCustomer.location}
                                            onChange={(e) => setNewCustomer({...newCustomer, location: e.target.value})}
                                            placeholder="Enter location"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowAddCustomerForm(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleAddCustomer}
                                        className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
                                        disabled={!newCustomer.shopName || !newCustomer.phoneNumber || !newCustomer.location}
                                    >
                                        Add Customer
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}