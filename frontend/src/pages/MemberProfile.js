import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Phone,
  Calendar,
  DollarSign,
  UserCheck,
  Edit,
  CreditCard,
  Download,
  Trash2,
  RefreshCw,
  MessageCircle,
  Fingerprint
} from 'lucide-react';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MemberProfile = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [memberPackage, setMemberPackage] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Renewal State
  const [allPackages, setAllPackages] = useState([]);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewData, setRenewData] = useState({
    package_id: '',
    duration_days: '',
    total_amount: '',
    amount_paid: '',
    payment_mode: 'Cash'
  });

  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchMemberData();
  }, [id]);

  const fetchMemberData = async () => {
    try {
      const [memberRes, attendanceRes, paymentsRes, statsRes] = await Promise.all([
        axios.get(`${API}/members/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/attendance/member/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/payments/member/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/members/${id}/attendance-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setMember(memberRes.data);
      setAttendance(attendanceRes.data);
      setPayments(paymentsRes.data);
      setAttendanceStats(statsRes.data);

      const packageRes = await axios.get(`${API}/packages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllPackages(packageRes.data);
      const pkg = packageRes.data.find((p) => p.id === memberRes.data.package_id);
      setMemberPackage(pkg);
    } catch (error) {
      console.error('Error fetching member data:', error);
      toast.error('Failed to load member data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/payments`,
        {
          member_id: id,
          amount_paid: parseFloat(paymentAmount),
          payment_mode: paymentMode,
          payment_date: new Date().toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentAmount('');
      fetchMemberData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const handleRenewChange = (e) => {
    const { name, value } = e.target;
    if (name === 'package_id') {
      const selectedPkg = allPackages.find(p => p.id === value);
      if (selectedPkg) {
        setRenewData(prev => ({
          ...prev,
          package_id: selectedPkg.id,
          duration_days: selectedPkg.duration_days,
          total_amount: selectedPkg.price,
          amount_paid: selectedPkg.price
        }));
        return;
      }
    }
    setRenewData(prev => ({ ...prev, [name]: value }));
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    const pendingAmount = member.total_amount - member.amount_paid;
    if (pendingAmount > 0) {
      toast.error('Clear pending dues before renewal.');
      return;
    }
    if (parseFloat(renewData.amount_paid) > parseFloat(renewData.total_amount)) {
      toast.error('Amount paid cannot exceed total amount');
      return;
    }
    try {
      await axios.post(
        `${API}/members/${id}/renew`,
        {
          package_id: renewData.package_id,
          duration_days: parseInt(renewData.duration_days),
          total_amount: parseFloat(renewData.total_amount),
          amount_paid: parseFloat(renewData.amount_paid),
          payment_mode: renewData.payment_mode
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Membership renewed successfully');
      setShowRenewModal(false);
      setRenewData({
        package_id: '',
        duration_days: '',
        total_amount: '',
        amount_paid: '',
        payment_mode: 'Cash'
      });
      fetchMemberData();
    } catch (error) {
      console.error('Error renewing membership:', error);
      toast.error(error.response?.data?.detail || 'Failed to renew membership');
    }
  };

  const generateWhatsAppLink = (type) => {
    const phone = member.phone_number.replace(/[^0-9]/g, '');
    const phoneWithCode = phone.startsWith('91') ? phone : `91${phone}`;

    let message = '';
    if (type === 'expiry') {
      message = `Hi ${member.full_name}, your gym membership at Belgaonkar Fitness expires on ${format(
        new Date(member.expiry_date),
        'dd MMM yyyy'
      )}. Please renew soon to continue your fitness journey!`;
    } else if (type === 'inactive') {
      message = `Hi ${member.full_name}, we miss you at Belgaonkar Fitness! It's been a while since your last visit. Come back and continue your fitness journey with us!`;
    } else if (type === 'birthday') {
      message = `Happy Birthday ${member.full_name}! 🎉 Wishing you a fantastic year ahead. The Belgaonkar Fitness team is cheering for you!`;
    } else if (type === 'payment') {
      const pending = member.total_amount - member.amount_paid;
      message = `Hi ${member.full_name}, your pending payment for Belgaonkar Fitness is ₹${pending.toFixed(
        2
      )}. Please clear the dues at your earliest convenience.`;
    }

    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
  };

  const downloadInvoice = async (paymentId) => {
    try {
      const response = await axios.get(`${API}/invoice/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this member? This will remove all their data including payments and attendance.')) return;

    try {
      await axios.delete(`${API}/members/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Member deleted successfully');
      navigate('/members');
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-text-muted">Loading member profile...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Member not found</p>
      </div>
    );
  }

  const now = new Date();
  const expiry = new Date(member.expiry_date);
  const isExpired = expiry < now;
  const isExpiringSoon = !isExpired && expiry <= new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const pendingAmount = member.total_amount - member.amount_paid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/members')}
          data-testid="back-button"
          className="flex items-center text-text-muted hover:text-text-main mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Members
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">
              {member.full_name}
            </h1>
            <p className="text-text-muted mt-1">{member.phone_number}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowRenewModal(true)}
              data-testid="renew-member-button"
              className="inline-flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 h-12 px-6 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Renew
            </button>
            <Link
              to={`/members/${id}/edit`}
              data-testid="edit-member-button"
              className="inline-flex items-center justify-center bg-white border border-border text-text-main hover:bg-secondary h-12 px-6 rounded-lg font-medium transition-colors"
            >
              <Edit className="w-5 h-5 mr-2" />
              Edit
            </Link>
            {isAdmin && (
              <button
                onClick={handleDelete}
                data-testid="delete-member-button"
                className="inline-flex items-center justify-center bg-red-50 border border-red-200 text-status-error hover:bg-red-100 h-12 px-6 rounded-lg font-medium transition-colors"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5" data-testid="expired-alert">
          <p className="text-status-error font-medium">Membership Expired</p>
        </div>
      )}
      {isExpiringSoon && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5" data-testid="expiring-alert">
          <p className="text-status-warning font-medium">Membership Expiring Soon</p>
        </div>
      )}
      {attendanceStats?.qualifies_for_extension && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5" data-testid="extension-alert">
          <p className="text-status-info font-medium">Low Attendance Alert</p>
          <p className="text-sm text-text-main mt-1">{attendanceStats.message}</p>
        </div>
      )}

      {/* Member Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Member Details</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <Phone className="w-5 h-5 text-text-muted mr-3" />
              <span className="text-text-main">{member.phone_number}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-text-muted mr-3" />
              <div>
                <p className="text-sm text-text-muted">Join Date</p>
                <p className="text-text-main">{format(new Date(member.join_date), 'dd MMM yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-text-muted mr-3" />
              <div>
                <p className="text-sm text-text-muted">Expiry Date</p>
                <p className="text-text-main">{format(new Date(member.expiry_date), 'dd MMM yyyy')}</p>
              </div>
            </div>
            {member.assigned_trainer && (
              <div className="flex items-center">
                <UserCheck className="w-5 h-5 text-text-muted mr-3" />
                <div>
                  <p className="text-sm text-text-muted">Trainer</p>
                  <p className="text-text-main">{member.assigned_trainer}</p>
                </div>
              </div>
            )}
            {member.last_visit_date && (
              <div className="flex items-center">
                <UserCheck className="w-5 h-5 text-text-muted mr-3" />
                <div>
                  <p className="text-sm text-text-muted">Last Visit</p>
                  <p className="text-text-main">
                    {format(new Date(member.last_visit_date), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}
            {member.biometric_enabled && (
              <div className="flex items-center">
                <Fingerprint className="w-5 h-5 text-text-muted mr-3" />
                <div>
                  <p className="text-sm text-text-muted">Biometric Access</p>
                  <p className="text-text-main">Enabled (ID: {member.device_user_id})</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Package & Payment Info */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Package & Payment</h2>
          <div className="space-y-4">
            {memberPackage && (
              <div className="bg-background-subtle rounded-lg p-4">
                <p className="text-sm text-text-muted mb-1">Package</p>
                <p className="text-lg font-semibold text-text-main">{memberPackage.package_name}</p>
                <p className="text-sm text-text-muted">{memberPackage.duration_days} days</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-text-muted mb-1">Total</p>
                <p className="text-lg font-semibold text-text-main">₹{member.total_amount}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Paid</p>
                <p className="text-lg font-semibold text-status-success">₹{member.amount_paid}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Pending</p>
                <p className="text-lg font-semibold text-status-error">₹{pendingAmount.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              data-testid="add-payment-button"
              className="w-full bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
            >
              <DollarSign className="w-5 h-5 inline mr-2" />
              Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Actions */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href={`tel:${member.phone_number}`}
            data-testid="call-now-button"
            className="flex items-center justify-center bg-blue-50 text-status-info border border-blue-200 hover:bg-blue-100 h-12 px-4 rounded-lg font-medium transition-colors"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Now
          </a>
          {isExpiringSoon && (
            <a
              href={generateWhatsAppLink('expiry')}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="whatsapp-expiry"
              className="flex items-center justify-center bg-green-50 text-status-success border border-green-200 hover:bg-green-100 h-12 px-4 rounded-lg font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Expiry Reminder
            </a>
          )}
          <a
            href={generateWhatsAppLink('inactive')}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="whatsapp-inactive"
            className="flex items-center justify-center bg-green-50 text-status-success border border-green-200 hover:bg-green-100 h-12 px-4 rounded-lg font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Inactive Reminder
          </a>
          {pendingAmount > 0 && (
            <a
              href={generateWhatsAppLink('payment')}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="whatsapp-payment"
              className="flex items-center justify-center bg-green-50 text-status-success border border-green-200 hover:bg-green-100 h-12 px-4 rounded-lg font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Payment Reminder
            </a>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Payment History</h2>
        {payments.length === 0 ? (
          <p className="text-text-muted text-center py-8">No payments recorded</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-background-subtle rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-text-main">₹{payment.amount_paid}</p>
                  <p className="text-sm text-text-muted">
                    {format(new Date(payment.payment_date), 'dd MMM yyyy')} - {payment.payment_mode}
                  </p>
                  <p className="text-xs text-text-muted mt-1">{payment.invoice_number}</p>
                </div>
                <button
                  onClick={() => downloadInvoice(payment.id)}
                  data-testid={`download-invoice-${payment.id}`}
                  className="flex items-center text-primary hover:text-primary-hover"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Attendance History</h2>
        {attendance.length === 0 ? (
          <p className="text-text-muted text-center py-8">No attendance records</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {attendance.slice(0, 20).map((record) => (
              <div key={record.id} className="bg-background-subtle rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-text-main">
                  {format(new Date(record.checkin_time), 'dd MMM')}
                </p>
                <p className="text-xs text-text-muted">{format(new Date(record.checkin_time), 'HH:mm')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Membership Cycles History */}
      {member.membership_history && member.membership_history.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Previous Cycles</h2>
          <div className="space-y-3">
            {member.membership_history.map((cycle, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-background-subtle rounded-lg"
              >
                <div>
                  <p className="font-medium text-text-main">{cycle.package_name} ({cycle.duration_days} days)</p>
                  <p className="text-sm text-text-muted mt-0.5">
                    {format(new Date(cycle.start_date), 'dd MMM yyyy')} to {format(new Date(cycle.expiry_date), 'dd MMM yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-main">₹{cycle.total_amount}</p>
                  <p className="text-xs text-text-muted">Paid: ₹{cycle.amount_paid}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-text-main mb-4 font-heading">Record Payment</h3>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  data-testid="payment-amount-input"
                  className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  data-testid="payment-mode-select"
                  className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-white border border-border text-text-main hover:bg-secondary h-12 px-6 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-payment-button"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
                >
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 my-8">
            <h3 className="text-xl font-semibold text-text-main mb-4 font-heading">Renew Membership</h3>
            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-1.5">Package</label>
                <select
                  name="package_id"
                  value={renewData.package_id}
                  onChange={handleRenewChange}
                  required
                  className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="">Select Package</option>
                  {allPackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.package_name} ({pkg.duration_days} days)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1.5">Duration (days)</label>
                  <input
                    type="number"
                    name="duration_days"
                    value={renewData.duration_days}
                    readOnly
                    className="w-full h-12 px-4 rounded-lg border border-border bg-gray-100 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1.5">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="total_amount"
                    value={renewData.total_amount}
                    readOnly
                    className="w-full h-12 px-4 rounded-lg border border-border bg-gray-100 text-base"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1.5">Amount Paid</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount_paid"
                    value={renewData.amount_paid}
                    onChange={handleRenewChange}
                    required
                    className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1.5">Payment Mode</label>
                  <select
                    name="payment_mode"
                    value={renewData.payment_mode}
                    onChange={handleRenewChange}
                    className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="flex-1 bg-white border border-border text-text-main hover:bg-secondary h-12 px-6 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
                >
                  Renew
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberProfile;
