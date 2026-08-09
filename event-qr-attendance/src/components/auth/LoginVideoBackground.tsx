import React, { useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export const LoginVideoBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none rounded-t-[32px] md:rounded-none bg-gradient-to-br from-[#7C5CFC] via-[#6846EC] to-[#4F2FD4]">
      {/* Uploaded User MP4 Video Stream - Scaled to fill 100% without black bars */}
      {!videoError && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-center z-0 transition-opacity duration-700 transform-gpu"
        >
          <source src="/login-bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Crisp Overlay Blend for Maximum HD Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-purple-950/10 to-black/20 z-1 pointer-events-none" />

      {/* Interactive Sound Control Button (Optimized position for mobile and laptop) */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-30">
        <button
          type="button"
          onClick={toggleSound}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 text-[11px] sm:text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
          title={isMuted ? 'Unmute Video Sound' : 'Mute Video Sound'}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-300" />
              <span>Enable Sound</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse" />
              <span>Sound On</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
