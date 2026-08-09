import React, { useState } from 'react';
import { StorageRepository } from './services/storage';
import { User, Event } from './types';
import { LoginPage } from './components/auth/LoginPage';
import { UserEventPortal } from './components/events/UserEventPortal';
import { EventPage } from './components/events/EventPage';
import { OrganizerPortal } from './components/organizer/OrganizerPortal';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => StorageRepository.getIsAuthenticated());
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageRepository.getCurrentUser());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [activePortal, setActivePortal] = useState<'user' | 'organizer'>(() => {
    const user = StorageRepository.getCurrentUser();
    return user?.role === 'organizer' || user?.role === 'admin' ? 'organizer' : 'user';
  });

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
          if (user.role === 'organizer' || user.role === 'admin') {
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

  // Render Organizer Command Portal for Organizers/Admins
  if (activePortal === 'organizer') {
    return (
      <OrganizerPortal
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onSwitchToUserView={() => setActivePortal('user')}
        onViewEventPage={(evt) => setSelectedEvent(evt)}
      />
    );
  }

  // Render Attendee User Event Catalog
  return (
    <div>
      {/* Top Banner to Switch to Organizer Portal for Organizers/Admins */}
      {(currentUser.role === 'organizer' || currentUser.role === 'admin') && (
        <div className="bg-slate-900 text-white text-xs py-2 px-4 flex items-center justify-between font-bold border-b border-slate-800">
          <span>You are logged in as an <strong>Organizer</strong> ({currentUser.email})</span>
          <button
            onClick={() => setActivePortal('organizer')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            Switch to Organizer Portal Command Center →
          </button>
        </div>
      )}

      <UserEventPortal
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onSelectEvent={(evt) => setSelectedEvent(evt)}
      />
    </div>
  );
}

export default App;
