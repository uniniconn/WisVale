import { useState, useEffect } from 'react';
import { db, auth, isDemoMode } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, updateDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { AllowedStudent, User, BirthdaySettings } from '../types';
import { UserPlus, Trash2, Users, ShieldCheck, Loader2, Plus, UserCheck, ShieldPlus, Cake, Save, ToggleLeft, ToggleRight, Calendar, X, Sparkles, Mountain, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../contexts/LanguageContext';

export default function AdminPanel({ currentUser }: { currentUser: User | null }) {
  const { isNight, theme } = useTheme();
  const { t } = useLanguage();
  const isPermanentAdmin = currentUser?.studentId === '1357924680';
  const [allowedStudents, setAllowedStudents] = useState<AllowedStudent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newStudentId, setNewStudentId] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [showBatch, setShowBatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Birthday Settings State
  const [birthdaySettings, setBirthdaySettings] = useState<BirthdaySettings>({
    slogan: '生日快乐！',
    isEnabled: true
  });
  const [isSavingBirthday, setIsSavingBirthday] = useState(false);

  // Qidan Settings State
  const [qidanSettings, setQidanSettings] = useState<BirthdaySettings>({
    slogan: '紫海猖狂，七单为王',
    isEnabled: false
  });
  const [isSavingQidan, setIsSavingQidan] = useState(false);
  const [newPermanentId, setNewPermanentId] = useState('');
  const [isUpdatingPermanentId, setIsUpdatingPermanentId] = useState(false);
  const [showPermanentIdConfirm, setShowPermanentIdConfirm] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      // ... existing demo data ...
      setAllowedStudents([
        { studentId: '1357924680', addedBy: 'system', addedAt: new Date().toISOString() }
      ]);
      setUsers([
        { uid: 'demo-admin', studentId: '1357924680', nickname: 'SYSTEM', role: 'admin', createdAt: new Date().toISOString() }
      ]);
      setLoading(false);
      return;
    }

    // Fetch Birthday Settings
    const unsubBirthday = onSnapshot(doc(db, 'settings', 'birthday'), (snapshot) => {
      if (snapshot.exists()) {
        setBirthdaySettings(snapshot.data() as BirthdaySettings);
      }
    });

    // Fetch Qidan Settings
    const unsubQidan = onSnapshot(doc(db, 'settings', 'qidan'), (snapshot) => {
      if (snapshot.exists()) {
        setQidanSettings(snapshot.data() as BirthdaySettings);
      }
    });

    const qAllowed = query(collection(db, 'allowedStudents'), orderBy('addedAt', 'desc'));
    // ... existing subscriptions ...
    const unsubscribeAllowed = onSnapshot(qAllowed, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as AllowedStudent);
        setAllowedStudents(data);
      },
      (error) => {
        console.error("Error fetching allowed students:", error);
        setLoading(false);
      }
    );

    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(qUsers, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as User);
        const uniqueUsers: User[] = [];
        const seenIds = new Set<string>();
        for (const u of data) {
          if (!seenIds.has(u.studentId)) {
            // Hide permanent admin from normal admins
            if (!isPermanentAdmin && u.studentId === '1357924680') {
              continue;
            }
            seenIds.add(u.studentId);
            uniqueUsers.push(u);
          }
        }
        setUsers(uniqueUsers);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubBirthday();
      unsubQidan();
      unsubscribeAllowed();
      unsubscribeUsers();
    };
  }, []);

  const handleSaveBirthday = async () => {
    if (isDemoMode) {
      alert(t('admin.demoError'));
      return;
    }
    setIsSavingBirthday(true);
    try {
      await setDoc(doc(db, 'settings', 'birthday'), birthdaySettings);
      alert(t('admin.saveSuccess'));
    } catch (err) {
      console.error("Error saving birthday settings:", err);
      alert(t('admin.saveFail'));
    } finally {
      setIsSavingBirthday(false);
    }
  };

  const handleSaveQidan = async () => {
    if (isDemoMode) {
      alert(t('admin.demoError'));
      return;
    }
    setIsSavingQidan(true);
    try {
      await setDoc(doc(db, 'settings', 'qidan'), qidanSettings);
      alert(t('admin.saveSuccess'));
    } catch (err) {
      console.error("Error saving qidan settings:", err);
      alert(t('admin.saveFail'));
    } finally {
      setIsSavingQidan(false);
    }
  };

  const handleUpdatePermanentId = async () => {
    if (!newPermanentId.trim() || isUpdatingPermanentId) return;
    if (isDemoMode) {
      alert(t('admin.demoError'));
      return;
    }

    setIsUpdatingPermanentId(true);
    try {
      const oldId = '1357924680';
      const newId = newPermanentId.trim();

      // 1. Add new ID to allowedStudents
      await setDoc(doc(db, 'allowedStudents', newId), {
        studentId: newId,
        addedBy: 'system-permanent-update',
        addedAt: new Date().toISOString()
      });

      // 2. Update all user documents with the old ID
      const q = query(collection(db, 'users'), where('studentId', '==', oldId));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.update(d.ref, { studentId: newId });
        });
        await batch.commit();
      }

      // 3. Remove old ID from allowedStudents (optional, but cleaner)
      await deleteDoc(doc(db, 'allowedStudents', oldId));

      alert(t('admin.saveSuccess'));
      // Force logout or re-login might be needed, but for now just refresh
      window.location.reload();
    } catch (err) {
      console.error("Error updating permanent admin ID:", err);
      alert(t('admin.saveFail'));
    } finally {
      setIsUpdatingPermanentId(false);
      setShowPermanentIdConfirm(false);
    }
  };

  const handleBatchImport = async () => {
    if (!batchInput.trim() || submitting) return;
    setSubmitting(true);
    try {
      // Split by Chinese period or standard period or newline
      const parts = batchInput.split(/[。.\n]/).filter(p => p.trim());
      const batch = isDemoMode ? null : writeBatch(db);
      const now = new Date().toISOString();
      const creator = auth.currentUser?.uid || 'unknown';

      const newEntries: AllowedStudent[] = [];

      for (const part of parts) {
        // Split by Chinese colon or standard colon
        const [nickname, studentId] = part.split(/[:：]/).map(s => s.trim());
        if (nickname && studentId) {
          if (isDemoMode) {
            newEntries.push({ studentId, nickname, addedBy: creator, addedAt: now });
          } else {
            const docRef = doc(db, 'allowedStudents', studentId);
            batch!.set(docRef, {
              studentId,
              nickname,
              addedBy: creator,
              addedAt: now
            });
          }
        }
      }

      if (isDemoMode) {
        setAllowedStudents(prev => [...newEntries, ...prev]);
      } else {
        await batch!.commit();
      }
      
      setBatchInput('');
      setShowBatch(false);
      alert(t('admin.batchSuccess'));
    } catch (err) {
      console.error("Error batch importing:", err);
      alert(t('admin.batchFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || submitting) return;

    setSubmitting(true);
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAllowedStudents(prev => [{
          studentId: newStudentId.trim(),
          addedBy: 'demo-admin',
          addedAt: new Date().toISOString()
        }, ...prev]);
        setNewStudentId('');
        return;
      }

      await setDoc(doc(db, 'allowedStudents', newStudentId.trim()), {
        studentId: newStudentId.trim(),
        addedBy: auth.currentUser?.uid || 'unknown',
        addedAt: new Date().toISOString()
      });
      setNewStudentId('');
    } catch (err) {
      console.error("Error adding student:", err);
      alert(t('admin.addFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (studentId === '1357924680') {
      return;
    }

    try {
      if (isDemoMode) {
        setAllowedStudents(prev => prev.filter(s => s.studentId !== studentId));
        setUsers(prev => prev.filter(u => u.studentId !== studentId));
        setConfirmRemoveId(null);
        return;
      }

      // 1. Delete from allowedStudents
      await deleteDoc(doc(db, 'allowedStudents', studentId));

      // 2. Find and delete all registered user records with this studentId
      const q = query(collection(db, 'users'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
      
      setConfirmRemoveId(null);
    } catch (err) {
      console.error("Error removing student:", err);
    }
  };

  const handleToggleRole = async (uid: string, studentId: string, currentRole: string) => {
    if (studentId === '1357924680') {
      alert(t('admin.permanentAdminError'));
      return;
    }
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    
    try {
      if (isDemoMode) {
        setUsers(prev => prev.map(u => u.studentId === studentId ? { ...u, role: newRole as any } : u));
        return;
      }
      
      // Update all documents with this studentId in chunks of 5 to avoid Firestore rules get() limit
      const q = query(collection(db, 'users'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      
      const chunkSize = 5;
      for (let i = 0; i < snap.docs.length; i += chunkSize) {
        const chunk = snap.docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(d => {
          batch.update(d.ref, { role: newRole });
        });
        await batch.commit();
      }
      
    } catch (err) {
      console.error("Error updating user role:", err);
      alert(t('admin.saveFail'));
    }
  };

  const combinedAccounts = Array.from(new Set([
    ...allowedStudents.map(s => s.studentId),
    ...users.map(u => u.studentId)
  ])).map(sid => {
    const allowed = allowedStudents.find(s => s.studentId === sid);
    const registered = users.find(u => u.studentId === sid);
    return {
      studentId: sid,
      nickname: registered?.nickname,
      isAllowed: !!allowed,
      isRegistered: !!registered,
      uid: registered?.uid,
      role: registered?.role || 'student',
      createdAt: registered?.createdAt,
      addedAt: allowed?.addedAt
    };
  }).sort((a, b) => (b.createdAt || b.addedAt || '').localeCompare(a.createdAt || a.addedAt || ''));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
          <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full -z-10 animate-pulse" />
        </div>
        <p className={`${theme.subText} text-xs font-black uppercase tracking-[0.2em] animate-pulse`}>{t('admin.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {isPermanentAdmin && (
        <>
          {/* Permanent Admin ID Modification Section */}
          <div className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} p-8 md:p-10 space-y-8 transition-all duration-1000`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${theme.text} tracking-tight`}>{t('admin.permanentAdmin.editId')}</h2>
                  <p className={`${theme.subText} text-xs font-bold uppercase tracking-widest mt-1`}>Current ID: {currentUser?.studentId}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={newPermanentId}
                    onChange={(e) => setNewPermanentId(e.target.value)}
                    placeholder={t('admin.permanentAdmin.newIdPlaceholder')}
                    className={`w-48 px-6 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-amber-500/5 outline-none text-sm font-bold transition-all duration-1000`}
                  />
                </div>
                <button
                  onClick={() => setShowPermanentIdConfirm(true)}
                  disabled={!newPermanentId.trim() || isUpdatingPermanentId}
                  className="flex items-center gap-3 px-8 py-3 bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingPermanentId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                  {t('admin.permanentAdmin.updateBtn')}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showPermanentIdConfirm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-6 ${isNight ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50/50 border-amber-200/50'} rounded-[2rem] border space-y-4`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                      <ShieldPlus className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-900">{t('admin.permanentAdmin.confirmTitle')}</h3>
                      <p className="text-xs text-amber-700/80 mt-1 font-bold">{t('admin.permanentAdmin.confirmDesc')}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowPermanentIdConfirm(false)}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isNight ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'} border ${theme.border}`}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleUpdatePermanentId}
                      className="px-6 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 shadow-lg shadow-amber-600/20"
                    >
                      {t('common.confirm')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Qidan Settings Section */}
          <div className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} p-8 md:p-10 space-y-8 transition-all duration-1000`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${theme.text} tracking-tight`}>{t('admin.qidan.title')}</h2>
                  <p className={`${theme.subText} text-xs font-bold uppercase tracking-widest mt-1`}>{t('admin.qidan.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQidanSettings(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    qidanSettings.isEnabled 
                      ? 'bg-purple-600/10 text-purple-600 border border-purple-600/20' 
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}
                >
                  {qidanSettings.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {qidanSettings.isEnabled ? t('admin.enabled') : t('admin.disabled')}
                </button>
                <button
                  onClick={handleSaveQidan}
                  disabled={isSavingQidan}
                  className="flex items-center gap-3 px-8 py-3 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSavingQidan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('admin.saveConfig')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className={`text-[10px] font-black ${theme.subText} uppercase tracking-[0.2em] ml-2`}>{t('admin.qidan.slogan')}</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={qidanSettings.slogan || ''}
                    onChange={(e) => setQidanSettings(prev => ({ ...prev, slogan: e.target.value }))}
                    placeholder={t('admin.qidan.placeholder')}
                    className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-purple-500/5 outline-none text-sm font-bold transition-all duration-1000`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Birthday Settings Section */}
          <div className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} p-8 md:p-10 space-y-8 transition-all duration-1000`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <Cake className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${theme.text} tracking-tight`}>{t('admin.birthday.title')}</h2>
                  <p className={`${theme.subText} text-xs font-bold uppercase tracking-widest mt-1`}>{t('admin.birthday.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setBirthdaySettings(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    birthdaySettings.isEnabled 
                      ? 'bg-green-600/10 text-green-600 border border-green-600/20' 
                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}
                >
                  {birthdaySettings.isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {birthdaySettings.isEnabled ? t('admin.enabled') : t('admin.disabled')}
                </button>
                <button
                  onClick={handleSaveBirthday}
                  disabled={isSavingBirthday}
                  className="flex items-center gap-3 px-8 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSavingBirthday ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('admin.saveConfig')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className={`text-[10px] font-black ${theme.subText} uppercase tracking-[0.2em] ml-2`}>{t('admin.birthday.slogan')}</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={birthdaySettings.slogan || ''}
                    onChange={(e) => setBirthdaySettings(prev => ({ ...prev, slogan: e.target.value }))}
                    placeholder={t('admin.birthday.placeholder')}
                    className={`w-full px-6 py-4 ${theme.input} rounded-2xl focus:ring-4 focus:ring-rose-500/5 outline-none text-sm font-bold transition-all duration-1000`}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">
              <div className="w-8 h-[2px] bg-green-600/30 rounded-full" />
              <span>系统管理 · ADMIN CENTER</span>
            </div>
            <h1 className={`text-4xl font-black ${theme.text} tracking-tight transition-colors duration-1000`}>{t('admin.title')}</h1>
            <p className={`${theme.subText} font-medium transition-colors duration-1000`}>{t('admin.subtitle')}</p>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBatch(!showBatch)}
                className={`px-6 py-3 ${isNight ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'} rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all active:scale-95`}
              >
                {showBatch ? t('admin.cancelBatch') : t('admin.batchImport')}
              </button>
            </div>

            {!showBatch ? (
              <form onSubmit={handleAddStudent} className={`flex gap-3 ${isNight ? 'bg-slate-900/40' : 'bg-white/50'} backdrop-blur-xl p-2 rounded-[1.5rem] border ${theme.border} transition-all duration-1000`}>
                <input 
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder={t('admin.inputStudentId')}
                  className={`px-6 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-sm font-bold w-48 transition-all duration-1000`}
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {t('admin.addAuth')}
                </button>
              </form>
            ) : (
              <div className={`flex flex-col gap-3 ${isNight ? 'bg-slate-900/40' : 'bg-white/50'} backdrop-blur-xl p-4 rounded-[1.5rem] border ${theme.border} transition-all duration-1000 w-full md:w-96`}>
                <textarea
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder={t('admin.batchPlaceholder')}
                  className={`w-full h-32 px-4 py-3 ${theme.input} rounded-2xl focus:ring-4 focus:ring-green-500/5 outline-none text-xs font-bold transition-all duration-1000 resize-none`}
                />
                <button
                  onClick={handleBatchImport}
                  disabled={submitting}
                  className="w-full py-3 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {t('admin.executeBatch')}
                </button>
              </div>
            )}
          </div>
        </div>

      <div className={`${theme.card} backdrop-blur-2xl rounded-[3rem] border ${theme.border} overflow-hidden transition-all duration-1000`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`${isNight ? 'bg-slate-900/40' : 'bg-slate-50/50'} border-b ${theme.border} transition-colors duration-1000`}>
                <th className={`px-10 py-6 text-[10px] font-black ${theme.subText} uppercase tracking-widest transition-colors duration-1000`}>{t('admin.table.idNickname')}</th>
                <th className={`px-10 py-6 text-[10px] font-black ${theme.subText} uppercase tracking-widest transition-colors duration-1000`}>{t('admin.table.status')}</th>
                <th className={`px-10 py-6 text-[10px] font-black ${theme.subText} uppercase tracking-widest transition-colors duration-1000`}>{t('admin.table.role')}</th>
                <th className={`px-10 py-6 text-[10px] font-black ${theme.subText} uppercase tracking-widest transition-colors duration-1000`}>{t('admin.table.time')}</th>
                <th className={`px-10 py-6 text-[10px] font-black ${theme.subText} uppercase tracking-widest text-right transition-colors duration-1000`}>{t('admin.table.action')}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isNight ? 'divide-slate-800' : 'divide-slate-50'} transition-colors duration-1000`}>
              {combinedAccounts.map((account) => (
                <tr key={account.studentId} className={`group hover:${isNight ? 'bg-slate-800/40' : 'bg-white/60'} transition-colors duration-1000`}>
                  <td className="px-10 py-6">
                    <div className={`font-black ${theme.text} text-lg tracking-tight transition-colors duration-1000`}>{account.studentId}</div>
                    {(account.nickname || account.isAllowed) && (
                      <div className={`text-xs font-bold text-green-600 mt-1 transition-colors duration-1000`}>
                        {t('dashboard.nickname')}: {account.nickname || (allowedStudents.find(s => s.studentId === account.studentId)?.nickname) || t('detail.notSet')}
                      </div>
                    )}
                    {account.studentId === '1357924680' && (
                      <span className={`text-[9px] text-amber-600 font-black ${isNight ? 'bg-amber-500/10' : 'bg-amber-50'} px-2 py-0.5 rounded-lg uppercase tracking-widest mt-1 inline-block transition-colors duration-1000`}>{t('admin.role.permanent')}</span>
                    )}
                  </td>
                  <td className="px-10 py-6">
                    {account.isRegistered ? (
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 ${isNight ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50/50 text-green-700 border-green-100/30'} text-[10px] font-black rounded-xl uppercase tracking-widest border transition-colors duration-1000`}>
                        <UserCheck className="w-3 h-3" /> {t('admin.status.registered')}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 ${isNight ? 'bg-slate-800/50 text-slate-500 border-slate-700/30' : 'bg-slate-100/50 text-slate-400 border-slate-200/30'} text-[10px] font-black rounded-xl uppercase tracking-widest border transition-colors duration-1000`}>
                        {t('admin.status.unregistered')}
                      </span>
                    )}
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-widest border transition-colors duration-1000 ${
                        account.role === 'admin' 
                          ? isNight ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-purple-50/50 text-purple-700 border-purple-100/30' 
                          : isNight ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50/50 text-blue-700 border-blue-100/30'
                      }`}>
                        {account.role === 'admin' ? t('admin.role.admin') : t('admin.role.student')}
                      </span>
                      {account.isRegistered && account.studentId !== '1357924680' && (
                        <button
                          onClick={() => handleToggleRole(account.uid!, account.studentId, account.role)}
                          className={`p-2 ${theme.subText} hover:text-green-600 hover:bg-green-500/10 rounded-xl transition-all active:scale-90 duration-1000`}
                          title="切换角色"
                        >
                          <ShieldPlus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className={`text-[10px] font-bold ${theme.subText} uppercase tracking-widest opacity-60 transition-colors duration-1000`}>
                      {account.createdAt ? `${t('admin.status.registered')}: ${new Date(account.createdAt).toLocaleDateString()}` : `${t('admin.addAuth')}: ${new Date(account.addedAt!).toLocaleDateString()}`}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    {account.studentId !== '1357924680' && (
                      <div className="flex items-center justify-end gap-3">
                        {confirmRemoveId === account.studentId ? (
                          <div className={`flex items-center gap-2 ${isNight ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50/50 border-red-100/30'} p-1.5 rounded-2xl border transition-colors duration-1000`}>
                            <span className="text-[9px] text-red-600 font-black px-3 uppercase tracking-widest">{t('admin.action.removeConfirm')}</span>
                            <button 
                              onClick={() => handleRemoveStudent(account.studentId)}
                              className="px-4 py-1.5 bg-red-600 text-white text-[10px] rounded-xl hover:bg-red-700 font-black uppercase tracking-widest"
                            >
                              {t('admin.action.yes')}
                            </button>
                            <button 
                              onClick={() => setConfirmRemoveId(null)}
                              className={`px-4 py-1.5 ${isNight ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'} text-[10px] rounded-xl hover:bg-slate-300 font-black uppercase tracking-widest transition-colors duration-1000`}
                            >
                              {t('admin.action.no')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemoveId(account.studentId)}
                            className={`p-3 ${theme.subText} hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all active:scale-90 opacity-0 group-hover:opacity-100 duration-1000`}
                            title="取消授权并移除"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {combinedAccounts.length === 0 && (
          <div className={`p-20 text-center ${theme.subText} font-black text-[10px] uppercase tracking-[0.3em] transition-colors duration-1000`}>
            {t('admin.noData')}
          </div>
        )}
      </div>
    </div>
  );
}
