import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { KnowledgePoint, QuestionField, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useViewMode } from '../hooks/useViewMode';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Brain, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Zap, 
  Trash2, 
  Plus, 
  FileDown, 
  BarChart3, 
  Search, 
  Filter,
  ArrowRight,
  Loader2,
  Sparkles,
  PieChart as PieIcon,
  AlertTriangle,
  X,
  Share2,
  Check,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import { generateKnowledgeSummaryWithAI } from '../services/apiService';
import Markdown from 'react-markdown';

export default function KnowledgeBase({ user }: { user: User | null }) {
  const { theme, isNight } = useTheme();
  const { isMobileView } = useViewMode();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [kps, setKps] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'1' | '2' | '3' | 'mastered' | 'summary'>('1');
  const [filterField, setFilterField] = useState<QuestionField | '全部'>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchQuestionIds, setBatchQuestionIds] = useState('');
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'success';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['1', '2', '3', 'mastered', 'summary'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [location.search]);

  useEffect(() => {
    if (!user?.studentId) return;

    const fetchKps = async () => {
      try {
        const data = await api.get('knowledgePoints', undefined, { studentId: user.studentId });
        setKps(data);
      } catch (err) {
        console.error("Error fetching knowledge points:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchKps();
    const interval = setInterval(fetchKps, 15000); // Poll every 15s

    return () => clearInterval(interval);
  }, [user?.studentId]);

  const filteredKps = useMemo(() => {
    return kps.filter(kp => {
      const matchesTab = activeTab === 'mastered' ? kp.level === 4 : kp.level.toString() === activeTab;
      const matchesField = filterField === '全部' || kp.field === filterField;
      const matchesSearch = kp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           kp.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesField && matchesSearch;
    });
  }, [kps, activeTab, filterField, searchQuery]);

  const handleLevelUp = async (kp: KnowledgePoint) => {
    if (kp.level >= 4) return;
    const nextLevel = (kp.level + 1) as 1 | 2 | 3 | 4;
    try {
      await api.put('knowledgePoints', kp.id, {
        level: nextLevel,
        mastered: nextLevel === 4
      });
      setKps(prev => prev.map(item => item.id === kp.id ? { ...item, level: nextLevel, mastered: nextLevel === 4 } : item));
    } catch (err) {
      console.error('Error leveling up:', err);
    }
  };

  const handleMaster = async (kp: KnowledgePoint) => {
    setConfirmModal({
      show: true,
      title: t('common.confirm'),
      message: t('kb.masterConfirm'),
      type: 'success',
      onConfirm: async () => {
        try {
          await api.put('knowledgePoints', kp.id, {
            level: 4,
            mastered: true
          });
          setKps(prev => prev.map(item => item.id === kp.id ? { ...item, level: 4, mastered: true } : item));
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (err) {
          console.error('Error mastering:', err);
        }
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete('knowledgePoints', id);
      setKps(prev => prev.filter(item => item.id !== id));
      setDeletingId(null);
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const handleBatchImport = async () => {
    if (!batchQuestionIds.trim()) return;
    setIsBatchImporting(true);
    try {
      const ids = batchQuestionIds.split(/[,，\s\n]+/).filter(id => id.trim());
      
      for (const id of ids) {
        const questions = await api.get('questions', undefined, { id: id.trim() });
        if (questions && questions.length > 0) {
          const qData = questions[0];
          const kpsList = qData.knowledgePoints || [];
          
          const uniqueKps = kpsList.filter((kp: any, idx: number, self: any[]) => 
            idx === self.findIndex((t: any) => t.title === kp.title)
          );

          for (const kp of uniqueKps) {
            const existing = await api.get('knowledgePoints', undefined, { 
              studentId: user?.studentId, 
              title: kp.title 
            });
            
            if (existing.length === 0) {
              await api.post('knowledgePoints', {
                questionId: id.trim(),
                field: Array.isArray(qData.field) ? qData.field[0] : qData.field,
                title: kp.title,
                content: kp.content,
                level: 1,
                mastered: false,
                userId: user?.uid,
                studentId: user?.studentId
              });
            }
          }
        }
      }
      setBatchQuestionIds('');
      alert(t('common.success'));
    } catch (err) {
      console.error('Batch import error:', err);
      alert(t('common.error'));
    } finally {
      setIsBatchImporting(false);
    }
  };

  const [printCount, setPrintCount] = useState(20);
  const [printVersion, setPrintVersion] = useState('A');

  const handlePrint = () => {
    if (activeTab === 'mastered') {
      window.print();
    }
  };

  const openInNewTab = () => {
    const url = window.location.href;
    window.open(url, '_blank');
  };

  const summaryData = useMemo(() => {
    const fields: Record<string, number> = {};
    kps.forEach(kp => {
      fields[kp.field] = (fields[kp.field] || 0) + 1;
    });
    return Object.entries(fields).map(([name, value]) => ({ name: t(`enum.field.${name}`), value }));
  }, [kps, t]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

  const handleGenerateSummary = async () => {
    if (kps.length === 0) return;
    setIsAiLoading(true);
    setAiError(false);
    try {
      const result = await generateKnowledgeSummaryWithAI(kps);
      setAiSummary(result.summary);
    } catch (err) {
      console.error('AI Summary failed:', err);
      setAiError(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 print:hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">
            <div className="w-8 h-[2px] bg-green-600/30 rounded-full" />
            <span>{t('kb.title')} · KNOWLEDGE BASE</span>
          </div>
          <h1 className={`text-3xl md:text-4xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{t('kb.title')}</h1>
          <p className={`${theme.subText} font-medium text-sm transition-colors duration-1000`}>{t('kb.subtitle')}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'summary' ? 'bg-green-600 text-white' : `${theme.card} ${theme.subText} border ${theme.border}`
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {t('kb.tab.summary')}
          </button>
        </div>
      </div>

      {activeTab !== 'summary' ? (
        <>
          {/* Filters & Tabs */}
          <div className="space-y-6 print:hidden">
            <div className="flex flex-wrap gap-2">
              {[
                { id: '1', label: t('kb.tab.level1'), icon: Circle },
                { id: '2', label: t('kb.tab.level2'), icon: Circle },
                { id: '3', label: t('kb.tab.level3'), icon: Circle },
                { id: 'mastered', label: t('kb.tab.mastered'), icon: CheckCircle2 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 md:px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 border ${
                    activeTab === tab.id 
                      ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/20' 
                      : `${theme.card} ${theme.subText} border ${theme.border}`
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.id === 'mastered' ? t('kb.tab.mastered') : tab.id}</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-lg text-[8px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-500/10'}`}>
                    {kps.filter(kp => tab.id === 'mastered' ? kp.level === 4 : kp.level.toString() === tab.id).length}
                  </span>
                </button>
              ))}
            </div>

            <div className={`p-4 md:p-6 ${theme.card} backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] border ${theme.border} flex flex-col md:flex-row gap-4 md:gap-6 transition-all duration-1000 relative z-10`}>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('common.search')}
                  className={`w-full pl-12 pr-6 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all`}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value as any)}
                  className={`w-full md:w-auto px-6 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all`}
                >
                  <option value="全部">{t('common.all')}</option>
                  {['生物化学', '细胞生物学', '植物学', '动物学', '微生物学', '动物生理学', '植物生理学', '其他'].map(f => (
                    <option key={f} value={f}>{t(`enum.field.${f}`)}</option>
                  ))}
                </select>
                <div className="flex gap-2 w-full md:w-auto min-h-[48px]">
                  {['1', '2', '3'].includes(activeTab) && (
                    <button 
                      onClick={() => {
                        const kpsToAnswer = (filteredKps || []).slice(0, 5).map(kp => kp.id);
                        if (kpsToAnswer.length > 0) {
                          navigate(`/answer/${activeTab}?ids=${kpsToAnswer.join(',')}`);
                        } else {
                          alert(t('kb.noKpsToAnswer'));
                        }
                      }}
                      className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Brain className="w-5 h-5" />
                      {t('answer.submit')}
                    </button>
                  )}
                  {activeTab === 'mastered' && (
                    <>
                      <input
                        type="number"
                        value={printCount}
                        onChange={(e) => setPrintCount(Number(e.target.value))}
                        className={`w-16 p-2 ${theme.input} rounded-xl text-center text-sm font-bold`}
                        title={t('kb.printCount')}
                      />
                      <select
                        value={printVersion}
                        onChange={(e) => setPrintVersion(e.target.value)}
                        className={`p-2 ${theme.input} rounded-xl text-sm font-bold`}
                        title={t('kb.printVersion')}
                      >
                        <option value="A">{t('kb.printVersionA')}</option>
                        <option value="B">{t('kb.printVersionB')}</option>
                      </select>
                      <button 
                        onClick={openInNewTab}
                        className={`flex-1 md:flex-none p-4 md:p-3 ${theme.card} border ${theme.border} rounded-2xl ${theme.subText} hover:${theme.text} transition-all flex items-center justify-center gap-2 print:hidden`}
                        title={t('kb.printTooltip')}
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button onClick={handlePrint} className={`flex-1 md:flex-none p-4 md:p-3 ${theme.card} border ${theme.border} rounded-2xl hover:text-green-600 transition-all flex items-center justify-center gap-2 print:hidden`} title={t('kb.exportTooltip')}>
                        <FileDown className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Batch Import */}
          {activeTab === '1' && (
            <div className={`${theme.card} backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] border ${theme.border} p-6 space-y-4 print:hidden`}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Plus className="w-3 h-3" /> {t('kb.batchImportTitle')}
              </h3>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={batchQuestionIds}
                  onChange={(e) => setBatchQuestionIds(e.target.value)}
                  placeholder={t('kb.batchImportPlaceholder')}
                  className={`flex-1 px-6 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all`}
                />
                <button
                  onClick={handleBatchImport}
                  disabled={isBatchImporting || !batchQuestionIds.trim()}
                  className="w-full md:w-auto px-8 py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isBatchImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {t('kb.batchImportBtn')}
                </button>
              </div>
            </div>
          )}

          {/* Printable Content */}
          <div className="print:block hidden">
            <div className="text-center mb-10 border-b-2 border-slate-900 pb-6">
              <h1 className="text-3xl font-serif font-black mb-2">{t('kb.printTitle')} - {
                activeTab === '1' ? t('kb.tab.level1') : activeTab === '2' ? t('kb.tab.level2') : activeTab === '3' ? t('kb.tab.level3') : t('kb.tab.mastered')
              } ({t('kb.printVersion')} {printVersion})</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest">{t('kb.printDate')}: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="space-y-8">
              {(filteredKps || []).slice(0, printCount).map((kp, index) => (
                <div key={kp.id} className="border-b border-slate-100 pb-6 last:border-0 break-inside-avoid">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-serif font-black text-xl opacity-20">{String(index + 1).padStart(2, '0')}</span>
                    <div className="flex-1 ml-4">
                      <h3 className="text-lg font-black mb-2">[{kp.questionId}] {kp.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-700">{kp.content}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(`enum.field.${kp.field}`)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Knowledge Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 print:hidden">
            <AnimatePresence mode="popLayout">
              {filteredKps.map(kp => (
                <motion.div
                  key={kp.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`${theme.card} backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] border ${theme.border} p-6 md:p-8 space-y-6 group hover:border-green-500/30 transition-all duration-500`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-600/10 text-green-600 text-[8px] font-black uppercase tracking-widest rounded-lg">
                          {t(`enum.field.${kp.field}`)}
                        </span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          {t('upload.questionId')}: {kp.questionId}
                        </span>
                      </div>
                      <h3 className={`text-lg md:text-xl font-black ${theme.text} tracking-tight`}>{kp.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {deletingId === kp.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                          <button 
                            onClick={() => handleDelete(kp.id)}
                            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            title={t('common.confirm')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingId(null)}
                            className={`p-2 ${theme.card} border ${theme.border} ${theme.text} rounded-xl hover:bg-slate-100 transition-all`}
                            title={t('common.cancel')}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeletingId(kp.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={`p-4 md:p-5 rounded-2xl ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border} text-sm font-medium ${theme.text} leading-relaxed`}>
                    {kp.content}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(l => (
                        <div 
                          key={l} 
                          className={`w-6 h-1.5 rounded-full transition-all ${
                            l <= kp.level ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-800'
                          }`} 
                        />
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      {kp.level < 4 && (
                        <>
                          <button
                            onClick={() => handleMaster(kp)}
                            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95"
                          >
                            {t('kb.tab.mastered')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredKps.length === 0 && (
            <div className="text-center py-20 space-y-4 print:hidden">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto">
                <Brain className="w-10 h-10 text-slate-300" />
              </div>
              <p className={`${theme.subText} font-bold`}>{t('common.none')}</p>
            </div>
          )}
        </>
      ) : (
        /* Summary View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 print:hidden">
          <div className={`lg:col-span-2 ${theme.card} backdrop-blur-2xl rounded-[2rem] md:rounded-[3rem] border ${theme.border} p-6 md:p-10 space-y-6 md:space-y-10`}>
            <div className="flex items-center gap-3">
              <PieIcon className="w-6 h-6 text-green-600" />
              <h2 className={`text-xl md:text-2xl font-black ${theme.text} tracking-tight`}>{t('kb.summary.distribution')}</h2>
            </div>
            
            <div className="h-[300px] md:h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summaryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobileView ? 60 : 80}
                    outerRadius={isMobileView ? 100 : 140}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {summaryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ 
                      backgroundColor: isNight ? '#0f172a' : '#ffffff',
                      borderRadius: '1rem',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-black ${theme.text}`}>{t('kb.summary.report')}</h3>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isAiLoading || kps.length === 0}
                  className={`px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50`}
                >
                  {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {aiSummary ? t('kb.summary.ai.refresh') : t('kb.summary.ai.generate')}
                </button>
              </div>

              <div className={`p-6 rounded-3xl ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border} space-y-6 relative overflow-hidden`}>
                {isAiLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                    <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                    <p className={`text-sm font-bold ${theme.subText} animate-pulse`}>{t('kb.summary.ai.loading')}</p>
                  </div>
                ) : aiError ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center text-red-500">
                    <AlertTriangle className="w-8 h-8" />
                    <p className="text-sm font-bold">{t('kb.summary.ai.fail')}</p>
                  </div>
                ) : aiSummary ? (
                  <div className={`prose prose-sm max-w-none ${isNight ? 'prose-invert' : ''} transition-all`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="px-2 py-1 bg-green-600 text-white text-[8px] font-black uppercase rounded-lg">AI Report</div>
                      <span className={`text-[10px] ${theme.subText} font-bold`}>{t('kb.aiAnalysis')}</span>
                    </div>
                    <div className={isNight ? 'text-slate-300' : 'text-slate-700'}>
                      <Markdown>{aiSummary}</Markdown>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center opacity-50">
                    <Brain className="w-12 h-12 text-slate-300" />
                    <p className={`text-sm font-bold ${theme.subText}`}>{t('kb.summary.ai.placeholder')}</p>
                  </div>
                )}
              </div>

              <div className={`p-6 rounded-3xl ${isNight ? 'bg-slate-900/50' : 'bg-slate-50'} border ${theme.border} space-y-4`}>
                <p className={`text-sm font-medium ${theme.text} leading-relaxed`}>
                  {t('kb.summary.total', { count: kps.length })}
                  {' '}{t('kb.summary.mastered', { count: kps.filter(k => k.level === 4).length })}
                </p>
                <div className="space-y-2">
                  <p className={`text-xs font-black ${theme.subText} uppercase tracking-widest`}>{t('kb.summary.weakness')}</p>
                  <div className="flex flex-wrap gap-2">
                    {summaryData.sort((a, b) => a.value - b.value).slice(0, 3).map(item => (
                      <span key={item.name} className="px-3 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-black rounded-xl uppercase tracking-widest">
                        {t('kb.summary.strengthen')}: {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 md:space-y-10">
            <div className={`${theme.card} backdrop-blur-2xl rounded-[2rem] md:rounded-[3rem] border ${theme.border} p-6 md:p-10 space-y-6`}>
              <h3 className={`text-xl font-black ${theme.text} tracking-tight`}>{t('kb.summary.progress')}</h3>
              <div className="space-y-6">
                {[
                  { label: t('kb.summary.level1'), level: 1, color: 'bg-slate-400' },
                  { label: t('kb.summary.level2'), level: 2, color: 'bg-blue-500' },
                  { label: t('kb.summary.level3'), level: 3, color: 'bg-purple-500' },
                  { label: t('kb.summary.level4'), level: 4, color: 'bg-green-500' }
                ].map(item => {
                  const count = kps.filter(k => k.level === item.level).length;
                  const percent = kps.length > 0 ? (count / kps.length) * 100 : 0;
                  return (
                    <div key={item.level} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest`}>{item.label}</span>
                        <span className={`text-xs font-black ${theme.text}`}>{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          className={`h-full ${item.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${theme.card} backdrop-blur-2xl rounded-[2rem] md:rounded-[3rem] border ${theme.border} p-6 md:p-10 space-y-4`}>
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className={`text-xl font-black ${theme.text} tracking-tight`}>{t('kb.suggestion')}</h3>
              <p className={`text-sm font-medium ${theme.subText} leading-relaxed`}>
                {kps.filter(k => k.level === 1).length > 0 
                  ? t('kb.summary.suggestion.improve', { count: kps.filter(k => k.level === 1).length })
                  : t('kb.summary.suggestion.good')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-sm ${theme.card} backdrop-blur-2xl rounded-[2.5rem] p-8 border ${theme.border} shadow-2xl`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  confirmModal.type === 'danger' ? 'bg-red-500/10 text-red-500' : 
                  confirmModal.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 
                  'bg-green-500/10 text-green-500'
                }`}>
                  {confirmModal.type === 'danger' ? <Trash2 className="w-6 h-6" /> : 
                   confirmModal.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> : 
                   <CheckCircle2 className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className={`text-xl font-black ${theme.text} tracking-tight`}>{confirmModal.title}</h3>
                  <p className={`text-xs font-bold ${theme.subText} uppercase tracking-widest`}>{t('common.confirm')}</p>
                </div>
              </div>

              <p className={`text-sm font-medium ${theme.text} leading-relaxed mb-8`}>
                {confirmModal.message}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className={`flex-1 py-4 ${theme.card} border ${theme.border} rounded-2xl text-[10px] font-black uppercase tracking-widest hover:${theme.mutedBg} transition-all`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 py-4 ${
                    confirmModal.type === 'danger' ? 'bg-red-500' : 
                    confirmModal.type === 'warning' ? 'bg-amber-500' : 
                    'bg-green-600'
                  } text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg`}
                >
                  {t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Content for Mastered */}
      {activeTab === 'mastered' && (
        <div className="print:block hidden">
          <div className="text-center mb-10 border-b-2 border-slate-900 pb-6">
            <h1 className="text-3xl font-serif font-black mb-2">{t('kb.printMasteredTitle')}</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">{t('kb.printDate')}: {new Date().toLocaleDateString()} | {t('kb.printCount')}: {Math.min(printCount, filteredKps.length)}</p>
          </div>
          <div className="space-y-8">
            {(filteredKps || []).slice(0, printCount).map((kp, index) => (
              <div key={kp.id} className="border-b border-slate-100 pb-6 last:border-0 break-inside-avoid">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-serif font-black text-xl opacity-20">{String(index + 1).padStart(2, '0')}</span>
                  <div className="flex-1 ml-4">
                    <h3 className="text-lg font-black mb-2">[{kp.questionId}] {kp.title}</h3>
                    {printVersion === 'B' && (
                      <p className="text-sm leading-relaxed text-slate-700">{kp.content}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t(`enum.field.${kp.field}`)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
