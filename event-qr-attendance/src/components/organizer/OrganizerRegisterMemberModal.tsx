import React, { useState } from 'react';
import { Event, Registration, User } from '../../types';
import { UserDatabaseService } from '../../services/userDatabase';
import { EventDatabaseService } from '../../services/eventDatabase';
import { StorageRepository, generateSecureTicketReference } from '../../services/storage';
import {
  X,
  UserPlus,
  QrCode,
  CheckCircle2,
  Loader2,
  IdCard,
  Mail,
  User as UserIcon,
  Calendar,
  Sparkles
} from 'lucide-react';

interface OrganizerRegisterMemberModalProps {
  isOpen: boolean;
  events: Event[];
  selectedEventId?: string;
  onClose: () => void;
  onMemberRegistered: (newReg: Registration) => void;
}

export const OrganizerRegisterMemberModal: React.FC<OrganizerRegisterMemberModalProps> = ({
  isOpen,
  events,
  selectedEventId,
  onClose,
  onMemberRegistered,
}) => {
  const activeEvents = events.filter((e) => e.status !== 'ended' && e.status !== 'archived');
  const defaultEvtId = selectedEventId && selectedEventId !== 'all' ? selectedEventId : (activeEvents[0]?.id || '');

  const [eventId, setEventId] = useState(defaultEvtId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isLeader, setIsLeader] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredNotice, setRegisteredNotice] = useState<{
    userName: string;
    email: string;
    regNum: string;
    reference: string;
    eventTitle: string;
  } | null>(null);

  if (!isOpen) return null;

  const targetEvent = events.find((e) => e.id === eventId) || activeEvents[0];

  const handleSubmit = async (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter member full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!regNumber.trim()) {
      alert('Please enter Student / Employee Register Number ID.');
      return;
    }
    if (!targetEvent) {
      alert('Please select an active event to register for.');
      return;
    }

    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanRegNum = regNumber.trim().toUpperCase();

    try {
      // 1. Create or sync User Account record in Firebase Realtime Database with Register Number ID
      let existingUserRecord = await UserDatabaseService.findUserByEmail(cleanEmail);

      const userId = existingUserRecord?.id || `usr-org-added-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const userAccount: User = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        registrationNumber: cleanRegNum,
        role: 'attendee',
        organizationId: 'org-1',
        status: 'active',
        avatarUrl: existingUserRecord?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        lastLogin: new Date().toISOString(),
      };

      // Save user account to Firebase RTDB & LocalStorage
      await UserDatabaseService.saveUserToRealtimeDB(userAccount, 'password', 'password123');

      // 2. Generate unique Registration Pass & QR Code Reference
      const refCode = generateSecureTicketReference();
      const newRegistration: Registration = {
        id: `reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        eventId: targetEvent.id,
        attendeeName: cleanName,
        attendeeEmail: cleanEmail,
        registrationNumber: cleanRegNum,
        reference: refCode,
        status: 'confirmed',
        responses: {},
        consentAccepted: true,
        createdAt: new Date().toISOString(),
        teamName: teamName.trim() || undefined,
        isTeamLeader: isLeader,
        teamLeaderName: isLeader ? cleanName : undefined,
        checkedInAt: undefined,
      };

      // Save Registration Pass to Firebase RTDB & LocalStorage
      await EventDatabaseService.saveRegistrationToRealtimeDB(newRegistration);
      StorageRepository.saveRegistration(newRegistration);

      // Increment registeredCount on target event
      const updatedEvent: Event = {
        ...targetEvent,
        registeredCount: (targetEvent.registeredCount || 0) + 1,
      };
      await EventDatabaseService.saveEventToRealtimeDB(updatedEvent);
      StorageRepository.saveEvent(updatedEvent);

      // Audit Log
      StorageRepository.logAuditEvent({
        actorId: 'organizer',
        actorName: 'Event Organizer',
        actorRole: 'organizer',
        action: 'ORGANIZER_BULK_REGISTER_MEMBER',
        entityType: 'registration',
        entityId: newRegistration.id,
        details: `Organizer registered member "${cleanName}" (ID: ${cleanRegNum}, Email: ${cleanEmail}) for event "${targetEvent.title}"`,
      });

      setIsLoading(false);

      const notice = {
        userName: cleanName,
        email: cleanEmail,
        regNum: cleanRegNum,
        reference: refCode,
        eventTitle: targetEvent.title,
      };
      setRegisteredNotice(notice);
      onMemberRegistered(newRegistration);

      // Reset form fields
      setName('');
      setEmail('');
      setRegNumber('');

      if (!addAnother) {
        setTimeout(() => {
          setRegisteredNotice(null);
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setIsLoading(false);
      alert(err?.message || 'Failed to register member to event.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">Organizer Member Registration</h3>
              <p className="text-xs text-indigo-200/80 font-medium">
                Register members & generate accounts with Student / Employee IDs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {registeredNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2 animate-fade-in shadow-sm">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Member Registered & Account Created!</span>
              </div>
              <p className="font-medium text-emerald-800">
                Registered <strong>{registeredNotice.userName}</strong> (ID:{' '}
                <code className="bg-white px-1.5 py-0.5 rounded border font-bold text-slate-900">
                  {registeredNotice.regNum}
                </code>
                ) for <strong>{registeredNotice.eventTitle}</strong>.
              </p>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span>
                  QR Ticket Code:{' '}
                  <strong className="font-mono bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded font-black">
                    {registeredNotice.reference}
                  </strong>
                </span>
                <span className="text-emerald-700 font-bold">Email: {registeredNotice.email}</span>
              </div>
            </div>
          )}

          {/* Select Target Event */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Target Event <span className="text-rose-500">*</span>
            </label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
            >
              {activeEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.category.toUpperCase()} • 📍 {evt.venueName})
                </option>
              ))}
            </select>
          </div>

          {/* Member Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-indigo-600" /> Member Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe / Rahul Sharma"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
            />
          </div>

          {/* Email Address & Register Number ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" /> Member Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@university.edu"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-indigo-600" /> Register Number / Student ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. 21BCE0491 / EMP-904"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all uppercase"
              />
            </div>
          </div>

          {/* Optional Team Name & Leader Toggle (For Team Events) */}
          {targetEvent?.format === 'team' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                  Team Name (Optional / Assign to Team)
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. QuantumHackers"
                  className="w-full bg-white border border-indigo-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isLeader}
                  onChange={(e) => setIsLeader(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-extrabold text-indigo-900">Mark as Team Leader 👑</span>
              </label>
            </div>
          )}

          {/* Info Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Registering a member automatically creates a user account record synced with their{' '}
              <strong>Register Number ID</strong> in Firebase Realtime Database. A digital QR Code Ticket Pass will be instantly generated for event gate entrance.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 font-extrabold text-xs transition-all cursor-pointer text-center"
            >
              Close
            </button>

            <div className="w-full sm:w-auto flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isLoading}
                className="flex-1 py-3 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-center"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Register &amp; Add Another +</span>}
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Register Member</span>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
