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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
    id: number;
    name: string;
    phone?: string;
    address?: string;
    position?: string;
    basic_salary: string | number;
    start_date?: string;
    remark?: string;
    created_at: string;
}

interface BonusItem {
    type: string;
    amount: string;
}

interface SalaryRecord {
    id: number;
    employee_id: number;
    salary_month: string;
    basic_salary: string | number;
    bonus_amount: string | number;
    bonus_types?: BonusItem[];
    net_salary: string | number;
    payment_date?: string;
    created_at: string;
    remark?: string;
    employee?: { name: string };
}

const MOCK_EMPLOYEES: Employee[] = [
    {
        id: 1,
        name: "Aye Chan",
        phone: "09987654321",
        address: "Sanchaung, Yangon",
        position: "Store Manager",
        basic_salary: 450000,
        start_date: "2024-11-15T00:00:00.000Z",
        remark: "Team lead for downtown branch",
        created_at: "2024-11-15T08:30:00.000Z",
    },
    {
        id: 2,
        name: "Thandar Oo",
        phone: "09777712345",
        address: "Mandalay",
        position: "Senior Sales",
        basic_salary: 380000,
        start_date: "2024-08-01T00:00:00.000Z",
        remark: "Top performer 2025",
        created_at: "2024-08-01T02:10:00.000Z",
    },
    {
        id: 3,
        name: "Myat Ko",
        phone: "0945001122",
        address: "Nay Pyi Taw",
        position: "Logistics",
        basic_salary: 420000,
        start_date: "2025-02-10T00:00:00.000Z",
        remark: "Handles intercity deliveries",
        created_at: "2025-02-10T04:45:00.000Z",
    },
];

const MOCK_SALARIES: SalaryRecord[] = [
    {
        id: 101,
        employee_id: 1,
        salary_month: "2026-02",
        basic_salary: 450000,
        bonus_amount: 30000,
        bonus_types: [{ type: "Performance Bonus", amount: "30000" }],
        net_salary: 480000,
        payment_date: "2026-03-01T00:00:00.000Z",
        created_at: "2026-03-01T07:00:00.000Z",
        remark: "Closed Lunar promo",
        employee: { name: "Aye Chan" },
    },
    {
        id: 102,
        employee_id: 2,
        salary_month: "2026-02",
        basic_salary: 380000,
        bonus_amount: 15000,
        bonus_types: [{ type: "Attendance Bonus", amount: "15000" }],
        net_salary: 395000,
        payment_date: "2026-02-28T00:00:00.000Z",
        created_at: "2026-02-28T05:30:00.000Z",
        remark: "Perfect attendance",
        employee: { name: "Thandar Oo" },
    },
];

const BONUS_TYPES = ["Attendance Bonus", "Performance Bonus", "Outstanding Bonus"];
const DEDUCTION_TYPES = ["Late", "Absent", "Damage", "Other"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | undefined) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatMonth(monthStr: string | undefined) {
    if (!monthStr) return "-";
    const [year, month] = monthStr.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
}

const emptyEmployee = {
    name: "",
    phone: "",
    address: "",
    position: "",
    basic_salary: "",
    start_date: "",
    remark: "",
};

const emptyBonuses: BonusItem[] = [
    { type: "", amount: "" },
    { type: "", amount: "" },
    { type: "", amount: "" },
];

const emptyDeductions: BonusItem[] = [
    { type: "", amount: "" },
    { type: "", amount: "" },
    { type: "", amount: "" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
    const { token } = useAuth();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"employees" | "salaries">("employees");
    const [search, setSearch] = useState("");
    const [usingMockData, setUsingMockData] = useState(false);
    const [isLocalhost, setIsLocalhost] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsLocalhost(window.location.hostname === "localhost");
        }
    }, []);

    const loadMockData = useCallback(() => {
        setEmployees(MOCK_EMPLOYEES);
        setSalaryRecords(MOCK_SALARIES);
        setUsingMockData(true);
        setError(null);
        setLoading(false);
    }, []);

    // ── Add / Edit employee modal ──────────────────────────────────────────────
    const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [empForm, setEmpForm] = useState(emptyEmployee);
    const [savingEmp, setSavingEmp] = useState(false);
    const [empError, setEmpError] = useState<string | null>(null);

    // ── Pay Salary modal ──────────────────────────────────────────────────────
    const [isSalaryOpen, setIsSalaryOpen] = useState(false);
    const [salEmployeeId, setSalEmployeeId] = useState("");
    const [salMonth, setSalMonth] = useState("");
    const [salBasic, setSalBasic] = useState("");
    const [salBonuses, setSalBonuses] = useState<BonusItem[]>(emptyBonuses.map(b => ({ ...b })));
    const [salDeductions, setSalDeductions] = useState<BonusItem[]>(emptyDeductions.map(d => ({ ...d })));
    const [salPaymentDate, setSalPaymentDate] = useState("");
    const [salRemark, setSalRemark] = useState("");
    const [savingSal, setSavingSal] = useState(false);
    const [salError, setSalError] = useState<string | null>(null);

    // ── Delete confirm ────────────────────────────────────────────────────────
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // ─── Fetch ────────────────────────────────────────────────────────────────

    const fetchData = useCallback(
        async (signal?: AbortSignal) => {
            if (!token) {
                if (isLocalhost) {
                    loadMockData();
                } else {
                    setLoading(false);
                }
                return;
            }

            setLoading(true);
            try {
                const [emps, sals] = await Promise.all([
                    apiFetch<Employee[]>("/employees", { token, signal }),
                    apiFetch<SalaryRecord[]>("/salaries", { token, signal }),
                ]);
                setEmployees(emps);
                setSalaryRecords(sals);
                setUsingMockData(false);
                setError(null);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                if (isLocalhost) {
                    loadMockData();
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load data");
            } finally {
                setLoading(false);
            }
        },
        [token, isLocalhost, loadMockData]
    );

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, [fetchData]);

    // ─── Filtered employees ────────────────────────────────────────────────────

    const filteredEmployees = employees.filter((emp) => {
        const q = search.toLowerCase();
        return (
            emp.name.toLowerCase().includes(q) ||
            (emp.phone ?? "").toLowerCase().includes(q) ||
            (emp.position ?? "").toLowerCase().includes(q) ||
            (emp.address ?? "").toLowerCase().includes(q)
        );
    });

    // ─── Employee CRUD ─────────────────────────────────────────────────────────

    const openAddEmployee = () => {
        setEditingEmployee(null);
        setEmpForm(emptyEmployee);
        setEmpError(null);
        setIsEmployeeOpen(true);
    };

    const openEditEmployee = (emp: Employee) => {
        setEditingEmployee(emp);
        setEmpForm({
            name: emp.name,
            phone: emp.phone ?? "",
            address: emp.address ?? "",
            position: emp.position ?? "",
            basic_salary: String(emp.basic_salary),
            start_date: emp.start_date ? emp.start_date.split("T")[0] : "",
            remark: emp.remark ?? "",
        });
        setEmpError(null);
        setIsEmployeeOpen(true);
    };

    const validateEmpForm = () => {
        if (!empForm.name.trim()) return "Full name is required.";
        if (!empForm.phone.trim()) return "Phone number is required.";
        if (!empForm.position.trim()) return "Position is required.";
        if (!empForm.basic_salary) return "Basic salary is required.";
        if (!empForm.start_date) return "Start date is required.";
        return null;
    };

    const handleSaveEmployee = async () => {
        const validationErr = validateEmpForm();
        if (validationErr) { setEmpError(validationErr); return; }
        if (!token) return;
        setSavingEmp(true);
        setEmpError(null);
        try {
            if (editingEmployee) {
                await apiFetch(`/employees/${editingEmployee.id}`, {
                    method: "PATCH",
                    token,
                    body: empForm,
                });
            } else {
                await apiFetch("/employees", {
                    method: "POST",
                    token,
                    body: empForm,
                });
            }
            setIsEmployeeOpen(false);
            await fetchData();
        } catch (err) {
            setEmpError(err instanceof Error ? err.message : "Failed to save employee");
        } finally {
            setSavingEmp(false);
        }
    };

    const handleDeleteEmployee = async (id: number) => {
        if (!token) return false;
        setDeletingId(id);
        let success = false;
        try {
            await apiFetch(`/employees/${id}`, { method: "DELETE", token });
            await fetchData();
            success = true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete employee");
        } finally {
            setDeletingId(null);
        }
        return success;
    };

    const handleDeleteFromModal = async () => {
        if (!editingEmployee) return;
        const deleted = await handleDeleteEmployee(editingEmployee.id);
        if (deleted) setIsEmployeeOpen(false);
    };

    // ─── Salary payment ────────────────────────────────────────────────────────

    const openPaySalary = (emp?: Employee) => {
        setSalEmployeeId(emp?.id ? String(emp.id) : "");
        setSalBasic(emp ? String(emp.basic_salary) : "");
        setSalMonth("");
        setSalBonuses(emptyBonuses.map(b => ({ ...b })));
        setSalDeductions(emptyDeductions.map(d => ({ ...d })));
        setSalPaymentDate(new Date().toISOString().split("T")[0]);
        setSalRemark("");
        setSalError(null);
        setIsSalaryOpen(true);
    };

    const totalBonus = salBonuses.reduce(
        (sum, b) => sum + (b.type && b.amount ? Number(b.amount) : 0),
        0
    );
    const totalDeduction = salDeductions.reduce(
        (sum, d) => sum + (d.type && d.amount ? Number(d.amount) : 0),
        0
    );
    const totalSalary = (Number(salBasic) || 0) + totalBonus - totalDeduction;

    const handlePaySalary = async () => {
        if (!token || !salEmployeeId || !salBasic || !salMonth || !salPaymentDate) {
            setSalError("Employee, salary month, basic salary, and payment date are required.");
            return;
        }
        const activeBonuses = salBonuses.filter((b) => b.type && b.amount);
        const activeDeductions = salDeductions.filter((d) => d.type && d.amount);
        setSavingSal(true);
        setSalError(null);
        try {
            await apiFetch("/salaries", {
                method: "POST",
                token,
                body: {
                    employee_id: parseInt(salEmployeeId),
                    salary_month: salMonth,
                    basic_salary: salBasic,
                    bonuses: activeBonuses,
                    deductions: activeDeductions,
                    payment_date: salPaymentDate,
                    remark: salRemark,
                },
            });
            setIsSalaryOpen(false);
            await fetchData();
        } catch (err) {
            setSalError(err instanceof Error ? err.message : "Failed to pay salary");
        } finally {
            setSavingSal(false);
        }
    };

    const updateBonus = (index: number, field: keyof BonusItem, value: string) => {
        setSalBonuses((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const updateDeduction = (index: number, field: keyof BonusItem, value: string) => {
        setSalDeductions((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900">Employees & Salaries</h1>
                        {usingMockData && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                Mock data
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500 mt-1">Manage employees and salary payments</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => openPaySalary()} variant="outline">
                        Pay Salary
                    </Button>
                    <Button
                        onClick={openAddEmployee}
                        className="bg-pink-600 hover:bg-pink-700 text-white"
                    >
                        + Add Employee
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {usingMockData && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    Showing mock employee and salary data for localhost testing. API write actions remain disabled without a token.
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "employees" ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                    onClick={() => setTab("employees")}
                >
                    Employees ({employees.length})
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "salaries" ? "border-pink-600 text-pink-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
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
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-3">
                                <CardTitle>Employee List</CardTitle>
                                <CardDescription>{employees.length} employees</CardDescription>
                            </div>
                            <div className="flex justify-center">
                                <Input
                                    placeholder="Search employee..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        {["Employee ID", "Name", "Phone", "Position", "Basic Salary", "Start Date", "Address", "Actions"].map(
                                            (h, idx) => (
                                                <th
                                                    key={h}
                                                    className={`py-3 px-4 text-sm font-medium text-white bg-blue-600 first:rounded-tl last:rounded-tr ${idx !== 0 ? "border-l border-blue-500/40" : ""} ${h === "Actions" ? "text-center" : "text-left"}`}
                                                >
                                                    {h}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-gray-400 text-sm">
                                                No employees found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEmployees.map((emp) => (
                                            <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-sm text-gray-500">#{String(emp.id).padStart(3, "0")}</td>
                                                <td className="py-3 px-4 align-top border-l border-gray-200">
                                                    <span className="font-medium text-gray-900">{emp.name}</span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 border-l border-gray-200">{emp.phone ?? "-"}</td>
                                                <td className="py-3 px-4 text-gray-600 border-l border-gray-200">{emp.position ?? "-"}</td>
                                                <td className="py-3 px-4 text-gray-900 border-l border-gray-200">{formatCurrency(Number(emp.basic_salary))}</td>
                                                <td className="py-3 px-4 text-sm text-gray-500 border-l border-gray-200">{formatDate(emp.start_date)}</td>
                                                <td className="py-3 px-4 text-gray-600 border-l border-gray-200">{emp.address ?? "-"}</td>
                                                <td className="py-3 px-4 border-l border-gray-200 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full sm:w-auto"
                                                        onClick={() => openEditEmployee(emp)}
                                                    >
                                                        Edit
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Salary Records</CardTitle>
                        <CardDescription>{salaryRecords.length} records</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr>
                                        {["Employee", "Month", "Basic Salary", "Bonus", "Total Paid", "Payment Date", "Remark"].map(
                                            (h, idx) => (
                                                <th
                                                    key={h}
                                                    className={`py-3 px-4 text-sm font-medium text-white bg-blue-600 text-left first:rounded-tl last:rounded-tr ${idx !== 0 ? "border-l border-blue-500/40" : ""}`}
                                                >
                                                    {h}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                                                No salary records yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        salaryRecords.map((s) => (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 font-medium text-gray-900">
                                                    {s.employee?.name ?? `EMP#${String(s.employee_id).padStart(2, "0")}`}
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 border-l border-gray-200">{formatMonth(s.salary_month)}</td>
                                                <td className="py-3 px-4 text-gray-900 border-l border-gray-200">{formatCurrency(Number(s.basic_salary))}</td>
                                                <td className="py-3 px-4 text-green-600 border-l border-gray-200">
                                                    {Number(s.bonus_amount) > 0 ? formatCurrency(Number(s.bonus_amount)) : "-"}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-gray-900 border-l border-gray-200">{formatCurrency(Number(s.net_salary))}</td>
                                                <td className="py-3 px-4 text-sm text-gray-500 border-l border-gray-200">
                                                    {formatDate(s.payment_date ?? s.created_at)}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500 border-l border-gray-200">{s.remark ?? "-"}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Add / Edit Employee Dialog ────────────────────────────────────────── */}
            <Dialog open={isEmployeeOpen} onOpenChange={setIsEmployeeOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-gray-900">
                                {editingEmployee ? "Edit Employee" : "Add New Employee"}
                            </DialogTitle>
                            {editingEmployee && (
                                <button
                                    type="button"
                                    aria-label="Close"
                                    onClick={() => setIsEmployeeOpen(false)}
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    X
                                </button>
                            )}
                        </div>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        {empError && (
                            <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2 border border-red-200">
                                {empError}
                            </p>
                        )}

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                className="w-full"
                                value={empForm.name}
                                onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Cho Aung"
                            />
                        </div>

                        {/* Phone + Position */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    className="w-full"
                                    value={empForm.phone}
                                    onChange={(e) => setEmpForm((f) => ({ ...f, phone: e.target.value }))}
                                    placeholder="e.g. 0911111111"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Position <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    className="w-full"
                                    value={empForm.position}
                                    onChange={(e) => setEmpForm((f) => ({ ...f, position: e.target.value }))}
                                    placeholder="e.g. Sales"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <Input
                                className="w-full"
                                value={empForm.address}
                                onChange={(e) => setEmpForm((f) => ({ ...f, address: e.target.value }))}
                                placeholder="Optional"
                            />
                        </div>

                        {/* Salary + Start Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Basic Salary (MMK) <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    className="w-full"
                                    type="number"
                                    value={empForm.basic_salary}
                                    onChange={(e) => setEmpForm((f) => ({ ...f, basic_salary: e.target.value }))}
                                    placeholder="e.g. 350000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    className="w-full"
                                    type="date"
                                    value={empForm.start_date}
                                    onChange={(e) => setEmpForm((f) => ({ ...f, start_date: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Remark */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                            <Input
                                className="w-full"
                                value={empForm.remark}
                                onChange={(e) => setEmpForm((f) => ({ ...f, remark: e.target.value }))}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                            {editingEmployee && (
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                                    onClick={handleDeleteFromModal}
                                    disabled={deletingId === editingEmployee.id}
                                >
                                    {deletingId === editingEmployee.id ? "Deleting..." : "Delete Employee"}
                                </Button>
                            )}
                            <div className="flex justify-end gap-2 sm:justify-start sm:ml-auto">
                                {!editingEmployee && (
                                    <Button variant="outline" onClick={() => setIsEmployeeOpen(false)}>
                                        Cancel
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSaveEmployee}
                                    disabled={savingEmp}
                                    className="bg-pink-600 hover:bg-pink-700 text-white"
                                >
                                    {savingEmp ? "Saving..." : "Save Employee"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Pay Salary Dialog ─────────────────────────────────────────────────── */}
            <Dialog open={isSalaryOpen} onOpenChange={setIsSalaryOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="text-gray-900">Pay Salary</DialogTitle>
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={() => setIsSalaryOpen(false)}
                                className="text-gray-500 hover:text-gray-900"
                            >
                                X
                            </button>
                        </div>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        {salError && (
                            <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2 border border-red-200">
                                {salError}
                            </p>
                        )}

                        {/* Employee */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Employee <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={salEmployeeId}
                                onChange={(e) => {
                                    setSalEmployeeId(e.target.value);
                                    const emp = employees.find((em) => em.id === parseInt(e.target.value));
                                    if (emp) setSalBasic(String(emp.basic_salary));
                                }}
                                className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm"
                            >
                                <option value="">Select employee</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Salary Month + Payment Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Salary Month <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    className="w-full"
                                    type="month"
                                    value={salMonth}
                                    onChange={(e) => setSalMonth(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Date <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    className="w-full"
                                    type="date"
                                    value={salPaymentDate}
                                    onChange={(e) => setSalPaymentDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Basic Salary */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Basic Salary (MMK)
                            </label>
                            <Input
                                className="w-full"
                                type="number"
                                value={salBasic}
                                onChange={(e) => setSalBasic(e.target.value)}
                                placeholder="Auto-filled from employee"
                            />
                        </div>

                        {/* Bonus types */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bonus (optional — up to 3)
                            </label>
                            <div className="space-y-2">
                                {salBonuses.map((bonus, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-4">
                                        <select
                                            value={bonus.type}
                                            onChange={(e) => updateBonus(i, "type", e.target.value)}
                                            className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm"
                                        >
                                            <option value="">— Bonus type —</option>
                                            {BONUS_TYPES.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                        <Input
                                            type="number"
                                            className="w-full"
                                            placeholder="Amount"
                                            value={bonus.amount}
                                            disabled={!bonus.type}
                                            onChange={(e) => updateBonus(i, "amount", e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Deduction types */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Deduction (optional — up to 3)
                            </label>
                            <div className="space-y-2">
                                {salDeductions.map((deduction, i) => (
                                    <div key={i} className="grid grid-cols-2 gap-4">
                                        <select
                                            value={deduction.type}
                                            onChange={(e) => updateDeduction(i, "type", e.target.value)}
                                            className="w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm"
                                        >
                                            <option value="">— Deduction type —</option>
                                            {DEDUCTION_TYPES.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                        <Input
                                            type="number"
                                            className="w-full"
                                            placeholder="Amount"
                                            value={deduction.amount}
                                            disabled={!deduction.type}
                                            onChange={(e) => updateDeduction(i, "amount", e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Remark */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                            <Input
                                className="w-full"
                                value={salRemark}
                                onChange={(e) => setSalRemark(e.target.value)}
                                placeholder="Optional"
                            />
                        </div>

                        {/* Total salary summary */}
                        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-1 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Basic Salary</span>
                                <span>{formatCurrency(Number(salBasic) || 0)}</span>
                            </div>
                            {salBonuses.filter((b) => b.type && b.amount).map((b, i) => (
                                <div key={i} className="flex justify-between text-green-600">
                                    <span>{b.type}</span>
                                    <span>+ {formatCurrency(Number(b.amount))}</span>
                                </div>
                            ))}
                            {salDeductions.filter((d) => d.type && d.amount).map((d, i) => (
                                <div key={`ded-${i}`} className="flex justify-between text-red-600">
                                    <span>{d.type}</span>
                                    <span>- {formatCurrency(Number(d.amount))}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-1">
                                <span>Total Bonus</span>
                                <span>{formatCurrency(totalBonus)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Total Deduction</span>
                                <span>- {formatCurrency(totalDeduction)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                                <span>Total Salary</span>
                                <span>{formatCurrency(totalSalary)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                onClick={handlePaySalary}
                                disabled={savingSal}
                                className="bg-pink-600 hover:bg-pink-700 text-white"
                            >
                                {savingSal ? "Processing..." : "Confirm Payment"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
