import React, { useState, useEffect, useRef } from 'react';
import { Event, User, Registration } from '../../types';
import { StorageRepository, generateSecureTicketReference } from '../../services/storage';
import { EventDatabaseService } from '../../services/eventDatabase';
import {
  X,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  QrCode,
  Sparkles,
  Share2,
  Clock,
  Zap,
  Award,
  Ticket,
  Plus,
  Trash2,
  KeyRound,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  User as UserIcon,
} from 'lucide-react';

interface EventDetailModalProps {
  event: Event | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onRegistrationComplete: () => void;
}

const DEFAULT_TEAM_LOGO = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150';

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  currentUser,
  isOpen,
  onClose,
  onRegistrationComplete,
}) => {
  const [attendeeName, setAttendeeName] = useState(currentUser.name);
  const [attendeeEmail, setAttendeeEmail] = useState(currentUser.email);
  const [attendeeRegNumber, setAttendeeRegNumber] = useState(currentUser.registrationNumber || '');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [registeredRef, setRegisteredRef] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Team Registration States
  const [teamName, setTeamName] = useState('');
  const [teamLogoUrl, setTeamLogoUrl] = useState(DEFAULT_TEAM_LOGO);
  const [isCustomLogo, setIsCustomLogo] = useState(false);
  const teamLogoInputRef = useRef<HTMLInputElement>(null);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [generatedTeamPasses, setGeneratedTeamPasses] = useState<{ name: string; email: string; ref: string; isLeader: boolean }[]>([]);

  const handleTeamLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX_SIZE) {
            h = Math.round((h * MAX_SIZE) / w);
            w = MAX_SIZE;
          }
        } else {
          if (h > MAX_SIZE) {
            w = Math.round((w * MAX_SIZE) / h);
            h = MAX_SIZE;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setTeamLogoUrl(compressed);
          setIsCustomLogo(true);
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const minTeamSize = event?.minTeamSize || 2;
  const maxTeamSize = event?.maxTeamSize || 4;
  const [teammates, setTeammates] = useState<Array<{ name: string; email: string; registrationNumber: string; phone: string }>>([
    { name: '', email: '', registrationNumber: '', phone: '' },
  ]);

  useEffect(() => {
    if (event) {
      EventDatabaseService.getRegistrationsFromRealtimeDB().then((rtdbRegs) => {
        const localRegs = StorageRepository.getRegistrations();
        const map = new Map<string, Registration>();
        localRegs.forEach((r) => map.set(r.id, r));
        rtdbRegs.forEach((r) => map.set(r.id, r));
        setAllRegistrations(Array.from(map.values()));
      });
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const eventRegistrations = allRegistrations.filter(
    (r) => r.eventId === event.id && r.status !== 'cancelled'
  );

  const teamMap = new Map<string, { name: string; teamCode?: string; members: Registration[] }>();
  eventRegistrations.forEach((r) => {
    if (r.teamName) {
      if (!teamMap.has(r.teamName)) {
        teamMap.set(r.teamName, {
          name: r.teamName,
          teamCode: r.teamCode,
          members: [],
        });
      }
      const t = teamMap.get(r.teamName)!;
      t.members.push(r);
      if (r.teamCode && !t.teamCode) t.teamCode = r.teamCode;
    }
  });
  const registeredTeams = Array.from(teamMap.values());

  const existingReg = allRegistrations.find(
    (r) => r.eventId === event.id && r.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase() && r.status !== 'cancelled'
  ) || StorageRepository.getRegistrationByEmail(event.id, currentUser.email);

  const isAlreadyRegistered = Boolean(existingReg) || Boolean(registeredRef);
  const currentRef = registeredRef || existingReg?.reference;
  const registeredCount = eventRegistrations.length;
  const isFull = registeredCount >= event.maxCapacity;

  const handleAddTeammateSlot = () => {
    if (teammates.length + 1 >= maxTeamSize) {
      alert(`Maximum team size is ${maxTeamSize} members.`);
      return;
    }
    setTeammates([...teammates, { name: '', email: '', registrationNumber: '', phone: '' }]);
  };

  const handleRemoveTeammateSlot = (index: number) => {
    if (teammates.length + 1 <= minTeamSize) {
      alert(`Minimum team size is ${minTeamSize} members.`);
      return;
    }
    setTeammates(teammates.filter((_, i) => i !== index));
  };

  const updateTeammateField = (index: number, field: 'name' | 'email' | 'registrationNumber' | 'phone', val: string) => {
    const next = [...teammates];
    next[index][field] = val;
    setTeammates(next);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      alert('Please enter your name and email address.');
      return;
    }

    setIsLoading(true);

    try {
      if (event.format === 'team') {
        if (!teamName.trim()) {
          alert('Please enter a Team Name.');
          setIsLoading(false);
          return;
        }

        const validTeammates = teammates.filter((t) => t.name.trim() && t.email.trim());
        const totalMembers = 1 + validTeammates.length;

        if (totalMembers < minTeamSize) {
          alert(`This event requires a minimum of ${minTeamSize} members per team.`);
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

        // Check for duplicate register numbers among team members
        const allMemberRegs = [
          (attendeeRegNumber.trim() || currentUser.registrationNumber || '').toLowerCase(),
          ...validTeammates.map((t) => t.registrationNumber.trim().toLowerCase()),
        ].filter(Boolean);
        const uniqueRegs = new Set(allMemberRegs);
        if (uniqueRegs.size !== allMemberRegs.length) {
          alert('Each team member must have a unique Register Number / Student ID.');
          setIsLoading(false);
          return;
        }

        const newTeamCode = `TEAM-${Math.floor(1000 + Math.random() * 9000)}`;
        const leaderReference = generateSecureTicketReference();

        const leaderReg: Registration = {
          id: `reg-${Date.now()}-leader`,
          eventId: event.id,
          reference: leaderReference,
          attendeeName: attendeeName.trim(),
          attendeeEmail: attendeeEmail.trim(),
          attendeePhone: attendeePhone.trim(),
          registrationNumber: attendeeRegNumber.trim() || currentUser.registrationNumber || '',
          status: 'confirmed',
          responses: {},
          consentAccepted: true,
          createdAt: new Date().toISOString(),
          teamName: teamName.trim(),
          teamCode: newTeamCode,
          teamLogoUrl: teamLogoUrl || DEFAULT_TEAM_LOGO,
          isTeamLeader: true,
          teamLeaderName: attendeeName.trim(),
        };

        StorageRepository.saveRegistration(leaderReg);
        StorageRepository.saveCredential({
          id: `cred-${Date.now()}-0`,
          registrationId: leaderReg.id,
          eventId: event.id,
          tokenHash: leaderReference,
          status: 'active',
          issuedAt: new Date().toISOString(),
        });

        const passes = [{ name: attendeeName.trim(), email: attendeeEmail.trim(), ref: leaderReference, isLeader: true }];

        for (let i = 0; i < validTeammates.length; i++) {
          const m = validTeammates[i];
          const mRef = generateSecureTicketReference();
          const mReg: Registration = {
            id: `reg-${Date.now()}-m${i + 1}`,
            eventId: event.id,
            reference: mRef,
            attendeeName: m.name.trim(),
            attendeeEmail: m.email.trim(),
            attendeePhone: m.phone.trim(),
            registrationNumber: m.registrationNumber.trim(),
            status: 'confirmed',
            responses: {},
            consentAccepted: true,
            createdAt: new Date().toISOString(),
            teamName: teamName.trim(),
            teamCode: newTeamCode,
            teamLogoUrl: teamLogoUrl || DEFAULT_TEAM_LOGO,
            isTeamLeader: false,
            teamLeaderName: attendeeName.trim(),
          };

          StorageRepository.saveRegistration(mReg);
          StorageRepository.saveCredential({
            id: `cred-${Date.now()}-${i + 1}`,
            registrationId: mReg.id,
            eventId: event.id,
            tokenHash: mRef,
            status: 'active',
            issuedAt: new Date().toISOString(),
          });

          passes.push({ name: m.name.trim(), email: m.email.trim(), ref: mRef, isLeader: false });
        }

        StorageRepository.logAuditEvent({
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUser.role,
          action: 'TEAM_REGISTRATION_CREATED',
          entityType: 'registration',
          entityId: leaderReg.id,
          details: `Registered Team "${teamName.trim()}" with Code: ${newTeamCode}`,
        });

        setGeneratedTeamPasses(passes);
        setRegisteredRef(leaderReference);
        setIsLoading(false);
        onRegistrationComplete();
        return;
      }

      // Individual Registration
      const reference = generateSecureTicketReference();
      const newRegistration: Registration = {
        id: `reg-${Date.now()}`,
        eventId: event.id,
        reference,
        attendeeName: attendeeName.trim(),
        attendeeEmail: attendeeEmail.trim(),
        attendeePhone: attendeePhone.trim(),
        registrationNumber: currentUser.registrationNumber || '',
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
        action: 'EVENT_REGISTRATION',
        entityType: 'registration',
        entityId: newRegistration.id,
        details: `Registered for "${event.title}" with Ticket Ref: ${reference}`,
      });

      setIsLoading(false);
      setRegisteredRef(reference);
      onRegistrationComplete();
    } catch (err) {
      console.error(err);
      alert('Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  const getCategoryBadge = () => {
    switch (event.category) {
      case 'hackathon':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Hackathon</span>;
      case 'conference':
        return <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Conference</span>;
      case 'sports':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-400/40 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Sports & Gaming</span>;
      default:
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Event & Workshop</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 transform transition-all relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner Header */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-900">
          <img
            src={event.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200'}
            alt={event.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

          {/* Floating Category Badge & Title */}
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <div className="flex items-center gap-2">
              {getCategoryBadge()}
              {event.isFree ? (
                <span className="bg-emerald-500 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  FREE ACCESS
                </span>
              ) : (
                <span className="bg-indigo-600 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ₹{event.price || 499}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-md">
              {event.title}
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Quick Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Date & Time</p>
                <p className="text-xs font-bold text-slate-800">
                  {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Venue / Location</p>
                <p className="text-xs font-bold text-slate-800 truncate">{event.venueName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Format & Capacity</p>
                <p className="text-xs font-bold text-slate-800">
                  {event.format === 'team' ? `Team (${minTeamSize}-${maxTeamSize})` : 'Individual'} • {registeredCount}/{event.maxCapacity}
                </p>
              </div>
            </div>
          </div>

          {/* Event Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">About This Event</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
          </div>

          {/* Action Box: Ticket Pass vs Registration Form */}
          <div className="pt-4 border-t border-slate-100">
            {isAlreadyRegistered ? (
              /* DIGITAL HOLOGRAPHIC TICKET PASS DISPLAY */
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 border border-indigo-200 shadow-md space-y-4 text-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Registration Confirmed</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-full text-indigo-700 border border-indigo-200 shadow-sm">
                    {currentRef}
                  </span>
                </div>

                {/* Team Badge on Pass */}
                {(existingReg?.teamName || generatedTeamPasses.length > 0) && (
                  <div className="p-3.5 rounded-2xl bg-white border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-black text-slate-900">Team: {existingReg?.teamName || teamName}</span>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {existingReg?.isTeamLeader || generatedTeamPasses[0]?.email === currentUser.email ? '👑 Leader' : '👤 Member'}
                      </span>
                    </div>

                    {(existingReg?.teamCode || generatedTeamPasses.length > 0) && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-[11px] font-mono">
                        <span>Code: <strong>{existingReg?.teamCode || 'TEAM-ACTIVE'}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(existingReg?.teamCode || 'TEAM-ACTIVE')}
                          className="text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                  <div className="space-y-1.5 text-center sm:text-left">
                    <h4 className="text-lg font-extrabold text-slate-900">{event.title}</h4>
                    <p className="text-xs font-medium text-slate-600">{attendeeName} ({attendeeEmail})</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 pt-1">
                      <Ticket className="w-4 h-4 text-amber-500" />
                      <span>Valid Digital Ticket Pass with QR</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0 border border-indigo-100">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                        currentRef || 'TICKET'
                      )}`}
                      alt="Ticket QR Code"
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegister} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-indigo-600" />
                    <span>{event.format === 'team' ? 'Team Registration' : 'Event Registration'}</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Available Now
                  </span>
                </div>

                {/* Team Details (Only for Team Format) */}
                {event.format === 'team' && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-white border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>Team Details</span>
                      </label>
                      <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                        {minTeamSize}-{maxTeamSize} Members/Team
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Team Name *</label>
                        <input
                          type="text"
                          required
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="e.g. Quantum Innovators"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Team Logo (Upload Custom Image)</span>
                        </label>
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          {isCustomLogo && (
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                              <img src={teamLogoUrl} alt="Team Logo Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 space-y-1">
                            <input
                              type="file"
                              ref={teamLogoInputRef}
                              accept="image/*"
                              onChange={handleTeamLogoUpload}
                              className="hidden"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => teamLogoInputRef.current?.click()}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 border border-indigo-200 text-indigo-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>{isCustomLogo ? 'Change Team Logo' : 'Upload Team Logo'}</span>
                              </button>
                              {isCustomLogo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTeamLogoUrl(DEFAULT_TEAM_LOGO);
                                    setIsCustomLogo(false);
                                    if (teamLogoInputRef.current) teamLogoInputRef.current.value = '';
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Reset to default logo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leader / Primary Attendee */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      {event.format === 'team' ? 'Leader Full Name *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Register No / Roll ID *</label>
                    <input
                      type="text"
                      required
                      value={attendeeRegNumber}
                      onChange={(e) => setAttendeeRegNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. 21BCE0491"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs uppercase font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      value={attendeePhone}
                      onChange={(e) => setAttendeePhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-bold"
                    />
                  </div>
                </div>

                {/* Dynamic Teammates in Modal */}
                {event.format === 'team' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-700 uppercase">Teammates ({1 + teammates.length}/{maxTeamSize})</span>
                      {1 + teammates.length < maxTeamSize && (
                        <button
                          type="button"
                          onClick={handleAddTeammateSlot}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Teammate
                        </button>
                      )}
                    </div>

                    {teammates.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-indigo-800 uppercase">
                          <span>Member {idx + 2} {idx + 2 <= minTeamSize ? '(Required)' : '(Optional)'}</span>
                          {teammates.length + 1 > minTeamSize && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTeammateSlot(idx)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required={idx + 2 <= minTeamSize}
                            value={m.name}
                            onChange={(e) => updateTeammateField(idx, 'name', e.target.value)}
                            placeholder="Teammate Full Name *"
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold"
                          />
                          <input
                            type="text"
                            value={m.registrationNumber}
                            onChange={(e) => updateTeammateField(idx, 'registrationNumber', e.target.value.toUpperCase())}
                            placeholder="Roll No / Student ID"
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs uppercase text-slate-800 font-bold"
                          />
                          <input
                            type="email"
                            required={idx + 2 <= minTeamSize}
                            value={m.email}
                            onChange={(e) => updateTeammateField(idx, 'email', e.target.value)}
                            placeholder="Teammate Email Address *"
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold"
                          />
                          <input
                            type="tel"
                            value={m.phone}
                            onChange={(e) => updateTeammateField(idx, 'phone', e.target.value)}
                            placeholder="Mobile Phone (Optional)"
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>Issuing Passes...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        {event.format === 'team'
                          ? `Register Team & Issue Passes`
                          : 'Confirm & Generate Digital Ticket Pass'}
                      </span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
