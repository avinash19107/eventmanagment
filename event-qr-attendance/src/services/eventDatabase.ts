import { ref, set, get, remove, update } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { Event, Registration, EventWinner } from '../types';

export const INITIAL_EVENTS: Event[] = [];

export class EventDatabaseService {
  /**
   * Save or Update an event in Firebase Realtime Database under events/{eventId}
   */
  public static async saveEventToRealtimeDB(event: Event): Promise<void> {
    try {
      const eventRef = ref(rtdb, `events/${event.id}`);
      await set(eventRef, {
        ...event,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firebase RTDB Event Save Notice:', err);
    }
  }

  /**
   * Fetch all events directly from Firebase Realtime Database
   */
  public static async getEventsFromRealtimeDB(): Promise<Event[]> {
    try {
      const eventsRef = ref(rtdb, 'events');
      const snapshot = await get(eventsRef);

      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, Event>;
        return Object.values(data);
      }
    } catch (err) {
      console.warn('Firebase RTDB Fetch Events Notice:', err);
    }

    return [];
  }

  /**
   * Mark an event as "ended" — it remains in the DB for history + winner tracking
   */
  public static async endEventInRealtimeDB(eventId: string): Promise<void> {
    try {
      const eventRef = ref(rtdb, `events/${eventId}`);
      await update(eventRef, {
        status: 'ended',
        endedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firebase RTDB End Event Notice:', err);
    }
  }

  /**
   * Delete an event and all its registrations + winners (cascade)
   */
  public static async deleteEventFromRealtimeDB(eventId: string): Promise<void> {
    try {
      // 1. Primary: Remove the event node
      await remove(ref(rtdb, `events/${eventId}`));
    } catch (err) {
      console.warn('Firebase RTDB Delete Event Notice:', err);
    }

    // 2. Cascade cleanup (non-blocking)
    try {
      await remove(ref(rtdb, `winners/${eventId}`));
      const regsSnap = await get(ref(rtdb, 'registrations'));
      if (regsSnap.exists()) {
        const data = regsSnap.val() as Record<string, Registration>;
        const deletes = Object.keys(data).filter((k) => data[k] && data[k].eventId === eventId);
        await Promise.all(deletes.map((k) => remove(ref(rtdb, `registrations/${k}`))));
      }
    } catch (e) {
      console.warn('Cascade cleanup notice:', e);
    }
  }

  /**
   * Save or Update a Registration in Firebase Realtime Database under registrations/{registrationId}
   */
  public static async saveRegistrationToRealtimeDB(registration: Registration): Promise<void> {
    try {
      const regRef = ref(rtdb, `registrations/${registration.id}`);
      await set(regRef, {
        ...registration,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firebase RTDB Registration Save Notice:', err);
    }
  }

  /**
   * Mark a registration as checked in (update status + checkedInAt)
   */
  public static async checkInRegistration(
    registrationId: string,
    staffName: string
  ): Promise<void> {
    try {
      const regRef = ref(rtdb, `registrations/${registrationId}`);
      await update(regRef, {
        status: 'checked_in',
        checkedInAt: new Date().toISOString(),
        checkedInBy: staffName,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firebase RTDB Check-In Notice:', err);
    }
  }

  /**
   * Fetch all registrations directly from Firebase Realtime Database
   */
  public static async getRegistrationsFromRealtimeDB(): Promise<Registration[]> {
    try {
      const regsRef = ref(rtdb, 'registrations');
      const snapshot = await get(regsRef);

      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, Registration>;
        return Object.values(data);
      }
    } catch (err) {
      console.warn('Firebase RTDB Fetch Registrations Notice:', err);
    }

    return [];
  }

  /**
   * Save winners/scores for an ended event
   */
  public static async saveWinnersForEvent(
    eventId: string,
    winners: EventWinner[]
  ): Promise<void> {
    try {
      const winnersRef = ref(rtdb, `winners/${eventId}`);
      const data: Record<string, EventWinner> = {};
      winners.forEach((w) => (data[w.registrationId] = w));
      await set(winnersRef, data);
    } catch (err) {
      console.warn('Firebase RTDB Save Winners Notice:', err);
      throw err;
    }
  }

  /**
   * Fetch winners for a specific ended event
   */
  public static async getWinnersForEvent(eventId: string): Promise<EventWinner[]> {
    try {
      const winnersRef = ref(rtdb, `winners/${eventId}`);
      const snapshot = await get(winnersRef);
      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, EventWinner>;
        return Object.values(data);
      }
    } catch (err) {
      console.warn('Firebase RTDB Fetch Winners Notice:', err);
    }
    return [];
  }

  /**
   * Seed method disabled - events are 100% user-generated by Organizers
   */
  public static async seedEventsIfEmpty(): Promise<void> {
    // Zero auto-seeding
  }
}
