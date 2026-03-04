import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Save, Download, MessageCircle, CheckCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AddMember = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [hasPaymentHistory, setHasPaymentHistory] = useState(false);
  const [formData, setFormData] = useState({
    full_name: location.state?.name || '',
    phone_number: location.state?.phone_number || '',
    package_id: '',
    join_date: new Date().toISOString().split('T')[0],
    membership_start_date: new Date().toISOString().split('T')[0],
    total_amount: '',
    discount_amount: '0',
    amount_paid: '0',
    payment_mode: 'Cash',
    assigned_trainer: '',
    date_of_birth: '',
    pt_plan: '',
    pt_price: '0'
  });

  const [packagePrice, setPackagePrice] = useState(0);

  useEffect(() => {
    fetchPackages();
    if (isEdit) {
      fetchMember();
    }
  }, [id]);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/packages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPackages(response.data);

      // Auto-prefill package if navigating from Enquiries
      if (!isEdit && location.state?.package_interest) {
        const interest = location.state.package_interest;
        const matchedPkg = response.data.find(p =>
          p.package_name.toLowerCase() === interest.toLowerCase() ||
          p.duration_days.toString() === interest ||
          interest.toLowerCase().includes(p.package_name.toLowerCase())
        );
        if (matchedPkg) {
          setFormData(prev => ({
            ...prev,
            package_id: matchedPkg.id,
            total_amount: calculateTotal(matchedPkg.price, prev.discount_amount, prev.pt_price).toString()
          }));
          setPackagePrice(matchedPkg.price);
        }
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    }
  };

  const fetchMember = async () => {
    try {
      const response = await axios.get(`${API}/members/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const member = response.data;
      setFormData({
        full_name: member.full_name,
        phone_number: member.phone_number,
        package_id: member.package_id,
        join_date: member.join_date.split('T')[0],
        membership_start_date: member.membership_start_date?.split('T')[0] || member.join_date.split('T')[0],
        total_amount: member.total_amount.toString(),
        discount_amount: (member.discount_amount || 0).toString(),
        amount_paid: member.amount_paid.toString(),
        assigned_trainer: member.assigned_trainer || '',
        date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
        pt_plan: member.pt_plan || '',
        pt_price: (member.pt_price || 0).toString()
      });
      setHasPaymentHistory(member.amount_paid > 0);
    } catch (error) {
      console.error('Error fetching member:', error);
      toast.error('Failed to load member data');
    }
  };

  const calculateTotal = (pkgPrice, discount, ptPrice) => {
    const pkg = parseFloat(pkgPrice) || 0;
    const disc = parseFloat(discount) || 0;
    const pt = parseFloat(ptPrice) || 0;
    return pkg - disc + pt;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-fill package price when package is selected
      if (name === 'package_id') {
        const selectedPackage = packages.find((p) => p.id === value);
        if (selectedPackage) {
          setPackagePrice(selectedPackage.price);
          const total = calculateTotal(selectedPackage.price, updated.discount_amount, updated.pt_price);
          updated.total_amount = total.toString();
        }
      }

      // Handle PT plan change
      if (name === 'pt_plan') {
        if (value === 'alternate_day') {
          updated.pt_price = '4000';
        } else if (value === 'daily') {
          updated.pt_price = '6000';
        } else {
          updated.pt_price = '0';
        }
        const total = calculateTotal(packagePrice, updated.discount_amount, updated.pt_price);
        updated.total_amount = total.toString();
      }

      // Recalculate total when discount changes
      if (name === 'discount_amount') {
        const total = calculateTotal(packagePrice, value, updated.pt_price);
        updated.total_amount = total.toString();
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isEdit && parseFloat(formData.amount_paid) <= 0) {
      toast.error('Starting members must make an initial payment.');
      setLoading(false);
      return;
    }

    try {
      const submitData = {
        ...formData,
        total_amount: parseFloat(formData.total_amount),
        discount_amount: parseFloat(formData.discount_amount),
        amount_paid: parseFloat(formData.amount_paid),
        pt_price: parseFloat(formData.pt_price),
        join_date: new Date(formData.join_date).toISOString(),
        membership_start_date: new Date(formData.membership_start_date).toISOString(),
        payment_mode: formData.payment_mode,
        date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString() : null,
        pt_plan: formData.pt_plan || null
      };

      if (isEdit) {
        await axios.patch(`${API}/members/${id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Member updated successfully');
        navigate('/members');
      } else {
        const response = await axios.post(`${API}/members`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Mark Enquiry as Joined if we started from an Enquiry
        if (location.state?.enquiryId) {
          try {
            await axios.post(`${API}/enquiries/${location.state.enquiryId}/convert`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (err) {
            console.error('Error marking enquiry as joined:', err);
          }
        }

        toast.success('Member added successfully');

        // Show Invoice options
        if (submitData.amount_paid > 0) {
          try {
            const paymentsRes = await axios.get(`${API}/payments/member/${response.data.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (paymentsRes.data && paymentsRes.data.length > 0) {
              setSuccessData({ member: response.data, payment_id: paymentsRes.data[0].id });
              return; // Stay on page to show options
            }
          } catch (e) {
            console.error('Error fetching payments for invoice', e);
          }
        }
        navigate('/members');
      }
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error(error.response?.data?.detail || 'Failed to save member');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (paymentId, skipDownload = false) => {
    try {
      const response = await axios.get(`${API}/invoice/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      if (!skipDownload) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice_${paymentId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Invoice downloaded');
      }
      return response.data;
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
      throw error;
    }
  };

  const handleShareWhatsApp = () => {
    if (!successData) return;
    try {
      const invoiceUrl = `${API}/invoice/${successData.payment_id}`;
      const amountPaid = successData.member.amount_paid;
      const totalAmount = successData.member.total_amount;
      const balanceAmount = totalAmount - amountPaid;

      let message = `Hi ${successData.member.full_name},\n\nWe have received your payment of ₹${amountPaid}.`;

      if (balanceAmount > 0) {
        message += `\nYour pending balance is ₹${balanceAmount.toFixed(2)}.`;
      }

      message += `\n\nDownload your invoice here:\n${invoiceUrl}\n\nThank you for training with Belgaonkar Fitness`;

      let phone = successData.member.phone_number.replace(/[^0-9]/g, '');
      if (!phone.startsWith('91') && phone.length === 10) {
        phone = `91${phone}`;
      } else if (!phone.startsWith('91')) {
        phone = `91${phone}`; // Fallback to ensure 91 prefix
      }

      const encodedMessage = encodeURIComponent(message);
      const waLink = `https://wa.me/${phone}?text=${encodedMessage}`;

      window.open(waLink, '_blank');
    } catch (error) {
      console.error("WhatsApp share error", error);
      toast.error('Failed to open WhatsApp.');
    }
  };

  const finalAmount = parseFloat(formData.total_amount) || 0;
  const discountAmt = parseFloat(formData.discount_amount) || 0;
  const ptAmt = parseFloat(formData.pt_price) || 0;

  if (successData) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white rounded-xl border border-border shadow-sm p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-status-success" />
        </div>
        <h2 className="text-3xl font-bold text-text-main mb-2">Member Created Successfully!</h2>
        <p className="text-text-muted mb-8">
          The membership for {successData.member.full_name} has been processed successfully.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => downloadInvoice(successData.payment_id)}
            className="w-full flex items-center justify-center bg-white border-2 border-primary text-primary hover:bg-primary-light h-14 px-6 rounded-lg font-semibold transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Invoice
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center justify-center bg-[#25D366] text-white hover:bg-[#20BE5A] h-14 px-6 rounded-lg font-semibold transition-colors shadow-sm"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Share via WhatsApp
          </button>
        </div>

        <button
          onClick={() => navigate('/members')}
          className="mt-8 text-text-muted hover:text-text-main font-medium underline-offset-4 hover:underline transition-all"
        >
          Return to Members List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('/members')}
          data-testid="back-button"
          className="flex items-center text-text-muted hover:text-text-main mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Members
        </button>
        <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">
          {isEdit ? 'Edit Member' : 'Add New Member'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-text-main mb-1.5">
                Full Name *
              </label>
              <input
                id="full_name"
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                data-testid="full-name-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-text-main mb-1.5">
                Phone Number *
              </label>
              <input
                id="phone_number"
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                required
                data-testid="phone-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-text-main mb-1.5">
                Date of Birth
              </label>
              <input
                id="date_of_birth"
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                data-testid="dob-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label htmlFor="assigned_trainer" className="block text-sm font-medium text-text-main mb-1.5">
                Assigned Trainer
              </label>
              <input
                id="assigned_trainer"
                type="text"
                name="assigned_trainer"
                value={formData.assigned_trainer}
                onChange={handleChange}
                data-testid="trainer-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Trainer name (optional)"
              />
            </div>
          </div>
        </div>

        {/* Package & Membership Details */}
        <div>
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Package & Membership</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="package_id" className="block text-sm font-medium text-text-main mb-1.5">
                Package *
              </label>
              {hasPaymentHistory && (
                <p className="text-xs text-status-warning mb-2 font-medium">Locked: Financial history exists.</p>
              )}
              <select
                id="package_id"
                name="package_id"
                value={formData.package_id}
                onChange={handleChange}
                required
                disabled={hasPaymentHistory}
                data-testid="package-select"
                className={`w-full h-12 px-4 pr-10 rounded-lg border border-border text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${hasPaymentHistory ? 'bg-gray-100 text-text-muted cursor-not-allowed' : 'bg-white'
                  }`}
              >
                <option value="">Select a package</option>
                {packages.length === 0 && <option value="" disabled>No packages available. Please add packages first.</option>}
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.package_name} ({pkg.duration_days} days) - ₹{pkg.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="discount_amount" className="block text-sm font-medium text-text-main mb-1.5">
                Discount Amount
              </label>
              {hasPaymentHistory && (
                <p className="text-xs text-status-warning mb-2 font-medium">Locked: Financial history exists.</p>
              )}
              <input
                id="discount_amount"
                type="number"
                step="0.01"
                name="discount_amount"
                value={formData.discount_amount}
                onChange={handleChange}
                disabled={hasPaymentHistory}
                data-testid="discount-input"
                className={`w-full h-12 px-4 rounded-lg border border-border text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${hasPaymentHistory ? 'bg-gray-100 text-text-muted cursor-not-allowed' : 'bg-white'
                  }`}
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="join_date" className="block text-sm font-medium text-text-main mb-1.5">
                Payment Date *
              </label>
              <input
                id="join_date"
                type="date"
                name="join_date"
                value={formData.join_date}
                onChange={handleChange}
                required
                data-testid="join-date-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label htmlFor="membership_start_date" className="block text-sm font-medium text-text-main mb-1.5">
                Membership Start Date *
              </label>
              <input
                id="membership_start_date"
                type="date"
                name="membership_start_date"
                value={formData.membership_start_date}
                onChange={handleChange}
                required
                data-testid="membership-start-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Personal Training */}
        <div>
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Personal Training (PT)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="pt_plan" className="block text-sm font-medium text-text-main mb-1.5">
                PT Plan
              </label>
              {hasPaymentHistory && (
                <p className="text-xs text-status-warning mb-2 font-medium">Locked: Financial history exists.</p>
              )}
              <select
                id="pt_plan"
                name="pt_plan"
                value={formData.pt_plan}
                onChange={handleChange}
                disabled={hasPaymentHistory}
                data-testid="pt-plan-select"
                className={`w-full h-12 px-4 rounded-lg border border-border text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${hasPaymentHistory ? 'bg-gray-100 text-text-muted cursor-not-allowed' : 'bg-white'
                  }`}
              >
                <option value="">No PT</option>
                <option value="alternate_day">Alternate Day Training - ₹4,000/month</option>
                <option value="daily">Daily Training - ₹6,000/month</option>
              </select>
            </div>

            {formData.pt_plan && (
              <div>
                <label htmlFor="pt_price" className="block text-sm font-medium text-text-main mb-1.5">
                  PT Price (auto-filled)
                </label>
                {hasPaymentHistory && (
                  <p className="text-xs text-status-warning mb-2 font-medium">Locked: Financial history exists.</p>
                )}
                <input
                  id="pt_price"
                  type="number"
                  step="0.01"
                  name="pt_price"
                  value={formData.pt_price}
                  readOnly
                  disabled={hasPaymentHistory}
                  data-testid="pt-price-input"
                  className={`w-full h-12 px-4 rounded-lg border border-border text-base ${hasPaymentHistory ? 'bg-gray-100 text-text-muted cursor-not-allowed' : 'bg-gray-100'
                    }`}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-primary-light border border-primary/20 rounded-lg p-5">
          <h3 className="font-semibold text-text-main mb-3">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Package Price:</span>
              <span className="font-medium">₹{packagePrice.toFixed(2)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-status-error">
                <span>Discount:</span>
                <span className="font-medium">-₹{discountAmt.toFixed(2)}</span>
              </div>
            )}
            {ptAmt > 0 && (
              <div className="flex justify-between text-primary">
                <span>PT Charges:</span>
                <span className="font-medium">+₹{ptAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-text-main pt-2 border-t border-primary/20">
              <span>Total Amount:</span>
              <span>₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h2 className="text-xl font-semibold text-text-main mb-4 font-heading">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="total_amount" className="block text-sm font-medium text-text-main mb-1.5">
                Total Amount (auto-calculated)
              </label>
              {hasPaymentHistory && (
                <p className="text-xs text-status-warning mb-2 font-medium">Locked: Financial history exists.</p>
              )}
              <input
                id="total_amount"
                type="number"
                step="0.01"
                name="total_amount"
                value={formData.total_amount}
                readOnly
                className="w-full h-12 px-4 rounded-lg border border-border bg-gray-100 text-base"
              />
            </div>

            <div>
              <label htmlFor="amount_paid" className="block text-sm font-medium text-text-main mb-1.5">
                Amount Paid Now
              </label>
              <input
                id="amount_paid"
                type="number"
                step="0.01"
                name="amount_paid"
                value={formData.amount_paid}
                onChange={handleChange}
                data-testid="amount-paid-input"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="payment_mode" className="block text-sm font-medium text-text-main mb-1.5">
                Payment Mode
              </label>
              <select
                id="payment_mode"
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                data-testid="payment-mode-select"
                className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="flex-1 bg-white border border-border text-text-main hover:bg-secondary h-12 px-6 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            data-testid="submit-member-button"
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5 inline mr-2" />
            {loading ? 'Saving...' : isEdit ? 'Update Member' : 'Add Member'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddMember;
