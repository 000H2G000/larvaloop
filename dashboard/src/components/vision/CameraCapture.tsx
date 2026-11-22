"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  disabled?: boolean;
  onCapture: (image: Blob) => void;
}

/** USB / built-in camera via getUserMedia (works on localhost or HTTPS). */
export function CameraCapture({ disabled, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(
    async (id?: string) => {
      stop();
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: id ? { exact: id } : undefined, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setActive(true);
        // Labels are only available after permission is granted.
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter((d) => d.kind === "videoinput");
        setDevices(cams);
        setDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? id ?? "");
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow it in the browser's address bar."
            : name === "NotFoundError"
              ? "No camera found. Plug in the USB camera or upload a photo instead."
              : "Could not start the camera.",
        );
      }
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), "image/jpeg", 0.92);
  };

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black/80">
        <video ref={videoRef} autoPlay playsInline muted className={`size-full object-contain ${active ? "" : "hidden"}`} />
        {!active && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-white/70">
            {error ?? "Camera is off"}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {active ? (
          <>
            <button
              type="button"
              onClick={capture}
              disabled={disabled}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface disabled:opacity-50"
            >
              Capture &amp; analyse
            </button>
            <button type="button" onClick={stop} className="rounded-lg border border-border px-3 py-2 text-sm text-muted">
              Stop camera
            </button>
          </>
        ) : (
          <button type="button" onClick={() => start(deviceId || undefined)} className="rounded-lg border border-border px-3 py-2 text-sm">
            Start camera
          </button>
        )}

        {devices.length > 1 && (
          <select
            value={deviceId}
            onChange={(e) => {
              setDeviceId(e.target.value);
              start(e.target.value);
            }}
            className="min-w-0 rounded-lg border border-border bg-surface px-2 py-2 text-sm"
            aria-label="Camera"
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
