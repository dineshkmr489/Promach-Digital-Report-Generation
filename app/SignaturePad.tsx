"use client";

import { RotateCcw, Signature } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SignaturePad({
  onChange,
  disabled = false,
}: {
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const inkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#12382e";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    lastPoint.current = point(event);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    const previous = lastPoint.current;
    if (!context || !previous) return;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(current.x, current.y);
    context.stroke();
    lastPoint.current = current;
    inkRef.current = true;
    setHasInk(true);
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    drawing.current = false;
    lastPoint.current = null;
    if (inkRef.current) {
      onChange(event.currentTarget.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    inkRef.current = false;
    setHasInk(false);
    onChange(null);
  }

  return (
    <div className="signature-pad">
      <div className="signature-pad-head">
        <span>
          <Signature size={17} />
          Sign inside the box
        </span>
        <button onClick={clear} type="button" disabled={disabled || !hasInk}>
          <RotateCcw size={14} />
          Clear
        </button>
      </div>
      <canvas
        aria-label="Digital signature area"
        className={disabled ? "disabled" : ""}
        height={220}
        onPointerCancel={finish}
        onPointerDown={start}
        onPointerLeave={finish}
        onPointerMove={move}
        onPointerUp={finish}
        ref={canvasRef}
        width={900}
      />
      <small>Use a mouse, finger, or stylus. The signature is stored with the signed report.</small>
    </div>
  );
}
