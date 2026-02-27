import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Search, UserCheck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Attendance = () => {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(`${API}/members/search/${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching members:', error);
      toast.error('Failed to search members');
    } finally {
      setSearching(false);
    }
  };

  const markAttendance = async (memberId, memberName) => {
    try {
      await axios.post(
        `${API}/attendance`,
        { member_id: memberId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Attendance marked for ${memberName}`);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error(error.response?.data?.detail || 'Failed to mark attendance');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-main font-heading">Mark Attendance</h1>
        <p className="text-text-muted mt-1">Search and check-in members</p>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or phone number"
            data-testid="attendance-search"
            className="w-full h-16 pl-14 pr-4 rounded-lg border-2 border-border bg-white text-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted"
            autoFocus
          />
        </div>

        {searching && (
          <div className="mt-4 text-center text-text-muted">Searching...</div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((member) => {
              const isExpired = new Date(member.expiry_date) < new Date();
              return (
                <button
                  key={member.id}
                  onClick={() => markAttendance(member.id, member.full_name)}
                  data-testid={`attendance-member-${member.id}`}
                  className="w-full flex items-center justify-between p-4 bg-background-subtle hover:bg-secondary rounded-lg transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-text-main">{member.full_name}</p>
                    <p className="text-sm text-text-muted">{member.phone_number}</p>
                    {isExpired && (
                      <span className="inline-block mt-1 bg-red-50 text-status-error border border-red-200 px-2 py-0.5 rounded-full text-xs font-medium">
                        Membership Expired
                      </span>
                    )}
                  </div>
                  <CheckCircle className="w-8 h-8 text-primary" />
                </button>
              );
            })}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <div className="mt-4 text-center text-text-muted">No members found</div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-primary-light border border-primary/20 rounded-xl p-5">
        <h3 className="font-semibold text-text-main mb-2">How to use:</h3>
        <ul className="text-sm text-text-main space-y-1">
          <li>1. Type member's name or phone number</li>
          <li>2. Select the member from results</li>
          <li>3. Attendance will be marked instantly</li>
          <li>4. Members can check-in only once per day</li>
        </ul>
      </div>
    </div>
  );
};

export default Attendance;
