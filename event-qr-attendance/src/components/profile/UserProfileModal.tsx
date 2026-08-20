import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { UserDatabaseService } from '../../services/userDatabase';
import { StorageRepository } from '../../services/storage';
import {
  X,
  User as UserIcon,
  Mail,
  Shield,
  Key,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Hash,
  Eye,
  EyeOff,
} from 'lucide-react';

interface UserProfileModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedUser: User) => void;
  initialTab?: 'profile' | 'security';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProfileUpdated,
  initialTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>(initialTab);

  // Profile Details State
  const [name, setName] = useState(currentUser.name || '');
  const [regNumber, setRegNumber] = useState(currentUser.registrationNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  // Password State
  const [previousPassword, setPreviousPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Status & Messaging State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [liveUser, setLiveUser] = useState<User>(currentUser);

  // Check Edit Lock Status: Locked permanently once Name & Registration Number are set, or once Profile Pic is uploaded
  const isProfileSet = Boolean(liveUser.registrationNumber && liveUser.name);
  const hasCustomAvatar = Boolean(
    liveUser.avatarUrl &&
    !liveUser.avatarUrl.includes('unsplash.com')
  );
  const allowOverride = Boolean(liveUser.allowEditOverride);
  const isLocked = isProfileSet && !allowOverride;
  const isAvatarLocked = (isLocked || hasCustomAvatar) && !allowOverride;

  useEffect(() => {
    setLiveUser(currentUser);
    setName(currentUser.name || '');
    setRegNumber(currentUser.registrationNumber || '');
    setAvatarUrl(currentUser.avatarUrl || '');
    setActiveTab(initialTab);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Fetch latest user data directly from Firebase RTDB when modal opens to detect admin unlock
    if (isOpen && currentUser.id) {
      UserDatabaseService.getUserFromRealtimeDB(currentUser.id)
        .then((fresh) => {
          if (fresh) {
            setLiveUser(fresh);
            setName(fresh.name || '');
            setRegNumber(fresh.registrationNumber || '');
            setAvatarUrl(fresh.avatarUrl || '');
            StorageRepository.setCurrentUser(fresh);
          }
        })
        .catch((err) => console.warn('Fetch live profile error:', err));
    }
  }, [currentUser, isOpen, initialTab]);

  if (!isOpen) return null;

  // Handle Avatar Image File Upload with instant Canvas compression
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAvatarLocked) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            setAvatarUrl(compressedBase64);
            setErrorMsg(null);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Profile Details Save
  const handleSaveProfileDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!regNumber.trim()) {
      setErrorMsg('Please enter your Register Number / Student ID.');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await UserDatabaseService.updateUserProfileDetails(
        liveUser,
        name,
        regNumber,
        avatarUrl
      );
      setIsLoading(false);
      setSuccessMsg('🎉 Profile details saved & permanently locked!');
      onProfileUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Failed to update profile details.');
    }
  };

  // Handle Password Change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!previousPassword.trim()) {
      setErrorMsg('Please enter your previous password.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await UserDatabaseService.changeUserPassword(
        currentUser.id,
        previousPassword,
        newPassword
      );
      setIsLoading(false);
      setPreviousPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('🔒 Password changed successfully!');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Password update failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">Account Settings &amp; Profile</h2>
              <p className="text-[11px] sm:text-xs text-indigo-200 font-medium truncate max-w-[200px] sm:max-w-xs">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 pt-2 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('profile');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('security');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Security &amp; Password</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Notification Messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'profile' && (
            /* TAB 1: PROFILE DETAILS FORM */
            <form onSubmit={handleSaveProfileDetails} className="space-y-5">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="relative group shrink-0">
                  <img
                    src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt="User Avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200 shadow-md"
                  />
                  {!isAvatarLocked && (
                    <label className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <Camera className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  {isAvatarLocked && (
                    <div
                      className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-white shadow-xs"
                      title="Profile picture is locked"
                    >
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 block">Profile Picture Avatar</label>
                  {isAvatarLocked ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs shadow-2xs cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Locked</span>
                    </div>
                  ) : (
                    <>
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-sm transition-all cursor-pointer">
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span>Choose Photo from Device</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Auto-compressed for instant upload
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={isLocked}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full border rounded-xl px-4 py-2.5 pl-10 text-xs font-medium focus:outline-none ${
                      isLocked
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-600'
                    }`}
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  {isLocked && <Lock className="w-4 h-4 text-amber-500 absolute right-3.5 top-3" />}
                </div>
              </div>

              {/* Register Number / Student ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Register Number / Student ID</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={isLocked}
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g. REG-2026-9041"
                    className={`w-full border rounded-xl px-4 py-2.5 pl-10 text-xs font-medium focus:outline-none uppercase ${
                      isLocked
                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-600'
                    }`}
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  {isLocked && <Lock className="w-4 h-4 text-amber-500 absolute right-3.5 top-3" />}
                </div>
              </div>

              {/* Email Address (Immutable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Account Email</label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs font-medium text-slate-500 cursor-not-allowed"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              {!isLocked && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.01]"
                >
                  {isLoading ? 'Saving Details...' : 'Save Profile Details'}
                </button>
              )}
            </form>
          )}

          {activeTab === 'security' && (
            /* TAB 2: CHANGE PASSWORD FORM */
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium leading-relaxed">
                🔒 Security Check: Enter your <strong>Previous Password</strong> to set a new account password.
              </div>

              {/* Previous Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800">Previous Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={previousPassword}
                    onChange={(e) => setPreviousPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 pr-10 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-all cursor-pointer"
              >
                {isLoading ? 'Updating Password...' : 'Verify & Change Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
