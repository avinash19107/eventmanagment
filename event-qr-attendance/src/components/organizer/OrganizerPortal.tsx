import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Event, User, Registration, AttendanceRecord, EventWinner } from '../../types';
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
  Shield,
  Trash2,
  Square,
  StopCircle,
  Trophy,
  Star,
  BarChart2,
  XCircle,
  Camera,
  ChevronRight,
  History,
  Menu,
  X,
} from 'lucide-react';

interface OrganizerPortalProps {
  currentUser: User;
  onSignOut: () => void;
  onSwitchToUserView: () => void;
  onViewEventPage: (event: Event) => void;
}

// ─── Confirmation Dialog ───────────────────────────────────────────────────────
interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 max-w-sm w-full space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <p className="text-sm font-bold text-slate-800 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 py-2.5 rounded-2xl text-white font-black text-xs transition-all cursor-pointer ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── Winners Panel ─────────────────────────────────────────────────────────────
interface WinnersPanelProps {
  event: Event;
  registrations: Registration[];
  currentUser: User;
  onClose: () => void;
}
const WinnersPanel: React.FC<WinnersPanelProps> = ({
  event,
  registrations,
  currentUser,
  onClose,
}) => {
  const [winners, setWinners] = useState<EventWinner[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [scoreMap, setScoreMap] = useState<Record<string, string>>({});
  const [prizeMap, setPrizeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    EventDatabaseService.getWinnersForEvent(event.id).then((ws) => {
      setWinners(ws);
      const sm: Record<string, string> = {};
      const pm: Record<string, string> = {};
      ws.forEach((w) => {
        sm[w.registrationId] = String(w.score);
        pm[w.registrationId] = w.prize || '';
      });
      setScoreMap(sm);
      setPrizeMap(pm);
    });
  }, [event.id]);

  const checkedInRegs = registrations.filter(
    (r) => r.eventId === event.id && (r.status === 'checked_in' || r.checkedInAt)
  );

  const handleSave = async () => {
    setIsSaving(true);
    const newWinners: EventWinner[] = checkedInRegs
      .filter((r) => scoreMap[r.id] !== undefined && scoreMap[r.id] !== '')
      .map((r, idx) => ({
        registrationId: r.id,
        attendeeName: r.attendeeName,
        attendeeEmail: r.attendeeEmail,
        reference: r.reference,
        score: parseFloat(scoreMap[r.id] || '0') || 0,
        prize: prizeMap[r.id] || '',
        rank: idx + 1,
        markedAt: new Date().toISOString(),
        markedBy: currentUser.name,
      }))
      .sort((a, b) => b.score - a.score)
      .map((w, i) => ({ ...w, rank: i + 1 }));

    await EventDatabaseService.saveWinnersForEvent(event.id, newWinners);
    setWinners(newWinners);
    setIsSaving(false);
  };

  const sortedWinners = [...winners].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-yellow-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Winners & Prizes</h3>
              <p className="text-xs text-slate-500 font-medium">{event.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Score assignment */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-700 mb-3">
              Assign Scores & Prizes — Checked-In Attendees
            </h4>
            {checkedInRegs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No checked-in attendees for this event.</p>
            ) : (
              <div className="space-y-2">
                {checkedInRegs.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">{r.attendeeName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{r.reference}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Score"
                      value={scoreMap[r.id] || ''}
                      onChange={(e) =>
                        setScoreMap((m) => ({ ...m, [r.id]: e.target.value }))
                      }
                      className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-center focus:outline-none focus:border-indigo-400"
                    />
                    <input
                      type="text"
                      placeholder="Prize (optional)"
                      value={prizeMap[r.id] || ''}
                      onChange={(e) =>
                        setPrizeMap((m) => ({ ...m, [r.id]: e.target.value }))
                      }
                      className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          {sortedWinners.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase text-slate-700 mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                Prize Leaderboard
              </h4>
              <div className="space-y-2">
                {sortedWinners.map((w, i) => (
                  <div
                    key={w.registrationId}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                      i === 0
                        ? 'bg-amber-50 border-amber-200'
                        : i === 1
                        ? 'bg-slate-100 border-slate-200'
                        : i === 2
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <span
                      className={`text-lg font-black w-7 text-center ${
                        i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-500' : i === 2 ? 'text-orange-500' : 'text-slate-400'
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">{w.attendeeName}</p>
                      {w.prize && (
                        <p className="text-[11px] text-amber-700 font-bold truncate">🏆 {w.prize}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-indigo-700">{w.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-white font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : '💾 Save Scores & Generate Leaderboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main OrganizerPortal ──────────────────────────────────────────────────────
export const OrganizerPortal: React.FC<OrganizerPortalProps> = ({
  currentUser,
  onSignOut,
  onSwitchToUserView,
  onViewEventPage,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);

  // User Management State for Admin Profile Unlock
  const [allUserRecords, setAllUserRecords] = useState<UserDatabaseRecord[]>([]);
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);

  // QR Scanner / Manual Verification State
  const [scanInputRef, setScanInputRef] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; reg?: Registration } | null>(null);

  // Camera QR Scanner State for Mobile Devices
  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const startCameraScanner = async () => {
    setIsCameraActive(true);
    setScanResult(null);
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode('mobile-qr-reader');
        html5QrcodeRef.current = html5Qrcode;
        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            handleAutoVerifyCode(decodedText);
            stopCameraScanner();
          },
          () => {}
        );
      } catch (err: any) {
        console.warn('Camera scanner start notice:', err);
      }
    }, 200);
  };

  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (e) {}
    }
    setIsCameraActive(false);
  };

  const handleAutoVerifyCode = async (rawCode: string) => {
    setScanResult(null);
    const refInput = rawCode.trim().toUpperCase();
    if (!refInput) return;
    setScanInputRef(refInput);

    const reg = allRegistrations.find(
      (r) => r.reference.toUpperCase() === refInput
    );

    if (!reg) {
      setScanResult({
        success: false,
        message: `No active ticket registration found for REF code "${refInput}".`,
      });
      return;
    }

    if (reg.status === 'cancelled') {
      setScanResult({
        success: false,
        message: `Ticket ${reg.reference} for ${reg.attendeeName} has been CANCELLED.`,
        reg,
      });
      return;
    }

    const alreadyCheckedIn =
      reg.status === 'checked_in' ||
      reg.checkedInAt ||
      allAttendance.some((a) => a.registrationId === reg.id);

    if (alreadyCheckedIn) {
      setScanResult({
        success: false,
        message: `Attendee ${reg.attendeeName} (${reg.reference}) is ALREADY CHECKED IN.`,
        reg,
      });
      return;
    }

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
    await EventDatabaseService.checkInRegistration(reg.id, currentUser.name);

    setScanResult({
      success: true,
      message: `🎉 VERIFIED & CHECKED IN: ${reg.attendeeName} (${reg.reference})`,
      reg: { ...reg, status: 'checked_in', checkedInAt: new Date().toISOString() },
    });

    await loadData();
  };

  const [rtdbRegistrations, setRtdbRegistrations] = useState<Registration[]>([]);

  // Tab: 'active' | 'ended' | 'scanner' | 'admin'
  const [activeTab, setActiveTab] = useState<'active' | 'ended' | 'scanner' | 'admin'>('active');

  const handleTabChange = async (tab: 'active' | 'ended' | 'scanner' | 'admin') => {
    setActiveTab(tab);
    // Always refresh from RTDB when switching tabs to catch newly-ended events
    if (tab === 'ended' || tab === 'active' || tab === 'scanner') {
      await loadData();
    }
  };

  // Delete/End confirmation state
  const [confirmAction, setConfirmAction] = useState<null | {
    type: 'delete' | 'end';
    event: Event;
  }>(null);

  // Winners panel
  const [winnersEvent, setWinnersEvent] = useState<Event | null>(null);

  // Load events & user profiles live from Firebase Realtime Database
  const loadData = async () => {
    const rtdbEvents = await EventDatabaseService.getEventsFromRealtimeDB();
    const myEvents = rtdbEvents.filter(
      (e) =>
        e.organizerEmail.toLowerCase() === currentUser.email.toLowerCase() ||
        currentUser.role === 'admin' ||
        currentUser.role === 'organizer'
    );
    setEvents(myEvents);

    // Load registered users for Admin edit lock management
    const users = await UserDatabaseService.getAllUsersFromRealtimeDB();
    setAllUserRecords(users);

    // Load live registrations from Firebase Realtime Database
    const regs = await EventDatabaseService.getRegistrationsFromRealtimeDB();
    setRtdbRegistrations(regs);
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle Mobile Hardware / Browser Back Button for Modals
  useEffect(() => {
    const handlePopState = () => {
      if (isCreateModalOpen) setIsCreateModalOpen(false);
      if (winnersEvent) setWinnersEvent(null);
      if (confirmAction) setConfirmAction(null);
    };

    if (isCreateModalOpen || winnersEvent || confirmAction) {
      window.history.pushState({ modalOpen: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isCreateModalOpen, winnersEvent, confirmAction]);

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

  const localRegistrations = StorageRepository.getRegistrations();
  // Merge live RTDB registrations with local registrations (RTDB takes priority)
  const allRegistrationsMap = new Map<string, Registration>();
  localRegistrations.forEach((r) => allRegistrationsMap.set(r.id, r));
  rtdbRegistrations.forEach((r) => allRegistrationsMap.set(r.id, r));
  const allRegistrations = Array.from(allRegistrationsMap.values());

  const allAttendance = StorageRepository.getAttendanceRecords();

  // Partition events
  const activeEvents = events.filter((e) => e.status !== 'ended' && e.status !== 'archived');
  const endedEvents = events.filter((e) => e.status === 'ended' || e.status === 'archived');

  // Calculate Metrics
  const totalRegistrations = allRegistrations.filter((r) => r.status !== 'cancelled').length;
  const totalCheckIns = allRegistrations.filter(
    (r) => r.status === 'checked_in' || r.checkedInAt
  ).length;

  // Filter Registrations by selected event
  const displayedRegistrations = allRegistrations.filter(
    (r) => selectedEventId === 'all' || r.eventId === selectedEventId
  );

  // Handle QR Check-in verification (also updates RTDB)
  const handleVerifyCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanResult(null);

    const refInput = scanInputRef.trim().toUpperCase();
    if (!refInput) return;

    // Search registration strictly by ticket reference ID code
    const reg = allRegistrations.find(
      (r) => r.reference.toUpperCase() === refInput
    );

    if (!reg) {
      setScanResult({
        success: false,
        message: `No active ticket registration found for REF code "${refInput}".`,
      });
      return;
    }

    if (reg.status === 'cancelled') {
      setScanResult({
        success: false,
        message: `Ticket ${reg.reference} for ${reg.attendeeName} has been CANCELLED.`,
        reg,
      });
      return;
    }

    // Check if already checked in
    const alreadyCheckedIn =
      reg.status === 'checked_in' ||
      reg.checkedInAt ||
      allAttendance.some((a) => a.registrationId === reg.id);

    if (alreadyCheckedIn) {
      setScanResult({
        success: false,
        message: `Attendee ${reg.attendeeName} (${reg.reference}) is ALREADY CHECKED IN${
          reg.checkedInAt ? ' at ' + new Date(reg.checkedInAt).toLocaleTimeString() : ''
        }.`,
        reg,
      });
      return;
    }

    // Record Check-in locally
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

    // Also update RTDB registration status to checked_in
    await EventDatabaseService.checkInRegistration(reg.id, currentUser.name);

    setScanResult({
      success: true,
      message: `✅ SUCCESS! Ticket ${reg.reference} Verified for ${reg.attendeeName} (${reg.attendeeEmail}). Attendance Recorded!`,
      reg,
    });
    setScanInputRef('');
    // Refresh registrations from RTDB
    const regs = await EventDatabaseService.getRegistrationsFromRealtimeDB();
    setRtdbRegistrations(regs);
  };

  // End event handler
  const handleEndEvent = async (event: Event) => {
    setConfirmAction(null);
    try {
      await EventDatabaseService.endEventInRealtimeDB(event.id);
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, status: 'ended' } : e)));
    } catch {
      alert('Failed to end event. Please try again.');
    }
  };

  // Delete event handler (cascade)
  const handleDeleteEvent = async (event: Event) => {
    setConfirmAction(null);
    try {
      await EventDatabaseService.deleteEventFromRealtimeDB(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setRtdbRegistrations((prev) => prev.filter((r) => r.eventId !== event.id));
    } catch {
      alert('Failed to delete event. Please try again.');
    }
  };

  // ──────────────────────────── RENDER ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white pb-24">
      {/* CONFIRM DIALOG */}
      {confirmAction && (
        <ConfirmDialog
          message={
            confirmAction.type === 'delete'
              ? `⚠️ Permanently DELETE "${confirmAction.event.title}"? This will remove the event AND all its registrations and QR codes. This cannot be undone.`
              : `End "${confirmAction.event.title}"? The event will be closed and moved to "Previous Hosted Events". Attendees can still view their status.`
          }
          confirmLabel={confirmAction.type === 'delete' ? '🗑️ Yes, Delete' : '🔴 Yes, End Event'}
          confirmClass={
            confirmAction.type === 'delete'
              ? 'bg-rose-600 hover:bg-rose-500'
              : 'bg-amber-600 hover:bg-amber-500'
          }
          onCancel={() => setConfirmAction(null)}
          onConfirm={() =>
            confirmAction.type === 'delete'
              ? handleDeleteEvent(confirmAction.event)
              : handleEndEvent(confirmAction.event)
          }
        />
      )}

      {/* WINNERS PANEL */}
      {winnersEvent && (
        <WinnersPanel
          event={winnersEvent}
          registrations={allRegistrations}
          currentUser={currentUser}
          onClose={() => setWinnersEvent(null)}
        />
      )}

      {/* LEFT SLIDE-OUT DRAWER MENU (OPENS FROM LEFT) */}
      {isLeftSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setIsLeftSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Sidebar Panel */}
          <div className="relative z-10 w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-300">
            <div>
              {/* Header Banner */}
              <div className="p-6 bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-900 text-white space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-800/50 px-2.5 py-1 rounded-full border border-indigo-500/30">
                    Organizer Workspace
                  </span>
                  <button
                    onClick={() => setIsLeftSidebarOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white">Hi, {currentUser.name || 'Organizer'} 👋</h2>
                </div>
              </div>

              {/* Navigation Menu List */}
              <div className="p-4 space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
                  Menu Navigation
                </div>

                <button
                  onClick={() => {
                    handleTabChange('active');
                    setIsLeftSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'active'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Active &amp; Live Events</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">
                    {activeEvents.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    handleTabChange('ended');
                    setIsLeftSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'ended'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Concluded Events &amp; Standings</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                    {endedEvents.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    handleTabChange('scanner');
                    setIsLeftSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'scanner'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>Gate Entrance QR Pass Scanner</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleTabChange('admin');
                    setIsLeftSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>Users &amp; Attendee Roster</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
                    {totalRegistrations}
                  </span>
                </button>

                <div className="pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 px-3">
                  Quick Actions
                </div>

                <button
                  onClick={() => {
                    setIsLeftSidebarOpen(false);
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Host New Event</span>
                </button>

                <button
                  onClick={() => {
                    setIsLeftSidebarOpen(false);
                    onSwitchToUserView();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Switch to Attendee Catalog</span>
                </button>
              </div>
            </div>

            {/* Footer Sign Out */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => {
                  setIsLeftSidebarOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-rose-600 font-black text-xs shadow-sm transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. ORGANIZER HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 px-3 sm:px-8 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* 3-Lines Left Open Menu Button */}
            <button
              onClick={() => setIsLeftSidebarOpen(true)}
              className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 shadow-sm transition-all cursor-pointer flex items-center gap-2"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-black text-indigo-900 hidden sm:inline">Menu</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 truncate">
                  Hi, {currentUser.name || 'Organizer'} 👋
                </span>
                <span className="hidden sm:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  v3
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={onSwitchToUserView}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-xs transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>User Catalog</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Host Event</span>
            </button>

            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 rounded-2xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DEDICATED PAGE WORKSPACE VIEWS */}
      <main className="max-w-7xl mx-auto px-3 sm:px-8 pt-6 sm:pt-8 space-y-6 pb-12">
        
        {/* PAGE 1: ACTIVE & LIVE EVENTS PAGE */}
        {activeTab === 'active' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Active &amp; Live Events Dashboard</h3>
                  <p className="text-xs text-slate-500 font-medium">Manage active events, end sessions, and check-in rosters</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTabChange('scanner')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold text-xs transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Open Gate Scanner Page</span>
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Host New Event</span>
                  </button>
                </div>
              </div>

              {activeEvents.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No active events hosted right now</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click "+ Host New Event" to create a new event session for attendees to join.
                  </p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white font-extrabold text-xs shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Event</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeEvents.map((evt) => {
                    const regCount = allRegistrations.filter(
                      (r) => r.eventId === evt.id && r.status !== 'cancelled'
                    ).length;
                    const checkInCount = allRegistrations.filter(
                      (r) => r.eventId === evt.id && (r.status === 'checked_in' || r.checkedInAt)
                    ).length;

                    return (
                      <div
                        key={evt.id}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {evt.category.toUpperCase()}
                              </span>
                              {evt.format === 'team' && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                  TEAM EVENT
                                </span>
                              )}
                            </div>
                            <h4 className="text-base font-black text-slate-900 truncate">{evt.title}</h4>
                            <p className="text-xs text-slate-500 font-medium truncate">📍 {evt.venueName}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onViewEventPage(evt)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer shadow-sm"
                            >
                              View →
                            </button>
                            <button
                              onClick={() => setConfirmAction({ type: 'end', event: evt })}
                              title="End Event Session"
                              className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all cursor-pointer"
                            >
                              <StopCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmAction({ type: 'delete', event: evt })}
                              title="Delete Event"
                              className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between border-t border-slate-200/80 text-xs text-slate-600 font-semibold">
                          <div className="flex items-center gap-4">
                            <span>
                              Registrations:{' '}
                              <strong className="text-slate-900 font-black">
                                {regCount} / {evt.maxCapacity}
                              </strong>
                            </span>
                            <span>
                              Check-ins:{' '}
                              <strong className="text-emerald-700 font-black">{checkInCount}</strong>
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">
                            📅 {new Date(evt.startDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LIVE ATTENDEE REGISTRATIONS LIST */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">Live Attendee Registrations</h3>
                <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
                  {allRegistrations.filter((r) => r.status !== 'cancelled').length} Total Registered
                </span>
              </div>

              {allRegistrations.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center">No attendee registrations recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {allRegistrations.map((reg) => {
                    const isCheckedIn = reg.status === 'checked_in' || reg.checkedInAt || allAttendance.some((a) => a.registrationId === reg.id);
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
                              Checked In ✓
                            </span>
                          ) : reg.status === 'cancelled' ? (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Cancelled
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
        )}

        {/* PAGE 2: CONCLUDED EVENTS & SCORES STANDINGS PAGE */}
        {activeTab === 'ended' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Concluded Events &amp; Standings</h3>
                    <p className="text-xs text-slate-500 font-medium">View ended events, winner standings, scores &amp; digital certificates</p>
                  </div>
                </div>
                <button
                  onClick={loadData}
                  title="Refresh from database"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 text-xs font-extrabold transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Standings</span>
                </button>
              </div>

              {endedEvents.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <History className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No concluded events yet</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    When an active event session is ended by the host, it will appear here with official scores &amp; winner leaderboards.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {endedEvents.map((evt) => {
                    const regs = allRegistrations.filter((r) => r.eventId === evt.id);
                    const regCount = regs.filter((r) => r.status !== 'cancelled').length;
                    const checkedInCount = regs.filter(
                      (r) => r.status === 'checked_in' || r.checkedInAt
                    ).length;

                    return (
                      <div
                        key={evt.id}
                        className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                                {evt.category.toUpperCase()}
                              </span>
                              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                EVENT CONCLUDED
                              </span>
                            </div>
                            <h4 className="text-lg font-black text-slate-900 truncate">{evt.title}</h4>
                            <p className="text-xs text-slate-500 font-medium truncate">📍 {evt.venueName}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setWinnersEvent(evt)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-white shadow-md text-xs font-black transition-all cursor-pointer"
                            >
                              <Trophy className="w-4 h-4 text-white" />
                              <span>🏆 Edit Winners &amp; Scores</span>
                            </button>
                            <button
                              onClick={() => setConfirmAction({ type: 'delete', event: evt })}
                              className="p-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between border-t border-slate-200/80 text-xs text-slate-600 font-semibold">
                          <div className="flex items-center gap-4">
                            <span>
                              Total Registered: <strong className="text-slate-900 font-black">{regCount}</strong>
                            </span>
                            <span>
                              Checked In: <strong className="text-emerald-700 font-black">{checkedInCount}</strong>
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">
                            Ended Date: {new Date(evt.startDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 3: GATE ENTRANCE QR PASS SCANNER TERMINAL PAGE */}
        {activeTab === 'scanner' && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-indigo-600/20">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Gate Entrance QR Pass Scanner</h3>
                    <p className="text-xs text-slate-500 font-medium">Scan attendee QR pass or enter REF code to verify check-in</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={isCameraActive ? stopCameraScanner : startCameraScanner}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                    isCameraActive
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>{isCameraActive ? 'Close Camera Scanner' : '📷 Open Device Camera'}</span>
                </button>
              </div>

              {/* Mobile Live Camera Scanner Area */}
              {isCameraActive && (
                <div className="p-4 bg-slate-900 rounded-3xl space-y-3 animate-fade-in">
                  <div id="mobile-qr-reader" className="overflow-hidden rounded-2xl border border-slate-700 max-w-md mx-auto" />
                  <p className="text-xs text-slate-300 text-center font-medium">
                    Position attendee digital QR pass code inside camera box to auto check-in.
                  </p>
                </div>
              )}

              <form onSubmit={handleVerifyCheckIn} className="space-y-4 max-w-lg mx-auto pt-2">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Enter Ticket Reference Code (e.g. REF-849201) *
                  </label>
                  <input
                    type="text"
                    required
                    value={scanInputRef}
                    onChange={(e) => setScanInputRef(e.target.value)}
                    placeholder="Type or paste REF code..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner-sm uppercase tracking-widest text-center"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-5 h-5" />
                  <span>Verify Ticket &amp; Mark Check-In</span>
                </button>
              </form>

              {/* Scan Result Feedback Banner */}
              {scanResult && (
                <div
                  className={`p-5 rounded-3xl border text-xs space-y-1.5 animate-fade-in max-w-lg mx-auto ${
                    scanResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-black">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <span>{scanResult.success ? '🎉 Ticket Check-In Verified!' : 'Check-In Notice'}</span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">{scanResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}
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
