import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { 
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useViewMode } from '../hooks/useViewMode';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export default function Layout({ children, user }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { viewMode, isMobileView, isDesktopForced } = useViewMode();
  const { timePeriod, isNight, isArtMode, customBgUrl, bgBlur, theme, getBgGradient } = useTheme();
  const { t } = useLanguage();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(user?.nickname || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (isMobileView && isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileView, isMenuOpen]);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 1500);
    return () => clearTimeout(timer);
  }, [timePeriod]);

  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    setNewNickname(user?.nickname || '');
  }, [user?.nickname]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Fullscreen error: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, []);

  const handleUpdateNickname = async () => {
    if (!user || !newNickname.trim() || newNickname === user.nickname) {
      setIsEditingNickname(false);
      return;
    }

    try {
      await api.put('users', user.uid, {
        nickname: newNickname.trim()
      });
      setIsEditingNickname(false);
      // Wait for re-fetch or reload
      window.location.reload();
    } catch (err) {
      console.error("Error updating nickname:", err);
      alert(t('layout.updateNicknameFail'));
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`
      min-h-screen flex ${isMobileView ? 'flex-col' : 'flex-row'} relative 
      ${isDesktopForced ? 'overflow-x-auto' : 'overflow-x-hidden'} 
      transition-all duration-1000 
      ${theme.bg}
      ${isFullscreen ? 'bg-slate-950' : ''} 
    `}
      style={{
        ...(customBgUrl ? { 
          backgroundImage: `url(${customBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        } : {}),
        '--sidebar-width': isMobileView ? '0px' : '256px'
      } as any}>
      
      {/* Background Decorative Elements */}
      {isArtMode && (
        <div className={`oil-texture ${isNight ? 'texture-thick' : 'texture-thin'}`} />
      )}
      
      <div className={`fixed inset-0 pointer-events-none overflow-hidden print:hidden bg-gradient-to-br ${getBgGradient()} transition-all duration-[3000ms] transform-gpu z-0 ${isTransitioning && customBgUrl ? 'blur-xl' : ''}`}
           style={customBgUrl ? { backdropFilter: `blur(${bgBlur}px)` } : {}}>
        <div className="absolute inset-0 opacity-40" />
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-white/10 blur-[60px] rounded-full transform-gpu" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-white/5 blur-[60px] rounded-full transform-gpu" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.01] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <MobileHeader 
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        isMobileView={isMobileView}
      />

      <Sidebar 
        user={user}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        isMobileView={isMobileView}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        handleLogout={handleLogout}
        handleUpdateNickname={handleUpdateNickname}
        isEditingNickname={isEditingNickname}
        setIsEditingNickname={setIsEditingNickname}
        newNickname={newNickname}
        setNewNickname={setNewNickname}
      />

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto print:p-0 ${isMobileView ? 'min-h-screen' : ''} ${isDesktopForced ? 'overflow-x-auto' : ''} relative z-10 min-w-0`}>
        <div className={`
          p-4 md:p-8 transition-all duration-500
          ${isMobileView ? `max-w-[480px] mx-auto border-x ${theme.border} min-h-screen ${theme.mainBg} backdrop-blur-xl` : ''}
          ${isDesktopForced ? 'w-[1200px]' : 'max-w-7xl mx-auto'}
          backdrop-blur-xl
          print:max-w-none
          ${isArtMode ? 'canvas-border' : ''}
        `}>
          {isArtMode && (
            <div className="absolute inset-0 pointer-events-none opacity-10 animate-shader" />
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
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
            className="fixed inset-0 bg-slate-900/60 z-[90] will-change-opacity"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
