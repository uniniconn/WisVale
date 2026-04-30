import { useState, useEffect } from 'react';
import { api, awardPoints } from '../lib/api';
import { Question } from '../types';
import { FileText, Printer, Eye, EyeOff, ChevronLeft, Download, Share2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

import { useLanguage } from '../contexts/LanguageContext';

export default function PaperGenerator({ user }: { user: any }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isNight, theme } = useTheme();
  const { t } = useLanguage();
  const selectedIds = searchParams.get('ids')?.split(',') || [];
  const initialTitle = searchParams.get('title') || 'WisVale 模拟试卷';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [paperMode, setPaperMode] = useState<'paper' | 'answer' | 'explanation'>('paper');
  const [paperTitle, setPaperTitle] = useState(initialTitle);

  useEffect(() => {
    if (selectedIds.length === 0) {
      navigate('/');
      return;
    }
    const fetchSelected = async () => {
      setLoading(true);
      try {
        const questionsData = await api.get('questions', undefined, { ids: selectedIds.join(',') });
        setQuestions(questionsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSelected();
  }, [searchParams]);

  const handlePrint = async () => {
    try {
      if (!user?.uid) return;
      // Award points to current user for printing
      await awardPoints(5, user.uid);
      
      // Award points to creators of selected questions (2 points per question)
      const creatorCounts: Record<string, number> = {};
      questions.forEach(q => {
        if (q.createdBy && q.createdBy !== user?.uid) {
          creatorCounts[q.createdBy] = (creatorCounts[q.createdBy] || 0) + 2;
        }
      });
      
      for (const [creatorUid, points] of Object.entries(creatorCounts)) {
        await awardPoints(points, creatorUid);
      }

      window.print();
    } catch (e) {
      console.error('Print failed:', e);
      alert(t('paper.printFail'));
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className={`min-h-screen ${isNight ? 'bg-slate-950/50' : 'bg-slate-50/50'} print:bg-white print:p-0 transition-colors duration-1000`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 print:hidden pt-10">
          <button 
            onClick={() => navigate('/')}
            className={`flex items-center gap-3 px-6 py-3 ${theme.card} rounded-2xl border ${theme.border} ${theme.subText} hover:${theme.text} font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 duration-1000`}
          >
            <ChevronLeft className="w-4 h-4" /> {t('paper.backToSetup')}
          </button>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className={`flex ${isNight ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-md p-1.5 rounded-2xl border ${theme.border} transition-colors duration-1000`}>
                {[
                  { id: 'paper', label: t('paper.mode.paper') },
                  { id: 'answer', label: t('paper.mode.answer') },
                  { id: 'explanation', label: t('paper.mode.explanation') }
                ].map(mode => (
                  <button 
                    key={mode.id}
                    onClick={() => setPaperMode(mode.id as any)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-1000 ${paperMode === mode.id ? 'bg-green-600 text-white' : theme.subText + ' hover:' + theme.text}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={openInNewTab}
                  className={`flex items-center gap-2 px-6 py-3 ${theme.card} ${theme.subText} border ${theme.border} rounded-2xl text-[10px] font-black uppercase tracking-widest hover:${theme.mutedBg} transition-all active:scale-95 duration-1000`}
                  title={t('paper.printTip')}
                >
                  <Share2 className="w-4 h-4" /> {t('paper.newTab')}
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" /> {t('paper.printBtn')}
                </button>
              </div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${isNight ? 'bg-slate-900/90 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-100'} border p-12 md:p-20 min-h-[1200px] print:border-none print:p-0 print-content rounded-[3rem] print:rounded-none relative transition-colors duration-1000`}
          >
            {/* Watermark for non-print */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] print:hidden overflow-hidden">
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-30deg] text-[120px] font-black whitespace-nowrap ${isNight ? 'text-white' : 'text-black'}`}>
                WisVale SYSTEM
              </div>
            </div>

            <div className="relative z-10">
              <div className={`text-center mb-16 border-b-4 print:border-none ${isNight ? 'border-slate-800' : 'border-slate-900'} pb-10 transition-colors duration-1000`}>
                <div className="flex items-center justify-center gap-4 mb-6 opacity-30 print:hidden">
                  <div className={`w-12 h-[1px] ${isNight ? 'bg-slate-100' : 'bg-slate-900'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${isNight ? 'text-slate-100' : 'text-slate-900'}`}>Internal Use Only</span>
                  <div className={`w-12 h-[1px] ${isNight ? 'bg-slate-100' : 'bg-slate-900'}`} />
                </div>
                
                <h1 className={`text-4xl md:text-5xl font-serif font-black ${isNight ? 'text-slate-100' : 'text-slate-900'} mb-6 tracking-tight transition-colors duration-1000`}>
                  {paperTitle} 
                </h1>
                
                <div className={`inline-flex items-center gap-3 px-6 py-2 ${isNight ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'} rounded-full text-[10px] font-black uppercase tracking-widest mb-10 transition-colors duration-1000 print:hidden`}>
                  {paperMode === 'explanation' ? t('paper.mode.explanation') : paperMode === 'answer' ? t('paper.mode.answer') : t('paper.mode.paper')}
                </div>

                <div className={`flex justify-center gap-12 text-xs font-black ${isNight ? 'text-slate-300' : 'text-slate-900'} uppercase tracking-widest transition-colors duration-1000 print:hidden`}>
                  <div className="flex flex-col gap-1 items-center">
                    <span>{questions.length} {t('paper.total')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8 print:space-y-4">
                {questions.map((q, index) => (
                  <div key={q.id} className={`relative group break-inside-avoid border-b ${isNight ? 'border-slate-800/50' : 'border-slate-50'} pb-12 print:pb-4 last:border-0 transition-colors duration-1000`}>
                    <div className="flex gap-4 md:gap-8 print:gap-4">
                      <span className={`font-serif text-xl print:text-sm ${isNight ? 'text-slate-200' : 'text-slate-900'} transition-colors duration-1000`}>
                        {index + 1}.
                      </span>
                      <div className="flex-1 space-y-6 print:space-y-2">
                        {paperMode === 'paper' ? (
                          <>
                            <div className={`text-xl print:text-sm ${isNight ? 'text-slate-200' : 'text-slate-900'} leading-[1.8] print:leading-[1.4] whitespace-pre-wrap font-serif transition-colors duration-1000`}>
                              <span className="mr-2">[{q.id}]</span>
                              {q.content || t('paper.noContent')}
                            </div>
                            
                            {q.imageUrl && (
                              <div className={`rounded-2xl overflow-hidden border ${isNight ? 'border-slate-800' : 'border-slate-100'} transition-colors duration-1000 max-w-2xl`}>
                                <img 
                                  src={q.imageUrl} 
                                  alt="Question Supplementary" 
                                  className={`max-h-[600px] w-full object-contain ${isNight ? 'bg-slate-950 invert-[0.85] hue-rotate-180 brightness-110 contrast-110' : 'bg-slate-50'} transition-all duration-1000`} 
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className={`text-xl print:text-sm ${isNight ? 'text-slate-200' : 'text-slate-900'} leading-[1.8] print:leading-[1.4] whitespace-pre-wrap font-serif transition-colors duration-1000`}>
                            <span className="mr-2">[{q.id}]</span>
                            {paperMode === 'answer' ? (q.answer || t('paper.noAnswer')) : (q.explanation || t('paper.noExplanation'))}
                          </div>
                        )}

                        <div className={`flex items-center gap-4 text-[10px] print:text-[8px] font-bold ${isNight ? 'text-slate-600' : 'text-slate-300'} uppercase tracking-widest transition-colors duration-1000`}>
                          <span>{t('upload.source')}: {t(`enum.source.${q.source}`)} {q.sourceDetail ? `| ${q.sourceDetail}` : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-32 text-center print:hidden">
                <div className={`w-20 h-1 ${isNight ? 'bg-slate-100' : 'bg-slate-900'} mx-auto mb-8 rounded-full opacity-10 transition-colors duration-1000`} />
                <p className={`text-[10px] font-black ${isNight ? 'text-slate-700' : 'text-slate-300'} uppercase tracking-[0.4em] transition-colors duration-1000`}>
                  © WisVale {t('paper.internalUse')}
                </p>
              </div>
            </div>
          </motion.div>
          
          <div className={`mt-12 text-center ${theme.subText} text-[10px] font-black uppercase tracking-widest print:hidden transition-colors duration-1000`}>
            {t('paper.printTip')}
          </div>
        </div>
      </div>
    );
}
