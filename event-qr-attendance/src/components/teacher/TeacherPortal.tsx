import React, { useState, useEffect } from 'react';
import {
  Search,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Ticket,
  UserCheck,
  LogOut,
  RefreshCw,
  Hash,
  Mail,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { User, Event, Registration } from '../../types';
import { UserDatabaseService, UserDatabaseRecord } from '../../services/userDatabase';
import { EventDatabaseService } from '../../services/eventDatabase';
import { StorageRepository } from '../../services/storage';

interface TeacherPortalProps {
  currentUser: User;
  onSignOut: () => void;
  onSwitchPortalView?: (view: 'admin' | 'organizer' | 'teacher' | 'user') => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  currentUser,
  onSignOut,
  onSwitchPortalView,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<UserDatabaseRecord | null>(null);

  const [allUsers, setAllUsers] = useState<UserDatabaseRecord[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load all student accounts, events, and registrations from Realtime Database
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Users
      const dbUsers = await UserDatabaseService.getAllUsersFromRealtimeDB();
      if (dbUsers && dbUsers.length > 0) {
        setAllUsers(dbUsers);
        StorageRepository.setUsers(dbUsers);
      } else {
        const localUsers = StorageRepository.getUsers();
        setAllUsers(
          localUsers.map((u) => ({
            ...u,
            authProvider: 'password',
            createdAt: u.lastLogin || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        );
      }

      // 2. Events
      const dbEvents = await EventDatabaseService.getEventsFromRealtimeDB();
      const localEvents = StorageRepository.getEvents();
      const eventMap = new Map<string, Event>();
      localEvents.forEach((e) => eventMap.set(e.id, e));
      dbEvents.forEach((e) => eventMap.set(e.id, e));
      setAllEvents(Array.from(eventMap.values()));

      // 3. Registrations
      const dbRegs = await EventDatabaseService.getRegistrationsFromRealtimeDB();
      const localRegs = StorageRepository.getRegistrations();
      const regMap = new Map<string, Registration>();
      localRegs.forEach((r) => regMap.set(r.id, r));
      dbRegs.forEach((r) => regMap.set(r.id, r));
      setAllRegistrations(Array.from(regMap.values()));
    } catch (err) {
      console.warn('Teacher portal sync notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Background polling every 4 seconds for real-time check-in updates
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filter students based on search query (by registrationNumber, name, or email)
  const matchingStudents = allUsers.filter((u) => {
    if (u.role === 'admin' || u.role === 'organizer') return false; // Show student attendees
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      (u.registrationNumber || '').toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Calculate selected student's registrations and attendance records (only for existing events)
  const validEventIds = new Set(allEvents.map((e) => e.id));
  const studentRegistrations = selectedStudent
    ? allRegistrations.filter(
        (r) =>
          validEventIds.has(r.eventId) &&
          (r.attendeeEmail.toLowerCase() === selectedStudent.email.toLowerCase() ||
            (selectedStudent.registrationNumber &&
              r.registrationNumber?.toLowerCase() === selectedStudent.registrationNumber.toLowerCase()))
      )
    : [];

  const isCheckedInReg = (r: Registration) => {
    if (r.status === 'checked_in' || !!r.checkedInAt) return true;
    const attList = StorageRepository.getAttendanceRecords();
    return attList.some(
      (a) =>
        a.registrationId === r.id ||
        (a.attendeeEmail?.toLowerCase() === r.attendeeEmail?.toLowerCase() && a.eventId === r.eventId)
    );
  };

  const attendedCount = studentRegistrations.filter(isCheckedInReg).length;
  const totalEventsCount = studentRegistrations.length;
  const attendanceRate = totalEventsCount > 0 ? Math.round((attendedCount / totalEventsCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-500 selection:text-white pb-24">
      {/* 1. TOP TEACHER NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-3 sm:px-8 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Brand & Faculty Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-black shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 truncate">Faculty Portal</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-amber-200 shrink-0">
                  Teacher
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono hidden sm:block">
                Student Attendance Verification &amp; Check-In Lookup
              </p>
            </div>
          </div>

          {/* Teacher Profile & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick Switch for Admin */}
            {currentUser.role === 'admin' && onSwitchPortalView && (
              <button
                onClick={() => onSwitchPortalView('admin')}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                ← Back to Admin
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-amber-600 active:scale-95 shadow-xs transition-all cursor-pointer"
              title="Refresh Realtime Database"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            {/* Teacher Badge */}
            <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'}
                alt={currentUser.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border-2 border-amber-200 shadow-xs"
              />
              <div className="hidden md:block text-left">
                <span className="text-xs font-black text-slate-900 block leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">Faculty Member</span>
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 active:scale-95 border border-slate-200 shadow-xs transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. SEARCH & ATTENDANCE VERIFICATION INTERFACE */}
      <main className="max-w-5xl mx-auto px-3 sm:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        {/* Search Hero Box */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Search Student by Register Number</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Check Student <span className="text-amber-600">Event Attendance</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Type any student registration ID, roll number, or name below to instantly view all events they attended and their verified gate check-in status.
          </p>

          {/* Large Search Input */}
          <div className="max-w-2xl mx-auto pt-2 sm:pt-4">
            <div className="relative shadow-md rounded-3xl overflow-hidden border-2 border-amber-200 focus-within:border-amber-500 transition-all bg-white">
              <Search className="w-5 h-5 text-amber-600 absolute left-4 sm:left-5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Enter Student Register Number (e.g. 21BCE0491...)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) {
                    setSelectedStudent(null);
                  }
                }}
                className="w-full pl-12 sm:pl-14 pr-12 py-3.5 sm:py-4 text-xs sm:text-base font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none bg-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStudent(null);
                  }}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer font-bold text-xs active:scale-95"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Quick Suggestions / Sample IDs for Testing */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 text-[11px] text-slate-500">
              <span className="font-semibold">Try sample IDs:</span>
              {allUsers
                .filter((u) => u.role !== 'admin' && u.role !== 'organizer' && u.registrationNumber)
                .slice(0, 3)
                .map((sampleUser) => (
                  <button
                    key={sampleUser.id}
                    onClick={() => {
                      setSearchQuery(sampleUser.registrationNumber || '');
                      setSelectedStudent(sampleUser);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-200 font-mono font-bold cursor-pointer transition-all"
                  >
                    {sampleUser.registrationNumber}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Search Results Dropdown List (if multiple matches found and not yet selected) */}
        {searchQuery.trim() && matchingStudents.length > 0 && !selectedStudent && (
          <div className="max-w-2xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden animate-fade-in divide-y divide-slate-100">
            <div className="p-3 bg-slate-50 text-[11px] font-mono font-bold text-slate-500 uppercase px-5">
              Found {matchingStudents.length} Matching Student(s) — Click to inspect
            </div>
            {matchingStudents.map((st) => (
              <div
                key={st.id}
                onClick={() => setSelectedStudent(st)}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-amber-50/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={st.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={st.name}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-xs"
                  />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                      {st.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                      <span className="font-bold text-amber-700">{st.registrationNumber || 'No Register ID'}</span>
                      <span>• {st.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State when no matches */}
        {searchQuery.trim() && matchingStudents.length === 0 && (
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2 shadow-sm">
            <UserIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-black text-slate-800">No Student Found</h4>
            <p className="text-xs text-slate-500">
              No student records matched "{searchQuery}". Please verify the register number or roll ID.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* STUDENT ATTENDANCE REPORT CARD (WHEN STUDENT IS SELECTED) */}
        {/* ========================================================= */}
        {selectedStudent && (
          <div className="space-y-6 animate-fade-in">
            {/* Student Profile & Overview Header */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedStudent.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={selectedStudent.name}
                    className="w-16 h-16 rounded-3xl object-cover border-2 border-amber-300 shadow-md"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-900">{selectedStudent.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-extrabold uppercase">
                        {selectedStudent.status || 'Active'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono">
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ID: {selectedStudent.registrationNumber || 'N/A'}
                      </span>
                      <span>{selectedStudent.email}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
                >
                  ← Search Another Student
                </button>
              </div>

              {/* Attendance KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Metric 1 */}
                <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">Total Registered Events</span>
                  <span className="text-3xl font-black text-slate-900 font-mono block">{totalEventsCount}</span>
                </div>

                {/* Metric 2 */}
                <div className="p-4.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-[11px] font-mono text-emerald-800 uppercase font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Attended</span>
                  </span>
                  <span className="text-3xl font-black text-emerald-800 font-mono block">{attendedCount}</span>
                </div>

                {/* Metric 3 */}
                <div className="p-4.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                  <span className="text-[11px] font-mono text-amber-900 uppercase font-bold">Overall Attendance Score</span>
                  <span className="text-3xl font-black text-amber-900 font-mono block">{attendanceRate}%</span>
                </div>
              </div>

              {/* Events & Attendance Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Events Attended &amp; Registered List ({studentRegistrations.length})
                    </h4>
                  </div>
                </div>

                {studentRegistrations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    This student has not registered for any events yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentRegistrations.map((reg) => {
                      const evt = allEvents.find((e) => e.id === reg.eventId);
                      const isCheckedIn = isCheckedInReg(reg);

                      return (
                        <div
                          key={reg.id}
                          className={`p-4.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                            isCheckedIn
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                                {reg.reference}
                              </span>
                              <h5 className="text-sm font-black text-slate-900">
                                {evt?.title || 'Campus Event'}
                              </h5>
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-3">
                              <span>Venue: <strong>{evt?.venueName || 'Campus Venue'}</strong></span>
                              <span>• Date: {evt ? new Date(evt.startDate).toLocaleDateString() : 'N/A'}</span>
                              {reg.checkedInAt && (
                                <span className="font-mono text-emerald-700">
                                  • Scanned at: {new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Attendance Status Badge */}
                          <div className="shrink-0">
                            {isCheckedIn ? (
                              <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs flex items-center gap-1.5 shadow-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Checked In (Attended ✓)</span>
                              </span>
                            ) : (
                              <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 font-bold text-xs flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 text-slate-400" />
                                <span>Not Checked In</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
