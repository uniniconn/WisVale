import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Image as ImageIcon, Sliders, X, Upload, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CustomBackgroundProps {
  currentBgUrl: string | null;
  currentBlur: number;
  theme: any;
}

export default function CustomBackground({ currentBgUrl, currentBlur, theme }: CustomBackgroundProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit size to 800KB
    if (file.size > 800 * 1024) {
      setError('图片大小不能超过 800KB');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (user?.uid) {
          await api.put('users', user.uid, {
            customBgUrl: base64String,
            bgBlur: currentBlur
          });
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading background:', err);
      setError('上传失败，请重试');
      setIsUploading(false);
    }
  };

  const handleBlurChange = async (blur: number) => {
    if (user?.uid) {
      await api.put('users', user.uid, {
        bgBlur: blur
      });
    }
  };

  const handleClear = async () => {
    if (user?.uid) {
      await api.put('users', user.uid, {
        customBgUrl: null,
        bgBlur: 0
      });
    }
  };

  return (
    <div className="space-y-4 px-2">
      <p className={`text-[10px] ${theme.subText} uppercase tracking-widest font-bold mb-3 px-2 transition-colors duration-1000`}>
        {t('layout.customBg.title') || '自定义背景'}
      </p>
      
      <div className={`p-4 rounded-2xl border ${theme.border} ${theme.mutedBg} space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className={`w-4 h-4 ${theme.navIcon}`} />
            <span className={`text-xs font-bold ${theme.text}`}>背景图片</span>
          </div>
          {currentBgUrl && (
            <button 
              onClick={handleClear}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="清除背景"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <label className={`
          relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all
          ${theme.border} hover:border-green-500 hover:bg-green-50/10
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Upload className={`w-6 h-6 mb-2 ${theme.navIcon}`} />
          <span className={`text-[10px] font-bold ${theme.subText}`}>
            {isUploading ? '正在上传...' : '点击上传图片 (最大 800KB)'}
          </span>
        </label>

        {error && (
          <p className="text-[10px] text-red-500 font-bold text-center">{error}</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className={`w-4 h-4 ${theme.navIcon}`} />
              <span className={`text-xs font-bold ${theme.text}`}>模糊程度</span>
            </div>
            <span className={`text-[10px] font-bold ${theme.subText}`}>{currentBlur}px</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="20" 
            value={currentBlur}
            onChange={(e) => handleBlurChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
        </div>
      </div>
    </div>
  );
}
