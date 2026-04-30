import { memo } from 'react';
import { RefreshCw, Brain } from 'lucide-react';
import { Theme } from '../../constants/themes';

interface KPPreviewCardProps {
  kp: { title: string; content: string };
  index: number;
  isLoading: boolean;
  onRegenerate: (index: number) => void;
  onCollect: (kp: { title: string; content: string }) => void;
  theme: Theme;
}

const KPPreviewCard = memo(({ 
  kp, 
  index, 
  isLoading, 
  onRegenerate, 
  onCollect, 
  theme 
}: KPPreviewCardProps) => {
  return (
    <div className={`p-4 ${theme.mutedBg} rounded-2xl border ${theme.border} space-y-3 relative`}>
      <div className="flex items-center justify-between">
        <h4 className={`text-xs font-black ${theme.text} uppercase tracking-wider flex items-center gap-2`}>
          <Brain className="w-3.5 h-3.5 text-indigo-500" />
          知识点 {index + 1}
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRegenerate(index)}
            disabled={isLoading}
            className={`p-1.5 ${theme.subText} hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-500/10`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <p className={`text-xs font-bold ${theme.text}`}>{kp.title}</p>
        <p className={`text-[10px] ${theme.subText} leading-relaxed`}>{kp.content}</p>
      </div>
      <button
        type="button"
        onClick={() => onCollect(kp)}
        className="w-full py-2 bg-indigo-500/10 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
      >
        加入个人知识库
      </button>
    </div>
  );
});

export default KPPreviewCard;
