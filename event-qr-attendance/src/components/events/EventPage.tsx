import React, { useState, useEffect } from 'react';
import { Event, User, Registration, EventWinner } from '../../types';
import { StorageRepository } from '../../services/storage';
import { EventDatabaseService } from '../../services/eventDatabase';
import { UserDatabaseService } from '../../services/userDatabase';
import { EmailService } from '../../services/email';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Ticket,
  Flame,
  Share2,
  Clock,
  Zap,
  Award,
  Globe,
  ShieldCheck,
  User as UserIcon,
  Mail,
  Phone,
  QrCode,
  Download,
  Trophy,
  Star,
  Hash,
} from 'lucide-react';
import { CertificateModal } from '../certificate/CertificateModal';

interface EventPageProps {
  event: Event;
  currentUser: User;
  onBack: () => void;
  onRegistrationComplete: () => void;
}

export const EventPage: React.FC<EventPageProps> = ({
  event,
  currentUser,
  onBack,
  onRegistrationComplete,
}) => {
  const [attendeeName, setAttendeeName] = useState(currentUser.name);
  const [attendeeEmail, setAttendeeEmail] = useState(currentUser.email);
  const [attendeeRegNumber, setAttendeeRegNumber] = useState(currentUser.registrationNumber || '');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [registeredRef, setRegisteredRef] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [teamActionType, setTeamActionType] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150');

  const PRESET_TEAM_LOGOS = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=150',
  ];

  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [winners, setWinners] = useState<EventWinner[]>([]);

  useEffect(() => {
    EventDatabaseService.getRegistrationsFromRealtimeDB().then((rtdbRegs) => {
      const localRegs = StorageRepository.getRegistrations();
      const map = new Map<string, Registration>();
      localRegs.forEach((r) => map.set(r.id, r));
      rtdbRegs.forEach((r) => map.set(r.id, r));
      setAllRegistrations(Array.from(map.values()));
    });

    EventDatabaseService.getWinnersForEvent(event.id).then((ws) => {
      setWinners(ws);
    });
  }, [event.id]);

  // Extract Event Registrations and Teams
  const eventRegistrations = allRegistrations.filter(
    (r) => r.eventId === event.id && r.status !== 'cancelled'
  );

  const teamMap = new Map<string, { name: string; logoUrl?: string; leaderName?: string; members: Registration[] }>();
  eventRegistrations.forEach((r) => {
    if (r.teamName) {
      if (!teamMap.has(r.teamName)) {
        teamMap.set(r.teamName, {
          name: r.teamName,
          logoUrl: r.teamLogoUrl,
          leaderName: r.isTeamLeader ? r.attendeeName : r.teamLeaderName || r.attendeeName,
          members: [],
        });
      }
      const t = teamMap.get(r.teamName)!;
      t.members.push(r);
      if (r.isTeamLeader) {
        t.leaderName = r.attendeeName;
      }
      if (r.teamLogoUrl && !t.logoUrl) {
        t.logoUrl = r.teamLogoUrl;
      }
    }
  });
  const registeredTeams = Array.from(teamMap.values());

  const existingReg = allRegistrations.find(
    (r) => r.eventId === event.id && r.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase() && r.status !== 'cancelled'
  ) || StorageRepository.getRegistrationByEmail(event.id, currentUser.email);

  const userWinner = winners.find(
    (w) => w.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  const isAlreadyRegistered = Boolean(existingReg) || Boolean(registeredRef);
  const isEventEnded = event.status === 'ended' || event.status === 'archived';
  const currentRef = registeredRef || existingReg?.reference;

  const registeredCount = eventRegistrations.length;
  const isFull = registeredCount >= event.maxCapacity;
  const capPercent = Math.min(100, Math.round((registeredCount / (event.maxCapacity || 1)) * 100));

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim() || !attendeeEmail.trim() || !attendeeRegNumber.trim()) {
      alert('Please enter your Full Name, Email, and Register Number / Student ID.');
      return;
    }

    setIsLoading(true);

    // Persist registration number & name to user profile if missing or updated
    if (
      attendeeRegNumber.trim() !== currentUser.registrationNumber ||
      attendeeName.trim() !== currentUser.name
    ) {
      try {
        await UserDatabaseService.updateUserProfileDetails(
          currentUser,
          attendeeName.trim(),
          attendeeRegNumber.trim(),
          currentUser.avatarUrl || ''
        );
      } catch (e) {}
    }

    let finalTeamName: string | undefined = undefined;
    let finalTeamLogo: string | undefined = undefined;
    let isLeader = false;

    if (event.format === 'team') {
      if (teamActionType === 'create') {
        if (!teamName.trim()) {
          alert('Please enter a Team Name to create a team.');
          setIsLoading(false);
          return;
        }
        finalTeamName = teamName.trim();
        finalTeamLogo = teamLogoUrl || PRESET_TEAM_LOGOS[0];
        isLeader = true;
      } else {
        if (!selectedTeamName) {
          alert('Please select an existing team to join.');
          setIsLoading(false);
          return;
        }
        finalTeamName = selectedTeamName;
        const targetTeam = registeredTeams.find((t) => t.name === selectedTeamName);
        finalTeamLogo = targetTeam?.logoUrl;
        isLeader = false;
      }
    }

    const reference = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

    const newRegistration: Registration = {
      id: `reg-${Date.now()}`,
      eventId: event.id,
      reference,
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail.trim(),
      attendeePhone: attendeePhone.trim(),
      registrationNumber: attendeeRegNumber.trim(),
      status: isFull && event.waitlistEnabled ? 'waitlisted' : 'confirmed',
      responses: {},
      consentAccepted: true,
      createdAt: new Date().toISOString(),
      teamName: finalTeamName,
      teamLogoUrl: finalTeamLogo,
      isTeamLeader: isLeader,
      teamLeaderName: isLeader ? attendeeName.trim() : registeredTeams.find((t) => t.name === selectedTeamName)?.leaderName,
    };

    // Save registration locally & in RTDB
    StorageRepository.saveRegistration(newRegistration);

    // Create QR Credential
    const qrCredential = {
      id: `cred-${Date.now()}`,
      registrationId: newRegistration.id,
      eventId: event.id,
      tokenHash: reference,
      status: 'active' as const,
      issuedAt: new Date().toISOString(),
    };
    StorageRepository.saveCredential(qrCredential);

    // Log Audit Event
    StorageRepository.logAuditEvent({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'EVENT_PAGE_REGISTRATION',
      entityType: 'registration',
      entityId: newRegistration.id,
      details: `Registered on dedicated event page for "${event.title}" with Ticket Ref: ${reference}`,
    });

    setIsLoading(false);
    setRegisteredRef(reference);
    onRegistrationComplete();
  };

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white pb-24">
      {/* 1. TOP PAGE HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-2xl transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Events</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider hidden sm:block">
              Event Details & Registration
            </span>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-indigo-200">
              {event.category.toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* 2. FULL-WIDTH HERO COVER BANNER */}
      <section className="relative w-full bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 relative z-10 text-white flex flex-col md:flex-row items-start justify-between gap-8">
          <img
            src={event.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200'}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />

          {/* Hero Main Content */}
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
                {event.category.toUpperCase()}
              </span>
              {event.isFree ? (
                <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  FREE TICKET
                </span>
              ) : (
                <span className="bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  ₹{event.price || 499}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {event.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              {event.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300 pt-3 font-semibold">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>
                  {startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>
                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>{event.venueName}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TWO-COLUMN EVENT DETAIL & REGISTRATION BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT COLUMN (7 COLS): OVERVIEW, AGENDA, SPEAKERS */}
          <div className="lg:col-span-7 space-y-8">
            {/* Host Information Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                alt="Host"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm"
              />
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Event Organizer</span>
                <h3 className="text-base font-black text-slate-900">{event.organizerName || 'Apex Events Host'}</h3>
              </div>
            </div>

            {/* OFFICIAL EVENT RESULTS & LEADERBOARD (WHEN EVENT IS ENDED) */}
            {isEventEnded && (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-white">Official Event Results &amp; Winner Leaderboard</h3>
                      <p className="text-xs text-indigo-300 font-medium">Verified scores &amp; awards published by event organizer</p>
                    </div>
                  </div>

                  <span className="text-xs font-black uppercase px-3.5 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 shrink-0">
                    Event Concluded
                  </span>
                </div>

                {/* User Personal Winner Celebration Banner */}
                {userWinner && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold space-y-1 animate-fade-in">
                    <div className="flex items-center gap-2 text-sm font-black text-amber-300">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>🎉 Congratulations {userWinner.attendeeName}! You achieved Rank #{userWinner.rank || 1}!</span>
                    </div>
                    <p className="text-xs font-medium text-amber-100">
                      Final Score: <span className="font-black text-amber-300">{userWinner.score} Points</span>
                      {userWinner.prize ? ` • Award Prize: ${userWinner.prize}` : ''}
                    </p>
                  </div>
                )}

                {/* Leaderboard Standings Table */}
                {winners.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider px-2">
                      <span>Rank &amp; Participant</span>
                      <span>Score &amp; Prize</span>
                    </div>

                    <div className="divide-y divide-indigo-500/20 max-h-72 overflow-y-auto pr-1">
                      {[...winners].sort((a, b) => b.score - a.score).map((w, idx) => {
                        const isMe = w.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase();
                        return (
                          <div
                            key={w.registrationId || idx}
                            className={`py-3 px-3 rounded-xl flex items-center justify-between gap-4 text-xs font-bold transition-all ${
                              isMe ? 'bg-amber-400/20 border border-amber-400/40 text-amber-200' : 'hover:bg-white/5 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-black shrink-0 text-amber-400 text-sm">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${w.rank || idx + 1}`}
                              </span>
                              <div className="min-w-0">
                                <p className="font-black text-white truncate">{w.attendeeName} {isMe ? '(You)' : ''}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{w.reference}</p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-amber-400 text-sm block">{w.score} Pts</span>
                              {w.prize && (
                                <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                                  {w.prize}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-3 text-center">
                    Official rankings are currently being processed by the event host.
                  </p>
                )}
              </div>
            )}

            {/* Event Description Section */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">About This Event</h2>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">{event.description}</p>

              {event.tags && event.tags.length > 0 && (
                <div className="pt-3 flex flex-wrap gap-2 border-t border-slate-100">
                  {event.tags.map((tag, idx) => (
                    <span key={idx} className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Speakers / Hosts Section */}
            {event.speakers && event.speakers.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Featured Speakers & Hosts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.speakers.map((spk, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0">
                        <Flame className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{spk}</h4>
                        <p className="text-[11px] text-indigo-700 font-semibold">Keynote Speaker</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Venue Details Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>Venue &amp; Location</span>
              </h2>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <h4 className="text-sm font-black text-slate-900">{event.venueName}</h4>
                {event.address && <p className="text-xs text-slate-600 font-medium">{event.address}</p>}
                {event.virtualLink && (
                  <p className="text-xs text-indigo-600 font-bold pt-1">Virtual Access Link: {event.virtualLink}</p>
                )}
              </div>
            </div>

            {/* PUBLIC PARTICIPANT / TEAM DIRECTORY (NAMES & TEAMS ONLY) */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                    {event.format === 'team' ? 'Registered Teams' : 'Registered Participants'}
                  </h2>
                </div>
                <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full">
                  {event.format === 'team' ? `${registeredTeams.length} Teams` : `${eventRegistrations.length} Joined`}
                </span>
              </div>

              {event.format === 'team' ? (
                registeredTeams.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {registeredTeams.map((t) => (
                      <div key={t.name} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                        <img
                          src={t.logoUrl || PRESET_TEAM_LOGOS[0]}
                          alt={t.name}
                          className="w-11 h-11 rounded-xl object-cover border border-indigo-200 shadow-sm shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 truncate">{t.name}</h4>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            Leader: <span className="font-extrabold text-indigo-700">{t.leaderName}</span>
                          </p>
                          <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 inline-block mt-0.5">
                            👥 {t.members.length} Members
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-2">No teams registered yet. Be the first to create one!</p>
                )
              ) : (
                eventRegistrations.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {eventRegistrations.map((r) => (
                      <div key={r.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                          {r.attendeeName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-black text-slate-800 truncate">{r.attendeeName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-2">No participants registered yet.</p>
                )
              )}
            </div>
          </div>

          {/* RIGHT STICKY COLUMN (5 COLS): REGISTRATION TICKET FORM OR CONFIRMED PASS */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              {isAlreadyRegistered ? (
                /* CONFIRMED DIGITAL TICKET PASS CARD */
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 p-6 sm:p-8 rounded-3xl border border-indigo-200 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Registration Confirmed</span>
                    </div>
                    <span className="text-xs font-mono font-black bg-white px-3.5 py-1 rounded-full text-indigo-700 border border-indigo-200 shadow-sm">
                      {currentRef}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900">{event.title}</h3>
                    <p className="text-xs text-slate-600 font-medium">{attendeeName} ({attendeeEmail})</p>
                  </div>

                  {/* QR Code Display */}
                  <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-lg flex flex-col items-center justify-center space-y-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                        currentRef || 'TICKET'
                      )}`}
                      alt="Ticket QR Code"
                      className="w-48 h-48 object-contain"
                    />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Scan QR at Event Entrance
                    </span>
                  </div>

                  {/* Actions: Print & Calendar */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => window.print()}
                      className="py-2.5 px-3 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Print Ticket</span>
                    </button>
                    <a
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.startDate.replace(/[-:]/g, '')}/${event.endDate.replace(/[-:]/g, '')}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.venueName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Add to Cal</span>
                    </a>
                  </div>

                  {/* Certificate Action - Unlocks only when Event is Ended by Organizer */}
                  {isEventEnded ? (
                    <button
                      onClick={() => setIsCertModalOpen(true)}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
                    >
                      <Award className="w-4 h-4" />
                      <span>📜 View &amp; Download Official Certificate</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-[11px] font-bold text-center flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>📜 Official Certificate will unlock after host ends event</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-indigo-700">
                    <Ticket className="w-4 h-4 text-amber-500" />
                    <span>Digital Holographic Ticket Pass Active</span>
                  </div>
                </div>
              ) : (
                /* REGISTRATION FORM CARD */
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xl space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Reserve Your Ticket</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                        Registration Open
                      </span>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Capacity Status</span>
                        <span className="text-indigo-700 font-black">{registeredCount} / {event.maxCapacity} Seats</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all rounded-full ${
                            capPercent > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                          }`}
                          style={{ width: `${capPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800">Full Name *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={attendeeName}
                          onChange={(e) => setAttendeeName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
                        />
                        <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800">Register Number / Student ID *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={attendeeRegNumber}
                          onChange={(e) => setAttendeeRegNumber(e.target.value)}
                          placeholder="e.g. REG-2026-884"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 uppercase focus:outline-none focus:border-indigo-600 font-bold"
                        />
                        <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800">Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={attendeeEmail}
                          onChange={(e) => setAttendeeEmail(e.target.value)}
                          placeholder="Your email address"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800">Phone Number (Optional)</label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={attendeePhone}
                          onChange={(e) => setAttendeePhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
                        />
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      </div>
                    </div>

                    {/* Team Selection Section (If Event is Team Format) */}
                    {event.format === 'team' && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span>Team Format Event</span>
                          </label>
                          <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                            {event.minTeamSize || 2}-{event.maxTeamSize || 4} Members/Team
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTeamActionType('create')}
                            className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                              teamActionType === 'create'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white'
                            }`}
                          >
                            ➕ Create Team
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeamActionType('join')}
                            className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                              teamActionType === 'join'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white'
                            }`}
                          >
                            🤝 Join Team ({registeredTeams.length})
                          </button>
                        </div>

                        {teamActionType === 'create' ? (
                          <div className="space-y-3 pt-1 animate-fade-in">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                Team Name *
                              </label>
                              <input
                                type="text"
                                required={teamActionType === 'create'}
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="e.g. QuantumHackers / Apex Squad"
                                className="w-full bg-white border border-indigo-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                Select Team Logo / Avatar
                              </label>
                              <div className="flex items-center gap-2 mb-1">
                                {PRESET_TEAM_LOGOS.map((url, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setTeamLogoUrl(url)}
                                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                                      teamLogoUrl === url ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-transparent opacity-60 hover:opacity-100'
                                    }`}
                                  >
                                    <img src={url} alt="Logo Preset" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1 animate-fade-in">
                            <label className="block text-[11px] font-bold text-slate-700 uppercase">
                              Select Registered Team *
                            </label>
                            {registeredTeams.length > 0 ? (
                              <select
                                required={teamActionType === 'join'}
                                value={selectedTeamName}
                                onChange={(e) => setSelectedTeamName(e.target.value)}
                                className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                              >
                                <option value="">-- Choose Existing Team --</option>
                                {registeredTeams.map((t) => (
                                  <option key={t.name} value={t.name}>
                                    {t.name} (Leader: {t.leaderName || 'Host'} • {t.members.length} Members)
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <p className="text-xs text-indigo-700 italic bg-white p-2.5 rounded-xl border border-indigo-100">
                                No teams registered yet. Be the first to <strong>Create a Team</strong>!
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <span>Generating Ticket Pass...</span>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4 text-amber-300" />
                          <span>Register &amp; Get Digital QR Ticket Pass</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* OFFICIAL CERTIFICATE PREVIEW MODAL */}
      <CertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        event={event}
        winner={userWinner}
        registration={
          existingReg || {
            id: `reg-${Date.now()}`,
            eventId: event.id,
            reference: currentRef || 'REF-849201',
            attendeeName,
            attendeeEmail,
            status: 'confirmed',
            responses: {},
            consentAccepted: true,
            createdAt: new Date().toISOString(),
          }
        }
      />
    </div>
  );
};
