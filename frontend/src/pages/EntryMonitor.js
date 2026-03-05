import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Activity, CheckCircle, XCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EntryMonitor = () => {
    const { token } = useAuth();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchEntries = async () => {
        try {
            // For now polling from member attendance. In a perfect world, we'd have a websocket or specific query.
            // We will just fetch the latest attendance from recently checked in members and sort it securely.
            const response = await axios.get(`${API}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter out those who haven't visited
            const members = response.data.filter(m => m.last_visit_date);
            // Let's create an events array
            const mappedEntries = await Promise.all(
                members.slice(0, 20).map(async (m) => {
                    const stats = await axios.get(`${API}/attendance/member/${m.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (stats.data.length > 0) {
                        const entry = stats.data[0];
                        return {
                            id: entry.id,
                            memberName: m.full_name,
                            checkinTime: new Date(entry.checkin_time),
                            source: entry.attendance_source || 'manual',
                            status: entry.access_status || 'granted',
                            reason: entry.access_denied_reason
                        };
                    }
                    return null;
                })
            );

            const validEntries = mappedEntries
                .filter(e => e !== null)
                .sort((a, b) => b.checkinTime - a.checkinTime)
                .slice(0, 50);

            setEntries(validEntries);
        } catch (error) {
            console.error('Error fetching entries:', error);
            toast.error('Failed to load live entries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
        // Poll every 10 seconds for real-time vibe
        const interval = setInterval(fetchEntries, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-lg text-text-muted">Loading entry logs...</div>
            </div>
        );
    }

    const formatTime = (dateOb) => {
        return dateOb.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary animate-pulse" /> Live Entry Monitor
                    </h1>
                    <p className="text-text-muted mt-1">Real-time gym access logs from biometric devices</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-secondary/50 text-text-muted text-sm uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-semibold">Time</th>
                            <th className="p-4 font-semibold">Member Name</th>
                            <th className="p-4 font-semibold">Source</th>
                            <th className="p-4 font-semibold text-right">Access Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-text-muted">No entry logs found today.</td>
                            </tr>
                        ) : (
                            entries.map(entry => (
                                <tr key={entry.id} className="hover:bg-secondary/30 transition-colors">
                                    <td className="p-4 font-medium text-text-main whitespace-nowrap">
                                        {formatTime(entry.checkinTime)}
                                    </td>
                                    <td className="p-4 font-semibold text-text-main">{entry.memberName}</td>
                                    <td className="p-4 text-text-muted capitalize">
                                        <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${entry.source === 'biometric' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {entry.source}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {entry.status === 'granted' ? (
                                            <div className="inline-flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium text-sm">
                                                <CheckCircle className="w-4 h-4 mr-1.5" /> Access Granted
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center text-red-600 bg-red-50 px-3 py-1 rounded-full font-medium text-sm">
                                                <XCircle className="w-4 h-4 mr-1.5" /> Access Denied {entry.reason && <span className="text-xs ml-1 opacity-80">({entry.reason})</span>}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EntryMonitor;
