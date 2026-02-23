"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface LedgerEntry {
    id: number;
    entry_date: string;
    type: "DEBIT" | "CREDIT";
    category: "SALE" | "SALARY" | "EXPENSE" | "OTHER_INCOME";
    reference_id: number | null;
    amount: string | number;
    description: string | null;
    reference_label: string | null;
    entry_source: "system" | "manual";
}

interface DisplayEntry extends LedgerEntry {
    income: number;
    expense: number;
}

type TypeFilter = "all" | "INCOME" | "EXPENSE" | "ADJUSTMENT";

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-MM", {
        style: "currency",
        currency: "MMK",
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function today() {
    return new Date().toISOString().split("T")[0];
}

function buildDisplayEntries(entries: LedgerEntry[]): DisplayEntry[] {
    return entries.map((e) => {
        const amt = Number(e.amount);
        return {
            ...e,
            income: e.type === "DEBIT" ? amt : 0,
            expense: e.type === "CREDIT" ? amt : 0,
        };
    });
}

/** Human-readable reference text for a row */
function referenceText(e: DisplayEntry): string {
    if (e.reference_label) return e.reference_label;
    if (e.entry_source === "manual") {
        return e.income > 0 ? "Manual Income" : "Manual Expense";
    }
    return "—";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CashLedgerPage() {
    const { token } = useAuth();

    // Data
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Manual entry modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<DisplayEntry | null>(null);
    const [modalDate, setModalDate] = useState(today());
    const [modalType, setModalType] = useState<"INCOME" | "EXPENSE">("INCOME");
    const [modalAmount, setModalAmount] = useState("");
    const [modalDescription, setModalDescription] = useState("");
    const [modalSaving, setModalSaving] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Toast
    const [toast, setToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
    const showToast = (msg: string) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast(msg);
        toastTimer.current = setTimeout(() => setToast(null), 3000);
    };
    useEffect(
        () => () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        },
        []
    );

    // ── Fetch ───────────────────────────────────────────────────────────────

    const fetchEntries = useCallback(
        async (signal?: AbortSignal) => {
            if (!token) return;
            setLoading(true);
            setError(null);
            try {
                const params: Record<string, string> = {};
                if (fromDate) params.from = fromDate;
                if (toDate) params.to = toDate;
                const data = await apiFetch<LedgerEntry[]>("/ledger", {
                    token,
                    params,
                    signal,
                });
                setEntries(data);
            } catch (err) {
                if (signal?.aborted) return;
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load ledger"
                );
            } finally {
                setLoading(false);
            }
        },
        [token, fromDate, toDate]
    );

    useEffect(() => {
        const controller = new AbortController();
        fetchEntries(controller.signal);
        return () => controller.abort();
    }, [fetchEntries]);

    // ── Computed ─────────────────────────────────────────────────────────────

    const displayEntries = useMemo(
        () => buildDisplayEntries(entries),
        [entries]
    );

    const filtered = useMemo(() => {
        return displayEntries.filter((e) => {
            if (typeFilter === "INCOME" && e.income === 0) return false;
            if (typeFilter === "EXPENSE" && e.expense === 0) return false;
            if (typeFilter === "ADJUSTMENT" && e.category !== "OTHER_INCOME")
                return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const refMatch = referenceText(e).toLowerCase().includes(q);
                const descMatch = (e.description ?? "")
                    .toLowerCase()
                    .includes(q);
                if (!refMatch && !descMatch) return false;
            }

            return true;
        });
    }, [displayEntries, typeFilter, searchQuery]);

    const totalIncome = useMemo(
        () => filtered.reduce((s, e) => s + e.income, 0),
        [filtered]
    );
    const totalExpense = useMemo(
        () => filtered.reduce((s, e) => s + e.expense, 0),
        [filtered]
    );
    const netBalance = totalIncome - totalExpense;

    // ── Handlers ────────────────────────────────────────────────────────────

    const openCreateModal = () => {
        setEditingEntry(null);
        setModalDate(today());
        setModalType("INCOME");
        setModalAmount("");
        setModalDescription("");
        setModalError(null);
        setModalOpen(true);
    };

    const openEditModal = (entry: DisplayEntry) => {
        setEditingEntry(entry);
        setModalDate(entry.entry_date.split("T")[0]);
        setModalType(entry.type === "DEBIT" ? "INCOME" : "EXPENSE");
        setModalAmount(String(Number(entry.amount)));
        setModalDescription(entry.description ?? "");
        setModalError(null);
        setModalOpen(true);
    };

    const handleSaveEntry = async () => {
        if (!token || !modalAmount || !modalDescription) return;
        const parsed = Number(modalAmount);
        if (isNaN(parsed) || parsed <= 0) {
            setModalError("Enter a valid amount greater than 0.");
            return;
        }

        setModalSaving(true);
        setModalError(null);
        try {
            const body = {
                entry_date: modalDate,
                type: modalType,
                amount: modalAmount,
                description: modalDescription,
            };

            if (editingEntry) {
                await apiFetch(`/ledger/${editingEntry.id}`, {
                    method: "PUT",
                    token,
                    body,
                });
                showToast("Entry updated successfully.");
            } else {
                await apiFetch("/ledger", {
                    method: "POST",
                    token,
                    body,
                });
                showToast("Manual entry saved successfully.");
            }
            setModalOpen(false);
            await fetchEntries();
        } catch (err) {
            setModalError(
                err instanceof Error ? err.message : "Failed to save entry"
            );
        } finally {
            setModalSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!token || deletingId === null) return;
        setDeleteLoading(true);
        try {
            await apiFetch(`/ledger/${deletingId}`, {
                method: "DELETE",
                token,
            });
            setDeletingId(null);
            showToast("Entry deleted.");
            await fetchEntries();
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : "Failed to delete entry"
            );
            setDeletingId(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Shared styles (matching Expenses table) ─────────────────────────────

    const thBase = "py-3 px-4 text-sm font-medium text-white bg-blue-600";
    const selectClass =
        "w-full h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white shadow-sm";

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className="fixed top-5 right-5 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium animate-pulse">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Cash Ledger
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Track all cash inflow and outflow
                    </p>
                </div>
                <Button
                    onClick={openCreateModal}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                    + Manual Entry
                </Button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Main Card */}
            <Card>
                <CardHeader>
                    <CardTitle>All Entries</CardTitle>
                    <CardDescription>
                        {filtered.length} entries
                    </CardDescription>

                    {/* Filters */}
                    <div className="pt-2 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by reference or description..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-10"
                                />
                            </div>
                            <div className="sm:w-44">
                                <select
                                    value={typeFilter}
                                    onChange={(e) =>
                                        setTypeFilter(
                                            e.target.value as TypeFilter
                                        )
                                    }
                                    className={selectClass}
                                >
                                    <option value="all">All Types</option>
                                    <option value="INCOME">Income</option>
                                    <option value="EXPENSE">Expense</option>
                                    <option value="ADJUSTMENT">
                                        Adjustment
                                    </option>
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col">
                                <label className="text-xs text-gray-500 mb-1">
                                    From
                                </label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) =>
                                        setFromDate(e.target.value)
                                    }
                                    className="w-40 h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs text-gray-500 mb-1">
                                    To
                                </label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    min={fromDate}
                                    className="w-40 h-10 px-3 py-2 text-sm text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white shadow-sm"
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-10 text-xs"
                                onClick={() => {
                                    const todayStr = today();
                                    setFromDate(todayStr);
                                    setToDate(todayStr);
                                }}
                            >
                                Today
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-10 text-xs"
                                disabled={loading}
                                onClick={() => fetchEntries()}
                            >
                                {loading ? (
                                    "Loading…"
                                ) : (
                                    <>
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="h-4 w-4 mr-1"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M21 12a9 9 0 1 1-3-6.7" />
                                            <path d="M21 3v6h-6" />
                                        </svg>
                                        Refresh
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            Loading ledger...
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className={`${thBase} text-left`}>
                                                Date
                                            </th>
                                            <th className={`${thBase} text-left`}>
                                                Reference
                                            </th>
                                            <th className={`${thBase} text-left`}>
                                                Description
                                            </th>
                                            <th className={`${thBase} text-right`}>
                                                Income
                                            </th>
                                            <th className={`${thBase} text-right`}>
                                                Expense
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="text-center py-8 text-gray-500"
                                                >
                                                    No entries found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map((e) => {
                                                const isSystem =
                                                    e.entry_source === "system";
                                                return (
                                                    <tr
                                                        key={e.id}
                                                        className="border-b border-gray-100 hover:bg-gray-50"
                                                    >
                                                        <td className="py-3 px-4 text-sm text-gray-500">
                                                            {formatDate(
                                                                e.entry_date
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">
                                                            <span className="text-sm">
                                                                {referenceText(e)}
                                                            </span>
                                                            {isSystem && (
                                                                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600 border border-blue-200">
                                                                    System
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-gray-900">
                                                            {e.description ??
                                                                "—"}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-right font-semibold text-green-600">
                                                            {e.income > 0
                                                                ? formatCurrency(
                                                                      e.income
                                                                  )
                                                                : "—"}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-right font-semibold text-red-600">
                                                            {e.expense > 0
                                                                ? formatCurrency(
                                                                      e.expense
                                                                  )
                                                                : "—"}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Summary Section ─────────────────────── */}
                            {filtered.length > 0 && (
                                <div className="mt-6 border-t border-gray-200 pt-4">
                                    <div className="sm:w-64 sm:ml-auto space-y-2 text-sm">
                                        <div className="flex justify-between sm:gap-8 px-4 py-2 rounded bg-green-50">
                                            <span className="text-gray-600">
                                                Total Income:
                                            </span>
                                            <span className="font-semibold text-green-600">
                                                {formatCurrency(totalIncome)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between sm:gap-8 px-4 py-2 rounded bg-red-50">
                                            <span className="text-gray-600">
                                                Total Expense:
                                            </span>
                                            <span className="font-semibold text-red-600">
                                                {formatCurrency(totalExpense)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between sm:gap-8 px-4 py-2 rounded bg-gray-100">
                                            <span className="text-gray-600">
                                                Net Balance:
                                            </span>
                                            <span
                                                className={`font-bold ${netBalance >= 0 ? "text-green-700" : "text-red-700"}`}
                                            >
                                                {formatCurrency(netBalance)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── Manual Entry / Edit Modal ───────────────────────────────── */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-lg shadow-lg p-0 gap-0">
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-200">
                        <DialogTitle className="text-lg font-semibold text-gray-900">
                            {editingEntry ? "Edit Entry" : "Manual Entry"}
                        </DialogTitle>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {/* Row 1: Date + Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="modal-date"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Date
                                </label>
                                <input
                                    id="modal-date"
                                    type="date"
                                    value={modalDate}
                                    onChange={(e) =>
                                        setModalDate(e.target.value)
                                    }
                                    className="w-full h-10 px-3 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="modal-type"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Type
                                </label>
                                <select
                                    id="modal-type"
                                    value={modalType}
                                    onChange={(e) =>
                                        setModalType(
                                            e.target.value as
                                                | "INCOME"
                                                | "EXPENSE"
                                        )
                                    }
                                    className="w-full h-10 px-3 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                >
                                    <option value="INCOME">Income (Cash In)</option>
                                    <option value="EXPENSE">Expense (Cash Out)</option>
                                    <option value="ADJUSTMENT_ADD">Adjustment (+)</option>
                                    <option value="ADJUSTMENT_SUB">Adjustment (-)</option>
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Amount */}
                        <div>
                            <label
                                htmlFor="modal-amount"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Amount (MMK)
                            </label>
                            <Input
                                id="modal-amount"
                                type="number"
                                min={1}
                                value={modalAmount}
                                onChange={(e) => setModalAmount(e.target.value)}
                                placeholder="e.g. 50000"
                                className="h-10 rounded-md px-3 border-gray-300"
                            />
                        </div>

                        {/* Row 3: Description */}
                        <div>
                            <label
                                htmlFor="modal-description"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Description
                            </label>
                            <textarea
                                id="modal-description"
                                value={modalDescription}
                                onChange={(e) =>
                                    setModalDescription(e.target.value)
                                }
                                placeholder="e.g. Owner deposit, petty cash adjustment..."
                                className="w-full min-h-[90px] px-3 py-2 text-sm text-black border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 resize-none"
                            />
                        </div>

                        {modalError && (
                            <p className="text-sm text-red-600">{modalError}</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                        <Button
                            variant="outline"
                            onClick={() => setModalOpen(false)}
                            disabled={modalSaving}
                            className="h-10 px-4 border-gray-300 text-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEntry}
                            disabled={
                                modalSaving ||
                                !modalAmount ||
                                !modalDescription
                            }
                            className="h-10 px-4 bg-pink-600 hover:bg-pink-700 text-white"
                        >
                            {modalSaving
                                ? "Saving..."
                                : editingEntry
                                  ? "Update"
                                  : "Save"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation Modal ───────────────────────────────── */}
            <Dialog
                open={deletingId !== null}
                onOpenChange={(open) => {
                    if (!open) setDeletingId(null);
                }}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-gray-700">
                            Are you sure you want to delete this ledger entry?
                            This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setDeletingId(null)}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {deleteLoading ? "Deleting…" : "Delete"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
