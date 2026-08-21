import React, { useState, useEffect } from 'react';
import { StorageRepository } from './services/storage';
import { User, Event } from './types';
import { LoginPage } from './components/auth/LoginPage';
import { UserEventPortal } from './components/events/UserEventPortal';
import { EventPage } from './components/events/EventPage';
import { OrganizerPortal } from './components/organizer/OrganizerPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { TeacherPortal } from './components/teacher/TeacherPortal';
import { RouteSecurityService } from './services/routeSecurity';
import { UserDatabaseService } from './services/userDatabase';
import { ShieldAlert, X } from 'lucide-react';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => StorageRepository.getIsAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageRepository.getCurrentUser());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  const [activePortal, setActivePortal] = useState<'user' | 'organizer' | 'teacher' | 'admin'>(() => {
    const user = StorageRepository.getCurrentUser();
    if (user?.role === 'admin') return 'admin';
    if (user?.role === 'teacher') return 'teacher';
    if (user?.role === 'organizer') return 'organizer';
    return 'user';
  });

  // Security Interceptor: Intercept URL changes, URL hash, and Path tampering
  useEffect(() => {
    const enforceRouteSecurity = () => {
      const { portal, wasTampered } = RouteSecurityService.parseRouteFromUrl(currentUser);

      if (wasTampered) {
        setSecurityNotice(
          '⛔ Security Guard: Unauthorized route access blocked. You do not have permission for administrative or organizer tools.'
        );
        StorageRepository.logAuditEvent({
          actorId: currentUser?.id || 'anonymous',
          actorName: currentUser?.name || 'Guest',
          actorRole: currentUser?.role || 'attendee',
          action: 'SECURITY_BLOCKED_UNAUTHORIZED_ROUTE',
          entityType: 'user',
          entityId: 'route_guard',
          details: `Blocked unauthorized URL tampering attempt to protected portal from path: ${window.location.pathname} hash: ${window.location.hash}`,
        });
        setActivePortal('user');
        RouteSecurityService.sanitizeBrowserUrl();
        return;
      }

      // Check if user is authorized for the portal
      if (!RouteSecurityService.isRouteAuthorized(portal, currentUser?.role)) {
        setActivePortal('user');
        RouteSecurityService.sanitizeBrowserUrl();
      }
    };

    enforceRouteSecurity();
    window.addEventListener('hashchange', enforceRouteSecurity);
    window.addEventListener('popstate', enforceRouteSecurity);

    return () => {
      window.removeEventListener('hashchange', enforceRouteSecurity);
      window.removeEventListener('popstate', enforceRouteSecurity);
    };
  }, [currentUser]);

  // Live Database Verification: Confirm user role has not been manipulated
  useEffect(() => {
    if (!currentUser || !isAuthenticated) return;

    const verifyDatabaseRole = async () => {
      try {
        const dbRecord = await UserDatabaseService.findUserByEmail(currentUser.email);
        if (dbRecord) {
          if (dbRecord.role !== currentUser.role) {
            console.warn(`🔒 Database Role Sync: Role updated from ${currentUser.role} to ${dbRecord.role}`);
            const syncedUser: User = { ...currentUser, role: dbRecord.role };
            setCurrentUser(syncedUser);
            StorageRepository.setCurrentUser(syncedUser);

            if (!RouteSecurityService.isRouteAuthorized(activePortal, dbRecord.role)) {
              setActivePortal('user');
            }
          }
        }
      } catch (err) {
        console.warn('Realtime database security check:', err);
      }
    };

    verifyDatabaseRole();
  }, [currentUser?.email, activePortal, isAuthenticated]);

  // Handle Mobile Hardware / Browser Back Button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedEvent) {
        setSelectedEvent(null);
      }
    };

    if (selectedEvent) {
      window.history.pushState({ view: 'event_detail' }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedEvent]);

  const handleSignOut = () => {
    StorageRepository.setIsAuthenticated(false);
    StorageRepository.setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedEvent(null);
    RouteSecurityService.sanitizeBrowserUrl();
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          StorageRepository.setCurrentUser(user);
          StorageRepository.setIsAuthenticated(true);
          setIsAuthenticated(true);
          RouteSecurityService.sanitizeBrowserUrl();
          if (user.role === 'admin') {
            setActivePortal('admin');
          } else if (user.role === 'teacher') {
            setActivePortal('teacher');
          } else if (user.role === 'organizer') {
            setActivePortal('organizer');
          } else {
            setActivePortal('user');
          }
        }}
      />
    );
  }

  // Render Dedicated Full Event Landing Page if an event is selected
  if (selectedEvent) {
    return (
      <EventPage
        event={selectedEvent}
        currentUser={currentUser}
        onBack={() => setSelectedEvent(null)}
        onRegistrationComplete={() => {
          // Stay on page to inspect digital ticket pass
        }}
      />
    );
  }

  // 1. Render Admin Portal for Superusers / Admins (Strict Role Check)
  if (activePortal === 'admin' && currentUser.role === 'admin') {
    return (
      <div>
        {securityNotice && (
          <div className="bg-rose-600 text-white text-xs font-black py-2.5 px-4 flex items-center justify-between shadow-md z-50 sticky top-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{securityNotice}</span>
            </div>
            <button
              onClick={() => setSecurityNotice(null)}
              className="p-1 hover:bg-rose-700 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <AdminPortal
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onSwitchPortalView={(view) => {
            if (RouteSecurityService.isRouteAuthorized(view, currentUser.role)) {
              setActivePortal(view);
            }
          }}
        />
      </div>
    );
  }

  // 2. Render Teacher Faculty Portal (Strict Role Check)
  if ((activePortal === 'teacher' || (currentUser.role === 'teacher' && activePortal !== 'user')) && (currentUser.role === 'teacher' || currentUser.role === 'admin')) {
    return (
      <div>
        {securityNotice && (
          <div className="bg-rose-600 text-white text-xs font-black py-2.5 px-4 flex items-center justify-between shadow-md z-50 sticky top-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{securityNotice}</span>
            </div>
            <button
              onClick={() => setSecurityNotice(null)}
              className="p-1 hover:bg-rose-700 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Admin Quick Switcher Bar */}
        {currentUser.role === 'admin' && (
          <div className="bg-purple-950 text-white text-xs py-2.5 px-3 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-bold border-b border-purple-900 shadow-sm">
            <span className="text-center sm:text-left">🛡️ Admin Mode • Currently Previewing <strong>Teacher Faculty Portal</strong></span>
            <button
              onClick={() => setActivePortal('admin')}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm text-center"
            >
              ← Back to Admin Center
            </button>
          </div>
        )}

        <TeacherPortal
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onSwitchPortalView={(view) => {
            if (RouteSecurityService.isRouteAuthorized(view, currentUser.role)) {
              setActivePortal(view);
            }
          }}
        />
      </div>
    );
  }

  // 3. Render Organizer Command Portal for Organizers/Admins (Strict Role Check)
  if (activePortal === 'organizer' && (currentUser.role === 'organizer' || currentUser.role === 'admin')) {
    return (
      <div>
        {securityNotice && (
          <div className="bg-rose-600 text-white text-xs font-black py-2.5 px-4 flex items-center justify-between shadow-md z-50 sticky top-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{securityNotice}</span>
            </div>
            <button
              onClick={() => setSecurityNotice(null)}
              className="p-1 hover:bg-rose-700 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Admin Quick Switcher Bar */}
        {currentUser.role === 'admin' && (
          <div className="bg-purple-950 text-white text-xs py-2.5 px-3 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-bold border-b border-purple-900 shadow-sm">
            <span className="text-center sm:text-left">🛡️ Admin Mode • Currently Previewing <strong>Organizer Command Center</strong></span>
            <button
              onClick={() => setActivePortal('admin')}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm text-center"
            >
              ← Back to Admin Center
            </button>
          </div>
        )}

        <OrganizerPortal
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onSwitchToUserView={() => setActivePortal('user')}
          onViewEventPage={(evt) => setSelectedEvent(evt)}
        />
      </div>
    );
  }

  // 4. Render Attendee User Event Catalog (Default Safe Fallback)
  return (
    <div>
      {securityNotice && (
        <div className="bg-rose-600 text-white text-xs font-black py-2.5 px-4 flex items-center justify-between shadow-md z-50 sticky top-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{securityNotice}</span>
          </div>
          <button
            onClick={() => setSecurityNotice(null)}
            className="p-1 hover:bg-rose-700 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Top Banner to Switch to Admin / Organizer / Teacher Portal */}
      {currentUser.role === 'admin' ? (
        <div className="bg-purple-950 text-white text-xs py-2.5 px-3 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-bold border-b border-purple-900 shadow-sm">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-center sm:text-left">
            <span>🛡️ Admin Mode • Currently Viewing <strong>User Event Portal</strong></span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActivePortal('teacher')}
              className="flex-1 sm:flex-initial bg-amber-700 hover:bg-amber-600 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer text-center"
            >
              🎓 Teacher View
            </button>
            <button
              onClick={() => setActivePortal('organizer')}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer text-center"
            >
              🎪 Organizer View
            </button>
            <button
              onClick={() => setActivePortal('admin')}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm text-center"
            >
              ← Back to Admin Center
            </button>
          </div>
        </div>
      ) : currentUser.role === 'organizer' ? (
        <div className="bg-slate-900 text-white text-xs py-2.5 px-3 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-bold border-b border-slate-800">
          <span className="text-center sm:text-left">You are logged in as Organizer ({currentUser.email})</span>
          <button
            onClick={() => setActivePortal('organizer')}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-black px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm text-center"
          >
            Switch to Organizer Portal Command Center →
          </button>
        </div>
      ) : null}

      <UserEventPortal
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onSelectEvent={(evt) => setSelectedEvent(evt)}
        onUserUpdated={(updatedUser) => {
          setCurrentUser(updatedUser);
          StorageRepository.setCurrentUser(updatedUser);
        }}
      />
    </div>
  );
}

export default App;
