import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Question, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useViewMode } from '../hooks/useViewMode';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ArrowLeft, 
  Brain, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  User as UserIcon,
  Tag,
  Edit2,
  Trash2,
  X,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';

export default function QuestionDetail({ user }: { user: User | null }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, isNight } = useTheme();
  const { isMobileView } = useViewMode();
  const { t } = useLanguage();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!id) return;
      try {
        const questionsData = await api.get('questions', undefined, { id: id });
        if (questionsData && questionsData.length > 0) {
          setQuestion(questionsData[0]);
        }
      } catch (err) {
        console.error("Error fetching question:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 space-y-4">
        <h2 className={`text-2xl font-black ${theme.text}`}>{t('detail.notFound')}</h2>
        <button onClick={() => navigate('/')} className="text-green-600 font-bold">{t('detail.backToBank')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex items-center justify-between">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 px-4 py-2 ${theme.card} border ${theme.border} rounded-xl text-xs font-black ${theme.subText} hover:${theme.text} transition-all`}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('detail.back')}
        </motion.button>

        {(user?.role === 'admin' || user?.studentId === question.creatorStudentId) && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(`/edit/${question.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 transition-all shadow-lg shadow-green-500/20"
          >
            <Edit2 className="w-4 h-4" />
            {t('detail.edit')}
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} overflow-hidden`}
          >
            <div className="p-8 md:p-12 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-green-500 rounded-full"></div>
                  <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{t('detail.content')}</h3>
                </div>
                <div className={`p-8 rounded-[2rem] ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border} text-lg leading-relaxed ${theme.text} font-medium whitespace-pre-wrap`}>
                  {question.content}
                </div>
              </div>

              {question.imageUrl && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
                    <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{t('detail.image')}</h3>
                  </div>
                  <div className={`p-4 rounded-[2rem] ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border} overflow-hidden`}>
                    <img 
                      src={question.imageUrl} 
                      alt="Question" 
                      referrerPolicy="no-referrer"
                      className="w-full h-auto rounded-2xl"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-orange-500 rounded-full"></div>
                    <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{t('detail.answer')}</h3>
                  </div>
                  <div className={`p-6 rounded-3xl ${isNight ? 'bg-orange-500/10' : 'bg-orange-50'} border border-orange-500/20 text-xl font-black text-orange-600`}>
                    {question.answer || t('detail.noAnswer')}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
                    <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{t('detail.explanation')}</h3>
                  </div>
                  <div className={`p-6 rounded-3xl ${isNight ? 'bg-blue-500/10' : 'bg-blue-50'} border border-blue-500/20 text-sm leading-relaxed ${theme.text} font-medium`}>
                    {question.explanation || t('detail.noExplanation')}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {question.knowledgePoints && question.knowledgePoints.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-green-500 rounded-full"></div>
                  <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{t('detail.aiKps')}</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {question.knowledgePoints.map((kp, idx) => (
                  <div key={idx} className={`p-5 rounded-3xl border ${isNight ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} flex justify-between items-center group/kp`}>
                    <div>
                      <p className={`text-sm font-black ${theme.text}`}>{kp.title}</p>
                      <p className={`text-xs font-bold ${theme.subText} mt-1`}>{t('upload.answer')}: {kp.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-10">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} p-10 space-y-10`}
          >
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-purple-500 rounded-full"></div>
                <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{t('detail.categoryInfo')}</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: t('dashboard.filter.field'), value: Array.isArray(question.field) ? question.field.map(f => t(`enum.field.${f}`)).join(', ') : t(`enum.field.${question.field}`), color: 'green' },
                  { label: t('dashboard.filter.type'), value: t(`enum.type.${question.type}`), color: 'blue' },
                  { label: t('dashboard.filter.difficulty'), value: Array.isArray(question.difficulty) ? question.difficulty.map(d => t(`enum.difficulty.${d}`)).join(', ') : t(`enum.difficulty.${question.difficulty}`), color: 'orange' },
                  { label: t('dashboard.filter.source'), value: t(`enum.source.${question.source}`), color: 'purple' },
                  { label: t('edit.sourceDetailLabel'), value: question.sourceDetail, color: 'indigo' }
                ].map(item => (
                  <div key={item.label} className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                    <div className={`px-4 py-3 rounded-2xl ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border} text-xs font-bold ${theme.text}`}>
                      {item.value || t('detail.notSet')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-pink-500 rounded-full"></div>
                <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{t('detail.metadata')}</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest`}>{t('detail.uploader')}</p>
                    <p className={`text-xs font-bold ${theme.text}`}>{question.creatorNickname || t('detail.unknownUser')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest`}>{t('detail.uploadTime')}</p>
                    <p className={`text-xs font-bold ${theme.text}`}>{new Date(question.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
