import React, { useRef, useEffect, useState } from 'react';

export const LoginVideoBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setVideoLoaded(true))
          .catch((err) => {
            console.warn('Autoplay prevented or waiting for interaction:', err);
            const handleInteract = () => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
              window.removeEventListener('click', handleInteract);
              window.removeEventListener('touchstart', handleInteract);
            };
            window.addEventListener('click', handleInteract);
            window.addEventListener('touchstart', handleInteract);
          });
      }
    }
  }, []);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none rounded-none bg-slate-950"
    >
      {/* Silent MP4 Background Video */}
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
        onLoadedData={() => setVideoLoaded(true)}
        className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-center z-0 transition-opacity duration-700 transform-gpu pointer-events-none select-none"
        src="/login-bg.mp4"
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Crisp Overlay Blend for Maximum Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-purple-950/10 to-black/20 z-1 pointer-events-none" />
    </div>
  );
};
