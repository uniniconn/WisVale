import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, isDemoMode } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Question, QuestionField, QuestionSource, QuestionDifficulty, QuestionType, User } from '../types';
import { Save, ChevronLeft, Loader2, AlertCircle, FileText, Info, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';

const MOCK_QUESTIONS: Question[] = [
  {
    id: 'U0001',
    imageUrl: 'https://picsum.photos/seed/bio1/800/600',
    field: '细胞生物学',
    source: '猿辅导',
    sourceDetail: '2023年全国甲卷第3题',
    difficulty: ['难题'],
    type: '概念题',
    content: '下列关于细胞呼吸的叙述，错误的是（ ）\nA. 葡萄糖在细胞质基质中分解为丙酮酸\nB. 有氧呼吸产生的[H]在线粒体内膜上与氧结合生成水\nC. 只有有氧呼吸才能产生ATP\nD. 丙酮酸进入线粒体后才能被彻底氧化分解',
    answer: 'C',
    explanation: '无氧呼吸在第一阶段也能产生少量ATP。',
    createdBy: 'demo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'U0002',
    imageUrl: 'https://picsum.photos/seed/bio2/800/600',
    field: '生物化学',
    source: '北斗学友',
    sourceDetail: '必修一《分子与细胞》P45',
    difficulty: ['易错题'],
    type: '计算题',
    content: '某蛋白质由n条肽链组成，氨基酸的平均分子量为a，若该蛋白质共有m个氨基酸，则该蛋白质的分子量约为多少？',
    answer: 'ma - 18(m-n)',
    explanation: '蛋白质分子量 = 氨基酸总分子量 - 脱去水的总分子量。脱去水分子数 = 氨基酸数 - 肽链数。',
    createdBy: 'demo',
    createdAt: new Date().toISOString()
  }
];

export default function EditQuestion({ user }: { user: User | null }) {
  const { isNight, theme } = useTheme();
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [uploaderNickname, setUploaderNickname] = useState<string | null>(null);
  const [firestoreDocId, setFirestoreDocId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    field: [] as QuestionField[],
    source: '' as QuestionSource,
    sourceDetail: '',
    difficulty: [] as QuestionDifficulty[],
    type: '' as QuestionType,
    answer: '',
    explanation: '',
    content: '',
    publicTags: [] as string[],
  });

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      if (isDemoMode) {
        const mockQ = MOCK_QUESTIONS.find(q => q.id === id);
        if (mockQ) {
          setQuestion(mockQ);
          setFormData({
            field: Array.isArray(mockQ.field) ? mockQ.field : [mockQ.field as QuestionField],
            source: mockQ.source,
            sourceDetail: mockQ.sourceDetail,
            difficulty: mockQ.difficulty,
            type: mockQ.type,
            answer: mockQ.answer || '',
            explanation: mockQ.explanation || '',
            content: mockQ.content || '',
            publicTags: mockQ.publicTags || [],
          });
        } else {
          alert(t('edit.notExist'));
          navigate('/');
        }
        setLoading(false);
        return;
      }

      try {
        // Query by the human-readable ID field
        const q = query(collection(db, 'questions'), where('id', '==', id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data() as Question;
          setFirestoreDocId(docSnap.id);
          setQuestion(data);
          
          // Fetch uploader nickname
          if (data.createdBy) {
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', data.createdBy)));
            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data() as User;
              setUploaderNickname(userData.nickname || null);
            }
          }
          
          // Check permissions: admin or creator
          if (user?.role !== 'admin' && data.createdBy !== user?.uid) {
            alert(t('edit.noPermission'));
            navigate('/');
            return;
          }

          setFormData({
            field: Array.isArray(data.field) ? data.field : [data.field as QuestionField],
            source: data.source,
            sourceDetail: data.sourceDetail,
            difficulty: Array.isArray(data.difficulty) ? data.difficulty : [data.difficulty] as QuestionDifficulty[],
            type: data.type,
            answer: data.answer || '',
            explanation: data.explanation || '',
            content: data.content || '',
            publicTags: data.publicTags || [],
          });
        } else {
          alert(t('edit.notExist'));
          navigate('/');
        }
      } catch (err) {
        console.error("Error fetching question:", err);
        alert(t('edit.loadFail'));
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(t('edit.saveSuccessDemo'));
        navigate('/');
        return;
      }

      if (!firestoreDocId) {
        throw new Error("Missing Firestore document ID");
      }

      await updateDoc(doc(db, 'questions', firestoreDocId), {
        ...question,
        ...formData
      });
      navigate('/');
    } catch (err) {
      console.error("Error saving question:", err);
      alert(t('edit.loadFail'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
          <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full -z-10 animate-pulse" />
        </div>
        <p className={`${theme.subText} text-xs font-black uppercase tracking-[0.2em] animate-pulse`}>{t('edit.loading')}</p>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">
            <div className="w-8 h-[2px] bg-green-600/30 rounded-full" />
            <span>{t('edit.subtitle')}</span>
          </div>
          <h1 className={`text-4xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{t('edit.title')}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 ${isNight ? 'bg-slate-800' : 'bg-slate-900'} text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors duration-1000`}>
              ID: {question.id}
            </span>
            <span className={`${theme.subText} font-medium text-sm transition-colors duration-1000`}>
              {t('edit.uploaderInfo', { 
                uploader: uploaderNickname || question.creatorNickname || question.creatorStudentId || 'SYSTEM',
                date: new Date(question.createdAt).toLocaleDateString()
              })}
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/')}
          className={`flex items-center gap-3 px-6 py-3 ${theme.card} border ${theme.border} ${theme.subText} hover:${theme.text} font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 duration-1000`}
        >
          <ChevronLeft className="w-4 h-4" /> {t('edit.backToBank')}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Left: Image Preview & OCR */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`${theme.card} backdrop-blur-2xl p-8 rounded-[3rem] border ${theme.border} space-y-6 transition-all duration-1000`}>
            <h2 className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest flex items-center gap-3 transition-colors duration-1000`}>
              <ImageIcon className="w-4 h-4 text-green-600" />
              {t('edit.imagePreview')}
            </h2>
            <div className={`aspect-auto ${isNight ? 'bg-slate-900/40' : 'bg-slate-50/50'} rounded-[2rem] overflow-hidden border ${theme.border} transition-colors duration-1000 flex items-center justify-center min-h-[200px]`}>
              {question.imageUrl ? (
                <img 
                  src={question.imageUrl} 
                  alt="Question" 
                  className={`w-full h-auto object-contain transition-all duration-1000 ${isNight ? 'invert-[0.85] hue-rotate-180 brightness-110 contrast-110' : ''}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={`p-10 text-center ${theme.subText} text-sm font-medium transition-colors duration-1000`}>
                  {t('edit.noImage')}
                </div>
              )}
            </div>
          </div>
          
          <div className={`${isNight ? 'bg-green-500/5' : 'bg-green-50/50'} backdrop-blur-xl border ${isNight ? 'border-green-500/10' : 'border-green-100/30'} p-8 rounded-[3rem] space-y-4 transition-all duration-1000`}>
            <h3 className="text-[10px] font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
              <Info className="w-4 h-4" /> {t('edit.ocrIndex')}
            </h3>
            <textarea
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              className={`w-full h-48 p-6 ${isNight ? 'bg-slate-900/40' : 'bg-white/50'} border ${isNight ? 'border-green-500/10' : 'border-green-200/30'} rounded-[2rem] text-sm font-medium ${theme.text} focus:bg-white focus:border-green-500/30 focus:ring-4 focus:ring-green-500/5 outline-none resize-none transition-all leading-relaxed duration-1000`}
              placeholder={t('edit.ocrPlaceholder')}
            />
          </div>
        </div>

        {/* Right: Edit Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-8">
          <div className={`${theme.card} backdrop-blur-2xl p-10 rounded-[3rem] border ${theme.border} space-y-10 transition-all duration-1000`}>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('edit.fieldLabel')}</label>
                <div className="flex flex-wrap gap-2 p-2">
                  {['生物化学', '细胞生物学', '植物学', '动物学', '微生物学', '动物生理学', '植物生理学', '其他'].map((f) => (
                    <label key={f} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={formData.field.includes(f as QuestionField)}
                        onChange={(e) => {
                          const newFields = e.target.checked 
                            ? [...formData.field, f as QuestionField]
                            : formData.field.filter(field => field !== f);
                          setFormData({...formData, field: newFields});
                        }}
                        className="hidden"
                      />
                      <div className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black transition-all ${
                        formData.field.includes(f as QuestionField)
                          ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-500/20'
                          : `${isNight ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-slate-200 bg-white/50 text-slate-400'}`
                      }`}>
                        {t(`enum.field.${f}`)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('edit.sourceLabel')}</label>
                <select 
                  value={formData.source}
                  onChange={e => setFormData({...formData, source: e.target.value as QuestionSource})}
                  className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
                  required
                >
                  {['猿辅导', '汇智启航', '北斗学友', '联赛题', '国赛题', '愿程', '其他'].map(s => (
                    <option key={s} value={s}>{t(`enum.source.${s}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('edit.sourceDetailLabel')}</label>
              <input 
                type="text"
                value={formData.sourceDetail}
                onChange={e => setFormData({...formData, sourceDetail: e.target.value})}
                placeholder={t('edit.sourceDetailPlaceholder')}
                className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('edit.difficultyLabel')}</label>
                <div className="flex gap-4 px-2 py-3">
                  {['易错题', '难题'].map((diff) => (
                    <label key={diff} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={formData.difficulty.includes(diff as QuestionDifficulty)}
                        onChange={(e) => {
                          const newDifficulty = e.target.checked 
                            ? [...formData.difficulty, diff as QuestionDifficulty]
                            : formData.difficulty.filter(d => d !== diff);
                          setFormData({...formData, difficulty: newDifficulty});
                        }}
                        className="hidden"
                      />
                      <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                        formData.difficulty.includes(diff as QuestionDifficulty)
                          ? 'bg-green-600 border-green-600 shadow-lg shadow-green-500/20'
                          : `${isNight ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white/50'}`
                      }`}>
                        {formData.difficulty.includes(diff as QuestionDifficulty) && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`text-sm font-bold ${formData.difficulty.includes(diff as QuestionDifficulty) ? theme.text : theme.subText} transition-colors`}>
                        {t(`enum.diff.${diff}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('edit.typeLabel')}</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as QuestionType})}
                  className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
                >
                  {['概念题', '计算题', '材料题'].map(type => (
                    <option key={type} value={type}>{t(`enum.type.${type}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('edit.publicTagsLabel')}</label>
              <input 
                type="text"
                value={formData.publicTags.join(', ')}
                onChange={e => setFormData({...formData, publicTags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                placeholder={t('edit.publicTagsPlaceholder')}
                className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
              />
            </div>

            <div className={`pt-10 border-t ${theme.border} space-y-8 transition-colors duration-1000`}>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('edit.answerLabel')}</label>
                <input 
                  type="text"
                  value={formData.answer}
                  onChange={e => setFormData({...formData, answer: e.target.value})}
                  placeholder={t('edit.answerPlaceholder')}
                  className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-lg font-black ${theme.text} transition-all duration-1000`}
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('edit.explanationLabel')}</label>
                <textarea 
                  value={formData.explanation}
                  onChange={e => setFormData({...formData, explanation: e.target.value})}
                  placeholder={t('edit.explanationPlaceholder')}
                  rows={5}
                  className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-medium ${theme.text} transition-all resize-none leading-relaxed duration-1000`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full py-5 ${isNight ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'} text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 duration-1000`}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {t('edit.saveBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
