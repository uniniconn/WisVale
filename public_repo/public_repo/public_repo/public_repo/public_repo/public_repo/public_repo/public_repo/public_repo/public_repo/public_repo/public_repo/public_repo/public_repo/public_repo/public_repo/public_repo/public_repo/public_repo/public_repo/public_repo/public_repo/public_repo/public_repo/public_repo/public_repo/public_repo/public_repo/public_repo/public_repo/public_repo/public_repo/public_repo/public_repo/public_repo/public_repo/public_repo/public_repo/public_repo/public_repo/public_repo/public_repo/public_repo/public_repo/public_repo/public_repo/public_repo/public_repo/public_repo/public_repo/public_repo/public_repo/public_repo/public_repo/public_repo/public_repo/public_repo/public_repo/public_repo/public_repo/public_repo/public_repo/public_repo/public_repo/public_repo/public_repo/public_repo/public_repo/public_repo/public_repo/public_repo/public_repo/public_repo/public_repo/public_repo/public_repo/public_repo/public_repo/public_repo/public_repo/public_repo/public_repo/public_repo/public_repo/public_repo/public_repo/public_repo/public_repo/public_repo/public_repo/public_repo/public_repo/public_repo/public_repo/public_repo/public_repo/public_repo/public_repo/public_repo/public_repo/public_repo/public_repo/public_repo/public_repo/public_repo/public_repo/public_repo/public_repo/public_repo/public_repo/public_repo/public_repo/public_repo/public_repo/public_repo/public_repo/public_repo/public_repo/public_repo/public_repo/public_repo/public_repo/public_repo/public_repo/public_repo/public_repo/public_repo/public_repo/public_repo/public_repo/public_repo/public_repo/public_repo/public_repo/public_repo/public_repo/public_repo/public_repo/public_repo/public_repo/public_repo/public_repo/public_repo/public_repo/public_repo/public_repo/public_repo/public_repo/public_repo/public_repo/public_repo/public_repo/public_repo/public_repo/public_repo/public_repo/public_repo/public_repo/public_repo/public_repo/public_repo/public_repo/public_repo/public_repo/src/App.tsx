import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, isDemoMode } from './firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UploadQuestion from './components/UploadQuestion';
import PaperGenerator from './components/PaperGenerator';
import AdminPanel from './components/AdminPanel';
import EditQuestion from './components/EditQuestion';
import Leaderboard from './components/Leaderboard';
import KnowledgeBase from './components/KnowledgeBase';
import KnowledgeLevelPage from './components/KnowledgeLevelPage';
import KnowledgeSummary from './components/KnowledgeSummary';
import QuestionDetail from './components/QuestionDetail';
import AnswerPage from './components/AnswerPage';
import Layout from './components/Layout';
import { User } from './types';
import { useTheme } from './hooks/useTheme';
import { LanguageProvider } from './contexts/LanguageContext';
import { Mountain, RefreshCw } from 'lucide-react';

export default function App() {
  const { theme, isNight, getBgGradient } = useTheme();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUser, setDemoUser] = useState<User | null>(null);

  useEffect(() => {
    document.title = 'WisVale';
  }, []);

  useEffect(() => {
    const checkDemoUser = () => {
      if (isDemoMode) {
        const savedUser = localStorage.getItem('demo_user');
        if (savedUser) {
          setDemoUser(JSON.parse(savedUser));
        } else {
          setDemoUser(null);
        }
        setLoading(false);
      }
    };

    if (isDemoMode) {
      checkDemoUser();
      window.addEventListener('storage', checkDemoUser);
      window.addEventListener('login-success', checkDemoUser);
      return () => {
        window.removeEventListener('storage', checkDemoUser);
        window.removeEventListener('login-success', checkDemoUser);
      };
    }

    let userDocUnsubscribe: (() => void) | null = null;

    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn("Firebase auth/firestore is taking too long. Forcing load to finish.");
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          if (userDocUnsubscribe) {
            userDocUnsubscribe();
          }
          // Use onSnapshot for real-time updates to user profile (e.g. role changes)
          userDocUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
            if (userDoc.exists()) {
              setUserData(userDoc.data() as User);
              setLoading(false);
              clearTimeout(timeoutId);
            } else {
              // If user exists in Auth but not in Firestore yet, we wait a bit longer
              // but eventually we must stop loading to show something
              setUserData(null);
              // Don't set loading(false) immediately if we just logged in
              // The timeout will handle the case where the document never appears
            }
          }, (err) => {
            console.error("Error fetching user data:", err);
            // If it's a permission error, it might be because the document doesn't exist yet
            // or the rules are still propagating. We'll set loading false but keep userData null.
            setLoading(false);
            clearTimeout(timeoutId);
          });
        } catch (err) {
          console.error("Error setting up user listener:", err);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } else {
        if (userDocUnsubscribe) {
          userDocUnsubscribe();
          userDocUnsubscribe = null;
        }
        setUserData(null);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
    };
  }, []);

  const effectiveUser = isDemoMode ? demoUser : userData;
  const isAuthenticated = isDemoMode ? !!demoUser : (!!user && !!userData);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-1000`}>
        {/* Background Decorative Elements */}
        <div className={`fixed inset-0 pointer-events-none overflow-hidden bg-gradient-to-br ${getBgGradient()} transition-colors duration-1000`}>
          <div className="absolute inset-0 backdrop-blur-[100px] opacity-60" />
          <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-white/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-white/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.02] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 p-8">
          <div className="relative">
            <div className="w-20 h-20 bg-green-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-green-500/20 animate-bounce">
              <Mountain className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -inset-4 bg-green-500/20 blur-2xl rounded-full -z-10 animate-pulse" />
          </div>

          <div className="text-center space-y-2">
            <h2 className={`text-2xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>WisVale</h2>
            <div className="flex items-center justify-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className={`${theme.subText} text-xs font-black uppercase tracking-[0.2em] animate-pulse`}>正在连接题库系统</span>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className={`mt-4 flex items-center gap-2 px-6 py-3 ${theme.card} backdrop-blur-xl border ${theme.border} rounded-2xl text-[10px] font-black ${theme.subText} hover:${theme.text} transition-all active:scale-95 group duration-1000`}
          >
            <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
            连接超时？点击刷新重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <Router>
        <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route
          path="/"
          element={isAuthenticated ? <Layout user={effectiveUser}><Dashboard user={effectiveUser} /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/upload"
          element={isAuthenticated ? <Layout user={effectiveUser}><UploadQuestion /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/generate"
          element={isAuthenticated ? <Layout user={effectiveUser}><PaperGenerator user={effectiveUser} /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/edit/:id"
          element={isAuthenticated ? <Layout user={effectiveUser}><EditQuestion user={effectiveUser} /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={isAuthenticated && effectiveUser?.role === 'admin' ? <Layout user={effectiveUser}><AdminPanel currentUser={effectiveUser} /></Layout> : <Navigate to="/" />}
        />
        <Route
          path="/leaderboard"
          element={isAuthenticated ? <Layout user={effectiveUser}><Leaderboard currentUser={effectiveUser} /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/knowledge"
          element={isAuthenticated ? <Layout user={effectiveUser}><KnowledgeBase /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/knowledge/level/:level"
          element={isAuthenticated ? <Layout user={effectiveUser}><KnowledgeLevelPage /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/knowledge/summary"
          element={isAuthenticated ? <Layout user={effectiveUser}><KnowledgeSummary /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/answer/:level"
          element={isAuthenticated ? <Layout user={effectiveUser}><AnswerPage /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/question/:id"
          element={isAuthenticated ? <Layout user={effectiveUser}><QuestionDetail user={effectiveUser} /></Layout> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
    </LanguageProvider>
  );
}

