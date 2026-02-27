import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Download, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Payments = () => {
  const { token, isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchPayments();
    }
  }, [isAdmin]);

  const fetchPayments = async () => {
    try {
      const [paymentsRes, membersRes] = await Promise.all([
        axios.get(`${API}/payments`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/members`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setPayments(paymentsRes.data);
      
      // Create member lookup
      const memberMap = {};
      membersRes.data.forEach(m => {
        memberMap[m.id] = m;
      });
      setMembers(memberMap);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
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

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
        <p className="text-text-muted">Only admins can view all payments</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-text-muted">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Payments</h1>
        <p className="text-text-muted mt-1">All payment transactions</p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
          <DollarSign className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No payments recorded</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-subtle border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Invoice</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Member</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Mode</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-text-main">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => {
                  const member = members[payment.member_id];
                  return (
                    <tr key={payment.id} className="hover:bg-background-subtle transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-mono text-text-main">{payment.invoice_number}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-text-main">{member?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-text-muted">{member?.phone_number}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-status-success">₹{payment.amount_paid}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-text-main border border-border px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {payment.payment_mode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-text-muted">
                          {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => downloadInvoice(payment.id)}
                          data-testid={`download-invoice-${payment.id}`}
                          className="flex items-center text-primary hover:text-primary-hover"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {payments.map((payment) => {
              const member = members[payment.member_id];
              return (
                <div key={payment.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-text-main">{member?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-text-muted">{member?.phone_number}</p>
                    </div>
                    <p className="text-lg font-bold text-status-success">₹{payment.amount_paid}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="text-xs text-text-muted">Payment Mode</p>
                      <p className="text-sm text-text-main">{payment.payment_mode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Date</p>
                      <p className="text-sm text-text-main">
                        {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <p className="text-xs font-mono text-text-muted">{payment.invoice_number}</p>
                    <button
                      onClick={() => downloadInvoice(payment.id)}
                      className="flex items-center text-primary hover:text-primary-hover text-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Invoice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
