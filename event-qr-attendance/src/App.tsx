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
          <div className="bg-purple-950 text-white text-xs py-2 px-4 flex items-center justify-between font-bold border-b border-purple-900 shadow-sm">
            <span>🛡️ Admin Mode • Currently Previewing <strong>Teacher Faculty Portal</strong></span>
            <button
              onClick={() => setActivePortal('admin')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer shadow-sm"
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
          <div className="bg-purple-950 text-white text-xs py-2 px-4 flex items-center justify-between font-bold border-b border-purple-900 shadow-sm">
            <span>🛡️ Admin Mode • Currently Previewing <strong>Organizer Command Center</strong></span>
            <button
              onClick={() => setActivePortal('admin')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer shadow-sm"
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
        <div className="bg-purple-950 text-white text-xs py-2 px-4 flex items-center justify-between font-bold border-b border-purple-900 shadow-sm">
          <span>🛡️ Admin Mode • Currently Viewing <strong>User Event Portal</strong></span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePortal('teacher')}
              className="bg-amber-700 hover:bg-amber-600 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer"
            >
              Teacher View
            </button>
            <button
              onClick={() => setActivePortal('organizer')}
              className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer"
            >
              Organizer View
            </button>
            <button
              onClick={() => setActivePortal('admin')}
              className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer shadow-sm"
            >
              ← Back to Admin Center
            </button>
          </div>
        </div>
      ) : currentUser.role === 'organizer' ? (
        <div className="bg-slate-900 text-white text-xs py-2 px-4 flex items-center justify-between font-bold border-b border-slate-800">
          <span>You are logged in as Organizer ({currentUser.email})</span>
          <button
            onClick={() => setActivePortal('organizer')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer shadow-sm"
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
