import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mountain, Lock, ShieldCheck, ArrowRight, Loader2, AlertTriangle, Info, Languages } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { isNight, theme, getBgGradient } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | React.ReactNode>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = studentId.trim();
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      await login(id); // Using the mock login which creates a user via the backend
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('login.loginFail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-all duration-1000 bg-gradient-to-br ${getBgGradient()}`}>
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-[10%] -left-[10%] w-[50%] h-[50%] ${isNight ? 'bg-indigo-500/10' : 'bg-green-200/30'} blur-[120px] rounded-full animate-pulse transition-colors duration-1000`} />
        <div className={`absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] ${isNight ? 'bg-slate-800/20' : 'bg-blue-200/30'} blur-[120px] rounded-full animate-pulse transition-colors duration-1000`} style={{ animationDelay: '2s' }} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full ${isNight ? 'opacity-[0.01]' : 'opacity-[0.03]'} pointer-events-none transition-opacity duration-1000`} 
             style={{ backgroundImage: `radial-gradient(${isNight ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className={`max-w-md w-full ${theme.card} backdrop-blur-2xl rounded-[3rem] p-10 border ${theme.border} relative z-10 transition-all duration-1000`}
      >
        <div className="absolute top-8 right-8">
          <button
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${theme.card} border ${theme.border} text-[10px] font-black ${theme.subText} hover:${theme.text} transition-all active:scale-95`}
          >
            <Languages className="w-3 h-3" />
            {language === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, damping: 15 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-[2rem] mb-6 group hover:rotate-12 transition-transform duration-500"
          >
            <Mountain className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className={`text-4xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{t('login.title')}</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <label htmlFor="studentId" className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>
              {t('login.studentId')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className={`h-5 w-5 ${isNight ? 'text-slate-600' : 'text-slate-300'} group-focus-within:text-green-500 transition-colors duration-1000`} />
              </div>
              <input
                type="text"
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={`block w-full pl-12 pr-4 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none transition-all duration-1000 text-sm font-bold`}
                placeholder={t('login.idPlaceholder')}
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`p-5 ${isNight ? 'bg-red-500/5 border-red-500/10 text-red-400' : 'bg-red-50/50 border-red-100/50 text-red-600'} backdrop-blur-sm text-xs font-bold rounded-[1.5rem] border flex items-start gap-3 transition-all duration-1000`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl text-sm font-black text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95 group"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>
                {t('login.login')} 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex justify-center">
          <a
            href="https://docs.qq.com/doc/DT2RjeWpkZnpVWHNk"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs font-bold ${theme.subText} hover:text-green-600 transition-colors duration-300 flex items-center gap-1`}
          >
            <Info className="w-4 h-4" />
            {t('login.help')}
          </a>
        </div>

        <div className={`mt-8 pt-8 border-t ${theme.border} flex items-center justify-center gap-2 text-[10px] font-black ${theme.subText} uppercase tracking-widest transition-all duration-1000`}>
          <ShieldCheck className="w-4 h-4" />
          <span>{t('login.authorizedOnly')}</span>
        </div>
      </motion.div>
    </div>
  );
}
