import React, { useEffect, useRef, useState } from "react";

export default function PeekingCapybara() {
  const cornerRef = useRef(null);
  const audioRef = useRef(null);
  const [isShowing, setIsShowing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio && !audio.paused) audio.pause();
    };
  }, []);

  function stopPlayback() {
    audioRef.current?.pause();
    setIsPlaying(false);
  }

  useEffect(() => {
    if (!isPlaying) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlaying]);

  async function playMusic() {
    const audio = audioRef.current;
    if (!audio || isPlaying) return;
    setPlaybackError("");
    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      setIsPlaying(false);
      setPlaybackError("Unable to play Interview Buddy. Please try again.");
    }
  }

  useEffect(() => {
    function updateProximity(event) {
      if (event.pointerType === "touch") return;
      const corner = cornerRef.current?.getBoundingClientRect();
      if (!corner) return;

      // Keep discovery close to the corner so this stays a hidden feature.
      setIsShowing(
        event.clientX >= corner.left - 16 &&
        event.clientY <= corner.bottom + 16
      );
    }

    const hide = () => setIsShowing(false);
    window.addEventListener("pointermove", updateProximity);
    document.documentElement.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("pointermove", updateProximity);
      document.documentElement.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return (
    <>
      <audio
        aria-label="Interview Buddy music"
        ref={audioRef}
        src={`${process.env.PUBLIC_URL}/Interview Buddy.mp3`}
        preload="none"
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setPlaybackError("Unable to play Interview Buddy. Please try again.");
        }}
      />
    <div className="ibRankingCapyCorner" ref={cornerRef}>
      <button
        type="button"
        className={`ibRankingCapyButton${isShowing ? " is-showing" : ""}`}
        aria-label="Headphone-wearing capybara"
        aria-hidden={!isShowing}
        disabled={!isShowing}
        tabIndex={isShowing ? 0 : -1}
        onClick={playMusic}
      >
        <img
          src={`${process.env.PUBLIC_URL}/Headphone-Wearing Capybara Mascot Peeking.png`}
          alt=""
          draggable="false"
        />
      </button>
    </div>
      {isPlaying && (
        <div className="ibRankingCapyPerformance">
          <div className="ibRankingCapyPerformanceContent">
            <img
              src={`${process.env.PUBLIC_URL}/Cheerful Capybara Finger-Sway Animation.gif`}
              alt="Capybara dancing to Interview Buddy"
            />
            <button type="button" onClick={stopPlayback}>
              Stop music
            </button>
          </div>
        </div>
      )}
      {playbackError && <p className="ibRankingCapyError" role="alert">{playbackError}</p>}
    </>
  );
}
