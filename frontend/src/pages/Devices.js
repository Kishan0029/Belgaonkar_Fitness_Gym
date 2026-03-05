import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2, Fingerprint, Wifi, WifiOff, Settings } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Devices = () => {
    const { token, isAdmin } = useAuth();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);

    const [formData, setFormData] = useState({
        device_name: '',
        ip_address: '',
        port: 4370,
        device_type: 'zkteco'
    });

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            const response = await axios.get(`${API}/devices`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDevices(response.data);
        } catch (error) {
            console.error('Error fetching devices:', error);
            toast.error('Failed to load devices');
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async (deviceId) => {
        toast.loading('Testing connection...', { id: 'test-conn' });
        try {
            const response = await axios.post(`${API}/devices/${deviceId}/test`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.status === 'success') {
                toast.success(response.data.message || 'Connected successfully', { id: 'test-conn' });
            } else {
                toast.error(response.data.message || 'Connection failed', { id: 'test-conn' });
            }
            fetchDevices();
        } catch (error) {
            toast.error('Test connection error', { id: 'test-conn' });
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDevice) {
                await axios.patch(
                    `${API}/devices/${editingDevice.id}`,
                    { ...formData },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success('Device updated successfully');
            } else {
                await axios.post(
                    `${API}/devices`,
                    { ...formData },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success('Device added successfully');
            }
            setShowModal(false);
            setEditingDevice(null);
            setFormData({ device_name: '', ip_address: '', port: 4370, device_type: 'zkteco' });
            fetchDevices();
        } catch (error) {
            console.error('Error saving device:', error);
            toast.error(error.response?.data?.detail || 'Failed to save device');
        }
    };

    const openEditModal = (device) => {
        setEditingDevice(device);
        setFormData({
            device_name: device.device_name,
            ip_address: device.ip_address,
            port: device.port,
            device_type: device.device_type
        });
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-lg text-text-muted">Loading devices...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Biometric Devices</h1>
                    <p className="text-text-muted mt-1">Manage network biometric and EM lock devices</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => {
                            setEditingDevice(null);
                            setFormData({ device_name: '', ip_address: '', port: 4370, device_type: 'zkteco' });
                            setShowModal(true);
                        }}
                        className="inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Device
                    </button>
                )}
            </div>

            {devices.length === 0 ? (
                <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
                    <Fingerprint className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <p className="text-text-muted">No devices found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {devices.map((device) => (
                        <div
                            key={device.id}
                            className="bg-white rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow relative"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${device.status === 'Connected' ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {device.status === 'Connected' ? (
                                            <Wifi className="w-6 h-6 text-green-600" />
                                        ) : (
                                            <WifiOff className="w-6 h-6 text-red-600" />
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-xl font-bold text-text-main">{device.device_name}</h3>
                                        <p className="text-sm text-text-muted flex items-center gap-2">
                                            {device.ip_address}:{device.port}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="py-3 border-t border-border mt-2 space-y-1">
                                <p className="text-sm">
                                    Status: <span className={`font-medium ${device.status === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>{device.status}</span>
                                </p>
                                <p className="text-sm text-text-muted">
                                    Last Sync: {device.last_sync ? new Date(device.last_sync).toLocaleString() : 'Never'}
                                </p>
                                <p className="text-sm text-text-muted">
                                    Type: <span className="uppercase">{device.device_type}</span>
                                </p>
                            </div>
                            {isAdmin && (
                                <div className="pt-3 border-t border-border flex justify-between">
                                    <button
                                        onClick={() => handleTestConnection(device.id)}
                                        className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">
                                        Test Connection
                                    </button>
                                    <button
                                        onClick={() => openEditModal(device)}
                                        className="p-1 px-2 text-text-muted hover:text-primary bg-secondary rounded-lg transition-colors flex items-center gap-1">
                                        <Settings className="w-4 h-4" /> Edit
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Device Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-semibold text-text-main mb-4 font-heading">
                            {editingDevice ? 'Edit Device' : 'Add New Device'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-1.5">Device Name *</label>
                                <input
                                    type="text"
                                    value={formData.device_name}
                                    onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                                    required
                                    className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="e.g. Main Entrance Gate"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-1.5">IP Address *</label>
                                <input
                                    type="text"
                                    value={formData.ip_address}
                                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                                    required
                                    className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="192.168.1.201"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-1.5">Port *</label>
                                <input
                                    type="number"
                                    value={formData.port}
                                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                                    required
                                    className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="4370"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-1.5">Device Type *</label>
                                <select
                                    value={formData.device_type}
                                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                                    required
                                    className="w-full h-12 px-4 rounded-lg border border-border bg-white text-base focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                >
                                    <option value="zkteco">ZKTeco / eSSL</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-white border border-border text-text-main hover:bg-secondary h-12 px-6 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-12 px-6 rounded-lg font-semibold shadow-sm transition-colors"
                                >
                                    {editingDevice ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Devices;
