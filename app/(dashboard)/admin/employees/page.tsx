"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

interface Employee {
    id: number;
    name: string;
    basic_salary: string | number;
    created_at: string;
    salary_records?: SalaryRecord[];
}

interface SalaryRecord {
    id: number;
    employee_id: number;
    basic_salary: string | number;
    bonus_amount: string | number;
    deduction_amount: string | number;
    net_salary: string | number;
    paid_at: string;
    employee?: { name: string };
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

export default function EmployeesPage() {
    const { token } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"employees" | "salaries">("employees");

    // Employee form
    const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
    const [empName, setEmpName] = useState("");
    const [empSalary, setEmpSalary] = useState("");
    const [savingEmp, setSavingEmp] = useState(false);

    // Salary form
    const [isSalaryOpen, setIsSalaryOpen] = useState(false);
    const [salEmployeeId, setSalEmployeeId] = useState("");
    const [salBasic, setSalBasic] = useState("");
    const [salBonus, setSalBonus] = useState("");
    const [salDeduction, setSalDeduction] = useState("");
    const [savingSal, setSavingSal] = useState(false);

    const fetchData = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        setLoading(true);
        try {
            const [emps, sals] = await Promise.all([
                apiFetch<Employee[]>("/employees", { token, signal }),
                apiFetch<SalaryRecord[]>("/salaries", { token, signal }),
            ]);
            setEmployees(emps);
            setSalaryRecords(sals);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            setError(
                err instanceof Error ? err.message : "Failed to load data"
            );
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, [fetchData]);

    const handleCreateEmployee = async () => {
        if (!token || !empName || !empSalary) return;
        setSavingEmp(true);
        setError(null);
        try {
            await apiFetch("/employees", {
                method: "POST",
                token,
                body: { name: empName, basic_salary: empSalary },
            });
            setIsEmployeeOpen(false);
            setEmpName("");
            setEmpSalary("");
            await fetchData();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to create employee"
            );
        } finally {
            setSavingEmp(false);
        }
    };

    const handlePaySalary = async () => {
        if (!token || !salEmployeeId || !salBasic) return;
        setSavingSal(true);
        setError(null);
        try {
            const body: Record<string, string | number> = {
                employee_id: parseInt(salEmployeeId),
                basic_salary: salBasic,
            };
            if (salBonus) body.bonus_amount = salBonus;
            if (salDeduction) body.deduction_amount = salDeduction;
            await apiFetch("/salaries", {
                method: "POST",
                token,
                body,
            });
            setIsSalaryOpen(false);
            setSalEmployeeId("");
            setSalBasic("");
            setSalBonus("");
            setSalDeduction("");
            await fetchData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to pay salary"
            );
        } finally {
            setSavingSal(false);
        }
    };

    const openPaySalary = (emp?: Employee) => {
        setSalEmployeeId(emp?.id ? String(emp.id) : "");
        setSalBasic(emp ? String(emp.basic_salary) : "");
        setSalBonus("");
        setSalDeduction("");
        setIsSalaryOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Employees & Salaries
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Manage employees and salary payments
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => {
                            setEmpName("");
                            setEmpSalary("");
                            setIsEmployeeOpen(true);
                        }}
                        className="bg-pink-600 hover:bg-pink-700 text-white"
                    >
                        + Add Employee
                    </Button>
                    <Button
                        onClick={() => openPaySalary()}
                        variant="outline"
                    >
                        Pay Salary
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    className={`pb-2 px-4 text-sm font-medium border-b-2 ${tab === "employees" ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setTab("employees")}
                >
                    Employees ({employees.length})
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium border-b-2 ${tab === "salaries" ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setTab("salaries")}
                >
                    Salary Records ({salaryRecords.length})
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : tab === "employees" ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Employee List</CardTitle>
                        <CardDescription>
                            {employees.length} employees
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Name
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Basic Salary
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Created
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((emp) => (
                                        <tr
                                            key={emp.id}
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <td className="py-3 px-4 font-medium text-gray-900">
                                                {emp.name}
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-900">
                                                {formatCurrency(
                                                    Number(emp.basic_salary)
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm text-gray-500">
                                                {new Date(
                                                    emp.created_at
                                                ).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        openPaySalary(emp)
                                                    }
                                                >
                                                    Pay Salary
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Salary Records</CardTitle>
                        <CardDescription>
                            {salaryRecords.length} records
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Employee
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Basic
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Bonus
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Deduction
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Net Salary
                                        </th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-white bg-blue-600">
                                            Paid At
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryRecords.map((s) => (
                                        <tr
                                            key={s.id}
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <td className="py-3 px-4 font-medium text-gray-900">
                                                {s.employee?.name ?? `EMP#${String(s.employee_id).padStart(2, '0')}`}
                                            </td>
                                            <td className="py-3 px-4 text-center text-gray-900">
                                                {formatCurrency(
                                                    Number(s.basic_salary)
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center text-green-600">
                                                {Number(s.bonus_amount) > 0
                                                    ? formatCurrency(
                                                        Number(
                                                            s.bonus_amount
                                                        )
                                                    )
                                                    : "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center text-red-600">
                                                {Number(s.deduction_amount) > 0
                                                    ? formatCurrency(
                                                        Number(
                                                            s.deduction_amount
                                                        )
                                                    )
                                                    : "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-gray-900">
                                                {formatCurrency(
                                                    Number(s.net_salary)
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center text-sm text-gray-500">
                                                {new Date(
                                                    s.paid_at
                                                ).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Employee Dialog */}
            <Dialog open={isEmployeeOpen} onOpenChange={setIsEmployeeOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Employee</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name
                            </label>
                            <Input
                                value={empName}
                                onChange={(e) => setEmpName(e.target.value)}
                                placeholder="Employee name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Basic Salary (MMK)
                            </label>
                            <Input
                                type="number"
                                value={empSalary}
                                onChange={(e) => setEmpSalary(e.target.value)}
                                placeholder="e.g. 300000"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsEmployeeOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateEmployee}
                                disabled={savingEmp || !empName || !empSalary}
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                            >
                                {savingEmp ? "Saving..." : "Create"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pay Salary Dialog */}
            <Dialog open={isSalaryOpen} onOpenChange={setIsSalaryOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pay Salary</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Employee
                            </label>
                            <select
                                value={salEmployeeId}
                                onChange={(e) => {
                                    setSalEmployeeId(e.target.value);
                                    const emp = employees.find(
                                        (em) => em.id === parseInt(e.target.value)
                                    );
                                    if (emp)
                                        setSalBasic(String(emp.basic_salary));
                                }}
                                className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg bg-white shadow-sm"
                            >
                                <option value="">Select employee</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Basic Salary (MMK)
                            </label>
                            <Input
                                type="number"
                                value={salBasic}
                                onChange={(e) => setSalBasic(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bonus (MMK)
                            </label>
                            <Input
                                type="number"
                                value={salBonus}
                                onChange={(e) => setSalBonus(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Deduction (MMK)
                            </label>
                            <Input
                                type="number"
                                value={salDeduction}
                                onChange={(e) =>
                                    setSalDeduction(e.target.value)
                                }
                                placeholder="0"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsSalaryOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handlePaySalary}
                                disabled={
                                    savingSal || !salEmployeeId || !salBasic
                                }
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                            >
                                {savingSal ? "Processing..." : "Pay Salary"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
