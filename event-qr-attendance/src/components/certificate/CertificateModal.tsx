import React, { useEffect, useRef } from 'react';
import { Event, Registration, EventWinner } from '../../types';
import { X, Download, Award, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  registration: Registration;
  winner?: EventWinner;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  event,
  registration,
  winner,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1920;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Deep Luxury Navy/Indigo)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0F172A');
    bgGrad.addColorStop(0.5, '#1E1B4B');
    bgGrad.addColorStop(1, '#090D16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Radial Background Glow
    const glowGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 600);
    glowGrad.addColorStop(0, 'rgba(129, 140, 248, 0.15)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // Outer Gold Frame Border
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#D97706';
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Inner Gold Fine Double Line Frame
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FBBF24';
    ctx.strokeRect(56, 56, width - 112, height - 112);

    // Decorative Corner Accents
    const drawCorner = (x: number, y: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(40, 0);
      ctx.lineTo(0, 40);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawCorner(56, 56, 0);
    drawCorner(width - 56, 56, Math.PI / 2);
    drawCorner(width - 56, height - 56, Math.PI);
    drawCorner(56, height - 56, -Math.PI / 2);

    // Header Emblem Icon
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#F59E0B';
    ctx.textAlign = 'center';
    ctx.fillText('✦  APEX EVENTS OFFICIAL CERTIFICATION  ✦', width / 2, 140);

    // Main Certificate Title
    ctx.font = '900 64px sans-serif';
    ctx.fillStyle = winner ? '#FBBF24' : '#FFFFFF';
    const mainTitle = winner ? 'WINNER AWARD CERTIFICATE' : 'CERTIFICATE OF PARTICIPATION';
    ctx.fillText(mainTitle, width / 2, 230);

    // Gold Divider Line
    const divGrad = ctx.createLinearGradient(width / 2 - 300, 0, width / 2 + 300, 0);
    divGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
    divGrad.addColorStop(0.5, '#F59E0B');
    divGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = divGrad;
    ctx.fillRect(width / 2 - 300, 260, 600, 4);

    // Sub-header Text
    ctx.font = 'italic 500 30px sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('This is proudly presented to', width / 2, 330);

    // Attendee Name
    ctx.font = '900 76px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(registration.attendeeName.toUpperCase(), width / 2, 430);

    // Name Underline
    ctx.fillStyle = '#6366F1';
    ctx.fillRect(width / 2 - 250, 455, 500, 4);

    // Description text
    ctx.font = '400 28px sans-serif';
    ctx.fillStyle = '#CBD5E1';
    const tName = registration.teamName || winner?.teamName;
    if (winner) {
      const teamPrefix = tName ? `as a member of Team "${tName}" ` : '';
      ctx.fillText(
        `${teamPrefix}for achieving Rank #${winner.rank || 1} with ${winner.score} Points${
          winner.prize ? ' & winning ' + winner.prize : ''
        } in`,
        width / 2,
        530
      );
    } else {
      const teamSuffix = tName ? ` with Team "${tName}"` : '';
      ctx.fillText(`for successfully attending and actively participating in${teamSuffix}`, width / 2, 530);
    }

    // Event Title
    ctx.font = '900 48px sans-serif';
    ctx.fillStyle = '#818CF8';
    ctx.fillText(event.title, width / 2, 610);

    // Event Details (Date & Venue)
    ctx.font = '600 24px sans-serif';
    ctx.fillStyle = '#94A3B8';
    const eventDateStr = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    ctx.fillText(`Held on ${eventDateStr}  •  ${event.venueName}`, width / 2, 675);

    // Footer - Left: Certificate Reference Code
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#F59E0B';
    const certCode = `CERT-${registration.reference.replace('REF-', '')}`;
    ctx.fillText(`VERIFIED CERT ID: ${certCode}`, 120, 880);

    ctx.font = '500 18px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`Issued to: ${registration.attendeeEmail}`, 120, 915);
    ctx.fillText(`Issue Date: ${new Date().toLocaleDateString()}`, 120, 945);

    // Footer - Right: Organizer Signature Line
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width - 450, 890);
    ctx.lineTo(width - 150, 890);
    ctx.stroke();

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(event.organizerName || 'Apex Events Director', width - 300, 925);

    ctx.font = '500 18px sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Event Host & Authorized Signatory', width - 300, 955);

    // Draw QR Verification Code at Bottom Left
    const verifyUrl = `${window.location.origin}/verify?cert=${certCode}`;
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 110, color: { dark: '#FFFFFF', light: '#1E1B4B' } })
      .then((qrDataUrl) => {
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 120, 720, 110, 110);
        };
        qrImg.src = qrDataUrl;
      })
      .catch(() => {});
  }, [isOpen, event, registration, winner]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${event.title.replace(/\s+/g, '_')}_Certificate_${registration.attendeeName.replace(/\s+/g, '_')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white leading-tight">Official Certificate</h3>
                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">{event.title}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="sm:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG Certificate</span>
            </button>

            <button
              onClick={onClose}
              className="hidden sm:inline-flex p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Display Container */}
        <div className="p-3 sm:p-6 bg-slate-950 flex items-center justify-center overflow-x-auto flex-1">
          <canvas
            ref={canvasRef}
            className="w-full max-w-3xl h-auto rounded-2xl border border-amber-500/30 shadow-2xl"
          />
        </div>

        {/* Footer Notice */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-800 bg-slate-900 text-center text-[10px] sm:text-xs text-slate-400 font-medium shrink-0">
          🔒 Certified &amp; Verifiable via QR Code • Reference ID: CERT-{registration.reference.replace('REF-', '')}
        </div>
      </div>
    </div>
  );
};
