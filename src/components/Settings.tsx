import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Save, Key, UserCheck, Database } from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../hooks/useTheme';
import { User } from '../types';

interface SettingsPageProps {
  user: User | null;
}

export default function SettingsPage({ user }: SettingsPageProps) {
  const { theme } = useTheme();
  const [keys, setKeys] = useState({ deepseek: '', ocr: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const data = await api.db.getById('settings', 'keys');
        if (data) {
          setKeys({
            deepseek: data.deepseek || '',
            ocr: data.ocr || ''
          });
        }
      } catch (err) {
        console.error('Failed to fetch keys:', err);
      }
    };
    fetchKeys();
  }, []);

  const handleSave = async () => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    setMessage('');
    try {
      await api.db.update('settings', 'keys', {
        value: JSON.stringify(keys)
      });
      setMessage('设置已保存');
    } catch (err) {
      setMessage('保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className={`p-8 text-center ${theme.text}`}>
        <p>您没有权限访问此页面。</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className={`p-3 rounded-2xl ${theme.accent} shadow-lg shadow-green-500/20`}>
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>系统设置</h1>
          <p className={`text-sm ${theme.subText}`}>配置全局 API 密钥和系统参数</p>
        </div>
      </div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${theme.card} rounded-[2rem] p-8 border shadow-xl backdrop-blur-md`}
        >
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-5 h-5 text-green-500" />
            <h2 className={`font-bold ${theme.text}`}>API 密钥配置</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-bold ${theme.subText} uppercase tracking-wider mb-2`}>
                DeepSeek API Key
              </label>
              <input
                type="password"
                value={keys.deepseek}
                onChange={(e) => setKeys(prev => ({ ...prev, deepseek: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border ${theme.input} outline-none focus:ring-2 focus:ring-green-500 transition-all font-mono`}
                placeholder="sk-..."
              />
            </div>

            <div>
              <label className={`block text-xs font-bold ${theme.subText} uppercase tracking-wider mb-2`}>
                OCR.space API Key
              </label>
              <input
                type="password"
                value={keys.ocr}
                onChange={(e) => setKeys(prev => ({ ...prev, ocr: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border ${theme.input} outline-none focus:ring-2 focus:ring-green-500 transition-all font-mono`}
                placeholder="K819..."
              />
            </div>
          </div>
        </motion.div>

        <div className="flex items-center justify-between gap-4">
          {message && (
            <p className={`text-sm font-bold ${message.includes('失败') ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className={`
              ml-auto flex items-center gap-2 px-8 py-4 rounded-2xl bg-green-600 text-white font-bold
              hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50
            `}
          >
            <Save className="w-5 h-5" />
            {loading ? '正在保存...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
