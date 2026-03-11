"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatId, formatThaiDate } from "@/lib/utils";

interface OrderDetail {
    id: number;
    created_at: string;
    total_amount: string | number;
    status: string;
    customer: { id: number; name: string; phone_number: string };
    salesperson: { id: number; username: string } | null;
    loan: {
        id: number;
        original_amount: string | number;
        remaining_amount: string | number;
        status: string;
    } | null;
    items: {
        id: number;
        quantity: number;
        unit_price: string | number;
        product: { name: string; category: string };
    }[];
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string) {
    return formatThaiDate(dateString);
}

export default function OutstandingDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { token } = useAuth();

    const { data: order = null, isLoading: loading, error: queryError } = useQuery({
        queryKey: ["order", params.id],
        queryFn: () => apiFetch<OrderDetail>(`/orders/${params.id}`, { token }),
        enabled: !!token && !!params.id,
    });
    const error = queryError?.message ?? null;

    if (loading) {
        return (
            <div className="p-6">
                <div className="max-w-5xl mx-auto text-center py-12 text-gray-500">
                    Loading order...
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="p-6">
                <div className="max-w-5xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {error ?? "Order not found"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Go Back
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const remaining = Number(order.loan?.remaining_amount ?? 0);
    const paid =
        Number(order.loan?.original_amount ?? order.total_amount) - remaining;

    return (
        <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                    >
                        &larr; Back
                    </Button>
                    <h1 className="text-xl font-semibold text-gray-900">
                        Order {formatId('ORD', order.id)}
                    </h1>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                            <div className="grid grid-cols-[80px_1fr] gap-y-2 text-sm text-gray-600">
                                <span>Date:</span>
                                <span className="text-gray-900">
                                    {formatDate(order.created_at)}
                                </span>
                                <span>Staff:</span>
                                <span className="text-gray-900">
                                    {order.salesperson?.username ?? "-"}
                                </span>
                                <span>Customer:</span>
                                <span className="text-gray-900">
                                    {order.customer.name}
                                </span>
                                <span>Phone:</span>
                                <span className="text-gray-900">
                                    {order.customer.phone_number}
                                </span>
                            </div>
                            <div className="text-right">
                                <span
                                    className={`inline-block px-3 py-1 text-xs font-bold rounded border ${remaining === 0 ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}
                                >
                                    {remaining === 0 ? "PAID" : "UNPAID"}
                                </span>
                                <div className="mt-3 text-2xl font-bold text-gray-900">
                                    {formatCurrency(
                                        Number(order.total_amount)
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Items Ordered
                    </h2>
                    <div className="mt-4 border-2 border-blue-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="py-3 px-4 text-left">No.</th>
                                    <th className="py-3 px-4 text-left">
                                        Product
                                    </th>
                                    <th className="py-3 px-4 text-left">
                                        Category
                                    </th>
                                    <th className="py-3 px-4 text-center">
                                        Qty
                                    </th>
                                    <th className="py-3 px-4 text-center">
                                        Unit Price
                                    </th>
                                    <th className="py-3 px-4 text-right">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-blue-50">
                                {order.items.map((item, i) => (
                                    <tr
                                        key={item.id}
                                        className="border-t border-blue-200"
                                    >
                                        <td className="py-3 px-4 text-gray-900">
                                            {i + 1}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-gray-900">
                                            {item.product.name}
                                        </td>
                                        <td className="py-3 px-4 text-gray-700">
                                            {item.product.category}
                                        </td>
                                        <td className="py-3 px-4 text-center text-gray-900">
                                            {item.quantity}
                                        </td>
                                        <td className="py-3 px-4 text-center text-gray-900">
                                            {formatCurrency(
                                                Number(item.unit_price)
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                                            {formatCurrency(
                                                item.quantity *
                                                Number(item.unit_price)
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <Card>
                    <CardContent className="pt-6 space-y-3 text-sm text-gray-700">
                        <div className="flex justify-between">
                            <span>Total:</span>
                            <span className="font-semibold text-gray-900">
                                {formatCurrency(Number(order.total_amount))}
                            </span>
                        </div>
                        {order.loan && (
                            <>
                                <div className="flex justify-between">
                                    <span>Loan Remaining:</span>
                                    <span className="font-semibold text-red-600">
                                        {formatCurrency(remaining)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Paid:</span>
                                    <span className="font-semibold text-green-600">
                                        {formatCurrency(paid)}
                                    </span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
