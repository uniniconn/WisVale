import { memo } from 'react';
import { Mountain, Menu, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface MobileHeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isMobileView: boolean;
}

const MobileHeader = memo(({ isMenuOpen, setIsMenuOpen, isMobileView }: MobileHeaderProps) => {
  const { theme, isNight, isArtMode } = useTheme();

  if (!isMobileView) return null;

  return (
    <div className={`
      flex ${theme.header} backdrop-blur-md p-4 items-center justify-between sticky top-0 z-[1001] print:hidden h-[72px] shadow-sm transition-all duration-500
      ${isMenuOpen ? 'backdrop-blur-xl bg-opacity-100' : ''}
    `}>
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center ${isArtMode ? 'brush-stroke' : ''}`}>
          <Mountain className="w-5 h-5 text-white" />
        </div>
        <span className={`font-bold ${theme.text} tracking-tight transition-colors duration-1000`}>WisVale</span>
      </div>
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)} 
        className={`p-2.5 ${isNight ? 'text-slate-400 bg-slate-900' : 'text-slate-600 bg-slate-50'} rounded-xl active:scale-90 transition-all duration-1000`}
      >
        {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </div>
  );
});

export default MobileHeader;
