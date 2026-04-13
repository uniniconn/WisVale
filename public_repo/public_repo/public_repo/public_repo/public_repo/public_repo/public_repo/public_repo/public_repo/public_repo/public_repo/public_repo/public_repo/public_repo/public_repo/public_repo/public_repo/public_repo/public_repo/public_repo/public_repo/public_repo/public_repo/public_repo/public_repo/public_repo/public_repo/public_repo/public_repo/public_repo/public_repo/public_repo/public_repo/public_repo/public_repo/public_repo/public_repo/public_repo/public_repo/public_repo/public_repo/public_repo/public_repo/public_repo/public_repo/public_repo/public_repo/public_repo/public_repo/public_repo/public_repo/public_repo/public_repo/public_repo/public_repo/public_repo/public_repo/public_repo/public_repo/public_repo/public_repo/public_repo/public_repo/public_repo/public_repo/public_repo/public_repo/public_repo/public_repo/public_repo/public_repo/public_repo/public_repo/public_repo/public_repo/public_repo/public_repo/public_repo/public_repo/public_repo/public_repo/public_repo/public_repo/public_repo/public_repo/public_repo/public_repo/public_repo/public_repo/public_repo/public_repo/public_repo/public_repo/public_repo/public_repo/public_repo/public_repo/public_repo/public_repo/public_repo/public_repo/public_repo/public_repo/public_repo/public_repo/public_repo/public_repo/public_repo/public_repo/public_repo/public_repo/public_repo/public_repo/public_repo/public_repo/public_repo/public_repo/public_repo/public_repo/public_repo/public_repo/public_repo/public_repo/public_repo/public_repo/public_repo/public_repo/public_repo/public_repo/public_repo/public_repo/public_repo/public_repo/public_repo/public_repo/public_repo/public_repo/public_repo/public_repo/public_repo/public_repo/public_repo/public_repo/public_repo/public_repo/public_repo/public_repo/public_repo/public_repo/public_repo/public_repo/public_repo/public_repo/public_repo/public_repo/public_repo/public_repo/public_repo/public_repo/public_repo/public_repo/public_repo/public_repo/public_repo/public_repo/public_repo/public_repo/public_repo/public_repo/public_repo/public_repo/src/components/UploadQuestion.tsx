import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { db, auth, isDemoMode, awardPoints, trackTokens } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, increment, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { extractTextFromImage, processQuestionWithAI, generateSingleKpWithAI } from '../services/apiService';
import { motion } from 'motion/react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, RefreshCw, Camera, FolderOpen, Brain, Sparkles, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { QuestionField, QuestionSource, QuestionDifficulty, QuestionType } from '../types';
import { useTheme } from '../hooks/useTheme';

// Image compression utility
const compressImage = (file: File, maxWidth = 1024, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if too large
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        
        ctx.drawImage(img, 0, 0, width, height);
        // Use image/jpeg for better compression ratio
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function UploadQuestion() {
  const navigate = useNavigate();
  const { isNight, theme } = useTheme();
  const { t } = useLanguage();
  const textCameraInputRef = useRef<HTMLInputElement>(null);
  const textGalleryInputRef = useRef<HTMLInputElement>(null);
  const suppCameraInputRef = useRef<HTMLInputElement>(null);
  const suppGalleryInputRef = useRef<HTMLInputElement>(null);
  const explanationCameraInputRef = useRef<HTMLInputElement>(null);
  const explanationGalleryInputRef = useRef<HTMLInputElement>(null);

  const [textImageFile, setTextImageFile] = useState<File | null>(null);
  const [textImagePreview, setTextImagePreview] = useState<string | null>(null);
  const [supplementaryFile, setSupplementaryFile] = useState<File | null>(null);
  const [supplementaryPreview, setSupplementaryPreview] = useState<string | null>(null);
  const [explanationFile, setExplanationFile] = useState<File | null>(null);
  const [explanationPreview, setExplanationPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [kpLoadingStates, setKpLoadingStates] = useState<Record<number, boolean>>({});
  const [pendingKnowledgePoints, setPendingKnowledgePoints] = useState<{ title: string; content: string }[]>([]);
  const [formData, setFormData] = useState({
    field: ['生物化学'] as QuestionField[],
    source: '猿辅导' as QuestionSource,
    sourceDetail: '',
    difficulty: ['易错题'] as QuestionDifficulty[],
    type: '概念题' as QuestionType,
    content: '',
    answer: '',
    explanation: '',
    knowledgePoints: [] as { title: string; content: string }[],
  });

  const handleRegenerateSingleKp = async (index: number) => {
    if (!formData.content.trim()) return;
    setKpLoadingStates(prev => ({ ...prev, [index]: true }));
    try {
      const data = await generateSingleKpWithAI(formData.content, [...formData.knowledgePoints, ...pendingKnowledgePoints]);
      
      if (data.knowledgePoint) {
        setPendingKnowledgePoints(prev => {
          const next = [...prev];
          next[index] = data.knowledgePoint;
          return next;
        });
      }
      if (data.usage?.total_tokens) {
        trackTokens(data.usage.total_tokens);
      }
    } catch (err) {
      console.error('Single KP regeneration failed:', err);
    } finally {
      setKpLoadingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleCollectToKnowledgeBase = async (kp: { title: string; content: string }) => {
    if (!auth.currentUser) return;
    try {
      // Deduplication check
      const q = query(
        collection(db, 'knowledgePoints'),
        where('userId', '==', auth.currentUser.uid),
        where('title', '==', kp.title)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert(t('upload.kpExists', { title: kp.title }));
        return;
      }

      const kpData = {
        userId: auth.currentUser.uid,
        title: kp.title,
        content: kp.content,
        level: 1,
        mastered: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questionId: 'pending_upload',
        field: formData.field[0] || '其他'
      };
      await addDoc(collection(db, 'knowledgePoints'), kpData);
      alert(t('upload.kpCollected', { title: kp.title }));
    } catch (err) {
      console.error('Failed to collect knowledge point:', err);
      alert(t('upload.kpCollectFail'));
    }
  };

  const handleRegenerateKps = async () => {
    if (!formData.content.trim()) return;
    setIsAiProcessing(true);
    try {
      const data = await processQuestionWithAI(formData.content);
      
      setPendingKnowledgePoints(data.knowledgePoints || []);
      if (data.usage?.total_tokens) {
        trackTokens(data.usage.total_tokens);
      }
    } catch (err) {
      console.error('Regeneration failed:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const onDropText = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setTextImageFile(selectedFile);
      try {
        const compressedDataUrl = await compressImage(selectedFile);
        setTextImagePreview(compressedDataUrl);
      } catch (err) {
        console.error('Compression failed:', err);
      }
    }
  }, []);

  const onDropExplanation = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setExplanationFile(selectedFile);
      try {
        const compressedDataUrl = await compressImage(selectedFile);
        setExplanationPreview(compressedDataUrl);
      } catch (err) {
        console.error('Compression failed:', err);
      }
    }
  }, []);

  const handleStartRecognition = async () => {
    if (!textImagePreview) {
      alert(t('upload.noImageError'));
      return;
    }
    setIsOcrLoading(true);
    setIsAiProcessing(true);
    let rawText = '';
    let rawExplanation = '';
    try {
      rawText = await extractTextFromImage(textImagePreview);
      if (explanationPreview) {
        rawExplanation = await extractTextFromImage(explanationPreview);
      }
      
      // Helper for similarity check
      const levenshteinDistance = (s1: string, s2: string): number => {
        const len1 = s1.length;
        const len2 = s2.length;
        const matrix = Array.from({ length: len1 + 1 }, (_, i) => [i]);
        for (let j = 1; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
          for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + cost
            );
          }
        }
        return matrix[len1][len2];
      };

      // Pre-AI duplicate check
      const qSnap = await getDocs(collection(db, 'questions'));
      let duplicateDocId = '';
      const isDuplicate = qSnap.docs.some(doc => {
        const content = doc.data().content;
        if (!content) return false;
        const cleanedRaw = rawText.replace(/\s/g, '');
        const cleanedContent = content.replace(/\s/g, '');
        
        const distance = levenshteinDistance(cleanedRaw, cleanedContent);
        const maxLen = Math.max(cleanedRaw.length, cleanedContent.length);
        const similarity = 1 - (distance / maxLen);
        
        const match = similarity > 0.9; // 90% similarity threshold
        if (match) duplicateDocId = doc.id;
        return match;
      });

      if (isDuplicate) {
        alert(t('upload.duplicateQuestion'));
        navigate(`/question/${duplicateDocId}`);
        return;
      }

      const data = await processQuestionWithAI(rawText, rawExplanation);

        setFormData(prev => ({ 
          ...prev, 
          content: data.cleanedContent,
          explanation: data.cleanedExplanation || rawExplanation
        }));
        
        // Deduplicate AI suggested knowledge points
        const uniqueKps = (data.knowledgePoints || []).filter((kp: any, index: number, self: any[]) =>
          index === self.findIndex((t) => t.title === kp.title)
        );
        setPendingKnowledgePoints(uniqueKps);
        
        if (data.usage?.total_tokens) {
          trackTokens(data.usage.total_tokens);
        }
    } catch (err) {
      console.error('Processing failed:', err);
      if (rawText) {
        setFormData(prev => ({ ...prev, content: rawText, explanation: rawExplanation }));
      }
      alert(t('upload.ocrFail'));
    } finally {
      setIsOcrLoading(false);
      setIsAiProcessing(false);
    }
  };

  const onDropSupplementary = useCallback(async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setSupplementaryFile(selectedFile);
      try {
        const compressedDataUrl = await compressImage(selectedFile);
        setSupplementaryPreview(compressedDataUrl);
      } catch (err) {
        console.error('Compression failed:', err);
      }
    }
  }, []);

  const { getRootProps: getTextRootProps, getInputProps: getTextHiddenInputProps, isDragActive: isTextDragActive } = useDropzone({
    onDrop: onDropText,
    accept: { 'image/*': [] },
    multiple: false,
    noClick: true, // Disable click on the root to handle buttons manually
  });

  const { getRootProps: getSuppRootProps, getInputProps: getSuppHiddenInputProps, isDragActive: isSuppDragActive } = useDropzone({
    onDrop: onDropSupplementary,
    accept: { 'image/*': [] },
    multiple: false,
    noClick: true, // Disable click on the root to handle buttons manually
  });

  const { getRootProps: getExplanationRootProps, getInputProps: getExplanationHiddenInputProps, isDragActive: isExplanationDragActive } = useDropzone({
    onDrop: onDropExplanation,
    accept: { 'image/*': [] },
    multiple: false,
    noClick: true,
  });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (files: File[]) => void) => {
    if (e.target.files && e.target.files.length > 0) {
      callback([e.target.files[0]]);
    }
  };

  const handleOcr = async () => {
    if (!textImagePreview) return;
    setIsOcrLoading(true);
    try {
      const keywords = await extractTextFromImage(textImagePreview);
      setFormData(prev => ({ ...prev, content: keywords }));
    } catch (err) {
      console.error('OCR failed:', err);
      alert(t('upload.ocrFail'));
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textImagePreview) {
      alert(t('upload.noImageError'));
      return;
    }
    if (!formData.content.trim()) {
      alert(t('upload.noContentError'));
      return;
    }
    if (formData.knowledgePoints.length === 0) {
      alert(t('upload.noKpError'));
      return;
    }
    if (formData.knowledgePoints.length > 3) {
      alert(t('upload.tooManyKpsError'));
      return;
    }
    
    setLoading(true);
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert(t('edit.saveSuccessDemo'));
        navigate('/');
        return;
      }

      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      // Get next ID
      const statsRef = doc(db, 'config', 'stats');
      const statsSnap = await getDoc(statsRef);
      let nextId = 1;
      if (statsSnap.exists()) {
        nextId = (statsSnap.data().questionCount || 0) + 1;
      }
      const formattedId = `U${String(nextId).padStart(4, '0')}`;

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();
      
      const questionData = {
        id: formattedId,
        imageUrl: supplementaryPreview || null, // Only store supplementary image
        ...formData,
        createdBy: auth.currentUser.uid,
        creatorStudentId: (isDemoMode ? 'demo' : userData?.studentId) || '未知',
        creatorNickname: (isDemoMode ? t('login.demo') : userData?.nickname) || null,
        createdAt: new Date().toISOString(),
      };

      const docRef = doc(db, 'questions', formattedId);
      await setDoc(docRef, questionData);
      await setDoc(statsRef, { questionCount: increment(1) }, { merge: true });
      
      // Save confirmed knowledge points to the knowledge base
      let newKpsCount = 0;
      if (formData.knowledgePoints.length > 0) {
        const batch = writeBatch(db);
        for (const kp of formData.knowledgePoints) {
          // Check for duplicates before adding to batch
          const q = query(
            collection(db, 'knowledgePoints'),
            where('userId', '==', auth.currentUser.uid),
            where('title', '==', kp.title)
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            newKpsCount++;
            const kpRef = doc(collection(db, 'knowledgePoints'));
            batch.set(kpRef, {
              id: kpRef.id,
              userId: auth.currentUser!.uid,
              questionId: formattedId,
              field: formData.field[0] || '其他',
              title: kp.title,
              content: kp.content,
              level: 1,
              mastered: false,
              createdAt: new Date().toISOString()
            });
          }
        }
        await batch.commit();
      }

      // Update user stats
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        questionsUploaded: increment(1),
        kpsUploaded: increment(newKpsCount)
      });

      // Award points for upload
      await awardPoints(10);
      
      alert(t('upload.submitSuccess'));
      navigate('/');
    } catch (err) {
      console.error(err);
      alert(t('upload.submitFail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">
          <div className="w-8 h-[2px] bg-green-600/30 rounded-full" />
          <span>{t('upload.title')} · UPLOAD QUESTION</span>
        </div>
        <h1 className={`text-4xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{t('upload.title')}</h1>
        <p className={`${theme.subText} font-medium transition-colors duration-1000`}>{t('upload.subtitle')}</p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left: Image Uploads */}
          <div className="lg:col-span-2 space-y-6">
            {/* Text Image (Required) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${theme.card} backdrop-blur-2xl rounded-[2.5rem] border-2 border-dashed ${isNight ? 'border-slate-800' : 'border-white/60'} p-6 text-center group hover:border-green-500/30 transition-all duration-1000`}
            >
              <h3 className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest mb-4 flex items-center justify-center gap-2`}>
                <ImageIcon className="w-3 h-3 text-green-600" />
                {t('upload.title')} ({t('common.finish')} · {t('common.next')})
              </h3>
              {!textImagePreview ? (
                <div {...getTextRootProps()} className={`py-10 ${isTextDragActive ? 'bg-green-500/5' : ''} transition-colors duration-500`}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={textCameraInputRef}
                    onChange={(e) => handleFileInputChange(e, onDropText)}
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={textGalleryInputRef}
                    onChange={(e) => handleFileInputChange(e, onDropText)}
                  />
                  
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => textCameraInputRef.current?.click()}
                        className={`w-16 h-16 ${isNight ? 'bg-green-500/10' : 'bg-green-50/50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
                      >
                        <Camera className="w-8 h-8 text-green-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => textGalleryInputRef.current?.click()}
                        className={`w-16 h-16 ${isNight ? 'bg-slate-800' : 'bg-slate-100'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
                      >
                        <FolderOpen className="w-8 h-8 text-slate-500" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[10px] ${theme.subText} font-black uppercase tracking-widest`}>
                        {isTextDragActive ? t('upload.releaseToSelect') : t('upload.clickOrDrag')}
                      </p>
                      <div className="flex justify-center gap-4 text-[8px] font-black uppercase tracking-widest opacity-40">
                        <span>{t('upload.camera')}</span>
                        <span>•</span>
                        <span>{t('upload.gallery')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative group/preview">
                  <img src={textImagePreview} alt="Text Preview" className={`max-h-[200px] mx-auto rounded-2xl border ${theme.border} transition-all duration-1000 ${isNight ? 'invert-[0.85] hue-rotate-180 brightness-110 contrast-110' : ''}`} />
                  <div className="absolute -top-2 -right-2 flex gap-2">
                    <button 
                      type="button"
                      onClick={() => { setTextImagePreview(null); setTextImageFile(null); }}
                      className="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition-all active:scale-90 shadow-lg"
                      title={t('upload.remove')}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Supplementary Image (Optional) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className={`${theme.card} backdrop-blur-2xl rounded-[2.5rem] border-2 border-dashed ${isNight ? 'border-slate-800' : 'border-white/60'} p-6 text-center group hover:border-blue-500/30 transition-all duration-1000`}
            >
              <h3 className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest mb-4 flex items-center justify-center gap-2`}>
                <ImageIcon className="w-3 h-3 text-blue-500" />
                {t('upload.explanation')} ({t('upload.optional')})
              </h3>
              {!supplementaryPreview ? (
                <div {...getSuppRootProps()} className={`py-10 ${isSuppDragActive ? 'bg-blue-500/5' : ''} transition-colors duration-500`}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={suppCameraInputRef}
                    onChange={(e) => handleFileInputChange(e, onDropSupplementary)}
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={suppGalleryInputRef}
                    onChange={(e) => handleFileInputChange(e, onDropSupplementary)}
                  />

                  <div className="flex flex-col items-center gap-6">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => suppCameraInputRef.current?.click()}
                        className={`w-16 h-16 ${isNight ? 'bg-blue-500/10' : 'bg-blue-50/50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
                      >
                        <Camera className="w-8 h-8 text-blue-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => suppGalleryInputRef.current?.click()}
                        className={`w-16 h-16 ${isNight ? 'bg-slate-800' : 'bg-slate-100'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
                      >
                        <FolderOpen className="w-8 h-8 text-slate-500" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[10px] ${theme.subText} font-black uppercase tracking-widest`}>
                        {isSuppDragActive ? t('upload.releaseToSelect') : t('upload.clickOrDrag')}
                      </p>
                      <div className="flex justify-center gap-4 text-[8px] font-black uppercase tracking-widest opacity-40">
                        <span>{t('upload.camera')}</span>
                        <span>•</span>
                        <span>{t('upload.gallery')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative group/preview">
                  <img src={supplementaryPreview} alt="Supp Preview" className={`max-h-[200px] mx-auto rounded-2xl border ${theme.border} transition-all duration-1000 ${isNight ? 'invert-[0.85] hue-rotate-180 brightness-110 contrast-110' : ''}`} />
                  <div className="absolute -top-2 -right-2">
                    <button 
                      type="button"
                      onClick={() => { setSupplementaryPreview(null); setSupplementaryFile(null); }}
                      className="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition-all active:scale-90 shadow-lg"
                      title={t('upload.remove')}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
            {/* Explanation Image (Optional) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`${theme.card} backdrop-blur-2xl rounded-[2.5rem] border-2 border-dashed ${isNight ? 'border-slate-800' : 'border-white/60'} p-6 text-center group hover:border-amber-500/30 transition-all duration-1000`}
            >
              <h3 className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest mb-4 flex items-center justify-center gap-2`}>
                <ImageIcon className="w-3 h-3 text-amber-500" />
                {t('upload.explanation')} ({t('upload.optional')} · {t('upload.autoOcr')})
              </h3>
              {!explanationPreview ? (
                <div {...getExplanationRootProps()} className={`py-10 ${isExplanationDragActive ? 'bg-amber-500/5' : ''} transition-colors duration-500`}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={explanationCameraInputRef}
                    onChange={(e) => handleFileInputChange(e, onDropExplanation)}
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={explanationGalleryInputRef}
                    onChange={(e) => handleFileInputChange(e, onDropExplanation)}
                  />

                  <div className="flex flex-col items-center gap-6">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => explanationCameraInputRef.current?.click()}
                        className={`w-16 h-16 ${isNight ? 'bg-amber-500/10' : 'bg-amber-50/50'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
                      >
                        <Camera className="w-8 h-8 text-amber-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => explanationGalleryInputRef.current?.click()}
                        className={`w-16 h-16 ${isNight ? 'bg-slate-800' : 'bg-slate-100'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
                      >
                        <FolderOpen className="w-8 h-8 text-slate-500" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-[10px] ${theme.subText} font-black uppercase tracking-widest`}>
                        {isExplanationDragActive ? t('upload.releaseToSelect') : t('upload.clickOrDrag')}
                      </p>
                      <div className="flex justify-center gap-4 text-[8px] font-black uppercase tracking-widest opacity-40">
                        <span>{t('upload.camera')}</span>
                        <span>•</span>
                        <span>{t('upload.gallery')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative group/preview">
                  <img src={explanationPreview} alt="Explanation Preview" className={`max-h-[200px] mx-auto rounded-2xl border ${theme.border} transition-all duration-1000 ${isNight ? 'invert-[0.85] hue-rotate-180 brightness-110 contrast-110' : ''}`} />
                  <div className="absolute -top-2 -right-2">
                    <button 
                      type="button"
                      onClick={() => { setExplanationPreview(null); setExplanationFile(null); }}
                      className="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition-all active:scale-90 shadow-lg"
                      title={t('upload.remove')}
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Start Recognition Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <p className={`text-xs text-center font-medium ${theme.subText}`}>
                {t('upload.aiHint')}
              </p>
              <button
                type="button"
                onClick={handleStartRecognition}
                disabled={!textImagePreview || isOcrLoading || isAiProcessing}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center gap-2"
              >
                {isOcrLoading || isAiProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('upload.aiAnalyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t('upload.aiAnalyzing')}
                  </>
                )}
              </button>
            </motion.div>
          </div>

          {/* Right: Metadata */}
          <div className={`lg:col-span-3 ${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} p-10 space-y-8 transition-all duration-1000`}>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.field')}</label>
                <div className="flex flex-wrap gap-2 p-2">
                  {['生物化学', '细胞生物学', '植物学', '动物学', '微生物学', '动物生理学', '植物生理学', '其他'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        const current = formData.field as QuestionField[];
                        const next = current.includes(f as QuestionField)
                          ? current.filter(item => item !== f)
                          : [...current, f as QuestionField];
                        setFormData({ ...formData, field: next });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        (formData.field as QuestionField[]).includes(f as QuestionField)
                          ? 'bg-green-600 text-white border-green-500'
                          : `${isNight ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'}`
                      }`}
                    >
                      {t(`enum.field.${f}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.source')}</label>
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
              <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.source')}</label>
              <input 
                type="text"
                value={formData.sourceDetail}
                onChange={e => setFormData({...formData, sourceDetail: e.target.value})}
                placeholder={t('upload.source')}
                className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.difficulty')}</label>
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
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.type')}</label>
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
            {/* Knowledge Points Section */}
            <div className="space-y-6">
              {/* Confirmed Knowledge Points */}
              {formData.knowledgePoints.length > 0 && (
                <div className="space-y-4 p-6 bg-green-500/5 rounded-[2rem] border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('upload.confirmKps')} ({formData.knowledgePoints.length})
                    </div>
                    {formData.knowledgePoints.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newKp = { title: '', content: '' };
                          // Avoid adding if last one is empty
                          const lastKp = formData.knowledgePoints[formData.knowledgePoints.length - 1];
                          if (lastKp && !lastKp.title.trim() && !lastKp.content.trim()) return;
                          
                          setFormData(prev => ({
                            ...prev,
                            knowledgePoints: [...prev.knowledgePoints, newKp]
                          }));
                        }}
                        className="text-[10px] font-black text-green-600 uppercase tracking-widest hover:text-green-700 transition-all"
                      >
                        + {t('upload.addKp')}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {formData.knowledgePoints.map((kp, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border ${isNight ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} flex flex-col gap-2 group`}>
                        <div className="flex justify-between items-start">
                          <input
                            type="text"
                            value={kp.title}
                            onChange={(e) => {
                              const newKps = [...formData.knowledgePoints];
                              newKps[idx].title = e.target.value;
                              setFormData(prev => ({ ...prev, knowledgePoints: newKps }));
                            }}
                            placeholder={t('upload.knowledgePoints')}
                            className={`w-full bg-transparent border-b ${isNight ? 'border-slate-700 focus:border-green-500' : 'border-slate-200 focus:border-green-500'} outline-none text-xs font-black ${theme.text} pb-1 transition-colors`}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                knowledgePoints: prev.knowledgePoints.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-2"
                          >
                            <RefreshCw className="w-3 h-3 rotate-45" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={kp.content}
                          onChange={(e) => {
                            const newKps = [...formData.knowledgePoints];
                            newKps[idx].content = e.target.value;
                            setFormData(prev => ({ ...prev, knowledgePoints: newKps }));
                          }}
                          placeholder={t('upload.content')}
                          className={`w-full bg-transparent border-b ${isNight ? 'border-slate-700 focus:border-green-500' : 'border-slate-200 focus:border-green-500'} outline-none text-[10px] font-bold ${theme.subText} pb-1 transition-colors`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending AI Suggestions */}
              {(pendingKnowledgePoints.length > 0 || isAiProcessing) && (
                <div className="space-y-4 p-6 bg-amber-500/5 rounded-[2rem] border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                      <Sparkles className="w-3 h-3" />
                      {t('upload.aiAnalyzing')} ({t('common.confirm')})
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const combined = [...prev.knowledgePoints, ...pendingKnowledgePoints];
                            const unique = combined.filter((kp, index, self) =>
                              index === self.findIndex((t) => t.title === kp.title)
                            );
                            return {
                              ...prev,
                              knowledgePoints: unique
                            };
                          });
                          setPendingKnowledgePoints([]);
                        }}
                        disabled={isAiProcessing || pendingKnowledgePoints.length === 0}
                        className="text-[10px] font-black text-green-600 uppercase tracking-widest hover:text-green-700 transition-all disabled:opacity-50"
                      >
                        {t('common.confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={handleRegenerateKps}
                        disabled={isAiProcessing}
                        className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isAiProcessing ? 'animate-spin' : ''}`} />
                        {t('common.edit')}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {isAiProcessing ? (
                      <div className="py-10 flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('upload.aiAnalyzing')}</span>
                      </div>
                    ) : (
                      pendingKnowledgePoints.map((kp, idx) => (
                        <div key={idx} className={`p-4 rounded-2xl border ${isNight ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} flex justify-between items-center relative overflow-hidden`}>
                          {kpLoadingStates[idx] && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className={`text-xs font-black ${theme.text}`}>{kp.title}</p>
                            <p className={`text-[10px] font-bold ${theme.subText} mt-1`}>{t('upload.answer')}: {kp.content}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleCollectToKnowledgeBase(kp)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                              title={t('nav.knowledge')}
                            >
                              <Brain className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerateSingleKp(idx)}
                              disabled={kpLoadingStates[idx]}
                              className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                              title={t('common.edit')}
                            >
                              <RefreshCw className={`w-3 h-3 ${kpLoadingStates[idx] ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (formData.knowledgePoints.length >= 3) {
                                  alert(t('common.error'));
                                  return;
                                }
                                setFormData(prev => ({
                                  ...prev,
                                  knowledgePoints: [...prev.knowledgePoints, kp]
                                }));
                                setPendingKnowledgePoints(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all"
                            >
                              {t('common.confirm')}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {!isAiProcessing && pendingKnowledgePoints.length === 0 && formData.content.trim() && (
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleRegenerateKps}
                    className={`flex-1 py-4 border-2 border-dashed ${isNight ? 'border-slate-800' : 'border-slate-200'} rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black ${theme.subText} uppercase tracking-widest hover:border-green-500/30 hover:text-green-600 transition-all`}
                  >
                    <Brain className="w-4 h-4" />
                    {t('upload.aiAnalyzing')}
                  </button>
                  {formData.knowledgePoints.length < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          knowledgePoints: [...prev.knowledgePoints, { title: '', content: '' }]
                        }));
                      }}
                      className={`flex-1 py-4 border-2 border-dashed ${isNight ? 'border-slate-800' : 'border-slate-200'} rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black ${theme.subText} uppercase tracking-widest hover:border-green-500/30 hover:text-green-600 transition-all`}
                    >
                      <Plus className="w-4 h-4" />
                      {t('upload.addKp')}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.content')}</label>
              <div className="relative">
                <textarea 
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  rows={6}
                  placeholder={t('upload.content')}
                  className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all resize-none duration-1000`}
                />
                {(isOcrLoading || isAiProcessing) && (
                  <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                        {isAiProcessing ? t('upload.aiAnalyzing') : t('upload.ocrProcessing')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.answer')} ({t('upload.optional')})</label>
              <input 
                type="text"
                value={formData.answer}
                onChange={e => setFormData({...formData, answer: e.target.value})}
                className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
              />
            </div>
            <div className="space-y-2">
              <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.explanation')} ({t('upload.optional')})</label>
              <textarea 
                value={formData.explanation}
                onChange={e => setFormData({...formData, explanation: e.target.value})}
                rows={3}
                className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all resize-none duration-1000`}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`px-10 py-5 ${theme.card} ${theme.subText} rounded-2xl font-black text-[10px] uppercase tracking-widest hover:${theme.text} transition-all active:scale-95 duration-1000`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !textImagePreview || !formData.content.trim()}
            className="flex items-center justify-center gap-3 px-12 py-5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {loading ? t('common.loading') : t('upload.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
