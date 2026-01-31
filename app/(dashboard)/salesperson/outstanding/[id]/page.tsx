"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockOrderDetails = [
    {
        id: "INV-001",
        date: "2026-01-31",
        time: "17:25",
        staff: "salesperson",
        status: "DELIVERED",
        amount: 31000,
        customer: {
            name: "Alice Kyaw",
            phone: "091111111",
            address: "Yangon",
        },
        items: [
            {
                name: "Rose Lipstick",
                category: "COSMETIC",
                qty: 2,
                unitPrice: 15500,
                total: 31000,
                id: "a9568f71-141b-416c-86ba-112879a45447",
            },
        ],
        subtotal: 31000,
        total: 31000,
    },
    {
        id: "INV-002",
        date: "2026-01-31",
        time: "14:33",
        staff: "salesperson",
        status: "PENDING ADMIN",
        amount: 46000,
        customer: {
            name: "Alice Kyaw",
            phone: "091111111",
            address: "Yangon",
        },
        items: [
            {
                name: "Matte Lipstick",
                category: "COSMETIC",
                qty: 1,
                unitPrice: 46000,
                total: 46000,
                id: "b1f2a3c4-1111-2222-3333-444455556666",
            },
        ],
        subtotal: 46000,
        total: 46000,
    },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default function OutstandingDetailPage() {
    const params = useParams<{ id: string }>();

    const order = useMemo(() => {
        return mockOrderDetails.find((item) => item.id === params.id);
    }, [params.id]);

    if (!order) {
        return (
            <div className="min-h-screen bg-[#FFCDC9] p-6">
                <div className="max-w-5xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order not found</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFCDC9] p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    Order #{order.id}
                                </h1>
                                <div className="mt-4 grid grid-cols-[80px_1fr] gap-y-2 text-sm text-gray-600">
                                    <span>Date:</span>
                                    <span className="text-gray-900">{formatDate(order.date)}</span>
                                    <span>Time:</span>
                                    <span className="text-gray-900">{order.time}</span>
                                    <span>Staff:</span>
                                    <span className="text-gray-900">{order.staff}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="inline-block px-3 py-1 text-xs font-bold rounded border bg-red-50 text-red-600 border-red-200">
                                    {order.status}
                                </span>
                                <div className="mt-3 text-2xl font-bold text-gray-900">
                                    {formatCurrency(order.amount)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
                    <div className="mt-3 border-t border-gray-200 pt-4 text-sm text-gray-700 space-y-2">
                        <div className="grid grid-cols-[80px_1fr]">
                            <span>Name:</span>
                            <span className="text-gray-900">{order.customer.name}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr]">
                            <span>Phone:</span>
                            <span className="text-gray-900">{order.customer.phone}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr]">
                            <span>Address:</span>
                            <span className="text-gray-900">{order.customer.address}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Items Ordered</h2>
                    <div className="mt-4 border-2 border-blue-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="py-3 px-4 text-left">No.</th>
                                    <th className="py-3 px-4 text-left">Product</th>
                                    <th className="py-3 px-4 text-left">Category</th>
                                    <th className="py-3 px-4 text-center">Qty</th>
                                    <th className="py-3 px-4 text-center">Unit Price</th>
                                    <th className="py-3 px-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-blue-50">
                                {order.items.map((item, index) => (
                                    <tr key={item.id} className="border-t border-blue-200">
                                        <td className="py-3 px-4 text-gray-900">{index + 1}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.id}</div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-700">{item.category}</td>
                                        <td className="py-3 px-4 text-center text-gray-900">{item.qty}</td>
                                        <td className="py-3 px-4 text-center text-gray-900">
                                            {formatCurrency(item.unitPrice)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                                            {formatCurrency(item.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Payment Summary</h2>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardContent className="pt-6 space-y-3 text-sm text-gray-700">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-gray-900">
                                    <span>Total:</span>
                                    <span>{formatCurrency(order.total)}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Customer Signature</h3>
                                <div className="h-24 border border-gray-200 rounded-lg bg-gray-50" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
