import { EventDatabaseService } from './eventDatabase';
import { RouteSecurityService } from './routeSecurity';
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
  EventFeedback,
  PlatformFeedback,
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
  FEEDBACK: 'eqa_event_feedback',
  PORTAL_FEEDBACK: 'eqa_portal_feedback',

  CURRENT_USER: 'eqa_current_user',
  SESSION_SIG: 'eqa_session_sig',
};

const DEFAULT_ORG: Organization = {
  id: 'org-1',
  name: 'Apex Horizon Global Events',
  logoUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150',
  primaryColor: '#4f46e5',
  status: 'active',
  createdAt: new Date().toISOString(),
};

const DEFAULT_USERS: User[] = [];

const DEFAULT_EVENTS: Event[] = [];

/**
 * Cryptographically secure high-entropy reference generator
 */
export function generateSecureTicketReference(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `REF-${hex}`;
  }
  return `REF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
}

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

    // Active auto-cleanup of legacy test data (John / Hackathon) from browser localStorage
    try {
      const cleanFilter = (item: any) => {
        if (!item) return false;
        const str = JSON.stringify(item).toLowerCase();
        return !str.includes('john') && !str.includes('hackathon');
      };

      const localUsers = this.getItem<User[]>(STORAGE_KEYS.USERS, []);
      if (localUsers.some((u) => !cleanFilter(u))) {
        this.setItem(STORAGE_KEYS.USERS, localUsers.filter(cleanFilter));
      }

      const localEvents = this.getItem<Event[]>(STORAGE_KEYS.EVENTS, []);
      if (localEvents.some((e) => !cleanFilter(e))) {
        this.setItem(STORAGE_KEYS.EVENTS, localEvents.filter(cleanFilter));
      }

      const localRegs = this.getItem<Registration[]>(STORAGE_KEYS.REGISTRATIONS, []);
      if (localRegs.some((r) => !cleanFilter(r))) {
        this.setItem(STORAGE_KEYS.REGISTRATIONS, localRegs.filter(cleanFilter));
      }

      const localAtt = this.getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
      if (localAtt.some((a) => !cleanFilter(a))) {
        this.setItem(STORAGE_KEYS.ATTENDANCE, localAtt.filter(cleanFilter));
      }
    } catch {}
  }

  public static getUsers(): User[] {
    return this.getItem(STORAGE_KEYS.USERS, []);
  }

  public static setUsers(users: User[]): void {
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  public static saveUser(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.unshift(user);
    }
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  public static deleteUser(userId: string): void {
    const users = this.getUsers().filter((u) => u.id !== userId);
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  public static isSessionExpired(): boolean {
    const expiryStr = localStorage.getItem('eqa_session_expiry');
    if (!expiryStr) return false;
    const expiry = Number(expiryStr);
    return !isNaN(expiry) && Date.now() > expiry;
  }

  public static getCurrentUser(): User | null {
    if (this.isSessionExpired()) {
      this.setIsAuthenticated(false);
      return null;
    }

    const user = this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) return null;

    // Verify session integrity signature against DevTools tampering
    const sig = localStorage.getItem(STORAGE_KEYS.SESSION_SIG);
    const isValid = RouteSecurityService.verifySessionIntegrity(user, sig);

    if (!isValid) {
      console.warn('⚠️ Security Alert: LocalStorage role tampering or invalid signature detected. Restoring safe role.');
      const safeUser: User = { ...user, role: 'attendee' };
      this.setCurrentUser(safeUser);
      return safeUser;
    }

    return user;
  }

  public static setCurrentUser(user: User | null): void {
    if (user) {
      this.setItem(STORAGE_KEYS.CURRENT_USER, user);
      const sig = RouteSecurityService.generateSessionSignature(user);
      localStorage.setItem(STORAGE_KEYS.SESSION_SIG, sig);
      // Set 24-hour session expiry
      if (!localStorage.getItem('eqa_session_expiry') || this.isSessionExpired()) {
        localStorage.setItem('eqa_session_expiry', (Date.now() + 24 * 60 * 60 * 1000).toString());
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION_SIG);
      localStorage.removeItem('eqa_session_expiry');
    }
  }

  public static getIsAuthenticated(): boolean {
    if (this.isSessionExpired()) {
      this.setIsAuthenticated(false);
      return false;
    }
    return this.getItem<boolean>(STORAGE_KEYS.IS_AUTHENTICATED, false);
  }

  public static setIsAuthenticated(authed: boolean): void {
    this.setItem(STORAGE_KEYS.IS_AUTHENTICATED, authed);
    if (!authed) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION_SIG);
      localStorage.removeItem('eqa_session_expiry');
    }
  }

  public static getEvents(): Event[] {
    return this.getItem(STORAGE_KEYS.EVENTS, DEFAULT_EVENTS);
  }

  public static setEvents(events: Event[]): void {
    this.setItem(STORAGE_KEYS.EVENTS, events);
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
    // 1. Delete Event
    const events = this.getEvents().filter((e) => e.id !== id);
    this.setItem(STORAGE_KEYS.EVENTS, events);

    // 2. Cascade Delete All Registrations/Passes for this event
    const regs = this.getRegistrations().filter((r) => r.eventId !== id);
    this.setItem(STORAGE_KEYS.REGISTRATIONS, regs);

    // 3. Cascade Delete All Attendance Records for this event
    const atts = this.getAttendanceRecords().filter((a) => a.eventId !== id);
    this.setItem(STORAGE_KEYS.ATTENDANCE, atts);

    // 4. Sync cascade deletion to Firebase Realtime Database
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

  public static updateTeamLogo(eventId: string, teamName: string, newLogoUrl: string): void {
    const regs = this.getRegistrations();
    let changed = false;
    regs.forEach((r) => {
      if (r.eventId === eventId && r.teamName === teamName) {
        r.teamLogoUrl = newLogoUrl;
        changed = true;
      }
    });
    if (changed) {
      this.setItem(STORAGE_KEYS.REGISTRATIONS, regs);
      EventDatabaseService.updateTeamLogoInRealtimeDB(eventId, teamName, newLogoUrl);
    }
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

    // Sync to Firebase Realtime Database
    try {
      EventDatabaseService.saveAttendanceToRealtimeDB(record);
    } catch (e) {}

    // Also update registration status in local storage
    const regs = this.getRegistrations();
    const regIdx = regs.findIndex(
      (r) => r.id === record.registrationId || (r.attendeeEmail.toLowerCase() === record.attendeeEmail.toLowerCase() && r.eventId === record.eventId)
    );
    if (regIdx >= 0) {
      regs[regIdx] = {
        ...regs[regIdx],
        status: 'checked_in',
        checkedInAt: record.checkInTime,
        checkedInBy: record.staffName,
      };
      this.setItem(STORAGE_KEYS.REGISTRATIONS, regs);
    }
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
    // Sanitize and redact sensitive details
    let safeDetails = event.details || '';
    safeDetails = safeDetails.replace(/password[:=]\s*\S+/gi, 'password:[REDACTED]');

    const newLog: AuditEvent = {
      ...event,
      details: safeDetails,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep max 100 entries in ring buffer
    const trimmedLogs = logs.slice(0, 100);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, trimmedLogs);
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

  public static getFeedback(eventId?: string, userEmail?: string): EventFeedback[] {
    const list = this.getItem<EventFeedback[]>(STORAGE_KEYS.FEEDBACK, []);
    return list.filter((f) => {
      if (eventId && f.eventId !== eventId) return false;
      if (userEmail && f.userEmail.toLowerCase() !== userEmail.toLowerCase()) return false;
      return true;
    });
  }

  public static saveFeedback(feedback: EventFeedback): void {
    const list = this.getItem<EventFeedback[]>(STORAGE_KEYS.FEEDBACK, []);
    const idx = list.findIndex((f) => f.id === feedback.id || (f.eventId === feedback.eventId && f.userEmail.toLowerCase() === feedback.userEmail.toLowerCase()));
    if (idx >= 0) {
      list[idx] = feedback;
    } else {
      list.unshift(feedback);
    }
    this.setItem(STORAGE_KEYS.FEEDBACK, list);

    // Save to Firebase Realtime Database
    EventDatabaseService.saveFeedbackToRealtimeDB(feedback);
  }

  public static hasUserSubmittedFeedback(eventId: string, userEmail: string): boolean {
    const list = this.getFeedback(eventId, userEmail);
    return list.length > 0;
  }

  public static getPlatformFeedback(): PlatformFeedback[] {
    return this.getItem<PlatformFeedback[]>(STORAGE_KEYS.PORTAL_FEEDBACK, []);
  }

  public static savePlatformFeedback(feedback: PlatformFeedback): void {
    const list = this.getPlatformFeedback();
    const idx = list.findIndex((f) => f.id === feedback.id || f.userEmail.toLowerCase() === feedback.userEmail.toLowerCase());
    if (idx >= 0) {
      list[idx] = feedback;
    } else {
      list.unshift(feedback);
    }
    this.setItem(STORAGE_KEYS.PORTAL_FEEDBACK, list);

    // Save to Firebase Realtime Database
    EventDatabaseService.savePlatformFeedbackToRealtimeDB(feedback);
  }

  public static deletePlatformFeedback(feedbackId: string): void {
    const list = this.getPlatformFeedback().filter((f) => f.id !== feedbackId);
    this.setItem(STORAGE_KEYS.PORTAL_FEEDBACK, list);
    EventDatabaseService.deletePlatformFeedbackFromRealtimeDB(feedbackId);
  }
}

StorageRepository.initialize();
