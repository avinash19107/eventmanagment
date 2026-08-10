import React, { useRef, useState } from 'react';

export const LoginVideoBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none rounded-none bg-slate-950"
    >
      {/* Silent MP4 Background Video */}
      {!videoError && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onContextMenu={(e) => e.preventDefault()}
          controlsList="nodownload no-remote-playback noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-center z-0 transition-opacity duration-700 transform-gpu pointer-events-none select-none"
        >
          <source src="https://github.com/avinash19107/eventmanagment/releases/download/v1.0.0/login-bg.mp4" type="video/mp4" />
          <source src="/login-bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Crisp Overlay Blend for Maximum Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-purple-950/10 to-black/20 z-1 pointer-events-none" />
    </div>
  );
};
