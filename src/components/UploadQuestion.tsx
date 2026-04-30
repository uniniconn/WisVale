import { useState, useCallback, useRef, memo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { api, awardPoints, trackTokens } from '../lib/api';
import { processQuestionWithAI, generateSingleKpWithAI, performOCR } from '../services/apiService';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Loader2, CheckCircle2, AlertCircle, RefreshCw, Brain, Sparkles, Plus, Command, Crop as CropIcon, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { QuestionField, QuestionSource, QuestionDifficulty, QuestionType, User } from '../types';
import { useTheme } from '../hooks/useTheme';
import { compressImage, prepareForOCR } from '../lib/imageUtils';
import ImageUploadCard from './upload/ImageUploadCard';
import KPPreviewCard from './upload/KPPreviewCard';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// --- Helpers ---

async function getCroppedImg(image: HTMLImageElement, pixelCrop: PixelCrop): Promise<string> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  // Set canvas to the actual pixels from the original image
  canvas.width = pixelCrop.width * scaleX;
  canvas.height = pixelCrop.height * scaleY;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  // Use high-quality smoothing for any potential scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Return maximum quality jpeg
  return canvas.toDataURL('image/jpeg', 1.0);
}

function detectQuestionArea(image: HTMLImageElement): Crop {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, image.width, image.height), image.width, image.height);

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  let found = false;

  // Use smaller step and more robust threshold
  const step = 5;
  const threshold = 180; // Detect pixels darker than this (for white background)

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const i = (y * canvas.width + x) * 4;
      const r = imageData[i];
      const g = imageData[i+1];
      const b = imageData[i+2];
      
      // Simple dark pixel detection (text usually is black/dark blue on white)
      if (r < threshold && g < threshold && b < threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // If no content found or the area is too small (noise), default to 90% center
  if (!found || (maxX - minX < 20 && maxY - minY < 20)) {
    return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, image.width, image.height), image.width, image.height);
  }

  const pad = 60;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(canvas.width, maxX + pad);
  maxY = Math.min(canvas.height, maxY + pad);

  return {
    unit: '%',
    x: (minX / canvas.width) * 100,
    y: (minY / canvas.height) * 100,
    width: ((maxX - minX) / canvas.width) * 100,
    height: ((maxY - minY) / canvas.height) * 100
  };
}

// --- Component ---

export default function UploadQuestion({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const { isNight, theme } = useTheme();
  const { t } = useLanguage();
  
  // Refs for manual triggers
  const textCameraInputRef = useRef<HTMLInputElement>(null);
  const textGalleryInputRef = useRef<HTMLInputElement>(null);
  const suppCameraInputRef = useRef<HTMLInputElement>(null);
  const suppGalleryInputRef = useRef<HTMLInputElement>(null);
  const explanationCameraInputRef = useRef<HTMLInputElement>(null);
  const explanationGalleryInputRef = useRef<HTMLInputElement>(null);

  // Image states
  const [textImagePreview, setTextImagePreview] = useState<string | null>(null);
  const [supplementaryPreview, setSupplementaryPreview] = useState<string | null>(null);
  const [explanationPreview, setExplanationPreview] = useState<string | null>(null);
  
  // Crop states
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [cropType, setCropType] = useState<'text' | 'supp' | 'expl'>('text');
  const cropImgRef = useRef<HTMLImageElement>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [kpLoadingStates, setKpLoadingStates] = useState<Record<number, boolean>>({});
  
  // Data states
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
      if (data.usage?.total_tokens && user) {
        trackTokens(data.usage.total_tokens, user.uid);
      }
    } catch (err) {
      console.error('Single KP regeneration failed:', err);
    } finally {
      setKpLoadingStates(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleRegenerateKps = async () => {
    if (!formData.content.trim()) return;
    setIsAiProcessing(true);
    try {
      const data = await processQuestionWithAI(formData.content);
      if (data.knowledgePoints) {
        setPendingKnowledgePoints(data.knowledgePoints);
      }
      if (data.usage?.total_tokens && user) {
        trackTokens(data.usage.total_tokens, user.uid);
      }
    } catch (err) {
      console.error('AI processing failed:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const onDropText = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file);
      setImageToCrop(dataUrl);
      setCropType('text');
      setIsCropping(true);
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  }, []);

  const handleCropConfirm = async () => {
    if (!cropImgRef.current || !completedCrop || !imageToCrop) return;

    try {
      const croppedDataUrl = await getCroppedImg(cropImgRef.current, completedCrop);
      setIsCropping(false);

      if (cropType === 'text') {
        setTextImagePreview(croppedDataUrl);
        setIsOcrLoading(true);
        setOcrProgress(20); // Network request started

        try {
          // Optimize for OCR.space limit (1MB) before sending
          const optimizedForOCR = await prepareForOCR(croppedDataUrl);
          const { text } = await performOCR(optimizedForOCR);
          setOcrProgress(100);

          if (text) {
            const ocrResult = text.trim();
            setFormData(prev => ({ ...prev, content: ocrResult }));
            
            setIsAiProcessing(true);
            const aiResult = await processQuestionWithAI(ocrResult);
            if (aiResult.knowledgePoints) {
              setPendingKnowledgePoints(aiResult.knowledgePoints);
            }
            if (aiResult.field) {
              setFormData(prev => ({ 
                ...prev, 
                field: Array.isArray(aiResult.field) ? aiResult.field : [aiResult.field as QuestionField],
                answer: aiResult.answer || prev.answer,
                explanation: aiResult.explanation || prev.explanation
              }));
            }
            if (aiResult.usage?.total_tokens && user) {
              trackTokens(Number(aiResult.usage.total_tokens), user.uid);
            }
          }
        } catch (err) {
          console.error('OCR failed:', err);
          alert('OCR 识别失败，请检查网络或换一张更清晰的照片。');
        } finally {
          setIsOcrLoading(false);
          setOcrProgress(0);
        }
      } else if (cropType === 'supp') {
        setSupplementaryPreview(croppedDataUrl);
      } else if (cropType === 'expl') {
        setExplanationPreview(croppedDataUrl);
      }
    } catch (err) {
      console.error('Cropping failed:', err);
    } finally {
      setIsOcrLoading(false);
      setIsAiProcessing(false);
      setImageToCrop(null);
    }
  };

  const onDropSupplementary = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    setImageToCrop(dataUrl);
    setCropType('supp');
    setIsCropping(true);
  }, []);

  const onDropExplanation = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    setImageToCrop(dataUrl);
    setCropType('expl');
    setIsCropping(true);
  }, []);

  const { getRootProps: getTextProps, getInputProps: getTextInputProps, isDragActive: textIsDragActive } = useDropzone({ onDrop: onDropText, accept: { 'image/*': [] }, multiple: false });
  const { getRootProps: getSuppProps, getInputProps: getSuppInputProps, isDragActive: suppIsDragActive } = useDropzone({ onDrop: onDropSupplementary, accept: { 'image/*': [] }, multiple: false });
  const { getRootProps: getExplProps, getInputProps: getExplInputProps, isDragActive: explIsDragActive } = useDropzone({ onDrop: onDropExplanation, accept: { 'image/*': [] }, multiple: false });

  const handleCollectToKnowledgeBase = async (kp: { title: string; content: string }) => {
    if (!user) return;
    try {
      await api.post('knowledgePoints', {
        userId: user.uid,
        ...kp,
        level: 1,
        mastered: false,
        field: formData.field[0] || '其他'
      });
      alert(t('kb.collectSuccess'));
    } catch (err) {
      console.error('Collection failed:', err);
      alert(t('kb.collectFail'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.content.trim()) return;

    setLoading(true);
    try {
      let textImageUrl = '';
      let suppImageUrl = '';
      let explImageUrl = '';

      // Helper to convert dataURL to File
      const dataURLtoFile = (dataurl: string, filename: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      };

      if (textImagePreview) {
        const file = dataURLtoFile(textImagePreview, 'text.jpg');
        const uploadRes = await api.storage.upload(file);
        textImageUrl = uploadRes.url;
      }

      if (supplementaryPreview) {
        const file = dataURLtoFile(supplementaryPreview, 'supp.jpg');
        const uploadRes = await api.storage.upload(file);
        suppImageUrl = uploadRes.url;
      }

      if (explanationPreview) {
        const file = dataURLtoFile(explanationPreview, 'expl.jpg');
        const uploadRes = await api.storage.upload(file);
        explImageUrl = uploadRes.url;
      }

      const questionData = {
        ...formData,
        imageUrl: textImageUrl,
        supplementaryImageUrl: suppImageUrl,
        explanationImageUrl: explImageUrl,
        createdBy: user.uid,
        creatorStudentId: user.studentId,
        creatorNickname: user.nickname || '',
      };

      const docRef = await api.post('questions', questionData);
      
      // Award points and update stats
      await awardPoints(10, user.uid);
      const latestUser = await api.get('users', user.uid);
      await api.put('users', user.uid, {
        questionsUploaded: (latestUser.questionsUploaded || 0) + 1
      });

      // Automatically add knowledge points to user's knowledge base
      for (const kp of formData.knowledgePoints) {
        await api.post('knowledgePoints', {
          userId: user.uid,
          questionId: docRef.id,
          ...kp,
          level: 1,
          mastered: false,
          field: formData.field[0] || '其他'
        });
      }

      alert(t('upload.success'));
      navigate('/');
    } catch (err) {
      console.error('Submit failed:', err);
      alert(t('upload.fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6">
      <div className="flex items-center gap-6">
        <div className={`w-16 h-16 bg-green-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-green-500/20 transition-transform duration-500 hover:scale-110 active:scale-95`}>
          <Upload className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className={`text-3xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{t('upload.title')}</h2>
          <p className={`text-sm ${theme.subText} font-bold tracking-tight transition-colors duration-1000 uppercase opacity-60`}>Biology Question Management System</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        <AnimatePresence>
          {isCropping && imageToCrop && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
            >
              <div className="w-full max-w-4xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">{t('upload.crop.title')}</h3>
                    <p className="text-sm text-slate-400 font-medium">{t('upload.crop.desc')}</p>
                  </div>
                  <button 
                    onClick={() => setIsCropping(false)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="relative bg-black rounded-3xl overflow-hidden border border-white/10 min-h-[400px] flex items-center justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    onComplete={c => setCompletedCrop(c)}
                    className="max-h-[70vh]"
                  >
                    <img
                      ref={cropImgRef}
                      src={imageToCrop}
                      alt="Crop area"
                      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                      onLoad={(e) => {
                        const { width, height } = e.currentTarget;
                        const initialCrop = detectQuestionArea(e.currentTarget);
                        setCrop(initialCrop);
                      }}
                    />
                  </ReactCrop>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                        if (cropImgRef.current) {
                            setCrop(detectQuestionArea(cropImgRef.current));
                        }
                    }}
                    className="px-6 py-4 bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2"
                  >
                    <CropIcon className="w-4 h-4" />
                    {t('upload.crop.autoDetect')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCropConfirm}
                    className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-600/30 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {t('upload.crop.confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ImageUploadCard
            title={t('upload.textImage')}
            preview={textImagePreview}
            onRemove={() => setTextImagePreview(null)}
            onCameraClick={() => textCameraInputRef.current?.click()}
            onGalleryClick={() => textGalleryInputRef.current?.click()}
            isDragActive={textIsDragActive}
            dropzoneProps={getTextProps()}
            isNight={isNight}
            theme={theme}
            iconColor="green"
            bgColorClass="bg-green-500"
          />
          <ImageUploadCard
            title={t('upload.supplementaryImage')}
            preview={supplementaryPreview}
            onRemove={() => setSupplementaryPreview(null)}
            onCameraClick={() => suppCameraInputRef.current?.click()}
            onGalleryClick={() => suppGalleryInputRef.current?.click()}
            isDragActive={suppIsDragActive}
            dropzoneProps={getSuppProps()}
            isNight={isNight}
            theme={theme}
            iconColor="blue"
            bgColorClass="bg-blue-500"
          />
          <ImageUploadCard
            title={t('upload.explanationImage')}
            preview={explanationPreview}
            onRemove={() => setExplanationPreview(null)}
            onCameraClick={() => explanationCameraInputRef.current?.click()}
            onGalleryClick={() => explanationGalleryInputRef.current?.click()}
            isDragActive={explIsDragActive}
            dropzoneProps={getExplProps()}
            isNight={isNight}
            theme={theme}
            iconColor="purple"
            bgColorClass="bg-purple-500"
          />
          
          {/* Hidden Inputs for Manual File Selection */}
          <input type="file" ref={textCameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files && onDropText(Array.from(e.target.files))} />
          <input type="file" ref={textGalleryInputRef} className="hidden" accept="image/*" onChange={e => e.target.files && onDropText(Array.from(e.target.files))} />
          <input type="file" ref={suppCameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files && onDropSupplementary(Array.from(e.target.files))} />
          <input type="file" ref={suppGalleryInputRef} className="hidden" accept="image/*" onChange={e => e.target.files && onDropSupplementary(Array.from(e.target.files))} />
          <input type="file" ref={explanationCameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => e.target.files && onDropExplanation(Array.from(e.target.files))} />
          <input type="file" ref={explanationGalleryInputRef} className="hidden" accept="image/*" onChange={e => e.target.files && onDropExplanation(Array.from(e.target.files))} />
        </div>

        <div className={`${theme.card} backdrop-blur-2xl rounded-[3rem] p-10 space-y-12 transition-all duration-1000 border border-white/10`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.field')}</label>
                <div className="flex flex-wrap gap-2">
                  {['生物化学', '细胞生物学', '植物学', '动物学', '微生物学', '动物生理学', '植物生理学', '其他'].map(field => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => {
                        const newFields = formData.field.includes(field as any)
                          ? formData.field.filter(f => f !== field)
                          : [...formData.field, field as QuestionField];
                        setFormData({ ...formData, field: newFields });
                      }}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 ${
                        formData.field.includes(field as any)
                          ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                          : `${theme.mutedBg} ${theme.subText} hover:${theme.text} border ${theme.border}`
                      }`}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.source')}</label>
                  <select 
                    value={formData.source}
                    onChange={e => setFormData({...formData, source: e.target.value as QuestionSource})}
                    className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
                  >
                    {['猿辅导', '汇智启航', '北斗学友', '联赛题', '国赛题', '愿程', '其他'].map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.sourceDetail')}</label>
                  <input 
                    type="text"
                    value={formData.sourceDetail}
                    onChange={e => setFormData({...formData, sourceDetail: e.target.value})}
                    placeholder={t('upload.sourceDetailPlaceholder')}
                    className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.difficulty')}</label>
                <div className="flex gap-4">
                  {['难题', '易错题'].map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => {
                        const newDiffs = formData.difficulty.includes(diff as any)
                          ? formData.difficulty.filter(d => d !== diff)
                          : [...formData.difficulty, diff as QuestionDifficulty];
                        setFormData({ ...formData, difficulty: newDiffs });
                      }}
                      className={`flex-1 py-4 rounded-2xl text-sm font-bold transition-all duration-300 active:scale-95 border ${
                        formData.difficulty.includes(diff as any)
                          ? 'bg-amber-500 border-amber-600 text-white'
                          : `${theme.mutedBg} ${theme.subText} ${theme.border}`
                      }`}
                    >
                      {t(`enum.diff.${diff}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
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
          </div>

          {/* AI Knowledge Point Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className={`text-[10px] font-black ${theme.subText} uppercase tracking-[0.2em] flex items-center gap-3`}>
                <Sparkles className="w-4 h-4 text-indigo-500" />
                {t('upload.aiAnalyzing')}
              </h3>
              {!isAiProcessing && formData.content.trim() && (
                <button
                  type="button"
                  onClick={handleRegenerateKps}
                  className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('common.edit')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isAiProcessing ? (
                <div className={`col-span-full py-12 flex flex-col items-center gap-4 ${theme.mutedBg} rounded-3xl border border-dashed ${theme.border}`}>
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest animate-pulse`}>AI正在提取核心知识点...</p>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {pendingKnowledgePoints.map((kp, idx) => (
                      <motion.div
                        key={`pending-${idx}-${kp.title}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <KPPreviewCard
                          kp={kp}
                          index={idx}
                          isLoading={kpLoadingStates[idx]}
                          onRegenerate={handleRegenerateSingleKp}
                          onCollect={handleCollectToKnowledgeBase}
                          theme={theme}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {pendingKnowledgePoints.length === 0 && !formData.content.trim() && (
                    <div className={`col-span-full py-12 flex flex-col items-center gap-3 ${theme.mutedBg} rounded-3xl border border-dashed ${theme.border} opacity-40`}>
                      <Brain className={`w-8 h-8 ${theme.subText}`} />
                      <p className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest`}>上传图片后将自动分析知识点</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Confirmed KPs */}
            {formData.knowledgePoints.length > 0 && (
              <div className="space-y-4">
                <p className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest flex items-center gap-2`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  已准备关联的知识点
                </p>
                <div className="flex flex-wrap gap-3">
                  {formData.knowledgePoints.map((kp, idx) => (
                    <div key={idx} className="bg-green-500/10 text-green-600 px-4 py-2 rounded-xl text-xs font-bold border border-green-500/20 flex items-center gap-2">
                       {kp.title}
                       <button onClick={() => setFormData(prev => ({ ...prev, knowledgePoints: prev.knowledgePoints.filter((_, i) => i !== idx) }))}>
                         <RefreshCw className="w-3 h-3 rotate-45" />
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.content')}</label>
              <div className="relative">
                <textarea 
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  rows={6}
                  placeholder={t('upload.content')}
                  className={`w-full px-8 py-6 ${theme.input} rounded-[2rem] focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all resize-none duration-1000 leading-relaxed`}
                />
                {(isOcrLoading || isAiProcessing) && (
                  <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-4">
                      {isOcrLoading ? (
                        <div className="relative flex items-center justify-center">
                          <svg className="w-20 h-20 -rotate-90">
                            <circle cx="40" cy="40" r="36" className="fill-none stroke-white/20 stroke-[4]" />
                            <circle 
                              cx="40" cy="40" r="36" 
                              className="fill-none stroke-green-600 stroke-[4] transition-all duration-300" 
                              strokeDasharray={226}
                              strokeDashoffset={226 - (226 * ocrProgress) / 100}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-black text-green-600">{Math.round(ocrProgress)}%</span>
                        </div>
                      ) : (
                        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                      )}
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-white/90 px-4 py-2 rounded-xl shadow-xl">
                        {isAiProcessing ? t('upload.aiAnalyzing') : (ocrProgress === 0 ? t('upload.ocr.initializing') : t('upload.ocrProcessing'))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.answer')} ({t('upload.optional')})</label>
                <input 
                  type="text"
                  value={formData.answer}
                  onChange={e => setFormData({...formData, answer: e.target.value})}
                  className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all duration-1000`}
                />
              </div>
              <div className="space-y-3">
                <label className={`block text-[10px] font-black ${theme.subText} uppercase tracking-widest ml-1 transition-colors duration-1000`}>{t('upload.explanation')} ({t('upload.optional')})</label>
                <textarea 
                  value={formData.explanation}
                  onChange={e => setFormData({...formData, explanation: e.target.value})}
                  rows={1}
                  className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold transition-all resize-none duration-1000`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex items-center gap-2">
             <AlertCircle className={`w-4 h-4 ${theme.subText}`} />
             <p className={`text-[10px] ${theme.subText} font-black uppercase tracking-widest`}>请核对AI提取内容，确保知识点准确性</p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`px-10 py-5 ${theme.card} ${theme.subText} rounded-2xl font-black text-[10px] uppercase tracking-widest hover:${theme.text} transition-all active:scale-95 duration-1000 border border-white/5`}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !textImagePreview || !formData.content.trim()}
              className="flex items-center justify-center gap-3 px-14 py-5 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-green-600/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {loading ? t('common.loading') : t('upload.submit')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
