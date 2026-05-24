import { Sparkles } from 'lucide-react';

interface Props {
  message: string;
}

export function InsightBanner({ message }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="text-brand-ink">
        <span className="mr-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">AI INSIGHT</span>
        {message}
      </div>
    </div>
  );
}
