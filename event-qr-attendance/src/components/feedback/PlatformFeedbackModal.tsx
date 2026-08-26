import React, { useState } from 'react';
import { User, PlatformFeedback } from '../../types';
import { StorageRepository } from '../../services/storage';
import { EventDatabaseService } from '../../services/eventDatabase';
import {
  X,
  Star,
  Sparkles,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';

interface PlatformFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onFeedbackSubmitted: (feedback: PlatformFeedback) => void;
}

export const PlatformFeedbackModal: React.FC<PlatformFeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onFeedbackSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [tag, setTag] = useState<string>('Student Attendee');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 1:
        return 'Needs Improvement 😕';
      case 2:
        return 'Fair 😐';
      case 3:
        return 'Good Experience 🙂';
      case 4:
        return 'Great & Intuitive! 😃';
      case 5:
        return 'Outstanding & Sleek! 🤩✨';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!feedbackText.trim()) {
      setErrorMsg('Please share your thoughts and experience before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const record: PlatformFeedback = {
        id: `pfb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email.toLowerCase(),
        userRole: currentUser.role,
        userAvatarUrl: currentUser.avatarUrl,
        rating,
        feedback: feedbackText.trim(),
        tag,
        createdAt: new Date().toISOString(),
      };

      StorageRepository.savePlatformFeedback(record);
      await EventDatabaseService.savePlatformFeedbackToRealtimeDB(record);

      StorageRepository.logAuditEvent({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'PLATFORM_FEEDBACK_SUBMITTED',
        entityType: 'registration',
        entityId: record.id,
        details: `Submitted ${rating}-star platform review: "${feedbackText.trim().slice(0, 40)}..."`,
      });

      onFeedbackSubmitted(record);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all relative">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest block font-bold">
                ApexEvents Community
              </span>
              <h3 className="text-lg font-black tracking-tight">
                Share Platform Feedback
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Star Rating */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Your Overall Rating *
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
                    className={`w-7 h-7 sm:w-8 sm:h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-500 drop-shadow-md'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-black text-indigo-700 font-mono">
              {getRatingLabel(hoverRating || rating)}
            </p>
          </div>

          {/* Community Role Tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Your Role / Tag
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                'Student Attendee',
                'Team Leader',
                'Event Organizer',
                'Teacher / Mentor',
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    tag === t
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Your Review & Experience *</span>
            </label>
            <textarea
              required
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what you loved about ApexEvents, ticketing passes, QR gate check-in, certificates, and team events..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all resize-none shadow-2xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
