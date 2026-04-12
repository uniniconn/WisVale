import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { db, auth, trackTokens } from '../firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { evaluateAnswerWithAI } from '../services/apiService';
import { KnowledgePoint } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';
import { Brain, ArrowLeft, Loader2, CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AnswerPage() {
  const { level } = useParams<{ level: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, isNight } = useTheme();
  const { t } = useLanguage();
  
  const [kps, setKps] = useState<KnowledgePoint[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState<{ pass: boolean; reason: string } | null>(null);
  const [redoneQuestions, setRedoneQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchKps = async () => {
      const params = new URLSearchParams(location.search);
      const idsParam = params.get('ids');
      if (!idsParam) {
        setLoading(false);
        return;
      }

      const ids = idsParam.split(',');
      const fetchedKps: KnowledgePoint[] = [];
      
      for (const id of ids) {
        const docRef = doc(db, 'knowledgePoints', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          fetchedKps.push({ ...docSnap.data(), id: docSnap.id } as KnowledgePoint);
        }
      }
      
      setKps(fetchedKps);
      setLoading(false);
    };

    fetchKps();
  }, [location.search]);

  const currentKp = kps[currentIndex];

  const handleSubmit = async () => {
    if (!answer.trim() || !currentKp) return;
    
    setEvaluating(true);
    try {
      const parsed = await evaluateAnswerWithAI(currentKp.title, currentKp.content, answer);
      setResult(parsed);
      
      if (parsed.usage?.total_tokens) {
        trackTokens(parsed.usage.total_tokens);
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      alert(t('answer.evalFail'));
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = async () => {
    if (!currentKp || !result) return;

    // Update level in Firestore
    try {
      let newLevel = 1;
      if (result.pass) {
        if (redoneQuestions.has(currentKp.id)) {
          newLevel = 1;
        } else {
          newLevel = Math.min(currentKp.level + 1, 4);
        }
      } else {
        newLevel = 1;
      }

      await updateDoc(doc(db, 'knowledgePoints', currentKp.id), {
        level: newLevel,
        mastered: newLevel === 4
      });
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          questionsAnswered: increment(1)
        });
      }
    } catch (err) {
      console.error("Error updating level:", err);
    }

    if (result.pass) {
      // Next question
      if (currentIndex < kps.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setAnswer('');
        setResult(null);
      } else {
        // Finished
        navigate(-1);
      }
    } else {
      // Redo this question
      setRedoneQuestions(prev => new Set(prev).add(currentKp.id));
      setAnswer('');
      setResult(null);
    }
  };

  const handleKeepLevelAndNext = () => {
    if (currentIndex < kps.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswer('');
      setResult(null);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (kps.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className={`${theme.text} font-bold`}>{t('answer.noKps')}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl">{t('common.back')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex items-center justify-between">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 px-4 py-2 ${theme.card} border ${theme.border} rounded-xl text-xs font-black ${theme.subText} hover:${theme.text} transition-all`}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </motion.button>
        <div className={`text-xs font-black ${theme.subText}`}>
          {t('answer.progress')}: {currentIndex + 1} / {kps.length}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`${theme.card} backdrop-blur-2xl rounded-[2.5rem] border ${theme.border} p-8 md:p-10 space-y-8`}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" />
              <h2 className={`text-sm font-black text-indigo-500 uppercase tracking-widest`}>{t('answer.title')}</h2>
            </div>
            <h1 className={`text-2xl md:text-3xl font-black ${theme.text}`}>{currentKp.title}</h1>
          </div>

          {!result ? (
            <div className="space-y-6">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t('answer.inputPlaceholder')}
                className={`w-full h-48 p-6 ${theme.input} rounded-2xl resize-none focus:ring-4 focus:ring-indigo-500/10 outline-none text-base transition-all`}
              />
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || evaluating}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {evaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : t('answer.submit')}
              </button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className={`p-6 rounded-2xl border ${result.pass ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-3 mb-4">
                  {result.pass ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-500" />
                  )}
                  <h3 className={`text-xl font-black ${result.pass ? 'text-green-500' : 'text-red-500'}`}>
                    {result.pass ? t('answer.pass') : t('answer.fail')}
                  </h3>
                </div>
                <p className={`text-sm font-medium ${theme.text} leading-relaxed`}>
                  {result.reason}
                </p>
              </div>

              <div className={`p-6 rounded-2xl ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border}`}>
                <h4 className={`text-xs font-black ${theme.subText} uppercase tracking-widest mb-2`}>{t('upload.explanation')}</h4>
                <p className={`text-sm font-medium ${theme.text} leading-relaxed`}>{currentKp.content}</p>
              </div>

              <div className="flex gap-4">
                {!result.pass && (
                  <button
                    onClick={handleKeepLevelAndNext}
                    className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {t('answer.keepLevel')}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className={`flex-1 py-4 ${result.pass ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-500 hover:bg-amber-600'} text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                >
                  {result.pass ? (
                    <>{t('answer.next')} <ArrowRight className="w-5 h-5" /></>
                  ) : (
                    <>{t('common.redo')} <RefreshCw className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
