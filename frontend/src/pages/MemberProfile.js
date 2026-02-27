import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Phone,
  Calendar,
  DollarSign,
  UserCheck,
  Edit,
  MessageCircle,
  CreditCard,
  Download
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
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  useEffect(() => {
    fetchMemberData();
  }, [id]);

  const fetchMemberData = async () => {
    try {
      const [memberRes, attendanceRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/members/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/attendance/member/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/payments/member/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setMember(memberRes.data);
      setAttendance(attendanceRes.data);
      setPayments(paymentsRes.data);

      // Fetch package details
      const packageRes = await axios.get(`${API}/packages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      toast.success('Invoice downloaded');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
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
          <div className="flex gap-2">
            <Link
              to={`/members/${id}/edit`}
              data-testid="edit-member-button"
              className="inline-flex items-center justify-center bg-white border border-border text-text-main hover:bg-secondary h-12 px-6 rounded-lg font-medium transition-colors"
            >
              <Edit className="w-5 h-5 mr-2" />
              Edit
            </Link>
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
        <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">WhatsApp Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <a
            href={generateWhatsAppLink('birthday')}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="whatsapp-birthday"
            className="flex items-center justify-center bg-green-50 text-status-success border border-green-200 hover:bg-green-100 h-12 px-4 rounded-lg font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Birthday Wish
          </a>
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
    </div>
  );
};

export default MemberProfile;
