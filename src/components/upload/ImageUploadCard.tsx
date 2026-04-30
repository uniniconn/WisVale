import { memo } from 'react';
import { Camera, FolderOpen, ImageIcon, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Theme } from '../../constants/themes';

interface ImageUploadCardProps {
  title: string;
  preview: string | null;
  onRemove: () => void;
  onCameraClick: () => void;
  onGalleryClick: () => void;
  isDragActive: boolean;
  dropzoneProps: any;
  isNight: boolean;
  theme: Theme;
  iconColor: string;
  bgColorClass: string;
}

const ImageUploadCard = memo(({
  title,
  preview,
  onRemove,
  onCameraClick,
  onGalleryClick,
  isDragActive,
  dropzoneProps,
  isNight,
  theme,
  iconColor,
  bgColorClass
}: ImageUploadCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${theme.card} backdrop-blur-2xl rounded-[2.5rem] border-2 border-dashed ${isNight ? 'border-slate-800' : 'border-white/60'} p-6 text-center group hover:border-${iconColor}-500/30 transition-all duration-1000`}
    >
      <h3 className={`text-[10px] font-black ${theme.subText} uppercase tracking-widest mb-4 flex items-center justify-center gap-2`}>
        <ImageIcon className={`w-3 h-3 text-${iconColor}-500`} />
        {title}
      </h3>
      {!preview ? (
        <div {...dropzoneProps} className={`py-10 ${isDragActive ? `bg-${iconColor}-500/5` : ''} transition-colors duration-500`}>
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onCameraClick}
                className={`w-16 h-16 ${isNight ? `bg-${iconColor}-500/10` : `bg-${iconColor}-50/50`} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
              >
                <Camera className={`w-8 h-8 text-${iconColor}-600`} />
              </button>
              <button
                type="button"
                onClick={onGalleryClick}
                className={`w-16 h-16 ${isNight ? 'bg-slate-800' : 'bg-slate-100'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm`}
              >
                <FolderOpen className="w-8 h-8 text-slate-500" />
              </button>
            </div>
            <div className="space-y-1">
              <p className={`text-[10px] ${theme.subText} font-black uppercase tracking-widest`}>
                {isDragActive ? '放开以选择' : '点击或拖拽图片'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative group/preview">
          <img 
            src={preview} 
            alt="Preview" 
            className={`max-h-[200px] mx-auto rounded-2xl border ${theme.border} transition-all duration-1000`} 
          />
          <div className="absolute -top-2 -right-2">
            <button 
              type="button"
              onClick={onRemove}
              className="bg-red-500 text-white p-2 rounded-xl hover:bg-red-600 transition-all active:scale-90 shadow-lg"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default ImageUploadCard;
