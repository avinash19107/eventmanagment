import React, { useState, useEffect } from 'react';
import { Event, User, Registration, AttendanceRecord } from '../../types';
import { EventDatabaseService } from '../../services/eventDatabase';
import { UserDatabaseService, UserDatabaseRecord } from '../../services/userDatabase';
import { StorageRepository } from '../../services/storage';
import { CreateEventModal } from '../events/CreateEventModal';
import {
  QrCode,
  Calendar,
  Users,
  Plus,
  LogOut,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Flame,
  Award,
  Clock,
  ArrowRight,
  UserCheck,
  Eye,
  RefreshCw,
  Lock,
  Unlock,
  Key,
  Shield
} from 'lucide-react';

interface OrganizerPortalProps {
  currentUser: User;
  onSignOut: () => void;
  onSwitchToUserView: () => void;
  onViewEventPage: (event: Event) => void;
}

export const OrganizerPortal: React.FC<OrganizerPortalProps> = ({
  currentUser,
  onSignOut,
  onSwitchToUserView,
  onViewEventPage,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // User Management State for Admin Profile Unlock
  const [allUserRecords, setAllUserRecords] = useState<UserDatabaseRecord[]>([]);
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);

  // QR Scanner / Manual Verification State
  const [scanInputRef, setScanInputRef] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; reg?: Registration } | null>(null);

  // Load events & user profiles live from Firebase Realtime Database
  const loadData = async () => {
    const rtdbEvents = await EventDatabaseService.getEventsFromRealtimeDB();
    const myEvents = rtdbEvents.filter(
      (e) => e.organizerEmail.toLowerCase() === currentUser.email.toLowerCase() || currentUser.role === 'admin' || currentUser.role === 'organizer'
    );
    setEvents(myEvents);

    // Load registered users for Admin edit lock management
    const users = await UserDatabaseService.getAllUsersFromRealtimeDB();
    setAllUserRecords(users);
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Admin Action: Unlock User Profile Edit Permission
  const handleUnlockUserEdit = async (targetUser: UserDatabaseRecord) => {
    try {
      await UserDatabaseService.unlockUserEditPermission(targetUser.id);
      setUnlockNotice(`🔓 Unlocked profile edit permission for ${targetUser.name} (${targetUser.email})!`);
      await loadData();
      setTimeout(() => setUnlockNotice(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to unlock user.');
    }
  };

  const allRegistrations = StorageRepository.getRegistrations();
  const allAttendance = StorageRepository.getAttendanceRecords();

  // Calculate Metrics
  const totalRegistrations = allRegistrations.length;
  const totalCheckIns = allAttendance.length;

  // Filter Registrations by selected event
  const displayedRegistrations = allRegistrations.filter(
    (r) => selectedEventId === 'all' || r.eventId === selectedEventId
  );

  // Handle QR Check-in verification
  const handleVerifyCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    setScanResult(null);

    const refInput = scanInputRef.trim().toUpperCase();
    if (!refInput) return;

    // Search registration by reference ID or email
    const reg = allRegistrations.find(
      (r) => r.reference.toUpperCase() === refInput || r.attendeeEmail.toLowerCase() === refInput.toLowerCase()
    );

    if (!reg) {
      setScanResult({
        success: false,
        message: `No active ticket registration found for code or email "${refInput}".`,
      });
      return;
    }

    // Check if already checked in
    const existingCheckIn = allAttendance.find((a) => a.registrationId === reg.id);
    if (existingCheckIn) {
      setScanResult({
        success: false,
        message: `Attendee ${reg.attendeeName} (${reg.reference}) is ALREADY CHECKED IN at ${new Date(existingCheckIn.checkInTime).toLocaleTimeString()}.`,
        reg,
      });
      return;
    }

    // Record Check-in
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      registrationId: reg.id,
      eventId: reg.eventId,
      attendeeName: reg.attendeeName,
      attendeeEmail: reg.attendeeEmail,
      checkInTime: new Date().toISOString(),
      staffUserId: currentUser.id,
      staffName: currentUser.name,
      stationId: 'stn-gate1',
      method: 'qr_scan',
    };

    StorageRepository.saveAttendanceRecord(newRecord);

    setScanResult({
      success: true,
      message: `SUCCESS! Ticket ${reg.reference} Verified for ${reg.attendeeName} (${reg.attendeeEmail}). Attendance Recorded!`,
      reg,
    });
    setScanInputRef('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white pb-24">
      {/* 1. ORGANIZER HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/90 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">Organizer Command Portal</span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  ID: {currentUser.email}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Firebase RTDB Event Management & Attendee Check-In Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSwitchToUserView}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-xs transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">User Portal View</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Host New Event</span>
            </button>

            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-2.5 rounded-2xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 shadow-sm transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. STATS STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-400 uppercase">
              <span>Hosted Events</span>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{events.length} Events</p>
            <p className="text-[11px] text-slate-500 font-medium">Published to Firebase RTDB</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-400 uppercase">
              <span>Total Registrations</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">{totalRegistrations} Attendees</p>
            <p className="text-[11px] text-slate-500 font-medium">Across all hosted events</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-400 uppercase">
              <span>Verified Check-Ins</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600">{totalCheckIns} Scanned</p>
            <p className="text-[11px] text-slate-500 font-medium">Entrance gate verifications</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-400 uppercase">
              <span>Organizer ID</span>
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-sm font-black text-slate-900 truncate">{currentUser.name}</p>
            <p className="text-[11px] text-indigo-600 font-bold truncate">{currentUser.email}</p>
          </div>
        </div>
      </section>

      {/* 3. TWO COLUMN WORKSPACE: QR VERIFICATION TOOL + HOSTED EVENTS */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: QR CODE ATTENDANCE SCANNER TOOL (5 COLS) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-indigo-600/20">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">QR Ticket Pass Scanner</h3>
                  <p className="text-xs text-slate-500 font-medium">Verify ticket reference codes at gate</p>
                </div>
              </div>

              <form onSubmit={handleVerifyCheckIn} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1.5">
                    Enter Ticket Reference (e.g. REF-849201) or Attendee Email
                  </label>
                  <input
                    type="text"
                    required
                    value={scanInputRef}
                    onChange={(e) => setScanInputRef(e.target.value)}
                    placeholder="Type REF code or email..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner-sm uppercase"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Verify Ticket & Check-In</span>
                </button>
              </form>

              {/* Scan Result Feedback Banner */}
              {scanResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1 animate-fade-in ${
                    scanResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{scanResult.success ? 'Ticket Verified' : 'Check-In Notice'}</span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed">{scanResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: HOSTED EVENTS & ATTENDEE LIST (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Your Hosted Events</h3>
                  <p className="text-xs text-slate-500 font-medium">Manage events & live attendee counts</p>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Host New Event</span>
                </button>
              </div>

              {events.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No events published yet</p>
                  <p className="text-[11px] text-slate-500">Click "+ Host New Event" to publish an event under your ID.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((evt) => {
                    const regCount = StorageRepository.getRegistrations(evt.id).length;
                    const checkInCount = allAttendance.filter((a) => a.eventId === evt.id).length;

                    return (
                      <div
                        key={evt.id}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                              {evt.category.toUpperCase()}
                            </span>
                            <h4 className="text-base font-black text-slate-900">{evt.title}</h4>
                            <p className="text-xs text-slate-500 font-medium">{evt.venueName}</p>
                          </div>

                          <button
                            onClick={() => onViewEventPage(evt)}
                            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all shrink-0 cursor-pointer shadow-sm"
                          >
                            View Event Page →
                          </button>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-slate-200/80 text-xs text-slate-600 font-semibold">
                          <div className="flex items-center gap-4">
                            <span>Registrations: <strong className="text-slate-900 font-black">{regCount} / {evt.maxCapacity}</strong></span>
                            <span>Scanned Check-ins: <strong className="text-emerald-700 font-black">{checkInCount}</strong></span>
                          </div>
                          <span>{new Date(evt.startDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LIVE REGISTRATIONS LIST */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">Live Attendee Registrations</h3>
                <span className="text-xs font-extrabold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                  {allRegistrations.length} Total Registered
                </span>
              </div>

              {allRegistrations.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center">No attendee registrations recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {allRegistrations.map((reg) => {
                    const isCheckedIn = allAttendance.some((a) => a.registrationId === reg.id);
                    return (
                      <div key={reg.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-extrabold text-slate-900">{reg.attendeeName}</p>
                          <p className="text-slate-500">{reg.attendeeEmail}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-indigo-700 block">{reg.reference}</span>
                          {isCheckedIn ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Checked In
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Registered
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

        {/* 4. ADMIN USER PROFILE PERMISSIONS & EDIT UNLOCK SECTION */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Admin User Profile & Edit Lock Management</h3>
                <p className="text-xs text-slate-500 font-medium">Unlock users to allow a 2nd time profile details change (Name, Reg #, Avatar)</p>
              </div>
            </div>
            <span className="text-xs font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full">
              {allUserRecords.length} Accounts Registered
            </span>
          </div>

          {unlockNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{unlockNotice}</span>
            </div>
          )}

          {allUserRecords.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center">No user accounts found in Firebase RTDB.</p>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {allUserRecords.map((u) => {
                const editsCount = u.detailsEditCount || 0;
                const isCurrentlyLocked = editsCount >= 1 && !u.allowEditOverride;

                return (
                  <div key={u.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{u.name}</span>
                          <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                            {u.role}
                          </span>
                          {u.registrationNumber && (
                            <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              Reg: {u.registrationNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px] font-medium">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCurrentlyLocked ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Locked (1 Edit Used)</span>
                        </span>
                      ) : u.allowEditOverride ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                          <Unlock className="w-3 h-3 text-emerald-600" />
                          <span>Unlocked by Admin</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                          0 Edits Used
                        </span>
                      )}

                      <button
                        onClick={() => handleUnlockUserEdit(u)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                        title="Allow this user to edit their profile details a 2nd time"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Allow 2nd Edit</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* CREATE EVENT MODAL */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={(newEvent) => {
          setEvents((prev) => [newEvent, ...prev]);
        }}
        organizerEmail={currentUser.email}
        organizerName={currentUser.name}
      />
    </div>
  );
};
