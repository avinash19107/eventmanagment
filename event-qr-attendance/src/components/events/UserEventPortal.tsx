import React, { useState, useEffect } from 'react';
import { Event, EventCategory, User, Registration, EventWinner } from '../../types';
import { EventDatabaseService } from '../../services/eventDatabase';
import { StorageRepository } from '../../services/storage';
import { CreateEventModal } from './CreateEventModal';
import { EventDetailModal } from './EventDetailModal';
import { UserProfileModal } from '../profile/UserProfileModal';
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
} from 'lucide-react';

interface UserEventPortalProps {
  currentUser: User;
  onSignOut: () => void;
  onSelectEvent: (event: Event) => void;
  onUserUpdated?: (updatedUser: User) => void;
}

export const UserEventPortal: React.FC<UserEventPortalProps> = ({
  currentUser,
  onSignOut,
  onSelectEvent,
  onUserUpdated,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'saved' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Secondary Filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'weekend' | 'month'>('all');
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

  // Handle Mobile Hardware / Browser Back Button for Modals
  useEffect(() => {
    const handlePopState = () => {
      if (isCreateModalOpen) {
        setIsCreateModalOpen(false);
      } else if (isDetailModalOpen) {
        setIsDetailModalOpen(false);
      } else if (isMyPassesDrawerOpen) {
        setIsMyPassesDrawerOpen(false);
      } else if (isProfileModalOpen) {
        setIsProfileModalOpen(false);
      }
    };

    const isAnyModalOpen = isCreateModalOpen || isDetailModalOpen || isMyPassesDrawerOpen || isProfileModalOpen;
    if (isAnyModalOpen) {
      window.history.pushState({ modalOpen: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isCreateModalOpen, isDetailModalOpen, isMyPassesDrawerOpen, isProfileModalOpen]);

  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [allWinnersMap, setAllWinnersMap] = useState<Record<string, EventWinner[]>>({});

  // Load events & registrations live from Firebase Realtime Database
  const loadEventsFromDB = async () => {
    const rtdbEvents = await EventDatabaseService.getEventsFromRealtimeDB();
    const localEvents = StorageRepository.getEvents();
    const allEventsMap = new Map<string, Event>();
    localEvents.forEach((e) => allEventsMap.set(e.id, e));
    rtdbEvents.forEach((e) => allEventsMap.set(e.id, e));
    const mergedEvents = Array.from(allEventsMap.values());
    setEvents(mergedEvents);

    const rtdbRegs = await EventDatabaseService.getRegistrationsFromRealtimeDB();
    const localRegs = StorageRepository.getRegistrations();
    const allRegsMap = new Map<string, Registration>();
    localRegs.forEach((r) => allRegsMap.set(r.id, r));
    rtdbRegs.forEach((r) => allRegsMap.set(r.id, r));

    const allRegs = Array.from(allRegsMap.values());
    setAllRegistrations(allRegs);

    const userRegs = allRegs.filter(
      (r) => r.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase()
    );
    setMyRegistrations(userRegs);

    // Load winner scores for ended events
    const winnersObj: Record<string, EventWinner[]> = {};
    for (const evt of rtdbEvents) {
      if (evt.status === 'ended' || evt.status === 'archived') {
        const ws = await EventDatabaseService.getWinnersForEvent(evt.id);
        if (ws && ws.length > 0) {
          winnersObj[evt.id] = ws;
        }
      }
    }
    setAllWinnersMap(winnersObj);
  };

  useEffect(() => {
    loadEventsFromDB();
  }, [currentUser]);

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

  // Partition Events into Active and Completed
  const activeEvents = events.filter((e) => e.status !== 'ended' && e.status !== 'archived');
  const completedEvents = events.filter((e) => e.status === 'ended' || e.status === 'archived');

  // Filter Events Logic
  const targetList = (selectedCategory as string) === 'completed' ? completedEvents : activeEvents;

  const filteredEvents = targetList.filter((evt) => {
    // Saved filter
    if (selectedCategory === 'saved') {
      if (!savedEventIds.includes(evt.id)) return false;
    } else if ((selectedCategory as string) !== 'all' && (selectedCategory as string) !== 'completed' && evt.category !== selectedCategory) {
      return false;
    }

    // Price Filter
    if (priceFilter === 'free' && !evt.isFree) return false;
    if (priceFilter === 'paid' && evt.isFree) return false;

    // Search Query
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (evt.title || '').toLowerCase().includes(q) ||
      (evt.description || '').toLowerCase().includes(q) ||
      (evt.venueName || '').toLowerCase().includes(q) ||
      (evt.tags && evt.tags.some((t) => (t || '').toLowerCase().includes(q)));

    return matchesSearch;
  });

  const featuredEvent = activeEvents.find((e) => e.featured) || activeEvents[0] || events[0];

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

  // Group active events by category for sectioned view
  const hackathons = activeEvents.filter((e) => e.category === 'hackathon');
  const conferences = activeEvents.filter((e) => e.category === 'conference');
  const workshops = activeEvents.filter((e) => e.category === 'event');
  const sports = activeEvents.filter((e) => e.category === 'sports');

  // Render a Luma-Style Event Card
  const renderLumaCard = (evt: Event) => {
    const regCount = allRegistrations.filter((r) => r.eventId === evt.id && r.status !== 'cancelled').length;
    const capPercent = Math.min(100, Math.round((regCount / (evt.maxCapacity || 1)) * 100));
    const isRegistered = myRegistrations.some((r) => r.eventId === evt.id);
    const isSaved = savedEventIds.includes(evt.id);
    const catConfig = getCategoryConfig(evt.category);
    const isEnded = evt.status === 'ended' || evt.status === 'archived';
    const winnersList = allWinnersMap[evt.id] || [];

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
        {/* Banner Image with Luma Overlay Badges */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
          <img
            src={evt.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'}
            alt={evt.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

          {/* Luma Date Box (Top Left) */}
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
                  className={`p-2 rounded-full backdrop-blur-md border shadow-md transition-transform hover:scale-110 ${
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
                  className="p-2 rounded-full bg-white/90 text-slate-600 hover:text-indigo-600 backdrop-blur-md border border-white/40 shadow-md transition-transform hover:scale-110"
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

          {/* Winner Scores & Leaderboard Section */}
          {winnersList.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-black text-amber-900">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Leaderboard Scores</span>
                </div>
                <span className="text-[10px] uppercase font-extrabold bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-full">
                  {winnersList.length} Winners
                </span>
              </div>

              <div className="space-y-1">
                {winnersList.slice(0, 3).map((w, idx) => {
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
                })}
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
                  <span>📜 Download Certificate & Scores</span>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(evt);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-purple-100 transition-all cursor-pointer shadow-sm"
                >
                  <span>View Concluded Event & Leaderboard</span>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white pb-24">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* 1. TOP NAVIGATION HEADER WITH 3-LINES MENU BUTTON */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 px-4 sm:px-8 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo Brand + 3-Lines Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                isMenuOpen
                  ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300'
                  : 'bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-600 border-slate-200'
              }`}
              title="Toggle Menu List"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
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

          {/* Center Search Input */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hackathons, conferences, sports..."
              className="w-full bg-slate-100/90 border border-slate-200 rounded-full px-4 py-2 pl-10 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Host Event Button (Organizers & Admins Only) */}
            {(currentUser.role === 'organizer' || currentUser.role === 'admin') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Host Event</span>
              </button>
            )}

            {/* My Tickets Drawer Button */}
            <button
              onClick={() => setIsMyPassesDrawerOpen(true)}
              className="relative flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">My Passes</span>
              {myRegistrations.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center ml-1">
                  {myRegistrations.length}
                </span>
              )}
            </button>

            {/* User Profile Badge */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              title="Click to View Profile & Security Settings"
              className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity group"
            >
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-indigo-200 shadow-sm group-hover:border-indigo-600 transition-colors"
              />
            </button>

            {/* Sign Out */}
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

      {/* 3-LINES DROPDOWN FLYOUT LIST MENU */}
      {isMenuOpen && (
        <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-2xl animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 space-y-4">
            {/* Mobile Search Input */}
            <div className="relative md:hidden">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hackathons, conferences, sports..."
                className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 pl-10 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>

            <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-wider">
              <span>Event Categories &amp; Quick Views</span>
              <span>List Menu</span>
            </div>

            {/* Menu List Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count =
                  cat.id === 'all'
                    ? events.length
                    : cat.id === 'saved'
                    ? savedEventIds.length
                    : cat.id === 'completed'
                    ? completedEvents.length
                    : events.filter((e) => e.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsMenuOpen(false);
                      if (cat.id !== 'all' && cat.id !== 'saved') {
                        const targetId = cat.id === 'event' ? 'section-events' : cat.id === 'completed' ? 'section-completed' : `section-${cat.id}s`;
                        const el = document.getElementById(targetId);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-xs font-black flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-md'
                        : 'bg-slate-50 hover:bg-indigo-50 text-slate-800 hover:text-indigo-600 border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {cat.id === 'hackathon' && <Zap className="w-4 h-4 text-amber-500 shrink-0" />}
                      {cat.id === 'conference' && <Flame className="w-4 h-4 text-indigo-500 shrink-0" />}
                      {cat.id === 'event' && <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />}
                      {cat.id === 'sports' && <Award className="w-4 h-4 text-rose-500 shrink-0" />}
                      {cat.id === 'completed' && <History className="w-4 h-4 text-purple-500 shrink-0" />}
                      {cat.id === 'saved' && <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />}
                      {cat.id === 'all' && <Compass className="w-4 h-4 text-indigo-500 shrink-0" />}
                      <span>{cat.label}</span>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. HERO SPOTLIGHT FEATURED EVENT */}
      {featuredEvent && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-200/80 shadow-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 group">
            <img
              src={featuredEvent.bannerUrl}
              alt={featuredEvent.title}
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-3.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Featured Spotlight
                </span>
                <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  {featuredEvent.category.toUpperCase()}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                {featuredEvent.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 font-normal leading-relaxed">
                {featuredEvent.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2 font-medium">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>{new Date(featuredEvent.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>{featuredEvent.venueName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{StorageRepository.getRegistrations(featuredEvent.id).length} / {featuredEvent.maxCapacity} Registered</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 w-full md:w-auto shrink-0">
              <button
                onClick={() => onSelectEvent(featuredEvent)}
                className="w-full md:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-xl shadow-indigo-500/30 transition-all cursor-pointer flex items-center justify-center gap-2.5 hover:scale-[1.02]"
              >
                <span>Go to Event Page & Register</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4. SECTIONED CONTENT DISPLAY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-12 animate-fade-in-up">
        {events.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto my-12">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner-sm">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">No events published yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                There are currently no events listed.
                {currentUser.role === 'organizer' || currentUser.role === 'admin'
                  ? ' Click "+ Host Event" to publish your first event!'
                  : ' Check back soon or ask an organizer to publish new events!'}
              </p>
            </div>
            {(currentUser.role === 'organizer' || currentUser.role === 'admin') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Host Event</span>
              </button>
            )}
          </div>
        ) : selectedCategory === 'all' && priceFilter === 'all' && !searchQuery ? (
          <>
            {/* HACKATHONS SECTION */}
            {hackathons.length > 0 && (
              <section id="section-hackathons" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-black text-slate-900">Trending Hackathons</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hackathons.map(renderLumaCard)}
                </div>
              </section>
            )}

            {/* CONFERENCES SECTION */}
            {conferences.length > 0 && (
              <section id="section-conferences" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-xl font-black text-slate-900">Tech Conferences & Summits</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {conferences.map(renderLumaCard)}
                </div>
              </section>
            )}

            {/* WORKSHOPS SECTION */}
            {workshops.length > 0 && (
              <section id="section-events" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-xl font-black text-slate-900">Interactive Workshops</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workshops.map(renderLumaCard)}
                </div>
              </section>
            )}

            {/* SPORTS SECTION */}
            {sports.length > 0 && (
              <section id="section-sports" className="space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-rose-600" />
                    <h2 className="text-xl font-black text-slate-900">Sports &amp; Gaming Arena</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sports.map(renderLumaCard)}
                </div>
              </section>
            )}

            {/* RECENTLY COMPLETED / PAST EVENTS SECTION */}
            {completedEvents.length > 0 && (
              <section id="section-completed" className="space-y-4 scroll-mt-24 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" />
                    <div>
                      <h2 className="text-xl font-black text-slate-900">Recently Completed Events</h2>
                      <p className="text-xs text-slate-500 font-medium">View official leaderboard scores &amp; download certificates</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1 rounded-full">
                    {completedEvents.length} Concluded
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedEvents.map(renderLumaCard)}
                </div>
              </section>
            )}
          </>
        ) : (
          /* FILTERED CATEGORY GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(renderLumaCard)}
          </div>
        )}
      </main>

      {/* 5. MY TICKETS DRAWER */}
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
                    return (
                      <div
                        key={reg.id}
                        className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative overflow-hidden shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-indigo-700 font-mono">{reg.reference}</span>
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                            {reg.status}
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
                            className="text-indigo-600 font-bold hover:underline"
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
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md"
            >
              Close Passes
            </button>
          </div>
        </div>
      )}

      {/* 6. CREATE EVENT MODAL */}
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

      {/* 7. EVENT DETAIL & REGISTRATION MODAL */}
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

      {/* 8. USER PROFILE & SECURITY SETTINGS MODAL */}
      <UserProfileModal
        currentUser={currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(updatedUser) => {
          setIsProfileModalOpen(false);
          onUserUpdated?.(updatedUser);
          addToast('success', '🎉 Profile updated! Your registration number is now saved.');
        }}
      />
    </div>
  );
};
