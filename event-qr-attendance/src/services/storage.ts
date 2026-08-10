import { EventDatabaseService } from './eventDatabase';
import {
  Organization,
  User,
  Event,
  Registration,
  QRCredential,
  AttendanceRecord,
  NotificationRecord,
  AuditEvent,
  EmailJSSettings,
} from '../types';

const STORAGE_KEYS = {
  ORGANIZATIONS: 'eqa_organizations',
  USERS: 'eqa_users',
  EVENTS: 'eqa_events',
  REGISTRATIONS: 'eqa_registrations',
  CREDENTIALS: 'eqa_credentials',
  ATTENDANCE: 'eqa_attendance',
  NOTIFICATIONS: 'eqa_notifications',
  AUDIT_LOGS: 'eqa_audit_logs',
  EMAILJS_SETTINGS: 'eqa_emailjs_settings',
  IS_AUTHENTICATED: 'eqa_is_authenticated',

  CURRENT_USER: 'eqa_current_user',
};

const DEFAULT_ORG: Organization = {
  id: 'org-1',
  name: 'Apex Horizon Global Events',
  logoUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150',
  primaryColor: '#4f46e5',
  status: 'active',
  createdAt: new Date().toISOString(),
};

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-organizer-default',
    name: 'Apex Event Organizer',
    email: 'organizer@apexevents.in',
    role: 'organizer',
    organizationId: 'org-1',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    lastLogin: new Date().toISOString(),
  }
];

import { INITIAL_EVENTS } from './eventDatabase';

const DEFAULT_EVENTS: Event[] = [];

export class StorageRepository {
  private static getItem<T>(key: string, defaultVal: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private static setItem<T>(key: string, val: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('Error saving to LocalStorage', e);
    }
  }

  public static initialize(): void {
    if (!localStorage.getItem(STORAGE_KEYS.ORGANIZATIONS)) {
      this.setItem(STORAGE_KEYS.ORGANIZATIONS, [DEFAULT_ORG]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.setItem(STORAGE_KEYS.USERS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
      this.setItem(STORAGE_KEYS.EVENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REGISTRATIONS)) {
      this.setItem(STORAGE_KEYS.REGISTRATIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CREDENTIALS)) {
      this.setItem(STORAGE_KEYS.CREDENTIALS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      this.setItem(STORAGE_KEYS.ATTENDANCE, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, []);
    }
  }

  public static getUsers(): User[] {
    return this.getItem(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  public static getCurrentUser(): User | null {
    return this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  public static setCurrentUser(user: User): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  public static getIsAuthenticated(): boolean {
    return this.getItem<boolean>(STORAGE_KEYS.IS_AUTHENTICATED, false);
  }

  public static setIsAuthenticated(authed: boolean): void {
    this.setItem(STORAGE_KEYS.IS_AUTHENTICATED, authed);
  }

  public static getEvents(): Event[] {
    return this.getItem(STORAGE_KEYS.EVENTS, DEFAULT_EVENTS);
  }

  public static saveEvent(event: Event): void {
    const events = this.getEvents();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events[idx] = event;
    } else {
      events.unshift(event);
    }
    this.setItem(STORAGE_KEYS.EVENTS, events);

    // Sync to Firebase Realtime Database
    EventDatabaseService.saveEventToRealtimeDB(event);
  }

  public static deleteEvent(id: string): void {
    const events = this.getEvents().filter((e) => e.id !== id);
    this.setItem(STORAGE_KEYS.EVENTS, events);

    // Sync deletion to Firebase Realtime Database
    EventDatabaseService.deleteEventFromRealtimeDB(id);
  }

  public static getRegistrations(eventId?: string): Registration[] {
    const regs = this.getItem<Registration[]>(STORAGE_KEYS.REGISTRATIONS, []);
    if (eventId) {
      return regs.filter((r) => r.eventId === eventId);
    }
    return regs;
  }

  public static getRegistrationById(id: string): Registration | undefined {
    return this.getRegistrations().find((r) => r.id === id);
  }

  public static getRegistrationByEmail(eventId: string, email: string): Registration | undefined {
    return this.getRegistrations(eventId).find(
      (r) => r.attendeeEmail.toLowerCase() === email.toLowerCase() && r.status !== 'cancelled'
    );
  }

  public static saveRegistration(reg: Registration): void {
    const regs = this.getRegistrations();
    const idx = regs.findIndex((r) => r.id === reg.id);
    if (idx >= 0) {
      regs[idx] = reg;
    } else {
      regs.unshift(reg);
    }
    this.setItem(STORAGE_KEYS.REGISTRATIONS, regs);

    // Save registration & QR code to Firebase Realtime Database
    EventDatabaseService.saveRegistrationToRealtimeDB(reg);
  }

  public static getCredentials(eventId?: string): QRCredential[] {
    const creds = this.getItem<QRCredential[]>(STORAGE_KEYS.CREDENTIALS, []);
    if (eventId) {
      return creds.filter((c) => c.eventId === eventId);
    }
    return creds;
  }

  public static getCredentialByToken(tokenHash: string): QRCredential | undefined {
    return this.getCredentials().find((c) => c.tokenHash.trim() === tokenHash.trim());
  }

  public static getCredentialByRegistration(registrationId: string): QRCredential | undefined {
    return this.getCredentials().find((c) => c.registrationId === registrationId);
  }

  public static saveCredential(cred: QRCredential): void {
    const creds = this.getCredentials();
    const idx = creds.findIndex((c) => c.id === cred.id);
    if (idx >= 0) {
      creds[idx] = cred;
    } else {
      creds.unshift(cred);
    }
    this.setItem(STORAGE_KEYS.CREDENTIALS, creds);
  }

  public static getAttendanceRecords(eventId?: string): AttendanceRecord[] {
    const att = this.getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    if (eventId) {
      return att.filter((a) => a.eventId === eventId);
    }
    return att;
  }

  public static getAttendanceByRegistration(registrationId: string): AttendanceRecord | undefined {
    return this.getAttendanceRecords().find(
      (a) => a.registrationId === registrationId && !a.isReversed
    );
  }

  public static saveAttendanceRecord(record: AttendanceRecord): void {
    const list = this.getAttendanceRecords();
    const idx = list.findIndex((a) => a.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    this.setItem(STORAGE_KEYS.ATTENDANCE, list);
  }

  public static getAuditLogs(eventId?: string): AuditEvent[] {
    const logs = this.getItem<AuditEvent[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    if (eventId) {
      return logs.filter((l) => l.entityId === eventId || l.details.includes(eventId));
    }
    return logs;
  }

  public static logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const logs = this.getAuditLogs();
    const newLog: AuditEvent = {
      ...event,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
    return newLog;
  }

  public static getNotifications(): NotificationRecord[] {
    return this.getItem<NotificationRecord[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  public static saveNotification(notif: NotificationRecord): void {
    const list = this.getNotifications();
    list.unshift(notif);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  public static getEmailJSSettings(): EmailJSSettings {
    const envServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const envTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const envPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    const stored = this.getItem<EmailJSSettings | null>(STORAGE_KEYS.EMAILJS_SETTINGS, null);

    if (stored && stored.serviceId) {
      return stored;
    }

    if (envServiceId && envTemplateId && envPublicKey) {
      return {
        serviceId: envServiceId,
        templateId: envTemplateId,
        publicKey: envPublicKey,
        isConfigured: true,
      };
    }

    return {
      serviceId: stored?.serviceId || '',
      templateId: stored?.templateId || '',
      publicKey: stored?.publicKey || '',
      isConfigured: Boolean(stored?.serviceId && stored?.templateId && stored?.publicKey),
    };
  }

  public static saveEmailJSSettings(settings: EmailJSSettings): void {
    this.setItem(STORAGE_KEYS.EMAILJS_SETTINGS, settings);
  }
}

StorageRepository.initialize();
