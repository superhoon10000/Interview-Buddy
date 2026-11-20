import React, { useEffect, useRef, useState } from "react";

// LYRIC TIMING: edit start (seconds from the beginning of the MP3).
// Smaller = earlier, larger = later. Keep these in increasing order.
// Each line stays until the next line starts; the final line stays to song end.
// Example: changing 2.548 to 2.348 shows the second line 0.2 seconds earlier.
const LYRICS = [
  { start: 0, text: "Interview Buddy, here we go!" },
  { start: 2.548, text: "Master the interview, steal the show." },
  { start: 5.4, text: "Boost your confidence, play it cool." },
  { start: 7.659, text: "Interview Buddy, capybaras rule!" },
];
const SONG_DURATION = 10.992;

export default function PeekingCapybara() {
  const audioRef = useRef(null);
  const [isShowing, setIsShowing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(SONG_DURATION);
  const lyricIndex = LYRICS.findIndex(({ start }, index) =>
    playbackTime >= start && playbackTime < (LYRICS[index + 1]?.start ?? duration)
  );
  const lineStart = LYRICS[lyricIndex]?.start ?? 0;
  const lineDuration = (LYRICS[lyricIndex + 1]?.start ?? duration) - lineStart;
  const currentLyric = LYRICS[lyricIndex]?.text;

  function syncPlayback(event) {
    const audio = event.currentTarget;
    setPlaybackTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
  }

  useEffect(() => {
    if (!isPlaying) return;
    let frame;
    function followAudio() {
      if (audioRef.current) setPlaybackTime(audioRef.current.currentTime);
      frame = window.requestAnimationFrame(followAudio);
    }
    frame = window.requestAnimationFrame(followAudio);
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);

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
      setPlaybackTime(0);
      await audio.play();
    } catch {
      setIsPlaying(false);
      setPlaybackError("Unable to play Interview Buddy. Please try again.");
    }
  }

  useEffect(() => {
    function updateProximity(event) {
      if (event.pointerType === "touch") return;
      // Use the viewport corner directly, independent of grid layout sizing.
      const proximity = 96; // 80px artwork + 16px discovery margin.
      setIsShowing(
        event.clientX >= window.innerWidth - proximity &&
        event.clientX <= window.innerWidth &&
        event.clientY >= window.innerHeight - proximity &&
        event.clientY <= window.innerHeight
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
        onPlaying={(event) => {
          syncPlayback(event);
          setIsPlaying(true);
        }}
        onTimeUpdate={syncPlayback}
        onSeeked={syncPlayback}
        onLoadedMetadata={syncPlayback}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setPlaybackError("Unable to play Interview Buddy. Please try again.");
        }}
      />
    <div className="ibRankingCapyCorner">
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
            <div className="ibRankingCapyLyrics" aria-label="Song lyrics" aria-live="polite" aria-atomic="true">
              {currentLyric && (
                <p
                  key={lyricIndex}
                  className="ibRankingCapyLyric"
                  style={{
                    animationDuration: `${lineDuration}s`,
                    animationDelay: `-${Math.max(0, playbackTime - lineStart)}s`,
                    // Sample the animation at the media time; never run two clocks.
                    animationPlayState: "paused",
                  }}
                >
                  {currentLyric}
                </p>
              )}
            </div>
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
