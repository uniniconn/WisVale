import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, isDemoMode } from '../firebase';
import { signOut } from 'firebase/auth';
import { User } from '../types';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Settings, 
  LogOut, 
  Mountain,
  Menu,
  X,
  AlertTriangle,
  Smartphone,
  Monitor,
  Trophy,
  User as UserIcon,
  Check,
  Edit3,
  Maximize,
  Minimize,
  Brain,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useViewMode } from '../hooks/useViewMode';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { KnowledgePoint } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export default function Layout({ children, user }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { viewMode, isMobileView, isDesktopForced } = useViewMode();
  const { timePeriod, isNight, isBirthday, isQidan, theme, getBgGradient } = useTheme();
  const { t } = useLanguage();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(user?.nickname || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [level1Kps, setLevel1Kps] = useState<KnowledgePoint[]>([]);
  const [isKpExpanded, setIsKpExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'knowledgePoints'),
      where('userId', '==', user.uid),
      where('level', '==', 1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as KnowledgePoint));
      setLevel1Kps(data);
    });
    return () => unsubscribe();
  }, [user]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    setNewNickname(user?.nickname || '');
  }, [user?.nickname]);

  const handleUpdateNickname = async () => {
    if (!user || !newNickname.trim() || newNickname === user.nickname) {
      setIsEditingNickname(false);
      return;
    }

    try {
      if (isDemoMode) {
        const demoUser = JSON.parse(localStorage.getItem('demo_user') || '{}');
        demoUser.nickname = newNickname.trim();
        localStorage.setItem('demo_user', JSON.stringify(demoUser));
        window.location.reload();
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        nickname: newNickname.trim()
      });
      setIsEditingNickname(false);
    } catch (err) {
      console.error("Error updating nickname:", err);
      alert(t('layout.updateNicknameFail'));
    }
  };

  useEffect(() => {
    // Apply classes to body/html if needed for global overrides
    if (viewMode === 'desktop') {
      document.documentElement.style.overflowX = 'auto';
    } else {
      document.documentElement.style.overflowX = 'hidden';
    }
  }, [viewMode]);

  const setViewMode = (mode: 'auto' | 'mobile' | 'desktop') => {
    localStorage.setItem('view_mode', mode);
    window.dispatchEvent(new Event('view-mode-change'));
  };

  const showSidebar = !isMobileView || isMenuOpen;

  const handleLogout = async () => {
    if (isDemoMode) {
      localStorage.removeItem('demo_user');
      window.location.reload();
      return;
    }
    await signOut(auth);
    navigate('/login');
  };


  const navItems = [
    { name: t('nav.home'), path: '/', icon: LayoutDashboard },
    { name: t('nav.knowledge'), path: '/knowledge', icon: Brain },
    { name: t('nav.upload'), path: '/upload', icon: PlusCircle },
    { name: t('nav.leaderboard'), path: '/leaderboard', icon: Trophy },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: t('nav.admin'), path: '/admin', icon: Settings });
  }

  return (
    <div className={`min-h-screen flex ${isMobileView ? 'flex-col' : 'flex-row'} relative ${isDesktopForced ? 'overflow-x-auto' : 'overflow-x-hidden'} transition-colors duration-1000 ${isQidan ? 'bg-purple-50' : (isBirthday ? 'bg-pink-50' : (isNight ? 'bg-slate-950' : 'bg-slate-50'))} ${isFullscreen ? 'bg-slate-950' : ''}`}>
      {/* Background Decorative Elements */}
      <div className={`fixed inset-0 pointer-events-none overflow-hidden print:hidden bg-gradient-to-br ${getBgGradient()} transition-colors duration-1000 transform-gpu z-0`}>
        <div className="absolute inset-0 opacity-40" />
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-white/10 blur-[60px] rounded-full transform-gpu" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-white/5 blur-[60px] rounded-full transform-gpu" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.01] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Mobile Header */}
      <div className={`
        ${isMobileView ? 'flex' : 'hidden'}
        ${theme.header} backdrop-blur-md p-4 items-center justify-between sticky top-0 z-50 print:hidden h-[72px] shadow-none transition-colors duration-1000
      `}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
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

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            initial={isMobileView ? { x: '-100%' } : false}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className={`
              ${isMobileView 
                ? 'fixed inset-y-0 left-0 z-[100] w-72' 
                : 'sticky top-0 h-screen w-64 shrink-0'}
              ${theme.sidebar} backdrop-blur-lg flex flex-col print:hidden shadow-none transition-colors duration-1000
              will-change-transform transform-gpu overflow-y-auto
            `}
          >
            <div className="h-full flex flex-col p-6">
              <div className={`
                flex items-center gap-3 mb-10 group cursor-default
              `}>
                <div className="w-11 h-11 bg-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <Mountain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`font-bold ${theme.text} leading-tight text-lg tracking-tight transition-colors duration-1000`}>WisVale</h1>
                </div>
              </div>

              <nav className="flex-1 space-y-3">
                {navItems.map((item) => {
                   const Icon = item.icon;
                   const isActive = location.pathname === item.path;
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
                                 : `${theme.card} backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]`}
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
                                 : `${theme.card} backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]`}
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

                {/* Fullscreen Toggle Button */}
                <button
                  onClick={toggleFullscreen}
                  className={`
                    w-full group flex items-center gap-3 px-5 py-4 rounded-[1.5rem] text-sm font-bold transition-all duration-500 relative overflow-hidden border
                    ${theme.card} backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]
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
                {/* View Mode Toggle */}
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

                <div className={`flex items-center gap-3 px-2 py-3 ${theme.mutedBg} rounded-2xl border ${theme.border} transition-colors duration-1000`}>
                  <div className={`w-10 h-10 rounded-full ${isNight ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-100 text-slate-600'} flex items-center justify-center font-bold border transition-colors duration-1000 shrink-0`}>
                    {user?.nickname ? user.nickname.slice(0, 2) : user?.studentId.slice(-2)}
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
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto print:p-0 ${isMobileView ? 'min-h-screen' : ''} ${isDesktopForced ? 'overflow-x-auto' : ''} relative z-10`}>
        <div className={`
          p-4 md:p-8 transition-all duration-1000
          ${isMobileView ? `max-w-[480px] mx-auto border-x ${theme.border} min-h-screen ${theme.mainBg} backdrop-blur-xl` : ''}
          ${isDesktopForced ? 'w-[1200px]' : 'max-w-7xl mx-auto'}
          print:max-w-none
        `}>
          {isDemoMode && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-bold">{t('layout.demoMode.title')}</p>
                <p>{t('layout.demoMode.desc')}</p>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMenuOpen && isMobileView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[90] will-change-[opacity,backdrop-filter]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
