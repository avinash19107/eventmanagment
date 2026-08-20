import React, { useRef, useEffect, useState } from 'react';

// Start time offset in seconds (0:04)
const START_TIME_SECONDS = 4;

// Cascading list of high-speed, reliable video streams (direct GitHub Release + local + fallback)
const VIDEO_SOURCES = [
  'https://github.com/avinash19107/eventmanagment/releases/download/v1.0.0/login-bg.mp4',
  '/login-bg.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-graphs-and-data-31913-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-working-on-a-computer-at-night-41562-large.mp4',
];

export const LoginVideoBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const hasSeekedRef = useRef(false);

  // Attempt video playback whenever source or ref changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;

    hasSeekedRef.current = false;
    video.muted = true;
    video.defaultMuted = true;

    const playVideo = () => {
      // Seek to 0:04 before playing
      try {
        if (video.currentTime < START_TIME_SECONDS) {
          video.currentTime = START_TIME_SECONDS;
          hasSeekedRef.current = true;
        }
      } catch (e) {}

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoLoaded(true);
          })
          .catch((err) => {
            console.warn('Video autoplay awaiting interaction or failed:', err);
            const handleInteract = () => {
              if (videoRef.current) {
                try {
                  if (videoRef.current.currentTime < START_TIME_SECONDS) {
                    videoRef.current.currentTime = START_TIME_SECONDS;
                  }
                } catch (e) {}
                videoRef.current.play().then(() => setVideoLoaded(true)).catch(() => {});
              }
              window.removeEventListener('click', handleInteract);
              window.removeEventListener('touchstart', handleInteract);
              window.removeEventListener('keydown', handleInteract);
            };
            window.addEventListener('click', handleInteract);
            window.addEventListener('touchstart', handleInteract);
            window.addEventListener('keydown', handleInteract);
          });
      }
    };

    video.load();
    playVideo();
  }, [sourceIndex, videoFailed]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = START_TIME_SECONDS;
        hasSeekedRef.current = true;
      } catch (e) {}
    }
  };

  const handleVideoEnded = () => {
    // Loop back from 0:04
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = START_TIME_SECONDS;
        videoRef.current.play().catch(() => {});
      } catch (e) {}
    }
  };

  const handleVideoError = () => {
    console.warn(`Video source ${VIDEO_SOURCES[sourceIndex]} failed on this environment. Switching to next source...`);
    if (sourceIndex + 1 < VIDEO_SOURCES.length) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setVideoFailed(true);
    }
  };

  const currentSourceUrl = `${VIDEO_SOURCES[sourceIndex]}#t=${START_TIME_SECONDS}`;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none rounded-none bg-slate-950"
    >
      {/* Ambient Animated Fallback Background Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 animate-pulse transition-opacity duration-1000" />

      {/* Multi-Source Auto-Playing Silent Background Video Starting from 0:04 */}
      {!videoFailed && (
        <video
          ref={videoRef}
          key={currentSourceUrl}
          autoPlay
          loop={false}
          muted
          playsInline
          preload="auto"
          onContextMenu={(e) => e.preventDefault()}
          controlsList="nodownload no-remote-playback noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={() => {
            if (videoRef.current && videoRef.current.currentTime < START_TIME_SECONDS) {
              try {
                videoRef.current.currentTime = START_TIME_SECONDS;
              } catch (e) {}
            }
            setVideoLoaded(true);
          }}
          onEnded={handleVideoEnded}
          onPlaying={() => setVideoLoaded(true)}
          onError={handleVideoError}
          className={`absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-center z-0 transition-opacity duration-1000 transform-gpu pointer-events-none select-none ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          src={currentSourceUrl}
        >
          <source src={currentSourceUrl} type="video/mp4" />
        </video>
      )}

      {/* Crisp Overlay Blend for Maximum Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-purple-950/20 to-black/30 z-1 pointer-events-none" />
    </div>
  );
};
