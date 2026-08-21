import React, { useState } from 'react';
import { Event, User, Registration, EventFeedback } from '../../types';
import { StorageRepository } from '../../services/storage';
import { EventDatabaseService } from '../../services/eventDatabase';
import {
  X,
  Star,
  Award,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface EventFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  currentUser: User;
  registration?: Registration;
  onFeedbackSubmitted: (feedback: EventFeedback) => void;
}

export const EventFeedbackModal: React.FC<EventFeedbackModalProps> = ({
  isOpen,
  onClose,
  event,
  currentUser,
  registration,
  onFeedbackSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [mentorshipRating, setMentorshipRating] = useState<number>(5);
  const [organizationRating, setOrganizationRating] = useState<number>(5);
  const [comments, setComments] = useState('');
  const [improvements, setImprovements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 1:
        return 'Needs Improvement 😕';
      case 2:
        return 'Fair Experience 😐';
      case 3:
        return 'Good & Educational 🙂';
      case 4:
        return 'Great Hackathon / Event! 😃';
      case 5:
        return 'Outstanding & Exceptional! 🤩✨';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (rating < 1) {
      setErrorMsg('Please select an overall star rating.');
      return;
    }

    if (!comments.trim()) {
      setErrorMsg('Please share a quick sentence about your experience or takeaways.');
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackRecord: EventFeedback = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        eventId: event.id,
        userId: currentUser.id,
        userName: currentUser.name || registration?.attendeeName || 'Attendee',
        userEmail: currentUser.email.toLowerCase(),
        registrationId: registration?.id,
        rating,
        mentorshipRating,
        organizationRating,
        comments: comments.trim(),
        improvements: improvements.trim() || undefined,
        submittedAt: new Date().toISOString(),
      };

      // Save locally and sync to Firebase Realtime Database
      StorageRepository.saveFeedback(feedbackRecord);
      await EventDatabaseService.saveFeedbackToRealtimeDB(feedbackRecord);

      // Audit Log
      StorageRepository.logAuditEvent({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'EVENT_FEEDBACK_SUBMITTED',
        entityType: 'event',
        entityId: feedbackRecord.id,
        details: `Submitted ${rating}-star feedback for event "${event.title}" to unlock certificate`,
      });

      setIsSubmitting(false);
      onFeedbackSubmitted(feedbackRecord);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Certificate Verification
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight mt-1">
                Participant Feedback
              </h2>
              <p className="text-xs text-indigo-200 font-medium truncate max-w-xs sm:max-w-sm mt-0.5">
                {event.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Certificate Gating Notification Notice */}
        <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-indigo-500/15 border-b border-amber-200/80 px-5 py-3 flex items-center gap-2.5 shrink-0">
          <Award className="w-4 h-4 text-amber-700 shrink-0" />
          <p className="text-[11px] font-bold text-amber-950 leading-relaxed">
            Submit your feedback to unlock and verify your <strong>Official Certificate of Participation</strong>!
          </p>
        </div>

        {/* Feedback Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Overall Star Rating */}
          <div className="text-center space-y-2 py-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Overall Hackathon / Event Experience *
            </label>

            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 rounded-xl hover:scale-125 active:scale-95 transition-all cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-500 drop-shadow-md'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-xs font-black text-indigo-700 font-mono tracking-tight pt-1">
              {getRatingLabel(hoverRating || rating)}
            </p>
          </div>

          {/* Criteria Ratings (Mentorship + Organization) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mentorship & Support */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-[11px] font-extrabold text-slate-700 block">
                Mentorship &amp; Judging
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMentorshipRating(s)}
                    className={`flex-1 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer ${
                      mentorshipRating === s
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50'
                    }`}
                  >
                    {s}★
                  </button>
                ))}
              </div>
            </div>

            {/* Organization & Logistics */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-[11px] font-extrabold text-slate-700 block">
                Logistics &amp; Organization
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setOrganizationRating(s)}
                    className={`flex-1 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer ${
                      organizationRating === s
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50'
                    }`}
                  >
                    {s}★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Highlights & Experience Comments */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
              <span>What went great? (Highlights / Takeaways) *</span>
              <span className="text-[10px] text-slate-400 font-normal">Required</span>
            </label>
            <textarea
              required
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Learned awesome full-stack AI development skills, loved the problem statements and team collaboration..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Suggestions for Improvement */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
              <span>Suggestions for future hackathons (Optional)</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <input
              type="text"
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="e.g. More mentoring office hours, food variety, longer hack duration..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-extrabold text-xs transition-all cursor-pointer text-center"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verifying &amp; Unlocking...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Submit &amp; Unlock Certificate ✓</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
