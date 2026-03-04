import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format, isToday } from 'date-fns';
import { MessageCircle, Phone, Edit, Trash2, ArrowRight, X, Plus } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOURCES = ['Walk-in', 'Instagram', 'Google Maps', 'Referral', 'WhatsApp', 'Other'];
const STATUSES = ['New', 'Contacted', 'Interested', 'Trial Scheduled', 'Joined', 'Not Interested', 'No Response'];

const Enquiries = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filter, setFilter] = useState('All');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone_number: '',
        package_interest: '',
        source: 'Walk-in',
        status: 'New',
        follow_up_date: '',
        trial_date: '',
        notes: ''
    });

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const fetchEnquiries = async () => {
        try {
            const res = await axios.get(`${API}/enquiries`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEnquiries(res.data);
        } catch (error) {
            console.error('Error fetching enquiries:', error);
            toast.error('Failed to load enquiries');
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsApp = (name, phone, pkg) => {
        if (!phone) {
            toast.error('No phone number provided.');
            return;
        }
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

        const message = `Hi ${name} 👋\n\nThank you for your enquiry at Belgaonkar Fitness Gym.\nOur ${pkg || 'membership'} details are available.\nLet us know if you'd like to visit for a trial 💪`;
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waLink, '_blank');
    };

    const handleCall = (phone) => {
        if (!phone) {
            toast.error('No phone number provided.');
            return;
        }
        window.location.href = `tel:${phone}`;
    };

    const handleConvert = (enquiry) => {
        // Redirect to Add Member and pass enquiry details + ID
        navigate('/members/add', {
            state: {
                enquiryId: enquiry.id,
                name: enquiry.name,
                phone_number: enquiry.phone_number,
                package_interest: enquiry.package_interest
            }
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this enquiry?")) return;
        try {
            await axios.delete(`${API}/enquiries/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Enquiry deleted');
            fetchEnquiries();
        } catch (error) {
            console.error('Error deleting enquiry:', error);
            toast.error('Failed to delete enquiry');
        }
    };

    const openEdit = (enquiry) => {
        setFormData({
            name: enquiry.name,
            phone_number: enquiry.phone_number,
            package_interest: enquiry.package_interest,
            source: enquiry.source,
            status: enquiry.status,
            follow_up_date: enquiry.follow_up_date ? enquiry.follow_up_date.split('T')[0] : '',
            trial_date: enquiry.trial_date ? enquiry.trial_date.split('T')[0] : '',
            notes: enquiry.notes || ''
        });
        setEditingId(enquiry.id);
        setShowModal(true);
    };

    const openAdd = () => {
        setFormData({
            name: '',
            phone_number: '',
            package_interest: '',
            source: 'Walk-in',
            status: 'New',
            follow_up_date: '',
            trial_date: '',
            notes: ''
        });
        setEditingId(null);
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const submitData = { ...formData };
            if (!submitData.follow_up_date) submitData.follow_up_date = null;
            else submitData.follow_up_date = new Date(submitData.follow_up_date).toISOString();

            if (!submitData.trial_date) submitData.trial_date = null;
            else submitData.trial_date = new Date(submitData.trial_date).toISOString();

            if (editingId) {
                await axios.put(`${API}/enquiries/${editingId}`, submitData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Enquiry updated');
            } else {
                await axios.post(`${API}/enquiries`, submitData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Enquiry created');
            }
            setShowModal(false);
            fetchEnquiries();
        } catch (error) {
            console.error('Error saving enquiry:', error);
            toast.error(error.response?.data?.detail || 'Failed to save enquiry');
        }
    };

    const filteredEnquiries = enquiries.filter(e => {
        if (filter === 'All') return true;
        if (filter === 'New') return e.status === 'New';
        if (filter === 'Interested') return e.status === 'Interested';
        if (filter === 'Joined') return e.status === 'Joined';
        if (filter === 'Follow-ups Today') {
            if (!e.follow_up_date) return false;
            return isToday(new Date(e.follow_up_date));
        }
        return true;
    });

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Enquiries</h1>
                    <p className="text-text-muted mt-1">Manage leads and follow-ups</p>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center justify-center bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Enquiry
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {['All', 'New', 'Follow-ups Today', 'Interested', 'Joined'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-text-main text-white cursor-default' : 'bg-white border border-border text-text-muted hover:text-text-main hover:bg-background-subtle'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-text-muted">Loading enquiries...</div>
                ) : filteredEnquiries.length === 0 ? (
                    <div className="p-12 text-center text-text-muted">No enquiries found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-background-subtle border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main whitespace-nowrap">Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main whitespace-nowrap">Phone</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main whitespace-nowrap">Package</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main whitespace-nowrap">Source</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main whitespace-nowrap">Follow-up</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-text-main whitespace-nowrap">Created</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-text-main whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredEnquiries.map((e) => (
                                    <tr key={e.id} className="hover:bg-background-subtle transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-text-main text-sm">{e.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-muted">{e.phone_number}</td>
                                        <td className="px-6 py-4 text-sm text-text-muted">{e.package_interest}</td>
                                        <td className="px-6 py-4 text-sm text-text-muted">{e.source}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${e.status === 'Joined' ? 'bg-green-100 text-green-700 border-green-200' :
                                                e.status === 'New' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                    e.status === 'Interested' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                        'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-muted">
                                            {e.follow_up_date ? format(new Date(e.follow_up_date), 'dd MMM yyyy') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-muted">
                                            {format(new Date(e.created_at), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => handleWhatsApp(e.name, e.phone_number, e.package_interest)} className="p-1.5 text-[#25D366] hover:bg-[#25D366]/10 rounded-md transition-colors" title="WhatsApp">
                                                    <MessageCircle className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleCall(e.phone_number)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Call">
                                                    <Phone className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => openEdit(e)} className="p-1.5 text-text-muted hover:text-text-main hover:bg-black/5 rounded-md transition-colors" title="Edit">
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                {e.status !== 'Joined' && (
                                                    <button onClick={() => handleConvert(e)} className="p-1.5 text-primary hover:bg-primary-light rounded-md transition-colors" title="Convert to Member">
                                                        <ArrowRight className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(e.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl my-auto">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-bold font-heading text-text-main">
                                {editingId ? 'Edit Enquiry' : 'Add New Enquiry'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-main rounded-md p-1 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Name *</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full h-10 px-3 rounded-lg border border-border focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Phone Number *</label>
                                    <input type="tel" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} required className="w-full h-10 px-3 rounded-lg border border-border focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Interested Package *</label>
                                    <input type="text" value={formData.package_interest} onChange={e => setFormData({ ...formData, package_interest: e.target.value })} required className="w-full h-10 px-3 rounded-lg border border-border focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Source *</label>
                                    <select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border bg-white focus:ring-primary focus:border-primary">
                                        {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Status *</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border bg-white focus:ring-primary focus:border-primary">
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Trial Date</label>
                                    <input type="date" value={formData.trial_date} onChange={e => setFormData({ ...formData, trial_date: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-main mb-1.5">Follow-up Date</label>
                                    <input type="date" value={formData.follow_up_date} onChange={e => setFormData({ ...formData, follow_up_date: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border focus:ring-primary focus:border-primary" />
                                </div>
                            </div>
                            <div className="mt-5 text-left">
                                <label className="block text-sm font-medium text-text-main mb-1.5">Notes</label>
                                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full p-3 rounded-lg border border-border focus:ring-primary focus:border-primary" rows="3" />
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-border">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-white border border-border text-text-main hover:bg-background-subtle rounded-lg font-medium transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold transition-colors">
                                    Save Enquiry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Enquiries;
