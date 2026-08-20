import React, { useState, useEffect, useRef } from 'react';
import { Event, EventCategory } from '../../types';
import { EventDatabaseService } from '../../services/eventDatabase';
import { StorageRepository } from '../../services/storage';
import {
  X,
  Calendar,
  MapPin,
  Users,
  Image as ImageIcon,
  DollarSign,
  Zap,
  Ticket,
  Flame,
  Award,
  Edit3,
  Loader2,
  CheckCircle2,
  Upload,
  Trash2,
} from 'lucide-react';

interface EditEventModalProps {
  isOpen: boolean;
  event: Event | null;
  onClose: () => void;
  onEventUpdated: (updatedEvent: Event) => void;
}

const CATEGORY_OPTIONS: { id: EventCategory; label: string; icon: any; color: string }[] = [
  { id: 'hackathon', label: 'Hackathon', icon: Zap, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'conference', label: 'Conference', icon: Flame, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'event', label: 'Event / Workshop', icon: Calendar, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'sports', label: 'Sports & Gaming', icon: Award, color: 'text-rose-600 bg-rose-50 border-rose-200' },
];

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  event,
  onClose,
  onEventUpdated,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('hackathon');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [customPhotoSelected, setCustomPhotoSelected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [virtualLink, setVirtualLink] = useState('');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('in_person');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number>(200);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState<number>(0);
  const [format, setFormat] = useState<'individual' | 'team'>('individual');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerUrl(reader.result);
        setCustomPhotoSelected(true);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setCategory(event.category || 'hackathon');
      setDescription(event.description || '');
      setBannerUrl(event.bannerUrl || '');
      setVenueName(event.venueName || '');
      setAddress(event.address || '');
      setVirtualLink(event.virtualLink || '');
      setLocationType(event.locationType || 'in_person');
      setStartDate(event.startDate || '');
      setEndDate(event.endDate || '');
      setMaxCapacity(event.maxCapacity || 200);
      setIsFree(event.isFree ?? true);
      setPrice(event.price || 0);
      setFormat(event.format || 'individual');
      setSuccessMsg(null);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !venueName.trim()) {
      alert('Please fill in event title, description, and venue name.');
      return;
    }

    setIsLoading(true);

    const updatedEvent: Event = {
      ...event,
      title: title.trim(),
      description: description.trim(),
      category,
      bannerUrl: bannerUrl || event.bannerUrl,
      startDate,
      endDate,
      venueName: venueName.trim(),
      address: address.trim(),
      virtualLink: virtualLink.trim(),
      locationType,
      maxCapacity: Number(maxCapacity) || 100,
      format,
      isFree,
      price: isFree ? 0 : Number(price),
    };

    try {
      // 1. Update in Firebase Realtime Database
      await EventDatabaseService.saveEventToRealtimeDB(updatedEvent);

      // 2. Update in LocalStorage Repository
      StorageRepository.saveEvent(updatedEvent);

      // 3. Log Audit Trail
      StorageRepository.logAuditEvent({
        actorId: event.organizerEmail || 'organizer',
        actorName: event.organizerName || 'Organizer',
        actorRole: 'organizer',
        action: 'UPDATE_EVENT_DETAILS',
        entityType: 'event',
        entityId: updatedEvent.id,
        details: `Updated timings, venue name ("${updatedEvent.venueName}"), and details for "${updatedEvent.title}"`,
      });

      setIsLoading(false);
      setSuccessMsg('🎉 Event details updated successfully!');
      onEventUpdated(updatedEvent);

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsLoading(false);
      alert(err?.message || 'Failed to update event details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">Edit Event Details</h3>
              <p className="text-xs text-slate-400 font-medium">
                Update venue name, dates, timings, or description
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hackathon 2026 Summit"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CATEGORY_OPTIONS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-xs font-extrabold ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timings & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Start Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> End Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Venue & Location Name */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Venue / Location Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Main Auditorium / Tech Park Hall A"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Full Address / Campus Details
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Block C, Floor 3, Campus West"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Virtual Stream / Meeting Link
                </label>
                <input
                  type="url"
                  value={virtualLink}
                  onChange={(e) => setVirtualLink(e.target.value)}
                  placeholder="https://meet.google.com/xyz"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Event Description & Agenda
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe event overview, schedule, guidelines..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all leading-relaxed"
            />
          </div>

          {/* Capacity & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" /> Maximum Attendee Capacity
              </label>
              <input
                type="number"
                min={10}
                max={10000}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-indigo-600" /> Ticket Pricing
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFree(true);
                    setPrice(0);
                  }}
                  className={`flex-1 py-2.5 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer ${
                    isFree
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  FREE TICKET
                </button>
                <button
                  type="button"
                  onClick={() => setIsFree(false)}
                  className={`flex-1 py-2.5 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer ${
                    !isFree
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  PAID TICKET
                </button>
              </div>
            </div>
          </div>

          {/* Upload Photo / Poster */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Upload Event Photo / Poster</span>
            </label>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Upload Area / Preview Box */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition-all">
              {/* Photo Preview */}
              <div className="relative w-32 h-20 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 shadow-sm">
                <img
                  src={bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200'}
                  alt="Event Banner Preview"
                  className="w-full h-full object-cover"
                />
                {customPhotoSelected && (
                  <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                    Custom
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New Photo</span>
                  </button>

                  {customPhotoSelected && (
                    <button
                      type="button"
                      onClick={() => {
                        setBannerUrl(event?.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200');
                        setCustomPhotoSelected(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Upload a custom banner photo for this event.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 font-extrabold text-xs transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <span>Save Event Updates</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
