import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Event, User, Registration, AttendanceRecord, EventWinner } from '../../types';
import { EventDatabaseService } from '../../services/eventDatabase';
import { UserDatabaseService, UserDatabaseRecord } from '../../services/userDatabase';
import { StorageRepository } from '../../services/storage';
import { CreateEventModal } from '../events/CreateEventModal';
import { EditEventModal } from '../events/EditEventModal';
import { OrganizerRegisterMemberModal } from './OrganizerRegisterMemberModal';
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
  Medal,
  Download,
  BarChart2,
  XCircle,
  Camera,
  CameraOff,
  ChevronRight,
  History,
  Menu,
  X,
  Edit3,
  UserPlus,
  Sparkles,
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

  // Team-wise score/prize state
  const [teamScoreMap, setTeamScoreMap] = useState<Record<string, string>>({});
  const [teamPrizeMap, setTeamPrizeMap] = useState<Record<string, string>>({});

  const isTeamEvent = event.format === 'team';

  // Extract all registrations for this event
  const eventRegs = registrations.filter(
    (r) => r.eventId === event.id && r.status !== 'cancelled'
  );

  // Group by team for team events
  const teamMap = new Map<string, {
    name: string;
    teamCode?: string;
    logoUrl?: string;
    leaderName: string;
    members: Registration[];
    hasCheckedIn: boolean;
  }>();

  if (isTeamEvent) {
    eventRegs.forEach((r) => {
      const tName = r.teamName || 'Individual / Unassigned';
      if (!teamMap.has(tName)) {
        teamMap.set(tName, {
          name: tName,
          teamCode: r.teamCode,
          logoUrl: r.teamLogoUrl,
          leaderName: r.isTeamLeader ? r.attendeeName : r.teamLeaderName || r.attendeeName,
          members: [],
          hasCheckedIn: false,
        });
      }
      const t = teamMap.get(tName)!;
      t.members.push(r);
      if (r.teamCode && !t.teamCode) t.teamCode = r.teamCode;
      if (r.teamLogoUrl && !t.logoUrl) t.logoUrl = r.teamLogoUrl;
      if (r.isTeamLeader) t.leaderName = r.attendeeName;
      if (r.status === 'checked_in' || r.checkedInAt) t.hasCheckedIn = true;
    });
  }

  const teamsList = Array.from(teamMap.values());

  useEffect(() => {
    EventDatabaseService.getWinnersForEvent(event.id).then((ws) => {
      setWinners(ws);
      const sm: Record<string, string> = {};
      const pm: Record<string, string> = {};
      const tsm: Record<string, string> = {};
      const tpm: Record<string, string> = {};

      ws.forEach((w) => {
        sm[w.registrationId] = String(w.score);
        pm[w.registrationId] = w.prize || '';
        if (w.teamName) {
          tsm[w.teamName] = String(w.score);
          tpm[w.teamName] = w.prize || '';
        }
      });
      setScoreMap(sm);
      setPrizeMap(pm);
      setTeamScoreMap(tsm);
      setTeamPrizeMap(tpm);
    });
  }, [event.id]);

  const checkedInRegs = eventRegs.filter(
    (r) => r.status === 'checked_in' || r.checkedInAt
  );

  const handleSave = async () => {
    setIsSaving(true);
    let newWinners: EventWinner[] = [];

    if (isTeamEvent) {
      // 1. Team-Wise Scoring Flow
      const scoredTeams = teamsList
        .filter((t) => teamScoreMap[t.name] !== undefined && teamScoreMap[t.name] !== '')
        .map((t) => ({
          team: t,
          score: parseFloat(teamScoreMap[t.name] || '0') || 0,
          prize: teamPrizeMap[t.name] || '',
        }))
        .sort((a, b) => b.score - a.score);

      scoredTeams.forEach((st, rankIdx) => {
        const rank = rankIdx + 1;
        st.team.members.forEach((m) => {
          newWinners.push({
            registrationId: m.id,
            attendeeName: m.attendeeName,
            attendeeEmail: m.attendeeEmail,
            reference: m.reference,
            score: st.score,
            prize: st.prize,
            rank,
            markedAt: new Date().toISOString(),
            markedBy: currentUser.name,
            teamName: st.team.name,
            teamLogoUrl: st.team.logoUrl,
          });
        });
      });
    } else {
      // 2. Individual Scoring Flow
      newWinners = checkedInRegs
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
    }

    await EventDatabaseService.saveWinnersForEvent(event.id, newWinners);
    setWinners(newWinners);
    setIsSaving(false);
  };

  // Group saved winners for leaderboard display
  const teamLeaderboardMap = new Map<string, { teamName: string; score: number; prize?: string; rank: number; members: EventWinner[] }>();
  if (isTeamEvent) {
    winners.forEach((w) => {
      const tName = w.teamName || w.attendeeName;
      if (!teamLeaderboardMap.has(tName)) {
        teamLeaderboardMap.set(tName, {
          teamName: tName,
          score: w.score,
          prize: w.prize,
          rank: w.rank || 1,
          members: [],
        });
      }
      teamLeaderboardMap.get(tName)!.members.push(w);
    });
  }
  const sortedTeamLeaderboard = Array.from(teamLeaderboardMap.values()).sort((a, b) => a.rank - b.rank);
  const sortedWinners = [...winners].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-400/30 font-black">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <span>{isTeamEvent ? 'Team-Wise Scores & Prize Awards' : 'Participant Scores & Prizes'}</span>
                {isTeamEvent && (
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                    Team Mode
                  </span>
                )}
              </h3>
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
          {/* TEAM-WISE SCORING VIEW */}
          {isTeamEvent ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Assign Score To Teams ({teamsList.length} Teams Registered)</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  All squad members receive the team's official score &amp; rank
                </span>
              </div>

              {teamsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  No teams found for this event.
                </p>
              ) : (
                <div className="space-y-3">
                  {teamsList.map((t) => (
                    <div
                      key={t.name}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                              👥 {t.name}
                            </span>
                            {t.teamCode && (
                              <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                                {t.teamCode}
                              </span>
                            )}
                            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              {t.members.length} Members
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {t.members.map((m) => (
                              <span
                                key={m.id}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                  m.isTeamLeader
                                    ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                                    : 'bg-white text-slate-600 border-slate-200'
                                }`}
                              >
                                {m.attendeeName} {m.isTeamLeader ? '👑 (Leader)' : ''}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Score and Prize Inputs */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Team Score *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="Score"
                              value={teamScoreMap[t.name] || ''}
                              onChange={(e) =>
                                setTeamScoreMap((m) => ({ ...m, [t.name]: e.target.value }))
                              }
                              className="w-24 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-center text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">Team Prize (optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. 1st Place Trophy"
                              value={teamPrizeMap[t.name] || ''}
                              onChange={(e) =>
                                setTeamPrizeMap((m) => ({ ...m, [t.name]: e.target.value }))
                              }
                              className="w-36 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* INDIVIDUAL SCORING VIEW */
            <div>
              <h4 className="text-xs font-black uppercase text-slate-700 mb-3">
                Assign Scores &amp; Prizes — Checked-In Attendees
              </h4>
              {checkedInRegs.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  No checked-in attendees found for this event.
                </p>
              ) : (
                <div className="space-y-2">
                  {checkedInRegs.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 truncate">{r.attendeeName}</p>
                        <p className="text-[11px] text-slate-500 truncate font-mono">{r.reference}</p>
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
                        className="w-32 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEADERBOARD STANDINGS */}
          {((isTeamEvent && sortedTeamLeaderboard.length > 0) || (!isTeamEvent && sortedWinners.length > 0)) && (
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase text-slate-700 mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                <span>{isTeamEvent ? 'Team Official Leaderboard' : 'Participant Leaderboard'}</span>
              </h4>

              {isTeamEvent ? (
                <div className="space-y-2.5">
                  {sortedTeamLeaderboard.map((st, i) => (
                    <div
                      key={st.teamName}
                      className={`p-4 rounded-2xl border ${
                        i === 0
                          ? 'bg-amber-50/80 border-amber-200 shadow-xs'
                          : i === 1
                          ? 'bg-slate-100 border-slate-200'
                          : i === 2
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-lg font-black w-8 h-8 rounded-xl flex items-center justify-center ${
                              i === 0
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : i === 1
                                ? 'bg-slate-300 text-slate-800'
                                : i === 2
                                ? 'bg-orange-300 text-orange-950'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-900">👥 {st.teamName}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {st.members.map((m) => m.attendeeName).join(', ')}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-indigo-700">{st.score} Pts</span>
                          {st.prize && (
                            <p className="text-[11px] text-amber-800 font-extrabold">🏆 {st.prize}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <span>Publishing Scores...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>{isTeamEvent ? '💾 Save Team Scores & Publish Leaderboard' : '💾 Save Scores & Generate Leaderboard'}</span>
              </>
            )}
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

  // QR Scanner / Manual Verification State
  const [scanInputRef, setScanInputRef] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; reg?: Registration } | null>(null);

  // Roster Search & Filter State
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterEventFilter, setRosterEventFilter] = useState('all');

  // Modal States
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isRegisterMemberModalOpen, setIsRegisterMemberModalOpen] = useState(false);
  const [registerMemberEventId, setRegisterMemberEventId] = useState<string | undefined>(undefined);

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

  // Load events live from Firebase Realtime Database
  const loadData = async () => {
    try {
      const [rtdbEvents, regs] = await Promise.all([
        EventDatabaseService.getEventsFromRealtimeDB(),
        EventDatabaseService.getRegistrationsFromRealtimeDB(),
      ]);

      const localEvents = StorageRepository.getEvents();
      const allEventsMap = new Map<string, Event>();
      localEvents.forEach((e) => allEventsMap.set(e.id, e));
      rtdbEvents.forEach((e) => allEventsMap.set(e.id, e));
      const mergedEvents = Array.from(allEventsMap.values());

      const isGlobalAdmin = currentUser.role === 'admin';
      const myEvents = mergedEvents.filter(
        (e) =>
          isGlobalAdmin ||
          (e.organizerEmail || '').toLowerCase() === (currentUser?.email || '').toLowerCase() ||
          (e.organizerId && e.organizerId === currentUser.id)
      );

      const myEventIds = new Set(myEvents.map((e) => e.id));
      const myRegs = isGlobalAdmin
        ? regs
        : regs.filter((r) => myEventIds.has(r.eventId));

      setEvents(myEvents);
      setRtdbRegistrations(myRegs);
    } catch (err) {
      console.warn('OrganizerPortal loadData notice:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    window.addEventListener('focus', loadData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', loadData);
    };
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

  const allAttendance = StorageRepository.getAttendanceRecords();

  const isGlobalAdmin = currentUser.role === 'admin';
  const myEventIds = new Set(events.map((e) => e.id));
  const localRegistrations = StorageRepository.getRegistrations().filter(
    (r) => isGlobalAdmin || myEventIds.has(r.eventId)
  );

  // Merge live RTDB registrations with local registrations and attendance records
  const allRegistrationsMap = new Map<string, Registration>();
  localRegistrations.forEach((r) => {
    const att = allAttendance.find((a) => a.registrationId === r.id || (a.attendeeEmail?.toLowerCase() === r.attendeeEmail?.toLowerCase() && a.eventId === r.eventId));
    if (att && r.status !== 'checked_in') {
      allRegistrationsMap.set(r.id, { ...r, status: 'checked_in' as const, checkedInAt: att.checkInTime });
    } else {
      allRegistrationsMap.set(r.id, r);
    }
  });

  rtdbRegistrations.forEach((r) => {
    const att = allAttendance.find((a) => a.registrationId === r.id || (a.attendeeEmail?.toLowerCase() === r.attendeeEmail?.toLowerCase() && a.eventId === r.eventId));
    if (att && r.status !== 'checked_in') {
      allRegistrationsMap.set(r.id, { ...r, status: 'checked_in' as const, checkedInAt: att.checkInTime });
    } else {
      allRegistrationsMap.set(r.id, r);
    }
  });

  const allRegistrations = Array.from(allRegistrationsMap.values());

  // Filtered Roster Registrations for Roster Page View
  const filteredRosterRegistrations = allRegistrations.filter((reg) => {
    if (rosterEventFilter !== 'all' && reg.eventId !== rosterEventFilter) return false;
    const q = rosterSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (reg.attendeeName || '').toLowerCase().includes(q) ||
      (reg.attendeeEmail || '').toLowerCase().includes(q) ||
      (reg.registrationNumber || '').toLowerCase().includes(q) ||
      (reg.reference || '').toLowerCase().includes(q)
    );
  });

  // Check-In verification helper across all records
  const isRegistrationCheckedIn = (r: Registration) => {
    if (r.status === 'checked_in' || !!r.checkedInAt) return true;
    return allAttendance.some(
      (a) =>
        a.registrationId === r.id ||
        (a.attendeeEmail?.toLowerCase() === r.attendeeEmail?.toLowerCase() && a.eventId === r.eventId)
    );
  };

  // Partition events
  const activeEvents = events.filter((e) => e.status !== 'ended' && e.status !== 'archived');
  const endedEvents = events.filter((e) => e.status === 'ended' || e.status === 'archived');

  // Calculate Metrics
  const totalRegistrations = allRegistrations.filter((r) => r.status !== 'cancelled').length;
  const totalCheckIns = allRegistrations.filter(isRegistrationCheckedIn).length;

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

    const teamNotice = reg.teamName ? ` • Team: ${reg.teamName} (${reg.isTeamLeader ? '👑 Leader' : 'Member'})` : '';
    setScanResult({
      success: true,
      message: `✅ SUCCESS! Ticket ${reg.reference} Verified for ${reg.attendeeName} (${reg.attendeeEmail})${teamNotice}. Attendance Recorded!`,
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
      const endedEvt: Event = { ...event, status: 'ended' };
      await EventDatabaseService.endEventInRealtimeDB(event.id);
      StorageRepository.saveEvent(endedEvt);
      setEvents((prev) => prev.map((e) => (e.id === event.id ? endedEvt : e)));
      await loadData();
    } catch {
      alert('Failed to end event. Please try again.');
    }
  };

  // Delete event handler (cascade)
  const handleDeleteEvent = async (event: Event) => {
    setConfirmAction(null);
    try {
      await EventDatabaseService.deleteEventFromRealtimeDB(event.id);
      StorageRepository.deleteEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setRtdbRegistrations((prev) => prev.filter((r) => r.eventId !== event.id));
      await loadData();
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
                  v3.1
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
                      (r) => r.eventId === evt.id && isRegistrationCheckedIn(r)
                    ).length;

                    return (
                      <div
                        key={evt.id}
                        className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-3.5 shadow-xs"
                      >
                        {/* Event Title and Badges Header */}
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                              {(evt.category || 'EVENT').toUpperCase()}
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

                        {/* Dedicated Responsive Action Toolbar */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              setRegisterMemberEventId(evt.id);
                              setIsRegisterMemberModalOpen(true);
                            }}
                            title="Register Member to Event"
                            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 border border-purple-200 text-purple-700 text-xs font-black transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Member</span>
                          </button>
                          <button
                            onClick={() => setEditingEvent(evt)}
                            title="Edit Event Details"
                            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 border border-indigo-200 text-indigo-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => onViewEventPage(evt)}
                            title="View Public Event Page"
                            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 active:scale-95 border border-slate-200 text-xs font-bold text-indigo-600 transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                          >
                            <span>View</span>
                            <span>→</span>
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'end', event: evt })}
                            title="End Event Session"
                            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 text-amber-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <StopCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">End</span>
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'delete', event: evt })}
                            title="Delete Event"
                            className="px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 border border-rose-200 text-rose-600 text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Card Stats Footer */}
                        <div className="pt-2.5 flex items-center justify-between border-t border-slate-200/80 text-xs text-slate-600 font-semibold">
                          <div className="flex items-center gap-3">
                            <span>
                              Regs: <strong className="text-slate-900 font-black">{regCount}/{evt.maxCapacity}</strong>
                            </span>
                            <span>
                              Check-ins: <strong className="text-emerald-700 font-black">{checkInCount}</strong>
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
                    const checkedInCount = regs.filter(isRegistrationCheckedIn).length;

                    return (
                      <div
                        key={evt.id}
                        className="p-4 sm:p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3.5 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                                {(evt.category || 'EVENT').toUpperCase()}
                              </span>
                              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                EVENT CONCLUDED
                              </span>
                            </div>
                            <h4 className="text-base sm:text-lg font-black text-slate-900 truncate">{evt.title}</h4>
                            <p className="text-xs text-slate-500 font-medium truncate">📍 {evt.venueName}</p>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => setWinnersEvent(evt)}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 shadow-md text-xs font-black transition-all cursor-pointer"
                            >
                              <Trophy className="w-4 h-4 text-slate-950" />
                              <span>🏆 Edit Winners &amp; Scores</span>
                            </button>
                            <button
                              onClick={() => setConfirmAction({ type: 'delete', event: evt })}
                              className="p-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-2.5 flex items-center justify-between border-t border-slate-200/80 text-xs text-slate-600 font-semibold">
                          <div className="flex items-center gap-4">
                            <span>
                              Registered: <strong className="text-slate-900 font-black">{regCount}</strong>
                            </span>
                            <span>
                              Checked In: <strong className="text-emerald-700 font-black">{checkedInCount}</strong>
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">
                            Ended: {new Date(evt.startDate).toLocaleDateString()}
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

        {/* PAGE 4: USERS & ATTENDEE ROSTER PAGE */}
        {activeTab === 'admin' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-purple-600/20">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Users &amp; Attendee Roster</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      View all registered members, Student IDs, and event check-in passes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsRegisterMemberModalOpen(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Register Member</span>
                  </button>

                  <button
                    onClick={loadData}
                    title="Refresh Roster Data"
                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search member by Name, Email, or Register ID..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 pl-10 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>

                <div>
                  <select
                    value={rosterEventFilter}
                    onChange={(e) => setRosterEventFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  >
                    <option value="all">All Events ({allRegistrations.length} Total Passes)</option>
                    {events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                      <th className="py-3 px-3">Member Details</th>
                      <th className="py-3 px-3">Register Number ID</th>
                      <th className="py-3 px-3">Team / Group</th>
                      <th className="py-3 px-3">Event Title</th>
                      <th className="py-3 px-3">QR Ref Code</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredRosterRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                          No member records found matching search filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRosterRegistrations.map((reg) => {
                        const targetEvt = events.find((e) => e.id === reg.eventId);
                        const isCheckedIn = reg.status === 'checked_in' || reg.checkedInAt || allAttendance.some((a) => a.registrationId === reg.id);
                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-3">
                              <div className="font-extrabold text-slate-900">{reg.attendeeName}</div>
                              <div className="text-slate-500 text-[11px]">{reg.attendeeEmail}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-mono font-extrabold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                {reg.registrationNumber || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              {reg.teamName ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-extrabold text-indigo-700 text-xs">
                                    <span>👥 {reg.teamName}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                      reg.isTeamLeader ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {reg.isTeamLeader ? '👑 Leader' : 'Member'}
                                    </span>
                                  </div>
                                  {reg.teamCode && (
                                    <div className="text-[10px] font-mono text-purple-700">Code: {reg.teamCode}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Individual</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-slate-800">
                              {targetEvt?.title || reg.eventId}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {reg.reference}
                              </span>
                            </td>
                            <td className="py-3.5 px-3">
                              {isCheckedIn ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                  Checked In ✓
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                  Confirmed Pass
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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

      {/* EDIT EVENT MODAL */}
      <EditEventModal
        isOpen={Boolean(editingEvent)}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onEventUpdated={(updatedEvent) => {
          setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
        }}
      />

      {/* ORGANIZER REGISTER MEMBER MODAL */}
      <OrganizerRegisterMemberModal
        isOpen={isRegisterMemberModalOpen}
        events={events}
        selectedEventId={registerMemberEventId}
        onClose={() => {
          setIsRegisterMemberModalOpen(false);
          setRegisterMemberEventId(undefined);
        }}
        onMemberRegistered={() => {
          loadData();
        }}
      />
    </div>
  );
};
