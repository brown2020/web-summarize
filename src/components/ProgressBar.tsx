// components/ProgressBar.tsx

type ProgressBarProps = {
  progress: number; // Progress value between 0 and 100
};

export default function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full mt-4">
      <div
        className="h-2 bg-blue-500 rounded-full transition-all duration-300"
        style={{ width: `${progress}%`, maxWidth: "100%" }}
      ></div>
    </div>
  );
}
