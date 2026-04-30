import { useState, useEffect, useMemo } from 'react';
import { api, trackTokens } from '../lib/api';
import { generateKnowledgeSummaryWithAI } from '../services/apiService';
import { KnowledgePoint, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Brain, 
  BarChart3, 
  Zap, 
  Loader2,
  Sparkles,
  PieChart as PieIcon,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Markdown from 'react-markdown';

export default function KnowledgeSummary({ user }: { user: User | null }) {
  const { theme, isNight } = useTheme();
  const { t } = useLanguage();
  const [kps, setKps] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user?.studentId) return;

    const fetchData = async () => {
      try {
        const data = await api.get('knowledgePoints', undefined, { 
          studentId: user.studentId
        });
        setKps(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching KPs for summary:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user?.studentId]);

  const summaryData = useMemo(() => {
    const fields: Record<string, number> = {};
    kps.forEach(kp => {
      fields[kp.field] = (fields[kp.field] || 0) + 1;
    });
    return Object.entries(fields).map(([name, value]) => ({ name: t(`enum.field.${name}`), value }));
  }, [kps, t]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

  const generateAiSummary = async () => {
    if (kps.length === 0 || !user?.uid) return;
    setIsGenerating(true);
    try {
      const data = await generateKnowledgeSummaryWithAI(kps.map(k => ({ title: k.title, field: k.field, level: k.level })));
      setAiSummary(data.summary);
      if (data.usage?.total_tokens) {
        trackTokens(data.usage.total_tokens, user.uid);
      }
    } catch (err) {
      console.error('AI Summary generation failed:', err);
      setAiSummary(t('kb.summary.ai.networkError'));
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // AI summary is now manually triggered via the refresh button
  }, [loading, kps.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">
          <div className="w-8 h-[2px] bg-green-600/30 rounded-full" />
          <span>{t('kb.tab.summary')} · LEARNING INSIGHTS</span>
        </div>
        <h1 className={`text-4xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{t('kb.tab.summary')}</h1>
        <p className={`${theme.subText} font-medium transition-colors duration-1000`}>{t('kb.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className={`lg:col-span-2 ${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} p-10 space-y-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-green-600" />
              <h2 className={`text-2xl font-black ${theme.text} tracking-tight`}>{t('kb.aiAnalysis')}</h2>
            </div>
            <button 
              onClick={generateAiSummary}
              disabled={isGenerating}
              className={`p-3 rounded-2xl ${theme.card} border ${theme.border} hover:text-green-600 transition-all active:scale-95 disabled:opacity-50`}
            >
              <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className={`p-8 rounded-[2.5rem] ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border} min-h-[300px]`}>
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                <p className={`text-sm font-black ${theme.subText} uppercase tracking-widest animate-pulse`}>{t('kb.summary.ai.loading')}</p>
              </div>
            ) : aiSummary ? (
              <div className={`prose prose-sm max-w-none ${isNight ? 'prose-invert' : ''} font-medium leading-relaxed`}>
                <Markdown>{aiSummary}</Markdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                <Brain className="w-12 h-12 text-slate-300" />
                <p className={`${theme.subText} font-bold`}>{t('kb.summary.ai.placeholder')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-10">
          <div className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} p-10 space-y-10`}>
            <div className="flex items-center gap-3">
              <PieIcon className="w-6 h-6 text-green-600" />
              <h2 className={`text-xl font-black ${theme.text} tracking-tight`}>{t('kb.distribution')}</h2>
            </div>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summaryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {summaryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isNight ? '#0f172a' : '#ffffff',
                      borderRadius: '1rem',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <div className={`p-6 rounded-3xl ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border} space-y-4`}>
                <p className={`text-sm font-medium ${theme.text} leading-relaxed`}>
                  {t('kb.summary.total', { count: kps.length })}
                  {t('kb.summary.mastered', { count: kps.filter(k => k.level === 4).length })}
                </p>
              </div>
            </div>
          </div>

          <div className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} p-10 space-y-4`}>
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className={`text-xl font-black ${theme.text} tracking-tight`}>{t('kb.suggestion')}</h3>
            <p className={`text-sm font-medium ${theme.subText} leading-relaxed`}>
              {kps.filter(k => k.level === 1).length > 5 
                ? t('kb.summary.suggestion.improve', { count: kps.filter(k => k.level === 1).length })
                : t('kb.summary.suggestion.good')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
