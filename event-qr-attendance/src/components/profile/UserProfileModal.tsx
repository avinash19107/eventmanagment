import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { UserDatabaseService } from '../../services/userDatabase';
import {
  X,
  User as UserIcon,
  Mail,
  Shield,
  Key,
  Lock,
  Unlock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Hash,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserProfileModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedUser: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

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

  // Check Edit Lock Status
  const editCount = currentUser.detailsEditCount || 0;
  const allowOverride = Boolean(currentUser.allowEditOverride);
  const isLocked = editCount >= 1 && !allowOverride;

  useEffect(() => {
    setName(currentUser.name || '');
    setRegNumber(currentUser.registrationNumber || '');
    setAvatarUrl(currentUser.avatarUrl || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  // Handle Avatar Image File Upload with instant Canvas compression
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        currentUser,
        name,
        regNumber,
        avatarUrl
      );
      setIsLoading(false);
      setSuccessMsg('🎉 Profile details saved successfully!');
      onProfileUpdated(updated);
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Account Settings & Profile</h2>
              <p className="text-xs text-indigo-200 font-medium">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3">
          <button
            onClick={() => {
              setActiveTab('profile');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Security & Password</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
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

          {activeTab === 'profile' ? (
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
                  <label className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 block">Profile Picture Avatar</label>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-sm transition-all cursor-pointer">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>📁 Choose Photo from Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 font-medium">Auto-compressed for instant upload</p>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Register Number / Student ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Register Number / Student ID</label>
                <div className="relative">
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g. REG-2026-9041"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-800 font-mono font-medium focus:outline-none focus:border-indigo-600"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Read-only Role & Email */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Role</span>
                  <span className="text-xs font-black text-indigo-700 uppercase">{currentUser.role}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Address</span>
                  <span className="text-xs font-bold text-slate-700 truncate block">{currentUser.email}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-all cursor-pointer"
              >
                {isLoading ? 'Saving Details...' : 'Save Profile Details'}
              </button>
            </form>
          ) : (
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
