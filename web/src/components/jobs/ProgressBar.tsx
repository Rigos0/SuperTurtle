export function ProgressBar({ progress }: { progress: number }) {
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${safeProgress}%` }}
      />
    </div>
  );
}
