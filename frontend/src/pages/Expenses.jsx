import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { IndianRupee, Search } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EXPENSE_CATEGORIES = [
    'Rent',
    'Electricity',
    'Water',
    'Internet',
    'Trainer Salary',
    'Staff Salary',
    'Equipment',
    'Maintenance',
    'Marketing',
    'Miscellaneous'
];

const Expenses = () => {
    const { token, isAdmin } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

    // Filter Bar State
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    useEffect(() => {
        if (isAdmin) {
            fetchExpenses();
        }
    }, [isAdmin]);

    const fetchExpenses = async () => {
        try {
            const params = new URLSearchParams();
            if (filterStartDate) params.append('start_date', filterStartDate);
            if (filterEndDate) params.append('end_date', filterEndDate);
            if (filterCategory) params.append('category', filterCategory);

            const res = await axios.get(`${API}/expenses?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenses(res.data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilter = () => {
        fetchExpenses();
    };

    const clearFilters = () => {
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterCategory('');
        setTimeout(() => {
            fetchExpenses(); // Re-fetch without current state if we trigger it, but safer to use effect or call manually.
        }, 0);
    };

    // Safe manual refetch for clear
    useEffect(() => {
        if (filterStartDate === '' && filterEndDate === '' && filterCategory === '') {
            fetchExpenses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStartDate, filterEndDate, filterCategory]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!amount || amount <= 0) {
            toast.error('Amount must be greater than 0');
            return;
        }
        if (!category) {
            toast.error('Category is required');
            return;
        }
        if (!expenseDate) {
            toast.error('Expense date is required');
            return;
        }

        try {
            await axios.post(`${API}/expenses`, {
                amount: parseFloat(amount),
                category,
                description,
                payment_mode: paymentMode,
                expense_date: new Date(expenseDate).toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Expense added successfully');

            // Clear form
            setAmount('');
            setCategory('');
            setDescription('');
            setPaymentMode('Cash');
            setExpenseDate(new Date().toISOString().split('T')[0]);

            // Refresh
            fetchExpenses();
        } catch (error) {
            console.error('Error adding expense:', error);
            toast.error(error.response?.data?.detail || 'Failed to add expense');
        }
    };

    const handleCancel = async (id) => {
        try {
            await axios.patch(`${API}/expenses/${id}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Expense cancelled successfully');
            fetchExpenses();
        } catch (error) {
            console.error('Error cancelling expense:', error);
            toast.error('Failed to cancel expense');
        }
    };

    if (!isAdmin) {
        return (
            <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
                <p className="text-text-muted">Only admins can manage expenses</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Expenses</h1>
                <p className="text-text-muted mt-1">Manage gym expenses</p>
            </div>

            {/* Add Expense Form */}
            <div className="bg-white rounded-xl border border-border shadow-sm p-5 md:p-6">
                <h2 className="text-xl font-bold text-text-main mb-4">Add Expense</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Amount (₹) *</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Category *</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                            required
                        >
                            <option value="">Select Category</option>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Payment Mode *</label>
                        <select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                        >
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank">Bank</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Date *</label>
                        <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            required
                        />
                    </div>
                    <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-sm font-medium text-text-main mb-1">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Optional description"
                        />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Add Expense
                        </button>
                    </div>
                </form>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">End Date</label>
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Category</label>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                        >
                            <option value="">All Categories</option>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleApplyFilter}
                            className="flex-1 bg-text-main hover:bg-black text-white px-4 py-2 rounded-lg font-medium transition-colors h-10"
                        >
                            Apply Filter
                        </button>
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 rounded-lg border border-border text-text-main hover:bg-background-subtle font-medium transition-colors h-10"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-text-muted">Loading expenses...</div>
                ) : expenses.length === 0 ? (
                    <div className="p-12 text-center">
                        <IndianRupee className="w-12 h-12 text-text-muted mx-auto mb-4" />
                        <p className="text-text-muted">No expenses found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-background-subtle border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Category</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Description</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Amount</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Mode</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {expenses.map((expense) => {
                                    const isCancelled = expense.status === 'cancelled';
                                    return (
                                        <tr
                                            key={expense.id}
                                            className={`transition-colors ${isCancelled ? 'bg-slate-50 opacity-60' : 'hover:bg-background-subtle'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-text-main">
                                                    {format(new Date(expense.expense_date), 'dd MMM yyyy')}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-text-main">{expense.category}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-text-muted">{expense.description || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className={`text-sm font-semibold ${isCancelled ? 'text-text-muted line-through' : 'text-status-danger'}`}>
                                                    ₹{expense.amount}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 text-text-main border border-border px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                    {expense.payment_mode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isCancelled ? (
                                                    <span className="bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                        Cancelled
                                                    </span>
                                                ) : (
                                                    <span className="bg-green-100 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Are you sure you want to cancel this expense?')) {
                                                            handleCancel(expense.id);
                                                        }
                                                    }}
                                                    disabled={isCancelled}
                                                    className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${isCancelled
                                                            ? 'text-text-muted bg-slate-100 cursor-not-allowed'
                                                            : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200'
                                                        }`}
                                                >
                                                    Cancel
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Expenses;
