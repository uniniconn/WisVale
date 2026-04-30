import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { Question, UserTag, User, QuestionDifficulty, QuestionField } from '../types';
import { Search, Filter, Tag, Plus, FileText, CheckCircle2, ChevronRight, Edit2, Trash2, RefreshCw, X, ChevronDown, ChevronUp, ArrowUpDown, Shuffle, Clock, Copy, ListChecks, Sparkles, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../hooks/useViewMode';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  user: User | null;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();
  const { isMobileView } = useViewMode();
  const { isNight, isBirthday, birthdaySlogan, isQidan, qidanSlogan, theme } = useTheme();
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userTags, setUserTags] = useState<Record<string, string[]>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStates, setFilterStates] = useState<Record<string, 'include' | 'exclude' | 'none'>>({});
  const [activeFilterMode, setActiveFilterMode] = useState<'include' | 'exclude' | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<{ id: string, value: string, isPublic: boolean } | null>(null);
  const [batchTagInput, setBatchTagInput] = useState('');
  const [batchIdInput, setBatchIdInput] = useState('');
  const [sortMode, setSortMode] = useState<'latest' | 'earliest' | 'random'>('latest');
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [tempPaperTitle, setTempPaperTitle] = useState('WisVale 模拟试卷');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedQuestionDetail, setSelectedQuestionDetail] = useState<Question | null>(null);
  const [isIslandExpanded, setIsIslandExpanded] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    '学科领域': true,
    '难度': false,
    '来源': false,
    '类型': false,
    '上传者': false,
    '个人标签': false,
    '公共标签': false
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const questionsData = await api.get('questions');
        setQuestions(questionsData);

        const usersData = await api.get('users');
        setAllUsers(usersData);

        if (user?.studentId) {
          const tagsData = await api.get('userTags', undefined, { studentId: user.studentId });
          const tagsMap: Record<string, string[]> = {};
          tagsData.forEach((data: UserTag) => {
            tagsMap[data.questionId] = data.tags;
          });
          setUserTags(tagsMap);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 45000); // Poll every 45s

    return () => clearInterval(interval);
  }, [user?.studentId]);

  const allUserTags = Array.from(new Set(Object.values(userTags).flat()));
  const allPublicTags = Array.from(new Set(questions.flatMap(q => q.publicTags || [])));
  
  const getUploaderName = (q: Question) => {
    const user = allUsers.find(u => u.uid === q.createdBy);
    return user?.nickname || q.creatorNickname || q.creatorStudentId || 'SYSTEM';
  };

  const allUploaders = Array.from(new Set(questions.map(q => getUploaderName(q))));

  const filteredQuestions = useMemo(() => {
    const filtered = questions.filter(q => {
      const uploaderName = getUploaderName(q);
      const fieldStr = Array.isArray(q.field) ? q.field.join(' ') : (q.field || '');
      const matchesSearch = q.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            q.source.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            fieldStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (q.creatorStudentId && q.creatorStudentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (q.creatorNickname && q.creatorNickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            uploaderName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const includeFilters = Object.entries(filterStates).filter(([_, state]) => state === 'include').map(([val]) => val);
      const excludeFilters = Object.entries(filterStates).filter(([_, state]) => state === 'exclude').map(([val]) => val);

      const fieldIncludes = includeFilters.filter(f => ['生物化学', '细胞生物学', '植物学', '动物学', '微生物学', '动物生理学', '植物生理学'].includes(f));
      const difficultyIncludes = includeFilters.filter(f => ['难题', '易错题'].includes(f));
      const sourceIncludes = includeFilters.filter(f => ['猿辅导', '汇智启航', '北斗学友', '联赛题', '国赛题', '愿程'].includes(f));
      const typeIncludes = includeFilters.filter(f => ['概念题', '计算题', '材料题'].includes(f));
      const uploaderIncludes = includeFilters.filter(f => allUploaders.includes(f));
      const tagIncludes = includeFilters.filter(f => !([...fieldIncludes, ...difficultyIncludes, ...sourceIncludes, ...typeIncludes, ...uploaderIncludes].includes(f)));

      const matchesField = fieldIncludes.length === 0 || (Array.isArray(q.field) ? fieldIncludes.some(f => q.field.includes(f as QuestionField)) : fieldIncludes.includes(q.field));
      const matchesDifficulty = difficultyIncludes.length === 0 || (Array.isArray(q.difficulty) ? difficultyIncludes.some(d => q.difficulty.includes(d as QuestionDifficulty)) : difficultyIncludes.includes(q.difficulty));
      const matchesSource = sourceIncludes.length === 0 || sourceIncludes.includes(q.source);
      const matchesType = typeIncludes.length === 0 || typeIncludes.includes(q.type);
      const matchesUploader = uploaderIncludes.length === 0 || uploaderIncludes.includes(uploaderName);
      
      const qTags = [...(userTags[q.id] || []), ...(q.publicTags || [])];
      const matchesTags = tagIncludes.length === 0 || tagIncludes.some(tag => qTags.includes(tag));

      const matchesFilter = matchesField && matchesDifficulty && matchesSource && matchesType && matchesTags && matchesUploader;
      const isExcluded = excludeFilters.some(tag => {
        const fieldMatch = Array.isArray(q.field) ? q.field.includes(tag as QuestionField) : q.field === tag;
        return qTags.includes(tag) || fieldMatch || (Array.isArray(q.difficulty) ? q.difficulty.includes(tag as QuestionDifficulty) : q.difficulty === tag) || q.source === tag || q.type === tag || uploaderName === tag;
      });

      return matchesSearch && matchesFilter && !isExcluded;
    });

    if (sortMode === 'random') {
      return [...filtered].sort(() => Math.random() - 0.5);
    } else if (sortMode === 'earliest') {
      return [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [questions, searchTerm, filterStates, userTags, allUsers, allUploaders, sortMode]);

  const pieData = useMemo(() => {
    const selectedData = questions.filter(q => selectedQuestions.includes(q.id));
    const counts: Record<string, number> = {};
    selectedData.forEach(q => {
      if (Array.isArray(q.field)) {
        q.field.forEach(f => {
          counts[f] = (counts[f] || 0) + 1;
        });
      } else if (q.field) {
        counts[q.field as string] = (counts[q.field as string] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [selectedQuestions, questions]);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

  const toggleSelection = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddTag = async (questionId: string, tag: string, isPublic: boolean = false) => {
    if (!tag.trim()) return;
    
    if (isPublic) {
      const q = questions.find(q => q.id === questionId);
      if (!q) return;
      const newPublicTags = Array.from(new Set([...(q.publicTags || []), tag]));
      
      await api.put('questions', q.id, { publicTags: newPublicTags });
      setTagInput(null);
      return;
    }

    const currentTags = userTags[questionId] || [];
    if (currentTags.includes(tag)) return;

    const newTags = [...currentTags, tag];

    if (!user?.studentId) return;
    const tagId = `${user.studentId}_${questionId}`;
    await api.post('userTags', {
      id: tagId,
      userId: user.uid,
      studentId: user.studentId,
      questionId,
      tags: newTags
    });
    setUserTags(prev => ({ ...prev, [questionId]: newTags }));
    setTagInput(null);
  };

  const handleBatchTag = async () => {
    if (!batchTagInput.trim() || selectedQuestions.length === 0) return;
    const tag = batchTagInput.trim();

    if (!user?.studentId) return;
    const studentId = user.studentId;

    try {
      const promises = selectedQuestions.map(async (questionId) => {
        const currentTags = userTags[questionId] || [];
        if (!currentTags.includes(tag)) {
          const newTags = [...currentTags, tag];
          const tagId = `${studentId}_${questionId}`;
          return api.post('userTags', {
            id: tagId,
            userId: user.uid,
            studentId: studentId,
            questionId,
            tags: newTags
          });
        }
      });
      await Promise.all(promises);
      setBatchTagInput('');
      
      // Refresh user tags
      const tagsData = await api.get('userTags', undefined, { studentId: user.studentId });
      const tagsMap: Record<string, string[]> = {};
      tagsData.forEach((data: UserTag) => {
        tagsMap[data.questionId] = data.tags;
      });
      setUserTags(tagsMap);
    } catch (err) {
      console.error("Error batch tagging:", err);
    }
  };

  const handleBatchSelectById = () => {
    if (!batchIdInput.trim()) return;
    const idsToSelect = batchIdInput.split('.').map(id => id.trim()).filter(id => id);
    const validIds = questions.filter(q => idsToSelect.includes(q.id)).map(q => q.id);
    setSelectedQuestions(prev => Array.from(new Set([...prev, ...validIds])));
    setBatchIdInput('');
  };

  const copySelectedIds = () => {
    const ids = selectedQuestions.join('.');
    navigator.clipboard.writeText(ids);
  };

  const toggleFilter = (val: string, type: 'include' | 'exclude') => {
    setFilterStates(prev => {
      if (prev[val] === type) {
        const next = { ...prev };
        delete next[val];
        return next;
      }
      return { ...prev, [val]: type };
    });
  };

  const handleTagClick = (val: string) => {
    if (activeFilterMode) {
      toggleFilter(val, activeFilterMode);
    } else {
      toggleFilter(val, 'include');
    }
  };

  const invertSelection = () => {
    const allVisibleIds = filteredQuestions.map(q => q.id);
    setSelectedQuestions(prev => allVisibleIds.filter(id => !prev.includes(id)));
  };

  const removeTag = async (questionId: string, tagToRemove: string, isPublic: boolean = false) => {
    if (isPublic) {
      if (user?.role !== 'admin') return;
      const q = questions.find(q => q.id === questionId);
      if (!q) return;
      const newPublicTags = (q.publicTags || []).filter(t => t !== tagToRemove);
      
      await api.put('questions', q.id, { publicTags: newPublicTags });
      return;
    }

    const currentTags = userTags[questionId] || [];
    const newTags = currentTags.filter(t => t !== tagToRemove);

    if (!user?.studentId) return;
    const tagId = `${user.studentId}_${questionId}`;
    await api.post('userTags', {
      id: tagId,
      userId: user.uid,
      studentId: user.studentId,
      questionId,
      tags: newTags
    });
    setUserTags(prev => ({ ...prev, [questionId]: newTags }));
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete('questions', id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 pb-20 relative">
      {/* Dynamic Island Selection Indicator - Sticky to bottom */}
      <AnimatePresence>
        {selectedQuestions.length > 0 && (
          <div className="fixed bottom-8 left-[var(--sidebar-width,0px)] right-0 z-[100] flex justify-center pointer-events-none transition-all duration-300">
            <motion.div
              layout
              initial={{ y: 100, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.8 }}
              transition={{ 
                type: 'spring', 
                stiffness: 400,
                damping: 30
              }}
              onClick={() => setIsIslandExpanded(!isIslandExpanded)}
              className={`
                ${isNight ? 'bg-slate-900/70 border-slate-700/50' : 'bg-white/70 border-white/50'} 
                backdrop-blur-[20px] border shadow-xl rounded-[44px] cursor-pointer overflow-hidden
                flex flex-col items-center justify-center pointer-events-auto
                noise-shader transform-gpu
              `}
              style={{
                width: isIslandExpanded ? (isMobileView ? '90vw' : '400px') : 'auto',
              }}
            >
              {!isIslandExpanded ? (
                <div className="px-6 h-12 flex items-center gap-4 whitespace-nowrap relative overflow-hidden">
                  <div className="absolute inset-0 animate-shader opacity-10 pointer-events-none" />
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-sm font-black ${theme.text} uppercase tracking-widest relative z-10`}>
                    {t('dashboard.selected', { count: selectedQuestions.length })}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse relative z-10`} />
                </div>
              ) : (
                <div className="p-8 w-full space-y-6 relative">
                  <div className="absolute top-0 left-0 right-0 h-1 animate-shader opacity-20" />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600 rounded-2xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`text-sm font-black ${theme.text} uppercase tracking-widest`}>{t('dashboard.distribution')}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{t('dashboard.totalSelected', { count: selectedQuestions.length })}</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsIslandExpanded(false);
                      }}
                      className={`p-2 rounded-xl ${isNight ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isNight ? '#0f172a' : '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {pieData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className={`text-[10px] font-bold ${theme.subText} truncate`}>{item.name}</span>
                        <span className={`text-[10px] font-black ${theme.text}`}>{Math.round((item.value / selectedQuestions.length) * 100)}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        copySelectedIds();
                      }}
                      className={`flex-1 py-3 ${isNight ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} ${theme.text} rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {t('dashboard.copyIds')}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTitleModal(true);
                        setIsIslandExpanded(false);
                      }}
                      className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {t('dashboard.generatePaper')}
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-green-500 rounded-full"></div>
                      <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{t('dashboard.batchActions')}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 ${isNight ? 'text-slate-500' : 'text-slate-400'} w-3.5 h-3.5 transition-colors duration-1000`} />
                        <input 
                          type="text" 
                          placeholder={t('dashboard.inputTag')}
                          value={batchTagInput}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setBatchTagInput(e.target.value)}
                          className={`w-full pl-9 pr-4 py-2 text-xs ${theme.input} border rounded-xl outline-none focus:bg-transparent focus:border-green-500/30 transition-all duration-1000`}
                        />
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBatchTag();
                        }}
                        disabled={selectedQuestions.length === 0 || !batchTagInput.trim()}
                        className="px-4 py-2 bg-green-600 text-white text-[10px] font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        {t('dashboard.addTag')}
                      </button>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!user?.studentId || selectedQuestions.length === 0) return;
                        try {
                          let addedCount = 0;
                          
                          for (const qId of selectedQuestions) {
                            const q = questions.find(item => item.id === qId);
                            if (!q || !q.knowledgePoints) continue;
                            
                            // Deduplicate within the question's own KPs first
                            const uniqueKps = q.knowledgePoints.filter((kp, idx, self) => 
                              idx === self.findIndex(t => t.title === kp.title)
                            );
                            
                            for (const kp of uniqueKps) {
                              const duplicates = await api.get('knowledgePoints', undefined, {
                                studentId: user.studentId,
                                title: kp.title
                              });
                              
                              if (duplicates.length === 0) {
                                await api.post('knowledgePoints', {
                                  questionId: q.id,
                                  field: Array.isArray(q.field) ? q.field[0] : q.field,
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
                          
                          if (addedCount > 0) {
                            alert(t('common.success'));
                          } else {
                            alert(t('common.none'));
                          }
                        } catch (err) {
                          console.error('Error collecting knowledge points:', err);
                          alert(t('common.error'));
                        }
                      }}
                      className="w-full px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {t('dashboard.batchCollectKps')}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Welcome Header */}
      {isQidan && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12 p-8 rounded-[3rem] text-purple-600 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="relative z-10 flex items-center justify-between gap-2 md:gap-8">
            <div className="text-center md:text-left whitespace-nowrap">
              <h2 className="text-xl sm:text-3xl md:text-6xl font-black tracking-tighter mb-1 md:mb-2">紫海猖狂，七单为王</h2>
              {qidanSlogan && (
                <p className="text-sm sm:text-lg md:text-2xl font-bold opacity-80">{qidanSlogan}</p>
              )}
            </div>
            <div className="text-4xl sm:text-5xl md:text-8xl animate-bounce flex justify-center">
              👑
            </div>
          </div>
        </motion.div>
      )}

      {!isQidan && isBirthday && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-12 p-8 rounded-[3rem] text-rose-600 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center text-8xl animate-bounce">
              🎂
            </div>
            <div className="text-center md:text-left whitespace-nowrap">
              <h2 className="text-2xl sm:text-4xl md:text-6xl font-black tracking-tighter mb-2">{birthdaySlogan}</h2>
            </div>
            <div className="flex-1 flex justify-end gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-white/30 animate-ping" style={{ animationDelay: `${i * 0.5}s` }} />
              ))}
            </div>
          </div>
          {/* Decorative Cake SVG - Minimal Style */}
          <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 transition-opacity duration-700 rotate-12">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
              <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
              <path d="M2 21h20" />
              <path d="M7 8v3" />
              <path d="M12 8v3" />
              <path d="M17 8v3" />
              <path d="M7 4h.01" />
              <path d="M12 4h.01" />
              <path d="M17 4h.01" />
            </svg>
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-8 md:mb-12"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">
            <div className="w-8 h-[2px] bg-green-600/30 rounded-full" />
            <span>欢迎回来 · WisVale</span>
          </div>
          <h1 className={`text-3xl md:text-5xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>
            {user?.role === 'admin' ? t('dashboard.adminConsole') : t('dashboard.questionBank')}
          </h1>
          <p className={`${theme.subText} font-medium text-sm md:text-base transition-colors duration-1000`}>
            {t('dashboard.welcome.subtitle', { name: user?.nickname || user?.studentId || '' })}
          </p>
        </div>
        
        <div className="flex items-center gap-4 self-start md:self-auto">
          <div className={`px-6 py-3 ${theme.card} backdrop-blur-xl rounded-2xl border transition-colors duration-1000 flex items-center gap-4`}>
            <div className="flex flex-col items-end">
              <span className={`text-[9px] font-black ${isNight ? 'text-slate-500' : 'text-slate-300'} uppercase tracking-widest leading-none mb-1 transition-colors duration-1000`}>{t('dashboard.totalQuestions')}</span>
              <span className={`text-xl font-black ${theme.text} transition-colors duration-1000`}>{questions.length}</span>
            </div>
            <div className={`w-[1px] h-8 ${isNight ? 'bg-slate-800' : 'bg-slate-100'} transition-colors duration-1000`} />
            <div className="flex flex-col items-end">
              <span className={`text-[9px] font-black ${isNight ? 'text-slate-500' : 'text-slate-300'} uppercase tracking-widest leading-none mb-1 transition-colors duration-1000`}>{t('dashboard.selectedQuestions')}</span>
              <span className="text-xl font-black text-green-600">{selectedQuestions.length}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div 
        className={`
          ${theme.mainBg || 'bg-white/40'} backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border ${theme.border} space-y-6 md:space-y-8 sticky z-30 transition-all duration-1000 shadow-none
          ${isMobileView ? '-mx-4 rounded-none border-x-0' : ''}
        `}
        style={{ top: isMobileView ? '0px' : '-32px' }}
      >
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isNight ? 'text-slate-500' : 'text-slate-400'} w-5 h-5 group-focus-within:text-green-500 transition-colors duration-1000`} />
            <input
              type="text"
              placeholder={t('dashboard.search.placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-4 ${theme.input} border rounded-2xl focus:bg-transparent focus:border-green-500/30 focus:ring-4 focus:ring-green-500/5 outline-none transition-all duration-1000 text-sm font-medium`}
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <div className={`flex items-center gap-1 p-1 rounded-2xl ${isNight ? 'bg-slate-900/50' : 'bg-slate-100/50'} border ${theme.border} min-w-fit`}>
              <button
                onClick={() => setSortMode('latest')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${sortMode === 'latest' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-400'}`}
              >
                <Clock className="w-3.5 h-3.5" />
                {t('dashboard.sort.latest')}
              </button>
              <button
                onClick={() => setSortMode('earliest')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${sortMode === 'earliest' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-400'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {t('dashboard.sort.earliest')}
              </button>
              <button
                onClick={() => setSortMode('random')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${sortMode === 'random' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-400'}`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                {t('dashboard.sort.random')}
              </button>
            </div>
          </div>
        </div>

        {/* Batch Actions & Selection Controls */}
        <div className={`flex flex-wrap items-center gap-4 pt-4 border-t ${theme.border} transition-colors duration-1000`}>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveFilterMode(prev => prev === 'include' ? null : 'include')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-1000 flex items-center gap-2 ${
                activeFilterMode === 'include' 
                ? 'bg-blue-600 text-white' 
                : theme.buttonSecondary
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('dashboard.includeMode')}
            </button>
            <button 
              onClick={() => setActiveFilterMode(prev => prev === 'exclude' ? null : 'exclude')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-1000 flex items-center gap-2 ${
                activeFilterMode === 'exclude' 
                ? 'bg-red-600 text-white' 
                : theme.buttonSecondary
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('dashboard.excludeMode')}
            </button>
            <div className={`h-6 w-px ${isNight ? 'bg-slate-800' : 'bg-slate-200'} mx-2 transition-colors duration-1000`} />
            <button 
              onClick={() => {
                const visibleIds = filteredQuestions.map(q => q.id);
                setSelectedQuestions(prev => Array.from(new Set([...prev, ...visibleIds])));
              }}
              className={`px-4 py-2 ${theme.buttonSecondary} text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-1000 active:scale-95`}
            >
              {t('dashboard.selectAll')}
            </button>
            <button 
              onClick={() => setSelectedQuestions([])}
              className={`px-4 py-2 ${theme.buttonSecondary} text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-1000 active:scale-95`}
            >
              {t('dashboard.clearSelection')}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <ListChecks className={`absolute left-3 top-1/2 -translate-y-1/2 ${isNight ? 'text-slate-500' : 'text-slate-400'} w-3.5 h-3.5 transition-colors duration-1000`} />
              <input 
                type="text" 
                placeholder={t('dashboard.batchInputIds')}
                value={batchIdInput}
                onChange={(e) => setBatchIdInput(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs ${theme.input} border rounded-xl outline-none focus:bg-transparent focus:border-green-500/30 transition-all duration-1000`}
              />
            </div>
            <button 
              onClick={handleBatchSelectById}
              disabled={!batchIdInput.trim()}
              className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {t('dashboard.batchSelect')}
            </button>
          </div>
        </div>

        <div className={`space-y-4 pt-4 border-t ${theme.border} transition-colors duration-1000`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-green-500 rounded-full"></div>
              <h3 className={`text-[10px] font-black ${isNight ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-[0.2em] transition-colors duration-1000`}>{t('dashboard.filters')}</h3>
            </div>
            {Object.keys(filterStates).length > 0 && (
              <button 
                onClick={() => setFilterStates({})}
                className="text-[10px] font-black text-green-600 hover:text-green-700 uppercase tracking-widest flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                {t('dashboard.resetFilters')}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
            {[
              { label: '学科领域', key: 'field', options: ['生物化学', '细胞生物学', '植物学', '动物学', '微生物学', '动物生理学', '植物生理学'] },
              { label: '难度', key: 'difficulty', options: ['难题', '易错题'] },
              { label: '来源', key: 'source', options: ['猿辅导', '汇智启航', '北斗学友', '联赛题', '国赛题', '愿程'] },
              { label: '类型', key: 'type', options: ['概念题', '计算题', '材料题'] },
              { label: '上传者', key: 'uploader', options: allUploaders },
              { label: '个人标签', key: 'personalTags', options: allUserTags },
              { label: '公共标签', key: 'publicTags', options: allPublicTags }
            ].map(group => (
              <div key={group.label} className={`flex flex-col gap-2 p-3 rounded-2xl transition-all duration-500 ${expandedFilters[group.label] ? (isNight ? 'bg-slate-900/20' : 'bg-slate-50/50') : ''}`}>
                <button 
                  onClick={() => setExpandedFilters(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
                  className="flex items-center justify-between w-full group/btn"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter group-hover/btn:text-green-600 transition-colors">{t(`dashboard.filter.${group.key}`)}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${isNight ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                      {group.options.length}
                    </span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-500 ${expandedFilters[group.label] ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {expandedFilters[group.label] && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 py-3">
                        {group.options.map(val => (
                          <button
                            key={val}
                            onClick={() => handleTagClick(val)}
                            className={`
                              px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-500 border
                              ${filterStates[val] === 'include' 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                : filterStates[val] === 'exclude'
                                ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20'
                                : `${isNight ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-500' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`
                              }
                            `}
                          >
                            {['field', 'difficulty', 'source', 'type'].includes(group.key) ? t(`enum.${group.key}.${val}`) : val}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredQuestions.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={`group relative flex flex-col p-6 rounded-[2.5rem] border transition-all duration-500 ${
                selectedQuestions.includes(q.id) 
                ? 'bg-green-600/5 border-green-500/30' 
                : `${theme.card} border-transparent hover:border-green-500/20`
              }`}
            >
              {/* Selection Checkbox */}
              <button 
                onClick={() => toggleSelection(q.id)}
                className={`absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10 ${
                  selectedQuestions.includes(q.id)
                  ? 'bg-green-600 border-green-600 scale-110'
                  : 'border-slate-300 group-hover:border-green-500'
                }`}
              >
                {selectedQuestions.includes(q.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className={`text-[10px] font-black ${isNight ? 'text-slate-500' : 'text-slate-300'} uppercase tracking-widest`}>#{q.id}</span>
                <span className="px-2 py-0.5 bg-green-600/10 text-green-600 text-[8px] font-black uppercase tracking-widest rounded-full">
                  {Array.isArray(q.field) ? q.field.map(f => t(`enum.field.${f}`)).join(', ') : t(`enum.field.${q.field}`)}
                </span>
              </div>

              <div 
                onClick={() => navigate(`/question/${q.id}`)}
                className="cursor-pointer flex-1 flex flex-col"
              >
                <div className={`text-sm font-medium ${theme.text} leading-relaxed mb-6 flex-1`}>
                  {q.content}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                      {getUploaderName(q).charAt(0)}
                    </div>
                    <span className={`text-[9px] font-bold ${theme.subText}`}>{getUploaderName(q)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {confirmDeleteId === q.id ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(q.id);
                          }}
                          className="px-2 py-1 text-[10px] font-black text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          {t('common.confirm')}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 text-[10px] font-black text-slate-400 hover:bg-slate-100/10 rounded-lg transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(q.id);
                        }}
                        className="p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {tagInput && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTagInput(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md ${theme.card} backdrop-blur-2xl rounded-3xl p-8 border ${theme.border} transition-all duration-1000`}
            >
              <h3 className={`text-xl font-bold ${theme.text} mb-4 transition-colors duration-1000`}>
                {t('dashboard.addTagTitle', { type: tagInput.isPublic ? t('dashboard.tagType.public') : t('dashboard.tagType.personal') })}
              </h3>
              <input
                type="text"
                autoFocus
                value={tagInput.value}
                onChange={(e) => setTagInput({ ...tagInput, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag(tagInput.id, tagInput.value, tagInput.isPublic);
                }}
                className={`w-full px-4 py-3 ${theme.input} border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all duration-1000`}
                placeholder={t('dashboard.inputTag')}
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setTagInput(null)}
                  className={`flex-1 px-4 py-3 ${theme.buttonSecondary} font-bold rounded-xl transition-all duration-1000`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleAddTag(tagInput.id, tagInput.value, tagInput.isPublic)}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Paper Title Modal */}
      <AnimatePresence>
        {showTitleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTitleModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md ${theme.card} backdrop-blur-2xl rounded-3xl p-8 border ${theme.border} transition-all duration-1000`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 ${isNight ? 'bg-green-500/20' : 'bg-green-100'} rounded-xl flex items-center justify-center transition-colors duration-1000`}>
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${theme.text} transition-colors duration-1000`}>{t('dashboard.generatePaper')}</h3>
                  <p className={`text-xs ${theme.subText} transition-colors duration-1000`}>{t('dashboard.paperTitlePlaceholder')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold ${theme.subText} uppercase mb-2 transition-colors duration-1000`}>{t('dashboard.paperTitle')}</label>
                  <input
                    type="text"
                    autoFocus
                    value={tempPaperTitle}
                    onChange={(e) => setTempPaperTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tempPaperTitle.trim()) {
                        navigate(`/generate?ids=${selectedQuestions.join(',')}&title=${encodeURIComponent(tempPaperTitle)}`);
                      }
                    }}
                    className={`w-full px-4 py-3 ${theme.input} border rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all duration-1000`}
                    placeholder={t('dashboard.paperTitlePlaceholder')}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowTitleModal(false)}
                    className={`flex-1 px-4 py-3 ${theme.buttonSecondary} font-bold rounded-xl transition-all duration-1000`}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      if (tempPaperTitle.trim()) {
                        navigate(`/generate?ids=${selectedQuestions.join(',')}&title=${encodeURIComponent(tempPaperTitle)}`);
                      }
                    }}
                    disabled={!tempPaperTitle.trim()}
                    className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {t('dashboard.generateConfirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
