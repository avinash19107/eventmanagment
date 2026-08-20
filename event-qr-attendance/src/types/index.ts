export type UserRole = 'admin' | 'organizer' | 'teacher' | 'staff' | 'viewer' | 'attendee';

export type EventStatus = 'draft' | 'published' | 'closed' | 'archived' | 'ended';

export type RegistrationStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'checked_in';

export type CredentialStatus = 'active' | 'revoked' | 'expired';

export type CheckInMethod = 'qr_scan' | 'manual_search' | 'kiosk_self';

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  organizationId: string;
  assignedEventIds?: string[];
  status: 'active' | 'inactive';
  lastLogin?: string;
  registrationNumber?: string;
  detailsEditCount?: number;
  allowEditOverride?: boolean;
}

export interface RegistrationField {
  id: string;
  eventId: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'radio' | 'checkbox' | 'terms';
  required: boolean;
  options?: string[];
  displayOrder: number;
  placeholder?: string;
}

export type EventCategory = 'all' | 'hackathon' | 'conference' | 'event' | 'sports';

export interface Event {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: EventCategory;
  bannerUrl?: string;
  timeZone: string;
  startDate: string;
  endDate: string;
  venueName: string;
  address?: string;
  virtualLink?: string;
  locationType?: 'in_person' | 'virtual' | 'hybrid';
  maxCapacity: number;
  registeredCount?: number;
  waitlistEnabled: boolean;
  status: EventStatus;
  registrationOpen: string;
  registrationClose: string;
  organizerEmail: string;
  organizerName: string;
  organizerId?: string;
  primaryColor?: string;
  customFields: RegistrationField[];
  createdAt: string;
  tags?: string[];
  isFree?: boolean;
  price?: number;
  featured?: boolean;
  speakers?: string[];
  format?: 'individual' | 'team';
  minTeamSize?: number;
  maxTeamSize?: number;
}

export interface Registration {
  id: string;
  eventId: string;
  reference: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  registrationNumber?: string;
  status: RegistrationStatus;
  responses: Record<string, string | boolean | string[]>;
  consentAccepted: boolean;
  createdAt: string;
  checkedInAt?: string;
  checkedInBy?: string;
  teamName?: string;
  teamLogoUrl?: string;
  teamCode?: string;
  isTeamLeader?: boolean;
  teamLeaderName?: string;
}

export interface EventTeam {
  id: string;
  eventId: string;
  name: string;
  teamCode?: string;
  logoUrl?: string;
  leaderRegistrationId: string;
  leaderName: string;
  leaderEmail: string;
  memberCount: number;
  createdAt: string;
}

export interface EventWinner {
  registrationId: string;
  attendeeName: string;
  attendeeEmail: string;
  reference: string;
  score: number;
  prize?: string;
  rank?: number;
  markedAt: string;
  markedBy: string;
  teamName?: string;
  teamLogoUrl?: string;
}

export interface QRCredential {
  id: string;
  registrationId: string;
  eventId: string;
  tokenHash: string;
  status: CredentialStatus;
  issuedAt: string;
}

export interface AttendanceRecord {
  id: string;
  registrationId: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  checkInTime: string;
  staffUserId: string;
  staffName: string;
  stationId: string;
  method: CheckInMethod;
  isReversed?: boolean;
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
}

export interface NotificationRecord {
  id: string;
  recipientEmail: string;
  recipientName: string;
  eventId: string;
  eventTitle: string;
  type: 'registration_receipt' | 'password_reset' | 'reminder';
  status: 'queued' | 'sent' | 'failed';
  providerRef?: string;
  sentAt: string;
  bodySnippet?: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'event' | 'registration' | 'attendance' | 'credential' | 'user';
  entityId: string;
  timestamp: string;
  details: string;
}

export interface EmailJSSettings {
  serviceId: string;
  templateId: string;
  publicKey: string;
  isConfigured: boolean;
}

