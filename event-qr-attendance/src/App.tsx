import React, { useState } from 'react';
import { StorageRepository } from './services/storage';
import { User, Event } from './types';
import { LoginPage } from './components/auth/LoginPage';
import { UserEventPortal } from './components/events/UserEventPortal';
import { EventPage } from './components/events/EventPage';
import { OrganizerPortal } from './components/organizer/OrganizerPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { TeacherPortal } from './components/teacher/TeacherPortal';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => StorageRepository.getIsAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageRepository.getCurrentUser());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [activePortal, setActivePortal] = useState<'user' | 'organizer' | 'teacher' | 'admin'>(() => {
    const user = StorageRepository.getCurrentUser();
    if (user?.role === 'admin') return 'admin';
    if (user?.role === 'teacher') return 'teacher';
    if (user?.role === 'organizer') return 'organizer';
    return 'user';
  });

  // Handle Mobile Hardware / Browser Back Button
  React.useEffect(() => {
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
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedEvent(null);
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          StorageRepository.setIsAuthenticated(true);
          setIsAuthenticated(true);
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

  // 1. Render Admin Portal for Superusers / Admins
  if (activePortal === 'admin' && currentUser.role === 'admin') {
    return (
      <AdminPortal
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onSwitchPortalView={(view) => setActivePortal(view)}
      />
    );
  }

  // 2. Render Teacher Faculty Portal
  if (activePortal === 'teacher' || (currentUser.role === 'teacher' && activePortal !== 'user')) {
    return (
      <div>
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
          onSwitchPortalView={(view) => setActivePortal(view)}
        />
      </div>
    );
  }

  // 3. Render Organizer Command Portal for Organizers/Admins
  if (activePortal === 'organizer') {
    return (
      <div>
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

  // 4. Render Attendee User Event Catalog
  return (
    <div>
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
