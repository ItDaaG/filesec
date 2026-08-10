import { useEffect, useRef, useState, useMemo } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Maximize2,
  ZoomIn, ZoomOut, RotateCcw, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileCategory = "image" | "video" | "audio" | "pdf" | "text" | "other";

function getFileCategory(filename: string, mimeType?: string): FileCategory {
  const mt = (mimeType ?? "").split(";")[0].trim().toLowerCase();

  // Prefer MIME type for robust classification.
  // If the backend returns a generic octet-stream, fall back to extension hints.
  if (mt && mt !== "application/octet-stream") {
    if (mt.startsWith("image/")) return "image";
    if (mt.startsWith("video/")) return "video";
    if (mt.startsWith("audio/")) return "audio";
    if (mt === "application/pdf" || mt.endsWith("+pdf")) return "pdf";
    if (mt.startsWith("text/")) return "text";
    if (
      [
        "application/json",
        "application/xml",
        "text/csv",
        "text/markdown",
        "application/yaml",
        "application/x-yaml",
      ].includes(mt)
    ) {
      return "text";
    }
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  if (["txt", "log", "md", "csv", "json", "xml", "yaml", "yml"].includes(ext)) return "text";
  return "other";
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const DOT_GRID: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, rgba(128,128,128,0.18) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};

// ---------------------------------------------------------------------------
// Image Viewer
// ---------------------------------------------------------------------------

const ImageViewer = ({ src, filename }: { src: string; filename: string }) => {
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);

  const zoomIn = () => { setFit(false); setZoom((z) => Math.min(+(z + 0.25).toFixed(2), 4)); };
  const zoomOut = () => { setFit(false); setZoom((z) => Math.max(+(z - 0.25).toFixed(2), 0.25)); };
  const reset = () => { setFit(true); setZoom(1); };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-background/95 backdrop-blur text-sm shrink-0">
        <Button variant="ghost" size="icon-xs" onClick={zoomOut} aria-label="Zoom out">
          <ZoomOut />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
          {fit ? "Fit" : `${Math.round(zoom * 100)}%`}
        </span>
        <Button variant="ghost" size="icon-xs" onClick={zoomIn} aria-label="Zoom in">
          <ZoomIn />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button variant="ghost" size="xs" onClick={reset} className="text-xs gap-1">
          <RotateCcw />
          Reset
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{filename}</span>
      </div>

      {/* Preview area */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-6"
        style={DOT_GRID}
      >
        <img
          src={src}
          alt={`Preview of ${filename}`}
          draggable={false}
          className={cn(
            "rounded shadow-md transition-all duration-150 select-none",
            fit ? "max-h-full max-w-full object-contain" : "",
          )}
          style={fit ? {} : { width: `${zoom * 100}%`, maxWidth: "none" }}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Video Player
// ---------------------------------------------------------------------------

const VideoPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = Number(e.target.value);
    v.volume = vol;
    v.muted = vol === 0;
    setVolume(vol);
    setMuted(vol === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-black"
    >
      <video
        ref={videoRef}
        src={src}
        className="flex-1 w-full object-contain min-h-0"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      {/* Controls bar */}
      <div className="shrink-0 bg-background/95 border-t px-4 py-3 space-y-2">
        {/* Seek bar */}
        <div className="relative w-full h-1.5 bg-muted rounded-full cursor-pointer group">
          <div
            className="h-full bg-primary rounded-full transition-all pointer-events-none"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="text-foreground hover:text-primary transition-colors"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Volume */}
          <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Mute">
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="w-20 accent-primary"
            aria-label="Volume"
          />

          {/* Time */}
          <span className="text-xs text-muted-foreground tabular-nums ml-1">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fullscreen"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Audio Player
// ---------------------------------------------------------------------------

const AudioPlayer = ({ src, filename }: { src: string; filename: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  // Static waveform bars (visual only, not real PCM)
  const bars = useMemo(
    () => Array.from({ length: 60 }, () => Math.random() * 0.75 + 0.25),
    // Intentionally keyed to src so bars regenerate when file changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [src],
  );

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const vol = Number(e.target.value);
    a.volume = vol;
    a.muted = vol === 0;
    setVolume(vol);
    setMuted(vol === 0);
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !a.muted;
    setMuted(a.muted);
  };

  const played = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex flex-col h-full items-center justify-center p-8" style={DOT_GRID}>
      <div className="w-full max-w-lg bg-background border rounded-2xl shadow-md p-6 space-y-5">
        {/* File name */}
        <div className="text-center">
          <p className="text-sm font-semibold truncate text-foreground">{filename}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Audio</p>
        </div>

        {/* Waveform visualization */}
        <div className="flex items-center gap-px h-14 px-1">
          {bars.map((h, i) => {
            const barPos = i / bars.length;
            const isPlayed = barPos <= played;
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-colors duration-100",
                  isPlayed ? "bg-primary" : "bg-muted-foreground/25",
                )}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>

        {/* Seek bar */}
        <div className="relative w-full h-1.5 bg-muted rounded-full cursor-pointer">
          <div
            className="h-full bg-primary rounded-full pointer-events-none"
            style={{ width: `${played * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>

        {/* Time */}
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Mute">
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume} onChange={handleVolume}
            className="w-20 accent-primary" aria-label="Volume"
          />

          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
          </button>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PDF Viewer
// ---------------------------------------------------------------------------

const PDFViewer = ({ src, filename }: { src: string; filename: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/95 backdrop-blur shrink-0">
        <span className="text-xs text-muted-foreground flex-1 truncate">
          {filename} — use browser controls for zoom &amp; pagination
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => window.open(src, "_blank")}
          className="gap-1 text-xs"
          aria-label="Open in new tab"
        >
          <ExternalLink />
          New tab
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleFullscreen}
          aria-label="Fullscreen"
        >
          <Maximize2 />
        </Button>
      </div>

      <iframe
        src={src}
        title={`PDF preview of ${filename}`}
        className="flex-1 w-full border-0"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Text Viewer
// ---------------------------------------------------------------------------

const TextViewer = ({ content, filename }: { content: string | null; filename: string }) => {
  const lineCount = content ? content.split("\n").length : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/95 backdrop-blur text-xs text-muted-foreground shrink-0">
        <span className="flex-1 truncate">{filename}</span>
        {content && <span>{lineCount} line{lineCount !== 1 ? "s" : ""}</span>}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-sm whitespace-pre-wrap break-words font-mono text-foreground/90 min-h-full">
          {content ?? "Loading…"}
        </pre>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Unsupported
// ---------------------------------------------------------------------------

const UnsupportedViewer = ({ filename }: { filename: string }) => (
  <div className="flex h-full items-center justify-center" style={DOT_GRID}>
    <div className="text-center space-y-2">
      <p className="text-sm font-medium text-foreground">No preview available</p>
      <p className="text-xs text-muted-foreground">{filename}</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface FilePreviewProps {
  blob: Blob;
  filename: string;
}

export const FilePreview = ({ blob, filename }: FilePreviewProps) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const category = getFileCategory(filename, blob.type);

  useEffect(() => {
    if (category === "text") {
      setTextContent(null);
      blob.text().then(setTextContent);
      return;
    }

    const url = URL.createObjectURL(blob);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [blob, category]);

  if (category === "text") {
    return <TextViewer content={textContent} filename={filename} />;
  }

  if (!objectUrl) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading preview…</p>
      </div>
    );
  }

  if (category === "image") return <ImageViewer src={objectUrl} filename={filename} />;
  if (category === "video") return <VideoPlayer src={objectUrl} />;
  if (category === "audio") return <AudioPlayer src={objectUrl} filename={filename} />;
  if (category === "pdf") return <PDFViewer src={objectUrl} filename={filename} />;

  return <UnsupportedViewer filename={filename} />;
};
