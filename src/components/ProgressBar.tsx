// components/ProgressBar.tsx

type ProgressBarProps = {
  progress: number; // Progress value between 0 and 100
};

export default function ProgressBar({ progress }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className="w-full mt-4" role="progressbar" aria-valuenow={clampedProgress} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">Processing...</span>
        <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
