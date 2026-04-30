import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { KnowledgePoint, QuestionField, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useViewMode } from '../hooks/useViewMode';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Brain, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Search, 
  ArrowRight,
  Loader2,
  FileDown,
  Sparkles,
  Plus,
  Zap,
  X,
  AlertTriangle,
  Share2,
  Check,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function KnowledgeLevelPage({ user }: { user: User | null }) {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { theme, isNight } = useTheme();
  const { isMobileView } = useViewMode();
  const { t } = useLanguage();
  const [kps, setKps] = useState<KnowledgePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterField, setFilterField] = useState<QuestionField | '全部'>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchQuestionIds, setBatchQuestionIds] = useState('');
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
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

  const currentLevel = level === 'mastered' ? 4 : parseInt(level || '1');
  const levelName = level === 'mastered' ? t('kb.level.masteredTitle') : t('kb.level.levelName', { level });

  useEffect(() => {
    if (!user?.studentId) return;

    const fetchData = async () => {
      try {
        const data = await api.get('knowledgePoints', undefined, { 
          studentId: user.studentId,
          level: currentLevel.toString()
        });
        setKps(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching KPs:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [currentLevel, user?.studentId]);

  const filteredKps = useMemo(() => {
    return kps.filter(kp => {
      const matchesField = filterField === '全部' || kp.field === filterField;
      const matchesSearch = kp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           kp.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesField && matchesSearch;
    });
  }, [kps, filterField, searchQuery]);

  const handleLevelUp = async (kp: KnowledgePoint) => {
    if (kp.level >= 4) return;
    try {
      await api.put('knowledgePoints', kp.id, {
        level: kp.level + 1,
        mastered: kp.level + 1 === 4
      });
    } catch (err) {
      console.error('Error leveling up:', err);
    }
  };

  const handleMaster = (kp: KnowledgePoint) => {
    setConfirmModal({
      show: true,
      title: t('kb.level.masterConfirmTitle'),
      message: t('kb.level.masterConfirmMessage'),
      type: 'warning',
      onConfirm: async () => {
        try {
          await api.put('knowledgePoints', kp.id, {
            level: 4,
            mastered: true
          });
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
      setDeletingId(null);
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const handleBatchImport = async () => {
    if (!batchQuestionIds.trim() || !user?.studentId) return;
    setIsBatchImporting(true);
    try {
      const ids = batchQuestionIds.split(/[,，\s\n]+/).filter(id => id.trim());
      let addedCount = 0;
      
      for (const id of ids) {
        const questions = await api.get('questions', undefined, { id: id.trim() });
        if (questions && questions.length > 0) {
          const qData = questions[0];
          const kpsList = qData.knowledgePoints || [];
          for (const kp of kpsList) {
            // Deduplication check
            const duplicates = await api.get('knowledgePoints', undefined, {
              studentId: user.studentId,
              title: kp.title
            });
            
            if (duplicates.length === 0) {
              await api.post('knowledgePoints', {
                questionId: id.trim(),
                field: Array.isArray(qData.field) ? qData.field[0] : qData.field,
                title: kp.title,
                content: kp.content,
                level: 1,
                mastered: false,
                createdAt: new Date().toISOString(),
                userId: user.uid,
                studentId: user.studentId
              });
              addedCount++;
            }
          }
        }
      }
      if (addedCount > 0) {
        alert(t('kb.level.importSuccess', { count: addedCount }));
      } else {
        alert(t('kb.level.importNoNew'));
      }
      setBatchQuestionIds('');
    } catch (err) {
      console.error('Batch import error:', err);
      alert(t('kb.level.importFail'));
    } finally {
      setIsBatchImporting(false);
    }
  };

  const handlePrint = () => {
    if (currentLevel === 4) {
      window.print();
    }
  };

  const openInNewTab = () => {
    const url = window.location.href;
    window.open(url, '_blank');
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
      <div className="space-y-2 print:hidden">
        <div className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">
          <div className="w-8 h-[2px] bg-green-600/30 rounded-full" />
          <span>{t('kb.level.title')} · {levelName.toUpperCase()}</span>
        </div>
        <h1 className={`text-3xl md:text-4xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{levelName}</h1>
        <p className={`${theme.subText} font-medium text-sm transition-colors duration-1000`}>
          {currentLevel === 4 ? t('kb.level.masteredDesc') : t('kb.level.levelDesc', { level: currentLevel })}
        </p>
      </div>

      <div className="space-y-6">
        {currentLevel === 1 && (
          <div className={`${theme.card} backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] border ${theme.border} p-6 space-y-4 print:hidden`}>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-3 h-3" /> {t('kb.level.batchImportTitle')}
            </h3>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={batchQuestionIds}
                onChange={(e) => setBatchQuestionIds(e.target.value)}
                placeholder={t('kb.level.batchImportPlaceholder')}
                className={`flex-1 px-6 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all`}
              />
              <button
                onClick={handleBatchImport}
                disabled={isBatchImporting || !batchQuestionIds.trim()}
                className="w-full md:w-auto px-8 py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBatchImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {t('kb.level.import')}
              </button>
            </div>
          </div>
        )}

        <div className={`p-4 md:p-6 ${theme.card} backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] border ${theme.border} flex flex-col md:flex-row gap-4 md:gap-6 transition-all duration-1000 print:hidden`}>
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('kb.level.searchPlaceholder')}
              className={`w-full pl-12 pr-6 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all`}
            />
          </div>
              <div className="flex flex-col md:flex-row gap-4">
                <select
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value as any)}
                  className={`w-full md:w-auto px-6 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all`}
                >
                  <option value="全部">{t('kb.level.allFields')}</option>
                  {['生物化学', '细胞生物学', '植物学', '动物学', '微生物学', '动物生理学', '植物生理学', '其他'].map(f => (
                    <option key={f} value={f}>{t(`enum.field.${f}`)}</option>
                  ))}
                </select>
                <div className="flex gap-2 w-full md:w-auto min-h-[48px]">
                  {currentLevel < 4 ? (
                    <button 
                      onClick={() => {
                        const kpsToAnswer = (filteredKps || []).slice(0, 5).map(kp => kp.id);
                        if (kpsToAnswer.length > 0) {
                          navigate(`/answer/${currentLevel}?ids=${kpsToAnswer.join(',')}`);
                        } else {
                          alert(t('kb.level.noKpsToAnswer'));
                        }
                      }}
                      className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Brain className="w-5 h-5" />
                      {t('kb.level.startAnswering')}
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={openInNewTab}
                        className={`flex-1 md:flex-none p-4 md:p-3 ${theme.card} border ${theme.border} rounded-2xl ${theme.subText} hover:${theme.text} transition-all flex items-center justify-center gap-2 print:hidden`}
                        title={t('kb.level.newTab')}
                      >
                        <Share2 className="w-5 h-5" />
                        <span className="md:hidden text-[10px] font-black uppercase tracking-widest">{t('kb.level.newTab')}</span>
                      </button>
                      <button onClick={handlePrint} className={`flex-1 md:flex-none p-4 md:p-3 ${theme.card} border ${theme.border} rounded-2xl hover:text-green-600 transition-all flex items-center justify-center gap-2 print:hidden`} title={t('kb.level.exportPdf')}>
                        <FileDown className="w-5 h-5" />
                        <span className="md:hidden text-[10px] font-black uppercase tracking-widest">{t('kb.level.exportPdf')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
        </div>
      </div>

      {/* Printable Content */}
      <div className="print:block hidden">
        <div className="text-center mb-6 pb-4">
          <h1 className="text-2xl font-serif font-black mb-1">{t('kb.level.printTitle')} - {levelName}</h1>
        </div>
        <div className="space-y-4">
          {filteredKps.map((kp, index) => (
            <div key={kp.id} className="border-b border-slate-100 pb-4 last:border-0 break-inside-avoid">
              <div className="flex justify-between items-start mb-2">
                <span className="font-serif font-black text-sm opacity-20">{String(index + 1).padStart(2, '0')}</span>
                <div className="flex-1 ml-4">
                  <h3 className="text-sm font-black mb-1">[{kp.questionId}] {kp.title}</h3>
                  <p className="text-[10px] leading-relaxed text-slate-700">{kp.content}</p>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t(`enum.field.${kp.field}`)}</span>
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
                      {t('kb.level.questionId')}: {kp.questionId}
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
                        {t('kb.level.confirmMaster')}
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
          <p className={`${theme.subText} font-bold`}>{t('kb.level.noMatch')}</p>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                  <p className={`text-xs font-bold ${theme.subText} uppercase tracking-widest`}>{t('common.needConfirm')}</p>
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
    </div>
  );
}
