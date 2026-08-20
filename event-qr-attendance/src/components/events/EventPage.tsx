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
  Lock,
  Plus,
  Trash2,
  Copy,
  Check,
  KeyRound,
  Crown,
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
  
  // Advanced Team Registration States
  const [teamActionType, setTeamActionType] = useState<'create_full' | 'join'>('create_full');
  const [teamName, setTeamName] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150');
  const [generatedTeamPasses, setGeneratedTeamPasses] = useState<{ name: string; email: string; ref: string; isLeader: boolean }[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Dynamic Teammates List (for Full Team Registration)
  const minTeamSize = event.minTeamSize || 2;
  const maxTeamSize = event.maxTeamSize || 4;
  const [teammates, setTeammates] = useState<Array<{ name: string; email: string; registrationNumber: string; phone: string }>>([
    { name: '', email: '', registrationNumber: '', phone: '' },
  ]);

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

  const teamMap = new Map<string, { name: string; teamCode?: string; logoUrl?: string; leaderName?: string; members: Registration[] }>();
  eventRegistrations.forEach((r) => {
    if (r.teamName) {
      if (!teamMap.has(r.teamName)) {
        teamMap.set(r.teamName, {
          name: r.teamName,
          teamCode: r.teamCode,
          logoUrl: r.teamLogoUrl,
          leaderName: r.isTeamLeader ? r.attendeeName : r.teamLeaderName || r.attendeeName,
          members: [],
        });
      }
      const t = teamMap.get(r.teamName)!;
      t.members.push(r);
      if (r.teamCode && !t.teamCode) t.teamCode = r.teamCode;
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

  // Add a new dynamic teammate row
  const handleAddTeammateSlot = () => {
    if (teammates.length + 1 >= maxTeamSize) {
      alert(`Maximum team size for this event is ${maxTeamSize} members (1 Leader + ${maxTeamSize - 1} Teammates).`);
      return;
    }
    setTeammates([...teammates, { name: '', email: '', registrationNumber: '', phone: '' }]);
  };

  // Remove a dynamic teammate row
  const handleRemoveTeammateSlot = (index: number) => {
    if (teammates.length + 1 <= minTeamSize) {
      alert(`Minimum team size for this event is ${minTeamSize} members (1 Leader + ${minTeamSize - 1} Teammates).`);
      return;
    }
    setTeammates(teammates.filter((_, i) => i !== index));
  };

  const updateTeammateField = (index: number, field: 'name' | 'email' | 'registrationNumber' | 'phone', val: string) => {
    const next = [...teammates];
    next[index][field] = val;
    setTeammates(next);
  };

  // Copy Team Join Code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Registration Submission Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      alert('Please enter your full name and email address.');
      return;
    }

    // Update profile details if attendee
    if (currentUser && currentUser.role === 'attendee') {
      try {
        await UserDatabaseService.updateUserProfileDetails(
          currentUser,
          currentUser.name,
          attendeeRegNumber.trim(),
          currentUser.avatarUrl || ''
        );
      } catch (e) {}
    }

    setIsLoading(true);

    try {
      // 1. TEAM FORMAT REGISTRATION FLOW
      if (event.format === 'team') {
        if (teamActionType === 'create_full') {
          // Validation for Full Team Registration
          if (!teamName.trim()) {
            alert('Please enter a Team Name.');
            setIsLoading(false);
            return;
          }

          // Check if team name already exists in this event
          if (registeredTeams.some((t) => t.name.toLowerCase() === teamName.trim().toLowerCase())) {
            alert(`A team named "${teamName.trim()}" already exists in this event. Please choose a unique name.`);
            setIsLoading(false);
            return;
          }

          // Validate filled teammates
          const validTeammates = teammates.filter((t) => t.name.trim() && t.email.trim());
          const totalTeamMembers = 1 + validTeammates.length;

          if (totalTeamMembers < minTeamSize) {
            alert(`This event requires a minimum of ${minTeamSize} members per team. Please add at least ${minTeamSize - 1} teammate(s).`);
            setIsLoading(false);
            return;
          }

          // Check for duplicate emails among team members
          const allMemberEmails = [attendeeEmail.trim().toLowerCase(), ...validTeammates.map((t) => t.email.trim().toLowerCase())];
          const uniqueEmails = new Set(allMemberEmails);
          if (uniqueEmails.size !== allMemberEmails.length) {
            alert('Each team member must have a unique email address.');
            setIsLoading(false);
            return;
          }

          // Generate Unique 6-character Team Code
          const newTeamCode = `TEAM-${Math.floor(1000 + Math.random() * 9000)}`;
          const finalTeamLogo = teamLogoUrl || PRESET_TEAM_LOGOS[0];
          const leaderReference = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

          // 1. Leader Registration
          const leaderReg: Registration = {
            id: `reg-${Date.now()}-leader`,
            eventId: event.id,
            reference: leaderReference,
            attendeeName: attendeeName.trim(),
            attendeeEmail: attendeeEmail.trim(),
            attendeePhone: attendeePhone.trim(),
            registrationNumber: attendeeRegNumber.trim(),
            status: 'confirmed',
            responses: {},
            consentAccepted: true,
            createdAt: new Date().toISOString(),
            teamName: teamName.trim(),
            teamLogoUrl: finalTeamLogo,
            teamCode: newTeamCode,
            isTeamLeader: true,
            teamLeaderName: attendeeName.trim(),
          };

          // Save Leader
          StorageRepository.saveRegistration(leaderReg);
          StorageRepository.saveCredential({
            id: `cred-${Date.now()}-0`,
            registrationId: leaderReg.id,
            eventId: event.id,
            tokenHash: leaderReference,
            status: 'active',
            issuedAt: new Date().toISOString(),
          });

          const passesSummary = [{ name: attendeeName.trim(), email: attendeeEmail.trim(), ref: leaderReference, isLeader: true }];

          // 2. Save Teammates
          for (let i = 0; i < validTeammates.length; i++) {
            const member = validTeammates[i];
            const memberRef = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
            const memberReg: Registration = {
              id: `reg-${Date.now()}-m${i + 1}`,
              eventId: event.id,
              reference: memberRef,
              attendeeName: member.name.trim(),
              attendeeEmail: member.email.trim(),
              attendeePhone: member.phone.trim(),
              registrationNumber: member.registrationNumber.trim(),
              status: 'confirmed',
              responses: {},
              consentAccepted: true,
              createdAt: new Date().toISOString(),
              teamName: teamName.trim(),
              teamLogoUrl: finalTeamLogo,
              teamCode: newTeamCode,
              isTeamLeader: false,
              teamLeaderName: attendeeName.trim(),
            };

            StorageRepository.saveRegistration(memberReg);
            StorageRepository.saveCredential({
              id: `cred-${Date.now()}-${i + 1}`,
              registrationId: memberReg.id,
              eventId: event.id,
              tokenHash: memberRef,
              status: 'active',
              issuedAt: new Date().toISOString(),
            });

            passesSummary.push({ name: member.name.trim(), email: member.email.trim(), ref: memberRef, isLeader: false });
          }

          // Audit Log
          StorageRepository.logAuditEvent({
            actorId: currentUser.id,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            action: 'TEAM_REGISTRATION_CREATED',
            entityType: 'registration',
            entityId: leaderReg.id,
            details: `Registered Team "${teamName.trim()}" (${passesSummary.length} members) with Team Code: ${newTeamCode}`,
          });

          setGeneratedTeamPasses(passesSummary);
          setRegisteredRef(leaderReference);
          setIsLoading(false);
          onRegistrationComplete();
          return;
        } else {
          // JOIN TEAM VIA CODE OR SELECTION
          let targetTeam = registeredTeams.find((t) => t.name === selectedTeamName);
          if (joinCodeInput.trim()) {
            targetTeam = registeredTeams.find((t) => t.teamCode?.toLowerCase() === joinCodeInput.trim().toLowerCase());
          }

          if (!targetTeam) {
            alert('Could not find the specified team. Please check the Team Join Code or select a team from the list.');
            setIsLoading(false);
            return;
          }

          if (targetTeam.members.length >= maxTeamSize) {
            alert(`This team has already reached its maximum capacity of ${maxTeamSize} members.`);
            setIsLoading(false);
            return;
          }

          const reference = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
          const joinReg: Registration = {
            id: `reg-${Date.now()}`,
            eventId: event.id,
            reference,
            attendeeName: attendeeName.trim(),
            attendeeEmail: attendeeEmail.trim(),
            attendeePhone: attendeePhone.trim(),
            registrationNumber: attendeeRegNumber.trim(),
            status: 'confirmed',
            responses: {},
            consentAccepted: true,
            createdAt: new Date().toISOString(),
            teamName: targetTeam.name,
            teamLogoUrl: targetTeam.logoUrl,
            teamCode: targetTeam.teamCode,
            isTeamLeader: false,
            teamLeaderName: targetTeam.leaderName,
          };

          StorageRepository.saveRegistration(joinReg);
          StorageRepository.saveCredential({
            id: `cred-${Date.now()}`,
            registrationId: joinReg.id,
            eventId: event.id,
            tokenHash: reference,
            status: 'active',
            issuedAt: new Date().toISOString(),
          });

          StorageRepository.logAuditEvent({
            actorId: currentUser.id,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            action: 'TEAM_JOINED',
            entityType: 'registration',
            entityId: joinReg.id,
            details: `Joined Team "${targetTeam.name}" with Ticket Ref: ${reference}`,
          });

          setRegisteredRef(reference);
          setIsLoading(false);
          onRegistrationComplete();
          return;
        }
      }

      // 2. INDIVIDUAL FORMAT REGISTRATION FLOW
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
      };

      StorageRepository.saveRegistration(newRegistration);
      StorageRepository.saveCredential({
        id: `cred-${Date.now()}`,
        registrationId: newRegistration.id,
        eventId: event.id,
        tokenHash: reference,
        status: 'active',
        issuedAt: new Date().toISOString(),
      });

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
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Registration failed. Please try again.');
      setIsLoading(false);
    }
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
                      <span>
                        🎉 Congratulations {userWinner.attendeeName}!
                        {userWinner.teamName ? ` Your Team "${userWinner.teamName}" achieved Rank #${userWinner.rank || 1}!` : ` You achieved Rank #${userWinner.rank || 1}!`}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-amber-100">
                      Official Score: <span className="font-black text-amber-300">{userWinner.score} Points</span>
                      {userWinner.prize ? ` • Award Prize: ${userWinner.prize}` : ''}
                    </p>
                  </div>
                )}

                {/* Leaderboard Standings Table (Team-wise vs Individual) */}
                {winners.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider px-2">
                      <span>{event.format === 'team' ? 'Rank & Team' : 'Rank & Participant'}</span>
                      <span>Score &amp; Prize</span>
                    </div>

                    <div className="divide-y divide-indigo-500/20 max-h-80 overflow-y-auto pr-1">
                      {event.format === 'team' ? (
                        /* TEAM LEADERBOARD VIEW */
                        (() => {
                          const teamGroupMap = new Map<string, { teamName: string; score: number; prize?: string; rank: number; members: EventWinner[] }>();
                          winners.forEach((w) => {
                            const tName = w.teamName || w.attendeeName;
                            if (!teamGroupMap.has(tName)) {
                              teamGroupMap.set(tName, {
                                teamName: tName,
                                score: w.score,
                                prize: w.prize,
                                rank: w.rank || 1,
                                members: [],
                              });
                            }
                            teamGroupMap.get(tName)!.members.push(w);
                          });

                          return Array.from(teamGroupMap.values())
                            .sort((a, b) => a.rank - b.rank)
                            .map((st, idx) => {
                              const isMyTeam = st.members.some((m) => m.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase());
                              return (
                                <div
                                  key={st.teamName}
                                  className={`py-3.5 px-3 rounded-xl flex items-center justify-between gap-4 text-xs font-bold transition-all ${
                                    isMyTeam ? 'bg-amber-400/20 border border-amber-400/40 text-amber-200' : 'hover:bg-white/5 text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-black shrink-0 text-amber-400 text-sm">
                                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${st.rank || idx + 1}`}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="font-black text-white truncate flex items-center gap-1.5">
                                        <span>👥 {st.teamName}</span>
                                        {isMyTeam && (
                                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded">
                                            Your Squad
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                        Members: {st.members.map((m) => m.attendeeName).join(', ')}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="font-black text-amber-400 text-sm block">{st.score} Pts</span>
                                    {st.prize && (
                                      <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                                        {st.prize}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                        })()
                      ) : (
                        /* INDIVIDUAL LEADERBOARD VIEW */
                        [...winners].sort((a, b) => b.score - a.score).map((w, idx) => {
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
                        })
                      )}
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
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 p-6 sm:p-8 rounded-3xl border border-indigo-200 shadow-xl space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Registration Confirmed</span>
                    </div>
                    <span className="text-xs font-mono font-black bg-white px-3.5 py-1 rounded-full text-indigo-700 border border-indigo-200 shadow-sm">
                      {currentRef}
                    </span>
                  </div>

                  {/* Team Banner / Badge if Team Event */}
                  {(existingReg?.teamName || generatedTeamPasses.length > 0) && (
                    <div className="p-4 rounded-2xl bg-white border border-indigo-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={existingReg?.teamLogoUrl || teamLogoUrl || PRESET_TEAM_LOGOS[0]}
                            alt="Team Logo"
                            className="w-10 h-10 rounded-xl object-cover border border-indigo-200 shadow-xs"
                          />
                          <div>
                            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Official Team Pass</span>
                            <h4 className="text-sm font-black text-slate-900 leading-tight">
                              {existingReg?.teamName || teamName}
                            </h4>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          existingReg?.isTeamLeader || generatedTeamPasses[0]?.email === currentUser.email
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        }`}>
                          {existingReg?.isTeamLeader || generatedTeamPasses[0]?.email === currentUser.email ? '👑 Team Leader' : '👤 Team Member'}
                        </span>
                      </div>

                      {/* Shareable Team Join Code */}
                      {(existingReg?.teamCode || generatedTeamPasses.length > 0) && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-900">
                            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Team Join Code: <strong className="text-indigo-700">{existingReg?.teamCode || 'TEAM-ACTIVE'}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(existingReg?.teamCode || 'TEAM-ACTIVE')}
                            className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer shadow-2xs transition-all"
                          >
                            {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                          </button>
                        </div>
                      )}

                      {/* Multi-Member Generated Passes Roster */}
                      {generatedTeamPasses.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                            Registered Team Roster ({generatedTeamPasses.length} Members)
                          </span>
                          <div className="space-y-1">
                            {generatedTeamPasses.map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 w-5 h-5 rounded-full flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs leading-none">{m.name} {m.isLeader && '👑'}</p>
                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{m.email}</p>
                                  </div>
                                </div>
                                <span className="font-mono text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                                  {m.ref}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
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
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {event.format === 'team' ? 'Team Registration' : 'Reserve Your Ticket'}
                      </h3>
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

                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Team Format Mode Switcher */}
                    {event.format === 'team' && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span>Team Mode</span>
                          </label>
                          <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                            {minTeamSize}-{maxTeamSize} Members/Team
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTeamActionType('create_full')}
                            className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                              teamActionType === 'create_full'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white'
                            }`}
                          >
                            ➕ Register Full Team
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

                        {teamActionType === 'create_full' ? (
                          <div className="space-y-3 pt-1 animate-fade-in">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                Team Name *
                              </label>
                              <input
                                type="text"
                                required
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
                          <div className="space-y-3 pt-1 animate-fade-in">
                            {/* Join with Team Code */}
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                                <KeyRound className="w-3 h-3 text-purple-600" />
                                <span>Enter 6-digit Team Join Code</span>
                              </label>
                              <input
                                type="text"
                                value={joinCodeInput}
                                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                                placeholder="e.g. TEAM-4921"
                                className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-purple-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 uppercase"
                              />
                            </div>

                            <div className="text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                              — OR PICK FROM ROSTER —
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                Select Registered Team
                              </label>
                              {registeredTeams.length > 0 ? (
                                <select
                                  value={selectedTeamName}
                                  onChange={(e) => setSelectedTeamName(e.target.value)}
                                  className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                                >
                                  <option value="">-- Choose Existing Team --</option>
                                  {registeredTeams.map((t) => (
                                    <option key={t.name} value={t.name} disabled={t.members.length >= maxTeamSize}>
                                      {t.name} ({t.members.length}/{maxTeamSize} Members{t.members.length >= maxTeamSize ? ' - FULL' : ''})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-xs text-indigo-700 italic bg-white p-2.5 rounded-xl border border-indigo-100">
                                  No teams created yet. Use <strong>Register Full Team</strong> to start one!
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section 1: Team Leader / Attendee Primary Profile */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-indigo-600" />
                          <span>{event.format === 'team' ? 'Slot 1: Team Leader (You)' : 'Your Profile'}</span>
                        </span>
                        {event.format === 'team' && (
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                            👑 Leader
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">
                            {event.format === 'team' ? 'Leader Full Name *' : 'Full Name *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={attendeeName}
                            onChange={(e) => setAttendeeName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-2xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Register No / Roll ID *</label>
                          <input
                            type="text"
                            required
                            value={attendeeRegNumber}
                            onChange={(e) => setAttendeeRegNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. 21BCE0491"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 uppercase font-bold focus:outline-none focus:border-indigo-600 shadow-2xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Email Address *</label>
                          <input
                            type="email"
                            required
                            value={attendeeEmail}
                            onChange={(e) => setAttendeeEmail(e.target.value)}
                            placeholder="Email Address"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-2xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 uppercase">Mobile Phone *</label>
                          <input
                            type="tel"
                            required
                            value={attendeePhone}
                            onChange={(e) => setAttendeePhone(e.target.value)}
                            placeholder="e.g. 9876543210"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Dynamic Teammates Slots (Only for Full Team Mode) */}
                    {event.format === 'team' && teamActionType === 'create_full' && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span>Team Members ({1 + teammates.length}/{maxTeamSize})</span>
                          </span>

                          {1 + teammates.length < maxTeamSize && (
                            <button
                              type="button"
                              onClick={handleAddTeammateSlot}
                              className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Teammate</span>
                            </button>
                          )}
                        </div>

                        {teammates.map((member, idx) => (
                          <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center">
                                  {idx + 2}
                                </span>
                                <span>Member {idx + 2} {idx + 2 <= minTeamSize ? '(Required)' : '(Optional)'}</span>
                              </span>

                              {teammates.length + 1 > minTeamSize && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTeammateSlot(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remove Member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                required={idx + 2 <= minTeamSize}
                                value={member.name}
                                onChange={(e) => updateTeammateField(idx, 'name', e.target.value)}
                                placeholder="Teammate Full Name *"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                              />

                              <input
                                type="text"
                                value={member.registrationNumber}
                                onChange={(e) => updateTeammateField(idx, 'registrationNumber', e.target.value)}
                                placeholder="Roll No / Student ID"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs uppercase text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                              />

                              <input
                                type="email"
                                required={idx + 2 <= minTeamSize}
                                value={member.email}
                                onChange={(e) => updateTeammateField(idx, 'email', e.target.value)}
                                placeholder="Teammate Email Address *"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                              />

                              <input
                                type="tel"
                                value={member.phone}
                                onChange={(e) => updateTeammateField(idx, 'phone', e.target.value)}
                                placeholder="Mobile Phone (Optional)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <span>Registering Team &amp; Passes...</span>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4 text-amber-300" />
                          <span>
                            {event.format === 'team' && teamActionType === 'create_full'
                              ? `Register Team & Issue ${1 + teammates.filter(t => t.name && t.email).length} Digital Passes`
                              : 'Register & Get Digital QR Ticket Pass'}
                          </span>
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
