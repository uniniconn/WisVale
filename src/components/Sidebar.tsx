import { memo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Mountain,
  FileText,
  Smartphone,
  Monitor,
  Trophy,
  Maximize,
  Minimize,
  Brain,
  ChevronRight,
  Check,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, KnowledgePoint } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../hooks/useTheme';
import { useViewMode } from '../hooks/useViewMode';
import { Theme } from '../constants/themes';
import CustomBackground from './CustomBackground';
import { VERSION } from '../version';

interface SidebarProps {
  user: User | null;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isMobileView: boolean;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  handleLogout: () => void;
  handleUpdateNickname: () => void;
  isEditingNickname: boolean;
  setIsEditingNickname: (editing: boolean) => void;
  newNickname: string;
  setNewNickname: (nickname: string) => void;
}

const Sidebar = memo(({ 
  user, 
  isMenuOpen, 
  setIsMenuOpen, 
  isMobileView, 
  toggleFullscreen, 
  isFullscreen, 
  handleLogout,
  handleUpdateNickname,
  isEditingNickname,
  setIsEditingNickname,
  newNickname,
  setNewNickname
}: SidebarProps) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { theme, isNight, isArtMode, customBgUrl, bgBlur } = useTheme();
  const { viewMode, setViewMode } = useViewMode();
  const [isKpExpanded, setIsKpExpanded] = useState(false);

  const navItems = [
    { name: t('nav.home'), path: '/', icon: LayoutDashboard },
    { name: t('nav.knowledge'), path: '/knowledge', icon: Brain },
    { name: t('nav.upload'), path: '/upload', icon: PlusCircle },
    { name: t('nav.leaderboard'), path: '/leaderboard', icon: Trophy },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: t('nav.admin'), path: '/admin', icon: Trophy });
    navItems.push({ name: '系统设置', path: '/settings', icon: Settings });
  }

  const showSidebar = !isMobileView || isMenuOpen;

  if (!showSidebar) return null;

  return (
    <motion.aside
      initial={isMobileView ? { x: '-100%' } : false}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`
        ${isMobileView 
          ? 'fixed inset-y-0 left-0 z-[1000] w-72 overflow-y-auto overscroll-contain shadow-2xl pt-[72px]' 
          : 'sticky top-0 h-screen w-64 shrink-0 overflow-y-auto overscroll-contain'}
        ${theme.sidebar} backdrop-blur-lg flex flex-col print:hidden shadow-none transition-colors duration-1000
        will-change-transform transform-gpu ${isArtMode ? 'brush-stroke' : ''}
      `}
    >
      <div className="h-full flex flex-col p-6">
        {!isMobileView && (
          <div className="flex items-center gap-3 mb-10 group cursor-default">
            <div className={`w-11 h-11 bg-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${isArtMode ? 'brush-stroke' : ''}`}>
              <Mountain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`font-bold ${theme.text} leading-tight text-lg tracking-tight transition-colors duration-1000`}>WisVale</h1>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-3">
          {navItems.map((item) => {
             const Icon = item.icon;
             const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
             const isKP = item.path === '/knowledge';

             return (
               <div key={item.path} className="space-y-1">
                 <div className="relative">
                   {isKP ? (
                     <div
                       onClick={() => setIsKpExpanded(!isKpExpanded)}
                       className={`
                         group flex items-center gap-3 px-5 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-500 relative overflow-hidden border cursor-pointer
                         ${isActive 
                           ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/20' 
                           : `${theme.card} ${theme.text} backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]`}
                       `}
                     >
                       <Icon className={`w-5 h-5 transition-all duration-500 group-hover:scale-110 ${isActive ? 'text-white' : theme.navIcon}`} />
                       {item.name}
                       <ChevronRight className={`ml-auto w-4 h-4 transition-transform duration-300 ${isKpExpanded ? 'rotate-90' : ''}`} />
                     </div>
                   ) : (
                     <Link
                       to={item.path}
                       onClick={() => setIsMenuOpen(false)}
                       className={`
                         group flex items-center gap-3 px-5 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-500 relative overflow-hidden border
                         ${isActive 
                           ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/20' 
                           : `${theme.card} ${theme.text} backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]`}
                       `}
                     >
                       <Icon className={`w-5 h-5 transition-all duration-500 group-hover:scale-110 ${isActive ? 'text-white' : theme.navIcon}`} />
                       {item.name}
                     </Link>
                   )}
                 </div>
                 
                 {isKP && isKpExpanded && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     className="pl-6 space-y-1"
                   >
                     {[
                       { name: t('kb.tab.level1'), path: '/knowledge/level/1' },
                       { name: t('kb.tab.level2'), path: '/knowledge/level/2' },
                       { name: t('kb.tab.level3'), path: '/knowledge/level/3' },
                       { name: t('kb.tab.mastered'), path: '/knowledge/level/mastered' },
                       { name: t('kb.tab.summary'), path: '/knowledge/summary' }
                     ].map((cat) => (
                       <Link 
                          key={cat.path}
                          to={cat.path}
                          onClick={() => setIsMenuOpen(false)}
                          className={`block px-4 py-2 text-[10px] font-bold ${theme.subText} border-l-2 ${isNight ? 'border-slate-800' : 'border-slate-100'} hover:border-green-500 hover:text-green-500 transition-all`}
                       >
                         {cat.name}
                       </Link>
                     ))}
                   </motion.div>
                 )}
               </div>
             );
          })}

          <button
            onClick={toggleFullscreen}
            className={`
              w-full group flex items-center gap-3 px-5 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-500 relative overflow-hidden border
              ${theme.card} ${theme.text} backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]
            `}
          >
            {isFullscreen ? (
              <>
                <Minimize className={`w-5 h-5 transition-all duration-500 group-hover:scale-110 ${theme.navIcon}`} />
                {t('layout.fullscreen.exit')}
              </>
            ) : (
              <>
                <Maximize className={`w-5 h-5 transition-all duration-500 group-hover:scale-110 ${theme.navIcon}`} />
                {t('layout.fullscreen.enter')}
              </>
            )}
          </button>
        </nav>

        <div className={`mt-auto pt-6 border-t ${isNight ? 'border-slate-800' : 'border-slate-100'} space-y-6 transition-colors duration-1000`}>
          <div className="px-2">
            <p className={`text-[10px] ${theme.subText} uppercase tracking-widest font-bold mb-3 px-2 transition-colors duration-1000`}>{t('layout.viewMode.title')}</p>
            <div className={`flex ${isNight ? 'bg-slate-900/50 border-slate-800/30' : 'bg-slate-100/50 border-slate-200/30'} p-1 rounded-2xl border transition-colors duration-1000`}>
              {[
                { id: 'auto', label: t('layout.viewMode.auto'), icon: null },
                { id: 'mobile', label: t('layout.viewMode.mobile'), icon: Smartphone },
                { id: 'desktop', label: t('layout.viewMode.desktop'), icon: Monitor }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all duration-1000 active:scale-95 ${
                    viewMode === mode.id 
                      ? (isNight ? 'bg-slate-800 text-green-400' : 'bg-white text-green-600') 
                      : (isNight ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                  }`}
                >
                  {mode.icon && <mode.icon className="w-3 h-3" />}
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <CustomBackground 
            currentBgUrl={customBgUrl} 
            currentBlur={bgBlur} 
            theme={theme} 
          />

          <div className={`flex items-center gap-3 px-2 py-3 ${theme.mutedBg} rounded-2xl border ${theme.border} transition-colors duration-1000`}>
            <div className={`w-10 h-10 rounded-full ${isNight ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-100 text-slate-600'} flex items-center justify-center font-bold border transition-colors duration-1000 shrink-0`}>
              {user?.nickname ? user.nickname.slice(0, 2) : (user?.studentId ? user.studentId.slice(-2) : '??')}
            </div>
            <div className="flex-1 min-w-0">
              {isEditingNickname ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    onBlur={handleUpdateNickname}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateNickname()}
                    className={`w-full bg-transparent border-b border-green-500 outline-none text-sm font-bold ${theme.text} py-0.5`}
                    placeholder={t('layout.nickname.placeholder')}
                  />
                  <button onClick={handleUpdateNickname} className="text-green-500">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-sm font-bold ${theme.text} truncate tracking-tight transition-colors duration-1000`}>
                    {user?.nickname || user?.studentId}
                  </p>
                  <button 
                    onClick={() => setIsEditingNickname(true)}
                    className={`p-1 ${theme.subText} hover:text-green-600 transition-colors shrink-0`}
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">{t('layout.status.online')}</p>
                </div>
                <div className={`w-[1px] h-2 ${isNight ? 'bg-slate-800' : 'bg-slate-200'} transition-colors duration-1000`} />
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider">{user?.points || 0} PTS</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="https://docs.qq.com/doc/DT1BwQUdpa01YR2VF"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${isNight ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-800' : 'bg-slate-100/50 text-slate-600 hover:bg-slate-200'} transition-all active:scale-[0.98]`}
            >
              <FileText className="w-4 h-4" />
              {t('layout.feedback')}
            </a>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout')}
            </button>
          </div>

          <div className="pt-2 text-center">
            <p className={`text-[10px] font-black ${theme.subText} opacity-30 uppercase tracking-[0.3em]`}>
              WisVale v{VERSION}
            </p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
});

export default Sidebar;
