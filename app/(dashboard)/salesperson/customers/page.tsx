"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

type Customer = {
    id: number;
    name: string;
    phone_number: string;
    address: string;
    outstanding_amount: number;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
    }).format(amount);
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

export default function CustomersPage() {
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Add New Customer form state
    const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        shopName: "",
        phoneNumber: "",
        location: ""
    });

    const { data: customers = [], isLoading: loading, error: queryError, dataUpdatedAt } = useQuery({
        queryKey: ["sp-customers"],
        queryFn: () => apiFetch<Customer[]>("/customers", { token }),
        enabled: !!token,
    });
    const error = fetchError ?? (queryError?.message ?? null);
    const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

    const handleAddCustomer = async () => {
        if (!token) {
            return;
        }

        try {
            await apiFetch("/customers", {
                method: "POST",
                token,
                body: {
                    name: newCustomer.shopName,
                    phone_number: newCustomer.phoneNumber,
                    address: newCustomer.location,
                    status: "ACTIVE",
                },
            });

            queryClient.invalidateQueries({ queryKey: ["sp-customers"] });
            setNewCustomer({ shopName: "", phoneNumber: "", location: "" });
            setShowAddCustomerForm(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create customer";
            setFetchError(message);
        }
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => {
            const q = searchTerm.toLowerCase();
            return (
                customer.name.toLowerCase().includes(q) ||
                String(customer.id).includes(q) ||
                customer.phone_number.toLowerCase().includes(q)
            );
        });
    }, [customers, searchTerm]);

    const customerStats = useMemo(() => {
        const total = customers.length;
        const totalOutstanding = customers.reduce((sum, customer) => sum + customer.outstanding_amount, 0);

        return { total, totalOutstanding };
    }, [customers]);

    return (
        <div className="min-h-screen bg-[#FFCDC9] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                        <p className="text-gray-500 mt-1">Manage and view customer information</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            size="md"
                            className="bg-pink-600 hover:bg-pink-700 text-white"
                            onClick={() => setShowAddCustomerForm(true)}
                        >
                            Add New Customer
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <Card className="bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Total Outstanding to Collect</div>
                            <div className={`text-3xl font-bold ${getOutstandingColor(customerStats.totalOutstanding)}`}>
                                {formatCurrency(customerStats.totalOutstanding)}
                            </div>
                            {lastUpdated && (
                                <div className="mt-2 text-xs text-gray-400">
                                    Last updated {lastUpdated.toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                            <div>From {customerStats.total} customers</div>
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
                                        placeholder="Search by ID, name, or contact"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-10"
                                    />
                                </div>
                            </div>
                        </div>
                        {error && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading customers...</div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No customers found matching your criteria.
                            </div>
                        ) : (
                            <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                                <table className="w-full border-collapse text-sm">
                                    <thead className="bg-blue-600 text-white">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-bold border-r border-blue-500">CustomerID</th>
                                            <th className="text-left py-3 px-4 font-bold border-r border-blue-500">Customer Name</th>
                                            <th className="text-left py-3 px-4 font-bold border-r border-blue-500">Contact</th>
                                            <th className="text-left py-3 px-4 font-bold border-r border-blue-500">Address</th>
                                            <th className="text-center py-3 px-4 font-bold">Total Outstanding</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((customer, index) => (
                                            <tr key={customer.id} className={`border-b border-gray-300 ${index % 2 === 0 ? "bg-blue-50 hover:bg-blue-100" : "bg-white hover:bg-gray-50"
                                                } transition-colors`}>
                                                <td className="py-3 px-4 text-gray-900 font-medium border-r border-gray-300">
                                                    {customer.id}
                                                </td>
                                                <td className="py-3 px-4 text-gray-900 font-semibold border-r border-gray-300">
                                                    {customer.name}
                                                </td>
                                                <td className="py-3 px-4 text-gray-900 font-medium border-r border-gray-300">
                                                    {customer.phone_number}
                                                </td>
                                                <td className="py-3 px-4 text-gray-700 border-r border-gray-300">
                                                    {customer.address}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className={`font-bold ${customer.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {formatCurrency(customer.outstanding_amount)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>

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
                                            onChange={(e) => setNewCustomer({ ...newCustomer, shopName: e.target.value })}
                                            placeholder="Enter shop name"
                                            className="w-full text-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number
                                        </label>
                                        <Input
                                            type="tel"
                                            value={newCustomer.phoneNumber}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
                                            placeholder="Enter phone number"
                                            className="w-full text-black"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Location
                                        </label>
                                        <Input
                                            type="text"
                                            value={newCustomer.location}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, location: e.target.value })}
                                            placeholder="Enter location"
                                            className="w-full text-black"
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