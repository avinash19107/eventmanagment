import React, { useState, useEffect } from 'react';
import { Event, User, Registration } from '../../types';
import { StorageRepository } from '../../services/storage';
import { EventDatabaseService } from '../../services/eventDatabase';
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
  Download
} from 'lucide-react';

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
  const [attendeePhone, setAttendeePhone] = useState('');
  const [registeredRef, setRegisteredRef] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    EventDatabaseService.getRegistrationsFromRealtimeDB().then((rtdbRegs) => {
      const localRegs = StorageRepository.getRegistrations();
      const map = new Map<string, Registration>();
      localRegs.forEach((r) => map.set(r.id, r));
      rtdbRegs.forEach((r) => map.set(r.id, r));
      setAllRegistrations(Array.from(map.values()));
    });
  }, [event.id]);

  const existingReg = allRegistrations.find(
    (r) => r.eventId === event.id && r.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase() && r.status !== 'cancelled'
  ) || StorageRepository.getRegistrationByEmail(event.id, currentUser.email);

  const isAlreadyRegistered = Boolean(existingReg) || Boolean(registeredRef);

  const registeredCount = allRegistrations.filter(
    (r) => r.eventId === event.id && r.status !== 'cancelled'
  ).length;
  const isFull = registeredCount >= event.maxCapacity;
  const capPercent = Math.min(100, Math.round((registeredCount / (event.maxCapacity || 1)) * 100));

  const currentRef = registeredRef || existingReg?.reference;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      alert('Please enter your name and email address.');
      return;
    }

    setIsLoading(true);

    const reference = `REF-${Math.floor(100000 + Math.random() * 900000)}`;

    const newRegistration: Registration = {
      id: `reg-${Date.now()}`,
      eventId: event.id,
      reference,
      attendeeName: attendeeName.trim(),
      attendeeEmail: attendeeEmail.trim(),
      attendeePhone: attendeePhone.trim(),
      status: isFull && event.waitlistEnabled ? 'waitlisted' : 'confirmed',
      responses: {},
      consentAccepted: true,
      createdAt: new Date().toISOString(),
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

    // Dispatch confirmation email via EmailJS
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      reference
    )}`;
    await EmailService.sendRegistrationConfirmation(newRegistration, event, qrDataUrl);

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
                <p className="text-xs text-slate-500 font-medium">{event.organizerEmail}</p>
              </div>
            </div>

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
                <span>Venue & Location</span>
              </h2>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <h4 className="text-sm font-black text-slate-900">{event.venueName}</h4>
                {event.address && <p className="text-xs text-slate-600 font-medium">{event.address}</p>}
                {event.virtualLink && (
                  <p className="text-xs text-indigo-600 font-bold pt-1">Virtual Access Link: {event.virtualLink}</p>
                )}
              </div>
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

                  <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Full Name *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={attendeeName}
                        onChange={(e) => setAttendeeName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Email Address *</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Phone Number (Optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={attendeePhone}
                        onChange={(e) => setAttendeePhone(e.target.value)}
                        placeholder="e.g. +1 (555) 000-0000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
                    >
                      {isLoading ? (
                        <span>Generating Digital Pass...</span>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4 text-amber-300" />
                          <span>Register & Get Digital QR Ticket Pass</span>
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
    </div>
  );
};
