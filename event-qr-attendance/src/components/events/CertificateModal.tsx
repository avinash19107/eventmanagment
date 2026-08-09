import React from 'react';
import { Event, User, EventWinner } from '../../types';
import { X, Award, Trophy, CheckCircle2, Download, Printer, ShieldCheck, Sparkles, Star } from 'lucide-react';

interface CertificateModalProps {
  event: Event | null;
  currentUser: User;
  winnerInfo: EventWinner | null;
  registrationRef?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  event,
  currentUser,
  winnerInfo,
  registrationRef,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !event) return null;

  const isWinner = Boolean(winnerInfo);
  const certId = `CERT-${(registrationRef || event.id.slice(-6)).toUpperCase()}`;
  const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            {isWinner ? (
              <Trophy className="w-5 h-5 text-amber-400" />
            ) : (
              <Award className="w-5 h-5 text-indigo-400" />
            )}
            <h3 className="text-sm font-extrabold tracking-wide uppercase">
              {isWinner ? '🏆 Official Winner Certificate' : '📜 Certificate of Participation'}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE CERTIFICATE CANVAS */}
        <div className="p-8 sm:p-12 bg-gradient-to-br from-amber-50/40 via-white to-indigo-50/40 relative overflow-hidden text-center space-y-6 border-8 border-double border-indigo-200 m-4 rounded-2xl shadow-inner">
          
          {/* Holographic Watermark Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <Trophy className="w-96 h-96 text-indigo-950" />
          </div>

          {/* Certificate Header */}
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/30 mx-auto mb-2">
              {isWinner ? <Trophy className="w-9 h-9" /> : <Award className="w-9 h-9" />}
            </div>

            <p className="text-xs font-black uppercase tracking-widest text-indigo-700">
              Official ApexEvents Verification Credential
            </p>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 font-serif">
              {isWinner ? 'CERTIFICATE OF EXCELLENCE' : 'CERTIFICATE OF PARTICIPATION'}
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-amber-400 via-indigo-600 to-purple-600 mx-auto rounded-full" />
          </div>

          {/* Recipient Block */}
          <div className="space-y-3 relative z-10 pt-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">This is proudly presented to</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 underline decoration-indigo-300 decoration-2 underline-offset-8">
              {currentUser.name}
            </h2>
            {currentUser.registrationNumber && (
              <p className="text-xs font-mono font-bold text-indigo-700">
                Reg No: {currentUser.registrationNumber}
              </p>
            )}
          </div>

          {/* Achievement Description */}
          <div className="max-w-xl mx-auto space-y-2 relative z-10 text-slate-700 text-xs sm:text-sm font-medium leading-relaxed">
            {isWinner ? (
              <p>
                For outstanding performance, achieving{' '}
                <strong className="text-amber-800 font-black uppercase bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  {winnerInfo?.rank === 1
                    ? '🥇 1st Place Winner'
                    : winnerInfo?.rank === 2
                    ? '🥈 2nd Place Winner'
                    : winnerInfo?.rank === 3
                    ? '🥉 3rd Place Winner'
                    : '🏆 Event Winner'}{' '}
                  (Score: {winnerInfo?.score || 'N/A'})
                </strong>{' '}
                in the official event event competition:
              </p>
            ) : (
              <p>
                For active participation and successful attendance in the officially conducted event session:
              </p>
            )}

            <h3 className="text-base sm:text-xl font-black text-indigo-900 pt-1">
              "{event.title}"
            </h3>
            <p className="text-xs text-slate-500 font-medium">📍 {event.venueName} • 📅 {eventDate}</p>
          </div>

          {/* Certificate Footer Seals */}
          <div className="pt-6 border-t border-slate-200/80 flex items-center justify-between text-left text-xs relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-emerald-700 font-black">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified System Issued</span>
              </div>
              <p className="text-[10px] font-mono text-slate-500">ID: {certId}</p>
            </div>

            <div className="text-center space-y-1">
              <div className="w-20 h-0.5 bg-slate-900 mx-auto" />
              <p className="text-[11px] font-extrabold text-slate-900">{event.organizerName || 'Apex Organizer'}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase">Event Host &amp; Organizer</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
