import React, { useRef, useState } from 'react';

export const LoginVideoBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none rounded-t-[32px] md:rounded-none bg-gradient-to-br from-[#7C5CFC] via-[#6846EC] to-[#4F2FD4]">
      {/* Silent MP4 Background Video */}
      {!videoError && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => setVideoError(true)}
          className="absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-center z-0 transition-opacity duration-700 transform-gpu"
        >
          <source src="/login-bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Crisp Overlay Blend for Maximum Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-purple-950/10 to-black/20 z-1 pointer-events-none" />
    </div>
  );
};
