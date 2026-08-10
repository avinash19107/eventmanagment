import React, { useState } from 'react';
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
  Video
} from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (newEvent: Event) => void;
  organizerEmail: string;
  organizerName: string;
}

const CATEGORY_OPTIONS: { id: EventCategory; label: string; icon: any; color: string }[] = [
  { id: 'hackathon', label: 'Hackathon', icon: Zap, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'conference', label: 'Conference', icon: Flame, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'event', label: 'Event / Workshop', icon: Calendar, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'sports', label: 'Sports & Gaming', icon: Award, color: 'text-rose-600 bg-rose-50 border-rose-200' },
];

const PRESET_BANNERS = [
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200',
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
  organizerEmail,
  organizerName,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('hackathon');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState(PRESET_BANNERS[0]);
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [virtualLink, setVirtualLink] = useState('');
  const [locationType, setLocationType] = useState<'in_person' | 'virtual' | 'hybrid'>('in_person');
  const [startDate, setStartDate] = useState('2026-09-15T09:00');
  const [endDate, setEndDate] = useState('2026-09-15T18:00');
  const [maxCapacity, setMaxCapacity] = useState<number>(200);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState<number>(0);
  const [format, setFormat] = useState<'individual' | 'team'>('individual');
  const [minTeamSize, setMinTeamSize] = useState<number>(2);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(4);
  const [tagsInput, setTagsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !venueName.trim()) {
      alert('Please fill in event title, description, and venue name.');
      return;
    }

    setIsLoading(true);

    const newEvent: Event = {
      id: `evt-${Date.now()}`,
      organizationId: 'org-1',
      title: title.trim(),
      description: description.trim(),
      category,
      bannerUrl: bannerUrl || PRESET_BANNERS[0],
      timeZone: 'America/New_York',
      startDate,
      endDate,
      venueName: venueName.trim(),
      address: address.trim(),
      virtualLink: virtualLink.trim(),
      locationType,
      maxCapacity: Number(maxCapacity) || 100,
      registeredCount: 0,
      waitlistEnabled: true,
      status: 'published',
      registrationOpen: new Date().toISOString(),
      registrationClose: endDate,
      organizerEmail: organizerEmail || 'support@apexevents.com',
      organizerName: organizerName || 'Apex Events Host',
      primaryColor: category === 'hackathon' ? '#8b5cf6' : category === 'conference' ? '#4f46e5' : category === 'sports' ? '#f43f5e' : '#10b981',
      customFields: [],
      createdAt: new Date().toISOString(),
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      format,
      minTeamSize: format === 'team' ? Number(minTeamSize) || 2 : undefined,
      maxTeamSize: format === 'team' ? Number(maxTeamSize) || 4 : undefined,
      isFree,
      price: isFree ? 0 : Number(price),
      featured: true,
    };

    try {
      // 1. Save to Firebase Realtime Database under events/{eventId}
      await EventDatabaseService.saveEventToRealtimeDB(newEvent);

      // 2. Save locally
      StorageRepository.saveEvent(newEvent);

      // 3. Log Audit
      StorageRepository.logAuditEvent({
        actorId: organizerEmail,
        actorName: organizerName,
        actorRole: 'organizer',
        action: 'CREATE_EVENT_RTDB',
        entityType: 'event',
        entityId: newEvent.id,
        details: `Created new ${category.toUpperCase()} event: "${newEvent.title}" in Firebase RTDB`,
      });

      setIsLoading(false);
      onEventCreated(newEvent);
      onClose();
    } catch (err: any) {
      console.error('Error creating event:', err);
      alert('Failed to save event to database: ' + (err?.message || err));
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-6 text-white flex items-center justify-between relative shadow-md">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-100 bg-white/20 px-2.5 py-1 rounded-full border border-white/25">
              Event Management
            </span>
            <h2 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">Create & Publish New Event</h2>
            <p className="text-xs text-indigo-100 font-medium">Fill in the details below to publish your event</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Category Select Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Event Category *
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
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 text-indigo-900 shadow-sm ring-2 ring-indigo-500/30'
                        : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1 ${cat.color.split(' ')[0]}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI Agentic Hackathon 2026"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description & Highlights *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide event details, schedule highlights, prize pool, or speaker info..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Venue & Location Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Venue Name *</span>
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. CyberPulse Stadium / Online"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-indigo-600" />
                <span>Location Type</span>
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              >
                <option value="in_person">In Person</option>
                <option value="hybrid">Hybrid (In-Person + Online)</option>
                <option value="virtual">Virtual Only</option>
              </select>
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Start Date & Time</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>End Date & Time</span>
              </label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Participation Format & Team Settings */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
            <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Participation Format</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('individual')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                  format === 'individual'
                    ? 'bg-white text-indigo-700 border-indigo-400 shadow-sm'
                    : 'bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                👤 Individual Entry
              </button>
              <button
                type="button"
                onClick={() => setFormat('team')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                  format === 'team'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-md'
                    : 'bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                👥 Team Format (Hackathons)
              </button>
            </div>

            {format === 'team' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 uppercase mb-1">
                    Min Team Members
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(Number(e.target.value))}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 uppercase mb-1">
                    Max Team Members
                  </label>
                  <input
                    type="number"
                    min={minTeamSize}
                    max={20}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Max Capacity & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Max Ticket Capacity</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ticket Pricing</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFree(!isFree)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isFree ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {isFree ? 'Free Ticket' : 'Paid Ticket'}
                </button>
                {!isFree && (
                  <input
                    type="number"
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="Price (₹ INR)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Banner Preset Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Event Banner Image Preset</span>
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_BANNERS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setBannerUrl(url)}
                  className={`relative rounded-xl overflow-hidden h-16 border-2 transition-all cursor-pointer ${
                    bannerUrl === url ? 'border-indigo-600 ring-2 ring-indigo-400/40' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="Or paste custom Banner Image URL..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Event Tags (Comma Separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. AI, Hackathon, Web3, Prize Pool"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Publishing Event...</span>
              ) : (
                <>
                  <Ticket className="w-4 h-4 text-amber-300" />
                  <span>Publish Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
