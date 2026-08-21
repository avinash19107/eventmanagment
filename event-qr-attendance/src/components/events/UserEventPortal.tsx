import React, { useState, useEffect } from 'react';
import { Event, EventCategory, User, Registration, EventWinner, PlatformFeedback } from '../../types';
import { EventDatabaseService } from '../../services/eventDatabase';
import { UserDatabaseService, UserDatabaseRecord } from '../../services/userDatabase';
import { StorageRepository } from '../../services/storage';
import { CreateEventModal } from './CreateEventModal';
import { EventDetailModal } from './EventDetailModal';
import { UserProfileModal } from '../profile/UserProfileModal';
import { LeaderboardView } from '../leaderboard/LeaderboardView';
import { CertificateModal } from '../certificate/CertificateModal';
import { EventFeedbackModal } from '../feedback/EventFeedbackModal';
import { PlatformFeedbackModal } from '../feedback/PlatformFeedbackModal';
import { ToastContainer, ToastMessage } from '../common/Toast';
import {
  Search,
  Zap,
  Code,
  Flame,
  Calendar,
  Award,
  Plus,
  Ticket,
  LogOut,
  MapPin,
  Users,
  ChevronRight,
  Filter,
  CheckCircle2,
  X,
  QrCode,
  ArrowUpRight,
  Globe,
  Clock,
  Compass,
  Heart,
  Share2,
  CalendarPlus,
  SlidersHorizontal,
  Check,
  Trophy,
  History,
  Star,
  Menu,
  Sparkles,
  HelpCircle,
  Activity,
  ArrowRight,
  MessageSquare,
  LayoutDashboard,
  ShieldCheck,
  Download,
  Loader2,
} from 'lucide-react';

interface UserEventPortalProps {
  currentUser: User;
  onSignOut: () => void;
  onSelectEvent: (event: Event) => void;
  onUserUpdated?: (updatedUser: User) => void;
}

export interface UserCertificateItem {
  event: Event;
  registration: Registration;
  winner?: EventWinner;
  isEnded: boolean;
  isCheckedIn: boolean;
  hasFeedback: boolean;
}

type PortalPage = 'discover' | 'portal' | 'how' | 'leaderboard';

// Hash to PortalPage mapping for direct URL refresh persistence
const parsePageFromHash = (): PortalPage => {
  const hash = window.location.hash.toLowerCase();
  if (hash.includes('leaderboard')) return 'leaderboard';
  if (hash.includes('portal')) return 'portal';
  if (hash.includes('how')) return 'how';
  return 'discover';
};

export const UserEventPortal: React.FC<UserEventPortalProps> = ({
  currentUser,
  onSignOut,
  onSelectEvent,
  onUserUpdated,
}) => {
  // Active Top Page Navigation with URL Refresh Persistence
  const [activePage, setActivePage] = useState<PortalPage>(parsePageFromHash);

  const navigateToPage = (page: PortalPage) => {
    setActivePage(page);
    const targetHash =
      page === 'leaderboard'
        ? '#leaderboard'
        : page === 'portal'
        ? '#my-portal'
        : page === 'how'
        ? '#how-it-works'
        : '#discover';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  };

  // Listen to browser Back/Forward & URL Hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const page = parsePageFromHash();
      setActivePage(page);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [events, setEvents] = useState<Event[]>(() => StorageRepository.getEvents());
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'saved' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Secondary Filters
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');

  // Bookmarks / Saved Events
  const [savedEventIds, setSavedEventIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`saved_events_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toasts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Modals & Drawers State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMyPassesDrawerOpen, setIsMyPassesDrawerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'security'>('profile');

  // Certificate & Feedback Modal State in My Portal
  const [portalSubTab, setPortalSubTab] = useState<'passes' | 'certificates'>('passes');
  const [selectedCert, setSelectedCert] = useState<{
    event: Event;
    registration: Registration;
    winner?: EventWinner;
  } | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [feedbackTargetCert, setFeedbackTargetCert] = useState<UserCertificateItem | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isPlatformFeedbackModalOpen, setIsPlatformFeedbackModalOpen] = useState(false);

  // Community Portal Feedbacks State
  const [portalFeedbacks, setPortalFeedbacks] = useState<PlatformFeedback[]>(() => StorageRepository.getPlatformFeedback());

  // Handle Mobile Hardware / Browser Back Button for Modals
  useEffect(() => {
    const handlePopState = () => {
      if (isPlatformFeedbackModalOpen) {
        setIsPlatformFeedbackModalOpen(false);
      } else if (isCertModalOpen) {
        setIsCertModalOpen(false);
        setSelectedCert(null);
      } else if (isFeedbackModalOpen) {
        setIsFeedbackModalOpen(false);
        setFeedbackTargetCert(null);
      } else if (isCreateModalOpen) {
        setIsCreateModalOpen(false);
      } else if (isDetailModalOpen) {
        setIsDetailModalOpen(false);
      } else if (isMyPassesDrawerOpen) {
        setIsMyPassesDrawerOpen(false);
      } else if (isProfileModalOpen) {
        setIsProfileModalOpen(false);
      }
    };

    const isAnyModalOpen =
      isCreateModalOpen ||
      isDetailModalOpen ||
      isMyPassesDrawerOpen ||
      isProfileModalOpen ||
      isCertModalOpen ||
      isFeedbackModalOpen ||
      isPlatformFeedbackModalOpen;

    if (isAnyModalOpen) {
      window.history.pushState({ modalOpen: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    isCreateModalOpen,
    isDetailModalOpen,
    isMyPassesDrawerOpen,
    isProfileModalOpen,
    isCertModalOpen,
    isFeedbackModalOpen,
  ]);

  const [allRegistrations, setAllRegistrations] = useState<Registration[]>(() => StorageRepository.getRegistrations());
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>(() => {
    const localRegs = StorageRepository.getRegistrations();
    return localRegs.filter((r) => r.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase());
  });
  const [allWinnersMap, setAllWinnersMap] = useState<Record<string, EventWinner[]>>({});

  const handleOpenCertificate = (cert: UserCertificateItem) => {
    if (cert.hasFeedback) {
      setSelectedCert({
        event: cert.event,
        registration: cert.registration,
        winner: cert.winner,
      });
      setIsCertModalOpen(true);
    } else {
      setFeedbackTargetCert(cert);
      setIsFeedbackModalOpen(true);
    }
  };

  // Countdown State for Featured Spotlight
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Helper function to check if a registration has been verified/checked in
  const isCheckedInReg = (r: Registration) => {
    if (r.status === 'checked_in' || !!r.checkedInAt) return true;
    const attList = StorageRepository.getAttendanceRecords();
    return attList.some(
      (a) => a.registrationId === r.id || (a.attendeeEmail?.toLowerCase() === r.attendeeEmail?.toLowerCase() && a.eventId === r.eventId)
    );
  };

  // Load events & registrations live from Firebase Realtime Database and Attendance Records
  const loadEventsFromDB = async () => {
    const attendanceRecords = StorageRepository.getAttendanceRecords();

    try {
      const rtdbEvents = await EventDatabaseService.getEventsFromRealtimeDB();
      const localEvents = StorageRepository.getEvents();

      // If RTDB returned events, only keep local events that are in RTDB
      const allEventsMap = new Map<string, Event>();
      rtdbEvents.forEach((e) => allEventsMap.set(e.id, e));
      if (rtdbEvents.length === 0) {
        localEvents.forEach((e) => allEventsMap.set(e.id, e));
      }

      const mergedEvents = Array.from(allEventsMap.values());
      const validEventIds = new Set(mergedEvents.map((e) => e.id));
      setEvents(mergedEvents);

      // Clean local storage if an event was deleted
      if (localEvents.some((e) => !validEventIds.has(e.id))) {
        const cleanedEvents = localEvents.filter((e) => validEventIds.has(e.id));
        localStorage.setItem('eqa_events', JSON.stringify(cleanedEvents));
      }

      // Registrations
      const rtdbRegs = await EventDatabaseService.getRegistrationsFromRealtimeDB();
      const localRegs = StorageRepository.getRegistrations();
      const allRegsMap = new Map<string, Registration>();

      localRegs.forEach((r) => {
        if (validEventIds.has(r.eventId)) {
          const att = attendanceRecords.find(
            (a) => a.registrationId === r.id || (a.attendeeEmail?.toLowerCase() === r.attendeeEmail?.toLowerCase() && a.eventId === r.eventId)
          );
          if (att && r.status !== 'checked_in') {
            allRegsMap.set(r.id, { ...r, status: 'checked_in' as const, checkedInAt: att.checkInTime });
          } else {
            allRegsMap.set(r.id, r);
          }
        }
      });

      rtdbRegs.forEach((r) => {
        if (validEventIds.has(r.eventId)) {
          const att = attendanceRecords.find(
            (a) => a.registrationId === r.id || (a.attendeeEmail?.toLowerCase() === r.attendeeEmail?.toLowerCase() && a.eventId === r.eventId)
          );
          if (att && r.status !== 'checked_in') {
            allRegsMap.set(r.id, { ...r, status: 'checked_in' as const, checkedInAt: att.checkInTime });
          } else {
            allRegsMap.set(r.id, r);
          }
        }
      });

      // Purge local storage of deleted event registrations & attendance
      if (localRegs.some((r) => !validEventIds.has(r.eventId))) {
        const cleanedRegs = localRegs.filter((r) => validEventIds.has(r.eventId));
        localStorage.setItem('eqa_registrations', JSON.stringify(cleanedRegs));
      }
      if (attendanceRecords.some((a) => !validEventIds.has(a.eventId))) {
        const cleanedAtt = attendanceRecords.filter((a) => validEventIds.has(a.eventId));
        localStorage.setItem('eqa_attendance', JSON.stringify(cleanedAtt));
      }

      const validAllRegs = Array.from(allRegsMap.values());
      setAllRegistrations(validAllRegs);

      const userRegs = validAllRegs.filter(
        (r) => r.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase()
      );
      setMyRegistrations(userRegs);

      // Load all winner scores for ended events
      const allRtdbWinners = await EventDatabaseService.getAllWinnersFromRealtimeDB();
      const winnersObj: Record<string, EventWinner[]> = { ...allRtdbWinners };
      for (const evt of mergedEvents) {
        if (!winnersObj[evt.id] && (evt.status === 'ended' || evt.status === 'archived')) {
          const ws = await EventDatabaseService.getWinnersForEvent(evt.id);
          if (ws && ws.length > 0) {
            winnersObj[evt.id] = ws;
          }
        }
      }
      setAllWinnersMap(winnersObj);

      // Load Real-time Platform / Community Feedbacks
      const rtdbPlatformFb = await EventDatabaseService.getPlatformFeedbackFromRealtimeDB();
      const localPlatformFb = StorageRepository.getPlatformFeedback();
      const pfMap = new Map<string, PlatformFeedback>();
      localPlatformFb.forEach((f) => pfMap.set(f.id, f));
      rtdbPlatformFb.forEach((f) => pfMap.set(f.id, f));
      setPortalFeedbacks(Array.from(pfMap.values()));
    } catch (err) {
      console.warn('Realtime database sync notice:', err);
    }
  };

  useEffect(() => {
    loadEventsFromDB();

    // Auto-sync every 3 seconds and on window focus so organizer check-in and status reflect instantly
    const interval = setInterval(loadEventsFromDB, 3000);
    window.addEventListener('focus', loadEventsFromDB);

    // Live subscription to currentUser profile and permissions
    let unsubUser: (() => void) | undefined;
    if (currentUser.id) {
      unsubUser = UserDatabaseService.subscribeToUser(currentUser.id, (fresh) => {
        if (fresh) {
          onUserUpdated?.(fresh);
        }
      });
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', loadEventsFromDB);
      unsubUser?.();
    };
  }, [currentUser.id]);

  // Partition Events into Active and Completed
  const activeEvents = events.filter((e) => e.status !== 'ended' && e.status !== 'archived');
  const completedEvents = events.filter((e) => e.status === 'ended' || e.status === 'archived');

  const featuredEvent = activeEvents.find((e) => e.featured) || activeEvents[0] || null;

  // Real-time Countdown Timer for Featured Event
  useEffect(() => {
    if (!featuredEvent) return;
    const targetDate = new Date(featuredEvent.startDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [featuredEvent]);

  // Toggle Bookmark Event
  const toggleSaveEvent = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (savedEventIds.includes(eventId)) {
      updated = savedEventIds.filter((id) => id !== eventId);
      addToast('info', 'Event removed from your saved list.');
    } else {
      updated = [...savedEventIds, eventId];
      addToast('success', 'Event saved to your favorites!');
    }
    setSavedEventIds(updated);
    localStorage.setItem(`saved_events_${currentUser.id}`, JSON.stringify(updated));
  };

  // Share Event Link
  const handleShareEvent = (evt: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#event-${evt.id}`;
    navigator.clipboard.writeText(url);
    addToast('success', `Link for "${evt.title}" copied to clipboard!`);
  };

  // Filter Events Logic
  const targetList = (selectedCategory as string) === 'completed' ? completedEvents : activeEvents;

  const filteredEvents = targetList.filter((evt) => {
    if (selectedCategory === 'saved') {
      if (!savedEventIds.includes(evt.id)) return false;
    } else if ((selectedCategory as string) !== 'all' && (selectedCategory as string) !== 'completed' && evt.category !== selectedCategory) {
      return false;
    }

    if (priceFilter === 'free' && !evt.isFree) return false;
    if (priceFilter === 'paid' && evt.isFree) return false;

    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (evt.title || '').toLowerCase().includes(q) ||
      (evt.description || '').toLowerCase().includes(q) ||
      (evt.venueName || '').toLowerCase().includes(q) ||
      (evt.tags && evt.tags.some((t) => (t || '').toLowerCase().includes(q)));

    return matchesSearch;
  });

  // Calculate Attendance KPI Metrics
  const attendedCount = myRegistrations.filter(isCheckedInReg).length;
  const totalRegisteredCount = myRegistrations.length;
  const attendanceRate = (totalRegisteredCount > 0 && attendedCount > 0) ? Math.round((attendedCount / totalRegisteredCount) * 100) : 0;
  const circumference = 2 * Math.PI * 56;
  const strokeOffset = circumference - (circumference * (attendanceRate / 100));

  // Category Configuration
  const getCategoryConfig = (category: EventCategory) => {
    switch (category) {
      case 'hackathon':
        return {
          label: 'Hackathon',
          badgeClass: 'bg-amber-500 text-white shadow-amber-500/20',
          accentColor: 'text-amber-600',
          icon: Code,
        };
      case 'conference':
        return {
          label: 'Conference',
          badgeClass: 'bg-indigo-600 text-white shadow-indigo-600/20',
          accentColor: 'text-indigo-600',
          icon: Flame,
        };
      case 'sports':
        return {
          label: 'Sports & Gaming',
          badgeClass: 'bg-rose-600 text-white shadow-rose-600/20',
          accentColor: 'text-rose-600',
          icon: Award,
        };
      default:
        return {
          label: 'Workshop',
          badgeClass: 'bg-emerald-600 text-white shadow-emerald-600/20',
          accentColor: 'text-emerald-600',
          icon: Calendar,
        };
    }
  };

  const categories: { id: EventCategory | 'saved' | 'completed'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Active', icon: Compass },
    { id: 'hackathon', label: 'Hackathons', icon: Code },
    { id: 'conference', label: 'Conferences', icon: Flame },
    { id: 'event', label: 'Workshops', icon: Calendar },
    { id: 'sports', label: 'Sports & Gaming', icon: Award },
    { id: 'completed' as any, label: `Recently Completed (${completedEvents.length})`, icon: History },
    { id: 'saved', label: `Saved (${savedEventIds.length})`, icon: Heart },
  ];

  // Render Luma Event Card in Clean Light Theme
  const renderLumaCard = (evt: Event) => {
    const eventParticipants = allRegistrations.filter((r) => r.eventId === evt.id && r.status !== 'cancelled');
    const regCount = eventParticipants.length;
    const capPercent = Math.min(100, Math.round((regCount / (evt.maxCapacity || 1)) * 100));
    const isRegistered = myRegistrations.some((r) => r.eventId === evt.id);
    const isSaved = savedEventIds.includes(evt.id);
    const catConfig = getCategoryConfig(evt.category);
    const isEnded = evt.status === 'ended' || evt.status === 'archived';
    const winnersList = allWinnersMap[evt.id] || [];

    const checkedInCount = eventParticipants.filter(isCheckedInReg).length;
    const isUserCheckedIn = eventParticipants.some(
      (p) => p.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase() && isCheckedInReg(p)
    );

    const startDate = new Date(evt.startDate);
    const monthStr = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayStr = startDate.getDate();

    return (
      <div
        key={evt.id}
        onClick={() => onSelectEvent(evt)}
        className={`bg-white border rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col shadow-sm group cursor-pointer ${
          isEnded ? 'border-purple-200/90 hover:border-purple-400' : 'border-slate-200/90 hover:border-indigo-400'
        }`}
      >
        {/* Banner Image with Overlay Badges */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
          <img
            src={evt.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'}
            alt={evt.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

          {/* Date Box (Top Left) */}
          <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-md rounded-2xl px-3 py-1.5 text-center text-slate-900 shadow-lg border border-white/40">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block leading-none">
              {monthStr}
            </span>
            <span className="text-base font-black leading-none block pt-0.5 text-slate-900">
              {dayStr}
            </span>
          </div>

          {/* Top Right Action Buttons (Bookmark, Share, Price, Status) */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
            {isEnded ? (
              <span className="bg-purple-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md border border-purple-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Ended</span>
              </span>
            ) : (
              <>
                <button
                  onClick={(e) => toggleSaveEvent(evt.id, e)}
                  className={`p-2 rounded-full backdrop-blur-md border shadow-md transition-transform hover:scale-110 cursor-pointer ${
                    isSaved
                      ? 'bg-rose-500 text-white border-rose-400'
                      : 'bg-white/90 text-slate-600 hover:text-rose-500 border-white/40'
                  }`}
                  title={isSaved ? 'Remove Bookmark' : 'Bookmark Event'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={(e) => handleShareEvent(evt, e)}
                  className="p-2 rounded-full bg-white/90 text-slate-600 hover:text-indigo-600 backdrop-blur-md border border-white/40 shadow-md transition-transform hover:scale-110 cursor-pointer"
                  title="Share Link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {evt.isFree ? (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                    FREE
                  </span>
                ) : (
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                    ₹{evt.price || 499}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${catConfig.badgeClass}`}>
                {catConfig.label}
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                Hosted by {evt.organizerName || 'Apex Events'}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
              {evt.title}
            </h3>

            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
              {evt.description}
            </p>
          </div>

          {/* Winner Scores & Leaderboard Section (Team vs Individual) */}
          {winnersList.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-black text-amber-900">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>{evt.format === 'team' ? 'Team Leaderboard' : 'Leaderboard Scores'}</span>
                </div>
                <span className="text-[10px] uppercase font-extrabold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-full">
                  {evt.format === 'team' ? 'Official Standings' : `${winnersList.length} Winners`}
                </span>
              </div>

              <div className="space-y-1">
                {evt.format === 'team' ? (
                  /* Team Leaderboard Preview */
                  (() => {
                    const tMap = new Map<string, { teamName: string; score: number; prize?: string; rank: number; members: EventWinner[] }>();
                    winnersList.forEach((w) => {
                      const tName = w.teamName || w.attendeeName;
                      if (!tMap.has(tName)) {
                        tMap.set(tName, {
                          teamName: tName,
                          score: w.score,
                          prize: w.prize,
                          rank: w.rank || 1,
                          members: [],
                        });
                      }
                      tMap.get(tName)!.members.push(w);
                    });

                    return Array.from(tMap.values())
                      .sort((a, b) => a.rank - b.rank)
                      .slice(0, 3)
                      .map((st, idx) => {
                        const isMyTeam = st.members.some((m) => m.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase());
                        return (
                          <div
                            key={st.teamName || idx}
                            className={`flex items-center justify-between px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                              isMyTeam
                                ? 'bg-amber-400 text-slate-950 border border-amber-500 shadow-sm'
                                : 'bg-white text-slate-800 border border-slate-200/60'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                              <span className="truncate">👥 {st.teamName} {isMyTeam ? '(Your Team)' : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-black text-indigo-700">{st.score} Pts</span>
                              {st.prize && (
                                <span className="text-[9px] text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded font-black">
                                  {st.prize}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                  })()
                ) : (
                  /* Individual Leaderboard Preview */
                  winnersList.slice(0, 3).map((w, idx) => {
                    const isMe = w.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase();
                    return (
                      <div
                        key={w.registrationId || idx}
                        className={`flex items-center justify-between px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                          isMe
                            ? 'bg-amber-400 text-slate-950 border border-amber-500 shadow-sm'
                            : 'bg-white text-slate-800 border border-slate-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                          <span className="truncate">{w.attendeeName} {isMe ? '(You)' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-black text-indigo-700">{w.score} Pts</span>
                          {w.prize && (
                            <span className="text-[9px] text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded font-black">
                              {w.prize}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Details & Capacity */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>
                {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {evt.venueName}
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Registrations</span>
                <span className="text-indigo-700 font-black">{regCount} / {evt.maxCapacity}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    capPercent > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                  }`}
                  style={{ width: `${capPercent}%` }}
                />
              </div>
            </div>

            {/* Registered Participants */}
            {eventParticipants.length > 0 ? (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                  {eventParticipants.slice(0, 4).map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="inline-flex h-6 w-6 rounded-full ring-2 ring-white bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-[9px] font-black items-center justify-center shadow-xs"
                      title={p.attendeeName}
                    >
                      {p.attendeeName.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {eventParticipants.length > 4 && (
                    <div className="inline-flex h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 text-slate-700 text-[9px] font-black items-center justify-center">
                      +{eventParticipants.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{eventParticipants.length} Registered Participants</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100/80 text-[11px] text-slate-400 font-medium">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>0 Registered Participants</span>
              </div>
            )}

            {/* Attendance Status Marker */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[11px] font-bold">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Attendance:</span>
              </span>
              {isUserCheckedIn ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Verified Present</span>
                </span>
              ) : checkedInCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{checkedInCount} Checked In</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-[10px]">
                  Gate Check-In
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {isEnded ? (
              isRegistered ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(evt);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>📜 Download Certificate &amp; Scores</span>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(evt);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-purple-100 transition-all cursor-pointer shadow-sm"
                >
                  <span>View Concluded Event &amp; Leaderboard</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )
            ) : isRegistered ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(evt);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-all cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Registered • View Event Page</span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(evt);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 hover:scale-[1.01]"
              >
                <span>Register on Event Page</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white pb-24 relative">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* 1. TOP NAVIGATION HEADER WITH LIGHT THEME & MULTI-PAGE TABS */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 px-4 sm:px-8 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                navigateToPage('discover');
                setSelectedCategory('all');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">ApexEvents</span>
            </div>
          </div>

          {/* Center Page Tabs Navigator (Pages Format) */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => navigateToPage('discover')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activePage === 'discover'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Discover</span>
            </button>

            <button
              onClick={() => navigateToPage('portal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activePage === 'portal'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>My Portal</span>
              {myRegistrations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-black text-[9px]">
                  {myRegistrations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => navigateToPage('how')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activePage === 'how'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How it Works</span>
            </button>

            <button
              onClick={() => navigateToPage('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activePage === 'leaderboard'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Leaderboard</span>
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Host Event Button (Organizers & Admins Only) */}
            {(currentUser.role === 'organizer' || currentUser.role === 'admin') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                title="Host New Event"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Host Event</span>
              </button>
            )}

            {/* My Passes Drawer Button */}
            <button
              onClick={() => setIsMyPassesDrawerOpen(true)}
              className="relative flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-700 font-extrabold text-xs shadow-xs transition-all cursor-pointer"
              title="View My Ticket Passes"
            >
              <Ticket className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Passes</span>
              {myRegistrations.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                  {myRegistrations.length}
                </span>
              )}
            </button>

            {/* User Profile Badge */}
            <button
              onClick={() => {
                setProfileModalTab('profile');
                setIsProfileModalOpen(true);
              }}
              title="Click to View Profile & Security Settings"
              className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200 cursor-pointer hover:opacity-80 active:scale-95 transition-all group"
            >
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={currentUser.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-indigo-200 shadow-xs group-hover:border-indigo-600 transition-colors"
              />
            </button>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 sm:p-2.5 rounded-2xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 active:scale-95 border border-slate-200 shadow-xs transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Page Navigation Selector */}
        <div className="flex md:hidden items-center justify-between gap-1 pt-2.5 mt-2 border-t border-slate-100 overflow-x-auto scrollbar-none">
          <button
            onClick={() => navigateToPage('discover')}
            className={`flex-1 min-w-[75px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
              activePage === 'discover'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover</span>
          </button>
          <button
            onClick={() => navigateToPage('portal')}
            className={`flex-1 min-w-[75px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
              activePage === 'portal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Portal</span>
            {myRegistrations.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full font-black text-[9px] ${
                activePage === 'portal' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {myRegistrations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => navigateToPage('how')}
            className={`flex-1 min-w-[75px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
              activePage === 'how'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How</span>
          </button>
          <button
            onClick={() => navigateToPage('leaderboard')}
            className={`flex-1 min-w-[85px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
              activePage === 'leaderboard'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>Ranks</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* PAGE 1: DISCOVER EVENTS PAGE VIEW */}
      {/* ========================================================= */}
      {activePage === 'discover' && (
        <div className="space-y-10 animate-fade-in">
          {/* Featured Spotlight Card with Live Countdown */}
          {featuredEvent && (
            <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-200/80 shadow-2xl p-6 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 group">
                <img
                  src={featuredEvent.bannerUrl}
                  alt={featuredEvent.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent pointer-events-none" />

                <div className="relative z-10 space-y-4 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> Featured Spotlight
                    </span>
                    <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {featuredEvent.category.toUpperCase()}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight uppercase">
                    {featuredEvent.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {featuredEvent.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span>{new Date(featuredEvent.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-purple-400" />
                      <span>{featuredEvent.venueName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>{allRegistrations.filter((r) => r.eventId === featuredEvent.id && r.status !== 'cancelled').length} Registered Participants</span>
                    </div>
                  </div>

                  {/* Real-time Countdown Timer */}
                  <div className="flex items-center gap-2 sm:gap-4 pt-2">
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/15 text-center min-w-[62px]">
                      <span className="block text-xl sm:text-2xl font-black text-white font-mono">{String(countdown.days).padStart(2, '0')}</span>
                      <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Days</span>
                    </div>
                    <span className="text-indigo-400 font-bold">:</span>
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/15 text-center min-w-[62px]">
                      <span className="block text-xl sm:text-2xl font-black text-white font-mono">{String(countdown.hours).padStart(2, '0')}</span>
                      <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Hours</span>
                    </div>
                    <span className="text-indigo-400 font-bold">:</span>
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/15 text-center min-w-[62px]">
                      <span className="block text-xl sm:text-2xl font-black text-white font-mono">{String(countdown.minutes).padStart(2, '0')}</span>
                      <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Mins</span>
                    </div>
                    <span className="text-indigo-400 font-bold">:</span>
                    <div className="p-3 rounded-2xl bg-black/40 border border-white/15 text-center min-w-[62px]">
                      <span className="block text-xl sm:text-2xl font-black text-cyan-400 font-mono">{String(countdown.seconds).padStart(2, '0')}</span>
                      <span className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Secs</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 w-full lg:w-auto shrink-0 flex flex-col gap-3">
                  <button
                    onClick={() => onSelectEvent(featuredEvent)}
                    className="w-full lg:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-xl shadow-indigo-500/30 transition-all cursor-pointer flex items-center justify-center gap-2.5 hover:scale-[1.02]"
                  >
                    <span>Register on Event Page</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Search & Category Filter Controls */}
          <section className="max-w-7xl mx-auto px-3 sm:px-8 space-y-4 sm:space-y-6">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none py-1">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count =
                    cat.id === 'all'
                      ? activeEvents.length
                      : cat.id === 'saved'
                      ? savedEventIds.filter((id) => activeEvents.some((e) => e.id === id)).length
                      : cat.id === 'completed'
                      ? completedEvents.length
                      : activeEvents.filter((e) => e.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 shrink-0 ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-white text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 shadow-xs'
                      }`}
                    >
                      <cat.icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Price Toggle & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events..."
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-2 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white border border-slate-200 shadow-xs sm:flex">
                  <button
                    onClick={() => setPriceFilter('all')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer active:scale-95 ${priceFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setPriceFilter('free')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer active:scale-95 ${priceFilter === 'free' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => setPriceFilter('paid')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer active:scale-95 ${priceFilter === 'paid' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Paid
                  </button>
                </div>
              </div>
            </div>

            {/* Events Grid */}
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-slate-200 bg-white shadow-sm space-y-4 max-w-lg mx-auto my-12">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">No matching events found</h3>
                <p className="text-xs text-slate-500">
                  Try adjusting your search keywords or switching filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map(renderLumaCard)}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAGE 2: MY PORTAL / USER CONSOLE VIEW */}
      {/* ========================================================= */}
      {activePage === 'portal' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8 animate-fade-in">
          {/* Section Header */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">
              My <span className="text-indigo-600">Portal</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mt-1">
              Your registered ticket passes, attendance metrics, and saved events live in one place.
            </p>
          </div>

          {/* Dashboard Frame in Clean Light Theme */}
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl overflow-hidden space-y-6 p-6 sm:p-8">
            {/* Personalized Welcome Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-600/30">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Welcome back, {currentUser.name}!
                  </h3>
                  <p className="text-xs text-slate-600 font-mono">
                    {currentUser.registrationNumber ? `ID: ${currentUser.registrationNumber} • ` : ''}
                    {myRegistrations.length} total event registrations
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Cards & Circular Attendance Progress Donut Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* KPI 1: Attended Events */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="p-3 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                </div>
                <div>
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono block">
                    {attendedCount}
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                    Events Attended
                  </span>
                </div>
              </div>

              {/* KPI 2: Total Registered Passes */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="p-3 rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                    <Ticket className="w-5 h-5" />
                  </span>
                </div>
                <div>
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono block">
                    {totalRegisteredCount}
                  </span>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                    Passes Registered
                  </span>
                </div>
              </div>

              {/* KPI 3: Attendance Analytics Donut Chart */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-5">
                {/* Circular SVG Donut */}
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 140 140">
                    <defs>
                      <linearGradient id="dnGradLight" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="70"
                      cy="70"
                      r="56"
                      className="fill-none stroke-slate-200 stroke-[10]"
                    />
                    <circle
                      cx="70"
                      cy="70"
                      r="56"
                      stroke="url(#dnGradLight)"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      className="fill-none transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900 font-mono leading-none">
                      {attendanceRate}%
                    </span>
                    <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                      Rate
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Attendance Score
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {attendedCount === 0
                      ? 'No events attended yet.'
                      : attendanceRate >= 80
                      ? '⭐ Excellent attendance record!'
                      : 'Check in to more events to boost your score.'}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-slate-600">
                    <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-indigo-600 inline-block" /> Attended ({attendedCount})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* My Portal Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 pt-2">
              <button
                type="button"
                onClick={() => setPortalSubTab('passes')}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  portalSubTab === 'passes'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>My Registered Passes ({myRegistrations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPortalSubTab('certificates')}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                  portalSubTab === 'certificates'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>🏆 My Official Certificates ({myRegistrations.filter((r) => isCheckedInReg(r) || events.find((e) => e.id === r.eventId)?.status === 'ended' || events.find((e) => e.id === r.eventId)?.status === 'archived').length})</span>
              </button>
            </div>

            {/* TAB 1: REGISTERED PASSES */}
            {portalSubTab === 'passes' && (
              <div className="space-y-4 pt-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Active Event Tickets ({myRegistrations.length})
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPortalSubTab('certificates')}
                    className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>View Certificates Gallery →</span>
                  </button>
                </div>

                {myRegistrations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-xs text-slate-500">You haven't reserved tickets for any events yet.</p>
                    <button
                      onClick={() => navigateToPage('discover')}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs cursor-pointer shadow-sm"
                    >
                      Browse Discover Events →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRegistrations.map((reg) => {
                      const evt = events.find((e) => e.id === reg.eventId);
                      const isCheckedIn = isCheckedInReg(reg);
                      const isEnded = evt?.status === 'ended' || evt?.status === 'archived';
                      const hasFeedback = StorageRepository.hasUserSubmittedFeedback(reg.eventId, currentUser.email);
                      const winner = allWinnersMap[reg.eventId]?.find(
                        (w) => w.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase()
                      );
                      const certItem: UserCertificateItem | null = evt
                        ? {
                            event: evt,
                            registration: reg,
                            winner,
                            isEnded,
                            isCheckedIn,
                            hasFeedback,
                          }
                        : null;

                      return (
                        <div
                          key={reg.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 group"
                        >
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 flex flex-col items-center justify-center font-mono text-xs font-bold text-indigo-700 shrink-0 shadow-2xs">
                              <span>PASS</span>
                              <span className="text-[9px] text-purple-700 font-black">{reg.reference.slice(-4)}</span>
                            </div>

                            <div className="space-y-1 min-w-0">
                              <h5 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {evt?.title || 'Registered Event'}
                              </h5>
                              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span>Ref: <strong className="text-indigo-600 font-mono">{reg.reference}</strong></span>
                                <span>• {evt?.venueName || 'Venue'}</span>
                              </p>

                              {/* Team Badge on Ticket Card */}
                              {reg.teamName && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    {reg.teamLogoUrl ? (
                                      <img src={reg.teamLogoUrl} alt="Team Logo" className="w-3.5 h-3.5 rounded-xs object-cover" />
                                    ) : (
                                      <Users className="w-3 h-3 text-indigo-600" />
                                    )}
                                    <span>Team: {reg.teamName}</span>
                                  </span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                                    reg.isTeamLeader ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    {reg.isTeamLeader ? '👑 Leader' : '👤 Member'}
                                  </span>
                                  {reg.teamCode && (
                                    <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                                      Code: {reg.teamCode}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/70">
                            <span
                              className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                                isCheckedIn
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              }`}
                            >
                              {isCheckedIn ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Attended • Verified</span>
                                </>
                              ) : (
                                <span>Pass Active • Ready for Gate</span>
                              )}
                            </span>

                            <div className="flex items-center gap-2">
                              {(isEnded || isCheckedIn) && certItem && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCertificate(certItem)}
                                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Certificate</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (evt) {
                                    onSelectEvent(evt);
                                  }
                                }}
                                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white hover:bg-indigo-600 hover:text-white active:scale-95 border border-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>View Ticket</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: OFFICIAL CERTIFICATES & AWARDS GALLERY */}
            {portalSubTab === 'certificates' && (
              <div className="space-y-4 pt-1 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-indigo-500/10 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Official Certificates &amp; Awards
                      </h4>
                    </div>
                  </div>

                  <span className="text-xs font-extrabold bg-white border border-amber-300 text-amber-900 px-3 py-1.5 rounded-full shadow-2xs shrink-0">
                    {myRegistrations.filter((r) => isCheckedInReg(r) || events.find((e) => e.id === r.eventId)?.status === 'ended' || events.find((e) => e.id === r.eventId)?.status === 'archived').length} Certificates Issued
                  </span>
                </div>

                {myRegistrations.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center border border-indigo-200 shadow-2xs">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h4 className="text-sm font-black text-slate-800">No Certificates Earned Yet</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Register and attend events on ApexEvents. Once the event concludes or you check in, your official certificate will appear here!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRegistrations.map((reg) => {
                      const evt = events.find((e) => e.id === reg.eventId);
                      if (!evt) return null;
                      const isCheckedIn = isCheckedInReg(reg);
                      const isEnded = evt.status === 'ended' || evt.status === 'archived';
                      const isUnlocked = isEnded || isCheckedIn;
                      const hasFeedback = StorageRepository.hasUserSubmittedFeedback(evt.id, currentUser.email);
                      const winner = allWinnersMap[evt.id]?.find(
                        (w) => w.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase()
                      );

                      const cert: UserCertificateItem = {
                        event: evt,
                        registration: reg,
                        winner,
                        isEnded,
                        isCheckedIn,
                        hasFeedback,
                      };

                      return (
                        <div
                          key={reg.id}
                          className={`p-4 rounded-2xl border transition-all space-y-3 ${
                            isUnlocked
                              ? 'bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-white border-amber-200/90 shadow-xs hover:border-amber-400'
                              : 'bg-slate-50 border-slate-200 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                                  winner
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : isUnlocked
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {winner ? <Trophy className="w-6 h-6" /> : <Award className="w-6 h-6" />}
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                    {evt.category || 'Event'}
                                  </span>
                                  {winner && (
                                    <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <Trophy className="w-3 h-3 text-amber-700" />
                                      <span>{winner.rank}</span>
                                    </span>
                                  )}
                                  {reg.teamName && (
                                    <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      {reg.teamLogoUrl ? (
                                        <img src={reg.teamLogoUrl} alt="Team Logo" className="w-3.5 h-3.5 rounded-xs object-cover" />
                                      ) : (
                                        <Users className="w-3 h-3 text-purple-600" />
                                      )}
                                      <span>Team: {reg.teamName}</span>
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-sm font-black text-slate-900 leading-snug truncate">
                                  {evt.title}
                                </h4>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>{evt.startDate}</span>
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                    <span className="truncate max-w-[180px]">{evt.venueName}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-full uppercase border shrink-0 ${
                                !isUnlocked
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : hasFeedback
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              {!isUnlocked ? '⏳ In Progress' : hasFeedback ? '✓ Verified & Ready' : '🔒 Feedback Required'}
                            </span>
                          </div>

                          {/* Certificate Bottom Action Bar */}
                          <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-slate-400">
                              Pass Ref: <strong className="text-indigo-600 font-bold">{reg.reference}</strong>
                            </span>

                            {isUnlocked ? (
                              hasFeedback ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCert({
                                      event: evt,
                                      registration: reg,
                                      winner: winner,
                                    });
                                    setIsCertModalOpen(true);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>View &amp; Download Certificate</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFeedbackTargetCert(cert);
                                    setIsFeedbackModalOpen(true);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Complete Feedback to Unlock</span>
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-amber-700 font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Unlocks when event concludes</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAGE 3: HOW IT WORKS & PLATFORM STORIES VIEW */}
      {/* ========================================================= */}
      {activePage === 'how' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-16 animate-fade-in">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase">
              Five Moments. <span className="text-indigo-600">Zero Friction.</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Your entire event journey from discovery to instant gate check-in, live certificates, and memories.
            </p>
          </div>

          {/* 5-Step Journey Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
              <span className="text-xs font-mono text-indigo-600 font-bold">01</span>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Discover</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  A curated feed of campus &amp; national events matched to your interests.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
              <span className="text-xs font-mono text-indigo-600 font-bold">02</span>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Register</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  One tap pass reservation with verified profile lock &amp; instant QR codes.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
              <span className="text-xs font-mono text-indigo-600 font-bold">03</span>
              <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Attend</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Fast-track check-in with high-speed camera scanner validation at the gate.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
              <span className="text-xs font-mono text-indigo-600 font-bold">04</span>
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Connect</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Team formation, leader selection, and collaboration with fellow attendees.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4">
              <span className="text-xs font-mono text-indigo-600 font-bold">05</span>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Celebrate</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Official participation certificates, live leaderboard rankings &amp; scores.
                </p>
              </div>
            </div>
          </div>

          {/* Real-time Platform Live Stats Grid */}
          {(() => {
            const liveEventsCount = events.length;
            const liveAttendeesCount = allRegistrations.filter((r) => r.status !== 'cancelled').length;
            const liveCheckedInCount = allRegistrations.filter(isCheckedInReg).length;
            const avgRating =
              portalFeedbacks.length > 0
                ? (portalFeedbacks.reduce((a, b) => a + (b.rating || 5), 0) / portalFeedbacks.length).toFixed(1)
                : '5.0';
            const satisfactionRate =
              portalFeedbacks.length > 0
                ? Math.round((portalFeedbacks.filter((f) => f.rating >= 4).length / portalFeedbacks.length) * 100)
                : 100;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
                <div className="space-y-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-indigo-600 block">
                    {liveEventsCount}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    Events Hosted
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-purple-600 block">
                    {liveAttendeesCount}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    Attendees Registered
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-pink-600 block">
                    {liveCheckedInCount}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    Passes Checked In
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 flex items-center justify-center gap-1">
                    <span>{portalFeedbacks.length > 0 ? `${satisfactionRate}%` : `${avgRating}★`}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    {portalFeedbacks.length > 0 ? `Satisfaction (${portalFeedbacks.length} Reviews)` : 'Satisfaction Rating'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Real-time Community Feedback Wall */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <span className="text-xs font-mono text-indigo-600 tracking-widest uppercase font-bold">
                  Community Feedback ({portalFeedbacks.length})
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase mt-1">
                  Loved By The People <span className="text-indigo-600">Who Show Up</span>
                </h3>
              </div>
            </div>

            {portalFeedbacks.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">Be the First to Review ApexEvents!</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    Share your experience with ticket passes, registrations, gate check-in, and certificates.
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => setIsPlatformFeedbackModalOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Write a Review</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {portalFeedbacks.slice(0, 6).map((fb) => (
                  <div
                    key={fb.id}
                    className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-indigo-300 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-amber-500 text-sm tracking-widest flex items-center gap-0.5">
                          {Array.from({ length: fb.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-500 inline-block" />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(fb.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        "{fb.feedback}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                      {fb.userAvatarUrl ? (
                        <img
                          src={fb.userAvatarUrl}
                          alt={fb.userName}
                          className="w-9 h-9 rounded-full object-cover border border-indigo-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {(fb.userName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 truncate">{fb.userName}</h5>
                        <p className="text-[10px] text-indigo-600 font-bold truncate">
                          {fb.tag || 'Student Attendee'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAGE 4: MONTHLY & ALL-TIME LEADERBOARD VIEW */}
      {activePage === 'leaderboard' && (
        <LeaderboardView
          currentUser={currentUser}
          events={events}
          registrations={allRegistrations}
          allWinnersMap={allWinnersMap}
          allUsers={StorageRepository.getUsers()}
          onSelectEvent={onSelectEvent}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      )}

      {/* 4. MY TICKETS DRAWER */}
      {isMyPassesDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-white border-l border-slate-200 h-full overflow-y-auto p-6 space-y-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-900">My Ticket Passes</h2>
                </div>
                <button
                  onClick={() => setIsMyPassesDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {myRegistrations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Ticket className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">You haven't registered for any events yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myRegistrations.map((reg) => {
                    const evt = events.find((e) => e.id === reg.eventId);
                    const isCheckedIn = isCheckedInReg(reg);
                    return (
                      <div
                        key={reg.id}
                        className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative overflow-hidden shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-indigo-700 font-mono">{reg.reference}</span>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                              isCheckedIn
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {isCheckedIn ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Attended</span>
                              </>
                            ) : (
                              <span>Confirmed</span>
                            )}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-900">{evt?.title || 'Registered Event'}</h4>
                          <p className="text-xs text-slate-500 font-medium">{reg.attendeeName}</p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-slate-200/80 text-[11px] text-slate-500">
                          <span>{new Date(reg.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={() => {
                              if (evt) {
                                onSelectEvent(evt);
                                setIsMyPassesDrawerOpen(false);
                              }
                            }}
                            className="text-indigo-600 font-bold hover:underline cursor-pointer"
                          >
                            View Ticket Pass
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMyPassesDrawerOpen(false)}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md cursor-pointer"
            >
              Close Passes
            </button>
          </div>
        </div>
      )}

      {/* 5. CREATE EVENT MODAL */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={(newEvent) => {
          setEvents((prev) => [newEvent, ...prev]);
          addToast('success', `🎉 Event "${newEvent.title}" published to Firebase RTDB!`);
        }}
        organizerEmail={currentUser.email}
        organizerName={currentUser.name}
      />

      {/* 6. EVENT DETAIL & REGISTRATION MODAL */}
      <EventDetailModal
        event={selectedEvent}
        currentUser={currentUser}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onRegistrationComplete={() => {
          loadEventsFromDB();
          addToast('success', '🎉 Registration confirmed! Ticket pass generated.');
        }}
      />

      {/* 7. USER PROFILE & SECURITY SETTINGS MODAL */}
      <UserProfileModal
        currentUser={currentUser}
        isOpen={isProfileModalOpen}
        initialTab={profileModalTab}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(updatedUser) => {
          setIsProfileModalOpen(false);
          onUserUpdated?.(updatedUser);
          addToast('success', '🎉 Profile updated! Your registration number is now saved.');
        }}
      />

      {/* 8. CERTIFICATE MODAL */}
      {selectedCert && (
        <CertificateModal
          isOpen={isCertModalOpen}
          onClose={() => {
            setIsCertModalOpen(false);
            setSelectedCert(null);
          }}
          event={selectedCert.event}
          registration={selectedCert.registration}
          winner={selectedCert.winner}
        />
      )}

      {/* 9. EVENT FEEDBACK MODAL (FOR CERTIFICATE UNLOCK) */}
      {feedbackTargetCert && (
        <EventFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => {
            setIsFeedbackModalOpen(false);
            setFeedbackTargetCert(null);
          }}
          event={feedbackTargetCert.event}
          currentUser={currentUser}
          registration={feedbackTargetCert.registration}
          onFeedbackSubmitted={() => {
            setIsFeedbackModalOpen(false);
            setSelectedCert({
              event: feedbackTargetCert.event,
              registration: feedbackTargetCert.registration,
              winner: feedbackTargetCert.winner,
            });
            setIsCertModalOpen(true);
            setFeedbackTargetCert(null);
            loadEventsFromDB();
            addToast('success', '🎉 Feedback submitted! Certificate unlocked.');
          }}
        />
      )}

      {/* 10. COMMUNITY PLATFORM FEEDBACK MODAL */}
      <PlatformFeedbackModal
        isOpen={isPlatformFeedbackModalOpen}
        onClose={() => setIsPlatformFeedbackModalOpen(false)}
        currentUser={currentUser}
        onFeedbackSubmitted={(newFb) => {
          setPortalFeedbacks((prev) => [newFb, ...prev.filter((f) => f.id !== newFb.id)]);
          addToast('success', '🎉 Thank you! Your feedback has been published to the community wall.');
        }}
      />
    </div>
  );
};
