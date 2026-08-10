import React, { useState } from 'react';
import { Event, User, Registration } from '../../types';
import { StorageRepository } from '../../services/storage';
import { EmailService } from '../../services/email';
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
  Video,
  Ticket
} from 'lucide-react';

interface EventDetailModalProps {
  event: Event | null;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onRegistrationComplete: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  currentUser,
  isOpen,
  onClose,
  onRegistrationComplete,
}) => {
  const [attendeeName, setAttendeeName] = useState(currentUser.name);
  const [attendeeEmail, setAttendeeEmail] = useState(currentUser.email);
  const [attendeePhone, setAttendeePhone] = useState('');
  const [registeredRef, setRegisteredRef] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !event) return null;

  const existingReg = StorageRepository.getRegistrationByEmail(event.id, currentUser.email);
  const isAlreadyRegistered = Boolean(existingReg) || Boolean(registeredRef);

  const registeredCount = StorageRepository.getRegistrations(event.id).length;
  const isFull = registeredCount >= event.maxCapacity;

  const handleRegister = async (e: React.FormEvent) => {
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

    // Log audit event
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

  const currentRef = registeredRef || existingReg?.reference;

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
                  ${event.price || 49}
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
                <p className="text-[10px] uppercase font-bold text-slate-400">Capacity & Spots</p>
                <p className="text-xs font-bold text-slate-800">
                  {registeredCount} / {event.maxCapacity} Seats
                </p>
              </div>
            </div>
          </div>

          {/* Event Description & Tags */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">About This Event</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>

            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {event.tags.map((tag, i) => (
                  <span key={i} className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Speakers Section */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Featured Speakers / Hosts</h3>
              <div className="flex flex-wrap gap-2">
                {event.speakers.map((spk, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{spk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                  <div className="space-y-1.5 text-center sm:text-left">
                    <h4 className="text-lg font-extrabold text-slate-900">{event.title}</h4>
                    <p className="text-xs font-medium text-slate-600">{attendeeName} ({attendeeEmail})</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 pt-1">
                      <Ticket className="w-4 h-4 text-amber-500" />
                      <span>Valid Digital Ticket Pass with Realtime QR</span>
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
                    <span>Instant Event Registration</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Available Now
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>Generating Pass...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Confirm & Generate Digital Ticket Pass</span>
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
