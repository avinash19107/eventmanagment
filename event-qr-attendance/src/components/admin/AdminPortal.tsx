import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  UserPlus,
  Search,
  Filter,
  Trash2,
  Edit3,
  KeyRound,
  CheckCircle2,
  XCircle,
  Calendar,
  Ticket,
  Activity,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Unlock,
  GraduationCap,
  Briefcase,
  UserCheck,
  ChevronRight,
  Sliders,
  FileSpreadsheet,
  Download,
  MessageSquare,
  Star,
} from 'lucide-react';
import { User, UserRole, Event, Registration, AuditEvent, PlatformFeedback } from '../../types';
import { UserDatabaseService, UserDatabaseRecord } from '../../services/userDatabase';
import { EventDatabaseService } from '../../services/eventDatabase';
import { StorageRepository } from '../../services/storage';

interface AdminPortalProps {
  currentUser: User;
  onSignOut: () => void;
  onSwitchPortalView?: (view: 'admin' | 'organizer' | 'teacher' | 'user') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  onSignOut,
  onSwitchPortalView,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'registrations' | 'audit' | 'feedback'>('users');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'organizer' | 'attendee' | 'admin'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [users, setUsers] = useState<UserDatabaseRecord[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [portalFeedbacks, setPortalFeedbacks] = useState<PlatformFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDatabaseRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserDatabaseRecord | null>(null);

  // Form states for Create User
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'teacher' as UserRole,
    registrationNumber: '',
    password: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Form states for Edit User
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'attendee' as UserRole,
    registrationNumber: '',
    status: 'active' as 'active' | 'inactive',
    newPassword: '',
    allowEditOverride: false,
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Load all system data from Firebase RTDB and Local Storage
  const loadSystemData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users
      const dbUsers = await UserDatabaseService.getAllUsersFromRealtimeDB();
      const localUsers = StorageRepository.getUsers();
      const mergedUsersMap = new Map<string, UserDatabaseRecord>();

      // Fallback local users
      localUsers.forEach((u) => {
        mergedUsersMap.set(u.id, {
          ...u,
          authProvider: 'password',
          createdAt: u.lastLogin || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      // Realtime DB users override
      dbUsers.forEach((u) => mergedUsersMap.set(u.id, u));
      setUsers(Array.from(mergedUsersMap.values()));

      // 2. Fetch Events
      const rtdbEvents = await EventDatabaseService.getEventsFromRealtimeDB();
      const localEvents = StorageRepository.getEvents();
      const mergedEventsMap = new Map<string, Event>();
      rtdbEvents.forEach((e) => mergedEventsMap.set(e.id, e));
      if (rtdbEvents.length === 0) {
        localEvents.forEach((e) => mergedEventsMap.set(e.id, e));
      }
      const mergedEvents = Array.from(mergedEventsMap.values());
      const validEventIds = new Set(mergedEvents.map((e) => e.id));
      setEvents(mergedEvents);

      // 3. Fetch Registrations (filter out deleted events)
      const rtdbRegs = await EventDatabaseService.getRegistrationsFromRealtimeDB();
      const localRegs = StorageRepository.getRegistrations();
      const mergedRegsMap = new Map<string, Registration>();
      localRegs.forEach((r) => {
        if (validEventIds.has(r.eventId)) mergedRegsMap.set(r.id, r);
      });
      rtdbRegs.forEach((r) => {
        if (validEventIds.has(r.eventId)) mergedRegsMap.set(r.id, r);
      });
      setRegistrations(Array.from(mergedRegsMap.values()));

      // 4. Audit Logs
      setAuditLogs(StorageRepository.getAuditLogs().slice(0, 100));

      // 5. Portal Community Feedbacks
      const rtdbPf = await EventDatabaseService.getPlatformFeedbackFromRealtimeDB();
      const localPf = StorageRepository.getPlatformFeedback();
      const pfMap = new Map<string, PlatformFeedback>();
      localPf.forEach((f) => pfMap.set(f.id, f));
      rtdbPf.forEach((f) => pfMap.set(f.id, f));
      setPortalFeedbacks(Array.from(pfMap.values()));
    } catch (err) {
      console.warn('System data sync notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this community review?')) return;
    try {
      StorageRepository.deletePlatformFeedback(feedbackId);
      await EventDatabaseService.deletePlatformFeedbackFromRealtimeDB(feedbackId);
      setPortalFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
      showNotification('✅ Review deleted successfully.');
    } catch (err: any) {
      showNotification(null, 'Failed to delete review.');
    }
  };

  useEffect(() => {
    loadSystemData();
    // Auto-sync every 5 seconds for live admin view
    const interval = setInterval(loadSystemData, 5000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (successMsg: string | null, errorMsg: string | null = null) => {
    setActionSuccess(successMsg);
    setActionError(errorMsg);
    setTimeout(() => {
      setActionSuccess(null);
      setActionError(null);
    }, 4000);
  };

  // Handle Create User
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) {
      showNotification(null, 'Please provide Full Name, Email, and Password.');
      return;
    }
    if (createForm.password.length < 6) {
      showNotification(null, 'Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      await UserDatabaseService.adminCreateUser(
        {
          name: createForm.name,
          email: createForm.email,
          role: createForm.role,
          registrationNumber: createForm.registrationNumber,
          status: createForm.status,
        },
        createForm.password
      );

      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        email: '',
        role: 'teacher',
        registrationNumber: '',
        password: '',
        status: 'active',
      });
      await loadSystemData();
      showNotification(`🎉 Account successfully created for ${createForm.name} (${createForm.role.toUpperCase()})`);
    } catch (err: any) {
      showNotification(null, err.message || 'Failed to create user account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditModal = (user: UserDatabaseRecord) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      registrationNumber: user.registrationNumber || '',
      status: user.status || 'active',
      newPassword: '',
      allowEditOverride: user.allowEditOverride || false,
    });
  };

  // Handle Edit User Submit
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsLoading(true);
      await UserDatabaseService.adminUpdateUser(
        editingUser.id,
        {
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          registrationNumber: editForm.registrationNumber,
          status: editForm.status,
          allowEditOverride: editForm.allowEditOverride,
        },
        editForm.newPassword || undefined
      );

      setEditingUser(null);
      await loadSystemData();
      showNotification(`✅ Profile details updated for ${editForm.name}`);
    } catch (err: any) {
      showNotification(null, err.message || 'Failed to update user profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete User
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      setIsLoading(true);
      await UserDatabaseService.deleteUserFromRealtimeDB(deletingUser.id);
      setDeletingUser(null);
      await loadSystemData();
      showNotification(`🗑️ User account "${deletingUser.name}" (${deletingUser.email}) permanently deleted.`);
    } catch (err: any) {
      showNotification(null, err.message || 'Failed to delete user.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Unlock 1-time Edit Lock
  const handleUnlockProfile = async (targetUser: UserDatabaseRecord) => {
    try {
      await UserDatabaseService.unlockUserEditPermission(targetUser.id);
      await loadSystemData();
      showNotification(`🔓 Edit lock removed for ${targetUser.name}. They can now edit details in their portal.`);
    } catch (err: any) {
      showNotification(null, err.message || 'Failed to unlock user.');
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.registrationNumber || '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  // Calculate Statistics
  const teachersCount = users.filter((u) => u.role === 'teacher').length;
  const organizersCount = users.filter((u) => u.role === 'organizer').length;
  const attendeesCount = users.filter((u) => u.role === 'attendee').length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;
  const totalVerifiedCheckIns = registrations.filter((r) => r.status === 'checked_in' || !!r.checkedInAt).length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300 font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-600" />
            <span>Admin</span>
          </span>
        );
      case 'teacher':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-amber-600" />
            <span>Teacher (Faculty)</span>
          </span>
        );
      case 'organizer':
        return (
          <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-indigo-600" />
            <span>Organizer</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-500" />
            <span>Student / Attendee</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-purple-600 selection:text-white pb-24">
      {/* 1. MASTER ADMIN TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-3 sm:px-8 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {/* Top Row: Brand, Portal Switcher, and Main Actions */}
          <div className="flex items-center justify-between gap-2">
            {/* Brand Logo & Master Badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center shadow-md shadow-purple-600/30 text-white font-black shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 truncate">ApexEvents</h1>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-purple-200 shrink-0">
                    Admin
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Create User Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Account</span>
                <span className="sm:hidden">+ Account</span>
              </button>

              {/* Sync Button */}
              <button
                onClick={loadSystemData}
                disabled={isLoading}
                className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-purple-600 active:scale-95 shadow-xs transition-all cursor-pointer"
                title="Refresh All Database Collections"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
              </button>

              {/* Sign Out */}
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 active:scale-95 border border-slate-200 shadow-xs transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Second Row on Mobile: Navigation Tabs & Portal Switcher Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            {/* Center Navigation Tabs */}
            <nav className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200 overflow-x-auto scrollbar-none py-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
                  activeTab === 'users'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users ({users.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('events')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
                  activeTab === 'events'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Events ({events.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('registrations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
                  activeTab === 'registrations'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Passes ({registrations.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
                  activeTab === 'audit'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
              </button>

              <button
                onClick={() => setActiveTab('feedback')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
                  activeTab === 'feedback'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Portal Feedback ({portalFeedbacks.length})</span>
              </button>
            </nav>

            {/* Quick Switch to Teacher / Organizer / Attendee View */}
            {onSwitchPortalView && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 overflow-x-auto scrollbar-none">
                <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 hidden sm:inline">View As:</span>
                <button
                  onClick={() => onSwitchPortalView('teacher')}
                  className="flex-1 sm:flex-initial px-2.5 py-1 rounded-lg hover:bg-white hover:text-amber-700 hover:shadow-xs active:scale-95 transition-all cursor-pointer text-center whitespace-nowrap text-[11px]"
                >
                  🎓 Teacher
                </button>
                <button
                  onClick={() => onSwitchPortalView('organizer')}
                  className="flex-1 sm:flex-initial px-2.5 py-1 rounded-lg hover:bg-white hover:text-indigo-600 hover:shadow-xs active:scale-95 transition-all cursor-pointer text-center whitespace-nowrap text-[11px]"
                >
                  🎪 Organizer
                </button>
                <button
                  onClick={() => onSwitchPortalView('user')}
                  className="flex-1 sm:flex-initial px-2.5 py-1 rounded-lg hover:bg-white hover:text-indigo-600 hover:shadow-xs active:scale-95 transition-all cursor-pointer text-center whitespace-nowrap text-[11px]"
                >
                  👤 User Portal
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. NOTIFICATIONS ALERT BANNER */}
      {actionSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Total Users */}
          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-[10px] font-mono font-bold uppercase">Total</span>
            </div>
            <span className="text-2xl font-black text-slate-900 font-mono block">{users.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">All Registered Users</span>
          </div>

          {/* Card 2: Teachers */}
          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <GraduationCap className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">Faculty</span>
            </div>
            <span className="text-2xl font-black text-slate-900 font-mono block">{teachersCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Teachers Accounts</span>
          </div>

          {/* Card 3: Organizers */}
          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">Staff</span>
            </div>
            <span className="text-2xl font-black text-slate-900 font-mono block">{organizersCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Event Organizers</span>
          </div>

          {/* Card 4: Attendees */}
          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">Students</span>
            </div>
            <span className="text-2xl font-black text-slate-900 font-mono block">{attendeesCount}</span>
            <span className="text-[11px] text-slate-500 font-medium">Student Attendees</span>
          </div>

          {/* Card 5: Events */}
          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <Calendar className="w-4 h-4 text-pink-600" />
              <span className="text-[10px] font-mono font-bold uppercase">Campus</span>
            </div>
            <span className="text-2xl font-black text-slate-900 font-mono block">{events.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">Total Events Hosted</span>
          </div>

          {/* Card 6: Verified Check-Ins */}
          <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <Ticket className="w-4 h-4 text-cyan-600" />
              <span className="text-[10px] font-mono font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.2 rounded">Attendance</span>
            </div>
            <span className="text-2xl font-black text-slate-900 font-mono block">{totalVerifiedCheckIns}</span>
            <span className="text-[11px] text-slate-500 font-medium">Verified Gate Scans</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: USERS & ROLE MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search & Role Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, register number ID, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Role Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <Filter className="w-4 h-4 text-slate-400 ml-1 hidden sm:inline" />
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    roleFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setRoleFilter('teacher')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    roleFilter === 'teacher'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Teachers ({teachersCount})
                </button>
                <button
                  onClick={() => setRoleFilter('organizer')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    roleFilter === 'organizer'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Organizers ({organizersCount})
                </button>
                <button
                  onClick={() => setRoleFilter('attendee')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    roleFilter === 'attendee'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Students ({attendeesCount})
                </button>
                <button
                  onClick={() => setRoleFilter('admin')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    roleFilter === 'admin'
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Admins ({adminsCount})
                </button>
              </div>
            </div>

            {/* Users Data Table */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 font-bold">User Details</th>
                      <th className="py-3.5 px-4 font-bold">Role</th>
                      <th className="py-3.5 px-4 font-bold">Register / ID</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Auth Provider</th>
                      <th className="py-3.5 px-4 font-bold text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-xs">No user accounts found matching your query.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors group">
                          {/* User Name & Email */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                                alt={u.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-xs"
                              />
                              <div>
                                <span className="font-black text-slate-900 block group-hover:text-purple-600 transition-colors">
                                  {u.name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                          {/* Register / ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {u.registrationNumber || <span className="text-slate-400 italic">Not set</span>}
                          </td>

                          {/* Account Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {u.status || 'active'}
                            </span>
                          </td>

                          {/* Auth Provider */}
                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {u.authProvider || 'password'}
                            </span>
                          </td>

                          {/* Admin Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Unlock Profile Button */}
                              {u.role === 'attendee' && (
                                <button
                                  onClick={() => handleUnlockProfile(u)}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                                  title="Unlock Profile 1-Time Edit Lock"
                                >
                                  {u.allowEditOverride ? <Unlock className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              {/* Edit User Button */}
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                                title="Edit User Details, Role, or Reset Password"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete User Button */}
                              {u.id !== currentUser.id && (
                                <button
                                  onClick={() => setDeletingUser(u)}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-400 hover:border-rose-200 border border-slate-200 transition-all cursor-pointer"
                                  title="Delete User Permanently from RTDB"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CAMPUS EVENTS OVERSIGHT */}
        {/* ========================================================= */}
        {activeTab === 'events' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">Campus Events Database</h3>
                <p className="text-xs text-slate-500">Live oversight of all {events.length} events across organizers &amp; teachers.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((evt) => {
                const eventRegs = registrations.filter((r) => r.eventId === evt.id);
                const checkedInCount = eventRegs.filter((r) => r.status === 'checked_in' || !!r.checkedInAt).length;

                return (
                  <div key={evt.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">
                          {evt.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(evt.startDate).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900 line-clamp-1">{evt.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{evt.description}</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Organizer:</span>
                        <strong className="text-slate-900">{evt.organizerName || 'Apex Organizer'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Registered:</span>
                        <strong className="text-indigo-600 font-mono font-bold">{eventRegs.length} / {evt.maxCapacity}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Attendance:</span>
                        <strong className="text-emerald-700 font-mono font-bold">{checkedInCount} Scanned</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: REGISTRATIONS & PASSES DATABASE */}
        {/* ========================================================= */}
        {activeTab === 'registrations' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">All Issued Ticket Passes</h3>
                <p className="text-xs text-slate-500">Total {registrations.length} pass records across all events in Firebase RTDB.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4 font-bold">Pass Reference</th>
                      <th className="py-3 px-4 font-bold">Attendee Name</th>
                      <th className="py-3 px-4 font-bold">Email</th>
                      <th className="py-3 px-4 font-bold">Event ID</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrations.map((reg) => {
                      const isCheckedIn = reg.status === 'checked_in' || !!reg.checkedInAt;
                      return (
                        <tr key={reg.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-black text-purple-700">{reg.reference}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{reg.attendeeName}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono">{reg.attendeeEmail}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{reg.eventId}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                isCheckedIn
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              }`}
                            >
                              {isCheckedIn ? 'Checked In ✓' : 'Confirmed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: AUDIT LOGS VIEW */}
        {/* ========================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-white border border-slate-200">
              <h3 className="text-base font-black text-slate-900">Security &amp; Administrative Audit Trail</h3>
              <p className="text-xs text-slate-500">Chronological record of account creations, role changes, and gate validations.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100 text-xs">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No audit trail records yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{log.action}</span>
                        <span className="px-2 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[10px] font-mono font-bold">
                          {log.actorRole}
                        </span>
                      </div>
                      <p className="text-slate-600">{log.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: PORTAL COMMUNITY FEEDBACK VIEW */}
        {/* ========================================================= */}
        {activeTab === 'feedback' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Stats Overview Strip */}
            {(() => {
              const totalCount = portalFeedbacks.length;
              const avgScore =
                totalCount > 0
                  ? (portalFeedbacks.reduce((a, b) => a + (b.rating || 5), 0) / totalCount).toFixed(1)
                  : '5.0';
              const fiveStarCount = portalFeedbacks.filter((f) => f.rating === 5).length;
              const satisfactionRate =
                totalCount > 0 ? Math.round((portalFeedbacks.filter((f) => f.rating >= 4).length / totalCount) * 100) : 100;

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Reviews</span>
                    <span className="text-2xl font-black text-slate-900 font-mono">{totalCount}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Average Rating</span>
                    <span className="text-2xl font-black text-amber-500 font-mono flex items-center gap-1">
                      <span>{avgScore}</span>
                      <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                    </span>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">5-Star Reviews</span>
                    <span className="text-2xl font-black text-purple-600 font-mono">{fiveStarCount}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Positive Sentiment</span>
                    <span className="text-2xl font-black text-emerald-600 font-mono">{satisfactionRate}%</span>
                  </div>
                </div>
              );
            })()}

            {/* Feedback List Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="text-base font-black text-slate-900">Live Community Feedback Wall</h3>
                    <p className="text-xs text-slate-500">Real attendee reviews published from user profiles to the discover page</p>
                  </div>
                </div>

                <span className="text-xs font-bold bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200">
                  {portalFeedbacks.length} Total Reviews
                </span>
              </div>

              {portalFeedbacks.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No Portal Reviews Submitted Yet</p>
                  <p className="text-xs text-slate-400">Users can submit feedback from their profile modal at any time.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {portalFeedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between hover:border-purple-300 transition-all"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {fb.userAvatarUrl ? (
                              <img
                                src={fb.userAvatarUrl}
                                alt={fb.userName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                {(fb.userName || 'U').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-black text-slate-900">{fb.userName}</p>
                              <p className="text-[10px] text-slate-500">{fb.userEmail}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-amber-900 text-xs font-black">
                            <span>{fb.rating}</span>
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                            {fb.tag || 'Community Reviewer'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(fb.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200/80">
                          "{fb.feedback}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400">ID: {fb.id}</span>
                        <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Review</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: CREATE ACCOUNT (TEACHER, ORGANIZER, ATTENDEE, ADMIN) */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* MODAL 1: CREATE ACCOUNT (TEACHER, ORGANIZER, ATTENDEE, ADMIN) */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] flex flex-col my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Create New Account</h3>
                  <p className="text-[11px] text-slate-500">Add Teacher, Organizer, or Student to RTDB.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer active:scale-95"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Role Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Role</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'teacher' })}
                    className={`py-2.5 px-2 sm:px-3 rounded-xl border text-xs font-black flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                      createForm.role === 'teacher'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-amber-600" />
                    <span>Teacher</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'organizer' })}
                    className={`py-2.5 px-2 sm:px-3 rounded-xl border text-xs font-black flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                      createForm.role === 'organizer'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>Organizer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'attendee' })}
                    className={`py-2.5 px-2 sm:px-3 rounded-xl border text-xs font-black flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                      createForm.role === 'attendee'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Attendee</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Langdon"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. teacher@university.edu"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Initial Password</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters (e.g. teacher123)"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Register ID / Department */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Staff / Student Registration ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. FACULTY-CS-101"
                  value={createForm.registrationNumber}
                  onChange={(e) => setCreateForm({ ...createForm, registrationNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 active:scale-95 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 active:scale-95 text-white text-xs font-black shadow-md shadow-purple-600/30 transition-all cursor-pointer text-center"
                >
                  {isLoading ? 'Creating...' : 'Create Account in RTDB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT USER DETAILS, ROLE, RESET PASSWORD */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] flex flex-col my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Edit User Account</h3>
                  <p className="text-[11px] text-slate-500">Edit profile details, role, or reset password.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer active:scale-95"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Change Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Change Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['teacher', 'organizer', 'attendee', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, role: r })}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-black capitalize transition-all cursor-pointer active:scale-95 text-center ${
                        editForm.role === r
                          ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Register ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Staff / Student Registration ID</label>
                <input
                  type="text"
                  value={editForm.registrationNumber}
                  onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                />
              </div>

              {/* Reset Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reset Password (Leave blank to keep unchanged)</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Enter new password (optional)"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Status & Edit Override */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.allowEditOverride}
                    onChange={(e) => setEditForm({ ...editForm, allowEditOverride: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Unlock Profile 1-Time Edit Lock</span>
                </label>

                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 active:scale-95 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 active:scale-95 text-white text-xs font-black shadow-md shadow-purple-600/30 transition-all cursor-pointer text-center"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DELETE USER CONFIRMATION */}
      {/* ========================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">Delete User Account?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete <strong>{deletingUser.name}</strong> ({deletingUser.email}) from Firebase Realtime Database? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {isLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
