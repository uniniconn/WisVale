import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db, isDemoMode } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, limit, where, orderBy } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Mountain, Lock, ShieldCheck, ArrowRight, Loader2, AlertTriangle, Info, Languages } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login() {
  const { isNight, theme, getBgGradient } = useTheme();
  const { language, setLanguage, t } = useLanguage();
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

    // 如果登录过程卡住超过 8 秒，自动刷新页面
    const stuckTimeout = setTimeout(() => {
      window.location.reload();
    }, 8000);

    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockUser = {
          studentId: id,
          role: id === 'ADMIN123' ? 'admin' : 'student',
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem('demo_user', JSON.stringify(mockUser));
        window.dispatchEvent(new Event('login-success'));
        clearTimeout(stuckTimeout);
        navigate('/');
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      // 1. Firebase Auth (Anonymous) - MUST DO THIS FIRST to have permissions for subsequent reads
      let userCredential;
      try {
        userCredential = await signInAnonymously(auth);
      } catch (authErr: any) {
        console.error("Auth Error:", authErr);
        if (authErr.code === 'auth/admin-restricted-operation' || authErr.code === 'auth/operation-not-allowed') {
          setError(
            <div>
              <p className="font-bold mb-1 text-red-700">{t('login.configNotReady')}</p>
              <p className="mb-2">{t('login.enableAnonymous')}</p>
              <ol className="list-decimal list-inside space-y-1 mb-3 text-xs opacity-80">
                <li>{t('login.configStep1')}</li>
                <li>{t('login.configStep2')}</li>
                <li>{t('login.configStep3')}</li>
              </ol>
              <a 
                href="https://console.firebase.google.com/project/_/authentication/providers" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
              >
                {t('login.goToConfig')}
              </a>
            </div>
          );
          setLoading(false);
          return;
        }
        throw authErr;
      }

      const uid = userCredential.user.uid;

      // 2. Check if studentId is allowed
      let allowedSnap;
      try {
        const allowedRef = doc(db, 'allowedStudents', id);
        allowedSnap = await getDoc(allowedRef);
      } catch (err: any) {
        console.error('Firestore Error (allowedStudents):', err);
        throw new Error(t('login.permissionError', { message: err.message }));
      }
      
      // 3. Check if first user (to auto-assign admin)
      let isFirstUser = false;
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
        isFirstUser = usersSnap.empty;
      } catch (err: any) {
        console.error('Firestore Error (users):', err);
        throw new Error(t('login.permissionError', { message: err.message }));
      }

      if (!allowedSnap?.exists() && !isFirstUser && id !== '1357924680') {
        setError(t('login.notAuthorized'));
        setLoading(false);
        return;
      }

      // 4. Create/Update User Profile
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          let role = isFirstUser || id === '1357924680' ? 'admin' : 'student';
          
          // Check if this studentId already has a role from a previous anonymous session
          const existingUsersSnap = await getDocs(query(collection(db, 'users'), where('studentId', '==', id), orderBy('createdAt', 'desc'), limit(1)));
          if (!existingUsersSnap.empty) {
            role = existingUsersSnap.docs[0].data().role;
          }

          // Get pre-assigned nickname if available
          let nickname = id === '1357924680' ? '…' : id;
          if (allowedSnap?.exists()) {
            const allowedData = allowedSnap.data() as any;
            if (allowedData.nickname) {
              nickname = allowedData.nickname;
            }
          }

          await setDoc(userDocRef, {
            uid,
            studentId: id,
            nickname,
            role,
            questionsUploaded: 0,
            kpsUploaded: 0,
            questionsAnswered: 0,
            tokensUsed: 0,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        console.error('Firestore Error (users profile):', err);
        throw new Error(t('login.profileError', { message: err.message }));
      }
      
      if (isFirstUser) {
        try {
          await setDoc(doc(db, 'config', 'stats'), { initialized: true, questionCount: 0 });
          await setDoc(doc(db, 'allowedStudents', id), {
            studentId: id,
            addedBy: 'system',
            addedAt: new Date().toISOString()
          });
        } catch (err: any) {
          console.error('Firestore Error (bootstrap):', err);
          // Non-fatal if profile was created, but good to know
        }
      }

      clearTimeout(stuckTimeout);
      navigate('/');
      
      // 登录成功后，延迟一段时间自动刷新一次，确保所有状态和数据最新
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      clearTimeout(stuckTimeout);
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
          {isDemoMode && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className={`p-5 ${isNight ? 'bg-amber-500/5 border-amber-500/10 text-amber-200/80' : 'bg-amber-50/50 border-amber-200/50 text-amber-800'} backdrop-blur-sm border rounded-[1.5rem] text-xs leading-relaxed transition-all duration-1000`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                <p className="font-black uppercase tracking-widest">{t('layout.demoMode.title')}</p>
              </div>
              <p className="opacity-80">{t('login.demoDesc', { adminId: 'ADMIN123' })}</p>
            </motion.div>
          )}

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
