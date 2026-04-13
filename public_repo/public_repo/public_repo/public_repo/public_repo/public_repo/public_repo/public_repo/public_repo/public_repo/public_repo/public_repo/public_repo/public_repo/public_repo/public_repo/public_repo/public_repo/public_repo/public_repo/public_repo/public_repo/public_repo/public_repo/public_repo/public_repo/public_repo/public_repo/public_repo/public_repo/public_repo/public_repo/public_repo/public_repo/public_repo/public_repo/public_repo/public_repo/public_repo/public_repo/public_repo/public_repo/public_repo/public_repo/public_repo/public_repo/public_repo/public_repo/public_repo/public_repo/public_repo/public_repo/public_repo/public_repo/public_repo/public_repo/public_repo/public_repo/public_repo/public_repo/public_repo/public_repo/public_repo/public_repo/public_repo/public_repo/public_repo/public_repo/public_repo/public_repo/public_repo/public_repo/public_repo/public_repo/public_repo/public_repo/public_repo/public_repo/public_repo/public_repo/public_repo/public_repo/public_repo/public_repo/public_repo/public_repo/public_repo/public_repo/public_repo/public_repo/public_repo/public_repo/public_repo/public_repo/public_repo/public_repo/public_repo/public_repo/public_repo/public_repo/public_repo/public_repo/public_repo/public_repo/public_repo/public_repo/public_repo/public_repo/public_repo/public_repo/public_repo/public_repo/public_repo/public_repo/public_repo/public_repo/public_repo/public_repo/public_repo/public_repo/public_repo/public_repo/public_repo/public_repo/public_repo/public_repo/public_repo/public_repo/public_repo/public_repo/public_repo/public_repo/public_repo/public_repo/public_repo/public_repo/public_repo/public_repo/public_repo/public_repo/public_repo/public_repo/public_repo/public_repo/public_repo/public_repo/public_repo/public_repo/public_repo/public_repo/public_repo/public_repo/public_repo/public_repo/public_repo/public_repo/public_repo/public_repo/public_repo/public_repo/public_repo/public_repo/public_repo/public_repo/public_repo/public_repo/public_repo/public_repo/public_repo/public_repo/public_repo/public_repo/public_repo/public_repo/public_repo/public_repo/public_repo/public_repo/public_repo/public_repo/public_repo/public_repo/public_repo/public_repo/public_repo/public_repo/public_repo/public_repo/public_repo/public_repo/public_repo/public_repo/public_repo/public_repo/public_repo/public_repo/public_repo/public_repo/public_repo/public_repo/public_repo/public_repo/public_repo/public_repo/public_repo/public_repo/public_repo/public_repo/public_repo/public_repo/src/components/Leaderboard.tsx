import { useState, useEffect } from 'react';
import { db, isDemoMode } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { User } from '../types';
import { Trophy, Medal, Crown, Star, TrendingUp, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';

const MOCK_LEADERBOARD: User[] = [
  { uid: '1', studentId: '2024001', role: 'student', points: 450, createdAt: '' },
  { uid: '2', studentId: '2024005', role: 'student', points: 380, createdAt: '' },
  { uid: '3', studentId: '2024012', role: 'student', points: 310, createdAt: '' },
  { uid: '4', studentId: '2024008', role: 'student', points: 290, createdAt: '' },
  { uid: '5', studentId: '2024015', role: 'student', points: 250, createdAt: '' },
];

export default function Leaderboard({ currentUser }: { currentUser: User | null }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'questionsUploaded' | 'kpsUploaded' | 'questionsAnswered' | 'tokensUsed'>('questionsUploaded');
  const { isNight, theme } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    if (isDemoMode) {
      setUsers(MOCK_LEADERBOARD);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users'),
      orderBy(activeTab, 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leaderboardData = snapshot.docs.map(doc => ({
        ...doc.data()
      } as User));
      
      // Deduplicate by studentId
      const uniqueUsers: User[] = [];
      const seenIds = new Set<string>();
      for (const u of leaderboardData) {
        if (u.studentId && !seenIds.has(u.studentId)) {
          seenIds.add(u.studentId);
          uniqueUsers.push(u);
        }
      }
      
      setUsers(uniqueUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-slate-400" />;
      case 2: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-lg font-black text-slate-300">#{index + 1}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">
          <div className="w-8 h-[2px] bg-green-600/30 rounded-full" />
          <span>{t('leaderboard.title')} · LEADERBOARD</span>
        </div>
        <h1 className={`text-4xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{t('leaderboard.title')}</h1>
        <p className={`${theme.subText} font-medium transition-colors duration-1000`}>{t('leaderboard.subtitle')}</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'questionsUploaded', label: t('leaderboard.tab.questions') },
          { id: 'kpsUploaded', label: t('leaderboard.tab.kps') },
          { id: 'questionsAnswered', label: t('leaderboard.tab.answers') },
          { id: 'tokensUsed', label: t('leaderboard.tab.tokens') }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : `${theme.card} ${theme.subText} hover:${theme.text} border ${theme.border}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top 3 Cards */}
        <AnimatePresence mode="popLayout">
          {users.slice(0, 3).map((user, index) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-8 rounded-[3rem] border flex flex-col items-center text-center space-y-4 transition-all duration-1000 transform-gpu will-change-transform
                ${index === 0 ? 'bg-slate-900 text-white border-slate-800 scale-110 z-10' : `${theme.card} backdrop-blur-xl`}
              `}
            >
              <div className={`
                w-20 h-20 rounded-[2rem] flex items-center justify-center mb-2 transition-colors duration-1000
                ${index === 0 ? 'bg-yellow-500' : (isNight ? 'bg-slate-800' : 'bg-slate-100')}
              `}>
                {index === 0 ? <Crown className="w-10 h-10 text-slate-900" /> : 
                 index === 1 ? <Medal className="w-10 h-10 text-slate-400" /> :
                 <Medal className="w-10 h-10 text-amber-600" />}
              </div>
              <div>
                <h3 className={`text-xl font-black tracking-tight ${index === 0 ? 'text-white' : theme.text} transition-colors duration-1000`}>
                  {user.nickname || t('leaderboard.anonymous')}
                </h3>
                <p className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-1000 ${index === 0 ? 'text-slate-400' : theme.subText}`}>
                  {index === 0 ? t('leaderboard.champion') : index === 1 ? t('leaderboard.runnerUp') : t('leaderboard.thirdPlace')}
                </p>
              </div>
              <div className={`px-6 py-2 rounded-2xl font-black text-lg transition-colors duration-1000 ${index === 0 ? 'bg-white/10 text-yellow-500' : theme.mutedBg + ' ' + theme.text}`}>
                {user[activeTab as keyof User] || 0} <span className="text-xs opacity-60 ml-1">
                  {activeTab === 'questionsUploaded' ? t('leaderboard.unit.question') : 
                   activeTab === 'kpsUploaded' ? t('leaderboard.unit.kp') : 
                   activeTab === 'questionsAnswered' ? t('leaderboard.unit.answer') : t('leaderboard.unit.token')}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border transition-all duration-1000 overflow-hidden`}>
        <div className={`p-8 border-b ${theme.border} flex items-center justify-between transition-colors duration-1000`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 ${isNight ? 'bg-green-500/20' : 'bg-green-50'} rounded-xl flex items-center justify-center transition-colors duration-1000`}>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h2 className={`text-lg font-black ${theme.text} transition-colors duration-1000`}>{t('leaderboard.fullList')}</h2>
          </div>
          <div className={`flex items-center gap-2 ${theme.subText} text-xs font-bold transition-colors duration-1000`}>
            <Users className="w-4 h-4" />
            <span>{t('leaderboard.activeUsers', { count: users.length })}</span>
          </div>
        </div>

        <div className={`divide-y ${isNight ? 'divide-slate-800/50' : 'divide-slate-100/50'} transition-colors duration-1000`}>
          {users.map((user, index) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center justify-between p-6 hover:bg-white/10 transition-colors duration-1000
                ${currentUser?.uid === user.uid ? (isNight ? 'bg-green-500/10' : 'bg-green-50/50') : ''}
              `}
            >
              <div className="flex items-center gap-6">
                <div className="w-12 flex justify-center">
                  {getRankIcon(index)}
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${isNight ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'} rounded-xl flex items-center justify-center font-black text-xs transition-colors duration-1000`}>
                    {user.nickname ? user.nickname.substring(0, 1) : '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-black ${theme.text} transition-colors duration-1000`}>
                        {user.nickname || t('leaderboard.anonymous')}
                      </span>
                      {currentUser?.uid === user.uid && (
                        <span className="px-2 py-0.5 bg-green-600 text-white text-[8px] font-black rounded-full uppercase tracking-widest">YOU</span>
                      )}
                    </div>
                    <p className={`text-[10px] font-bold ${theme.subText} uppercase tracking-widest transition-colors duration-1000`}>
                      {user.role === 'admin' ? t('leaderboard.role.admin') : t('leaderboard.role.student')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-black ${theme.text} transition-colors duration-1000`}>{user[activeTab as keyof User] || 0}</div>
                <div className={`text-[10px] font-black ${isNight ? 'text-slate-600' : 'text-slate-300'} uppercase tracking-widest transition-colors duration-1000`}>
                  {activeTab === 'questionsUploaded' ? t('leaderboard.label.questions') : 
                   activeTab === 'kpsUploaded' ? t('leaderboard.label.kps') : 
                   activeTab === 'questionsAnswered' ? t('leaderboard.label.answers') : t('leaderboard.label.tokens')}
                </div>
              </div>
            </motion.div>
          ))}
          
          {users.length === 0 && !loading && (
            <div className="p-20 text-center space-y-4">
              <div className={`w-20 h-20 ${isNight ? 'bg-slate-900' : 'bg-slate-50'} rounded-[2rem] flex items-center justify-center mx-auto transition-colors duration-1000`}>
                <Star className={`w-10 h-10 ${isNight ? 'text-slate-800' : 'text-slate-200'} transition-colors duration-1000`} />
              </div>
              <p className={`${theme.subText} font-bold transition-colors duration-1000`}>{t('leaderboard.noData')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Points Rule Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-10 rounded-[3rem] ${theme.card} backdrop-blur-2xl border ${theme.border} relative overflow-hidden group transition-all duration-1000`}>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          <Trophy className="w-12 h-12 mb-6 opacity-50 text-green-600" />
          <h3 className={`text-2xl font-black mb-4 ${theme.text} transition-colors duration-1000`}>{t('leaderboard.howToEarn')}</h3>
          <ul className={`space-y-4 text-sm font-bold ${theme.subText} transition-colors duration-1000`}>
            <li className="flex items-center gap-3">
              <div className={`w-6 h-6 ${isNight ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg flex items-center justify-center text-xs text-green-600 transition-colors duration-1000`}>+10</div>
              {t('leaderboard.earn.upload')}
            </li>
            <li className="flex items-center gap-3">
              <div className={`w-6 h-6 ${isNight ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg flex items-center justify-center text-xs text-green-600 transition-colors duration-1000`}>+2</div>
              {t('leaderboard.earn.selected')}
            </li>
            <li className="flex items-center gap-3">
              <div className={`w-6 h-6 ${isNight ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg flex items-center justify-center text-xs text-green-600 transition-colors duration-1000`}>+5</div>
              {t('leaderboard.earn.generate')}
            </li>
          </ul>
        </div>

        <div className={`p-10 rounded-[3rem] ${theme.card} backdrop-blur-2xl border ${theme.border} relative overflow-hidden group transition-all duration-1000`}>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
          <Star className="w-12 h-12 mb-6 opacity-50 text-yellow-500" />
          <h3 className={`text-2xl font-black mb-4 ${theme.text} transition-colors duration-1000`}>{t('leaderboard.whatIsPoints')}</h3>
          <p className={`text-sm font-bold ${theme.subText} leading-relaxed transition-colors duration-1000`}>
            {t('leaderboard.pointsDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
