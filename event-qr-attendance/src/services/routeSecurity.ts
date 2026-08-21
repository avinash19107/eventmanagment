import { User } from '../types';

/**
 * Route & Session Security Service
 * Provides cryptographic route token encryption, anti-tampering guards,
 * and role-based route authorization.
 */

const SECRET_SALT = 'ApexEvents_2026_SecureRoute_#9981x!z';

export interface DecryptedRoute {
  portal: 'user' | 'organizer' | 'teacher' | 'admin';
  page?: 'discover' | 'portal' | 'how' | 'leaderboard';
  eventId?: string;
  timestamp: number;
  userId?: string;
  role?: string;
}

export class RouteSecurityService {
  /**
   * Simple and robust symmetric string encryption for client-side route tokens
   */
  public static encryptToken(data: DecryptedRoute): string {
    try {
      const jsonStr = JSON.stringify(data);
      let encrypted = '';
      for (let i = 0; i < jsonStr.length; i++) {
        const charCode = jsonStr.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
        encrypted += String.fromCharCode(charCode);
      }
      return btoa(encrypted).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      return '';
    }
  }

  /**
   * Decrypt and validate a route token
   */
  public static decryptToken(token: string): DecryptedRoute | null {
    try {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      const decryptedStr = atob(base64);
      let jsonStr = '';
      for (let i = 0; i < decryptedStr.length; i++) {
        const charCode = decryptedStr.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
        jsonStr += String.fromCharCode(charCode);
      }
      const data = JSON.parse(jsonStr) as DecryptedRoute;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Generate an encrypted URL Hash
   */
  public static generateEncryptedHash(route: DecryptedRoute): string {
    const token = this.encryptToken(route);
    return `#sec=${token}`;
  }

  /**
   * Parse route from URL hash (handles encrypted `#sec=...` tokens and detects raw attempts)
   */
  public static parseRouteFromUrl(currentUser: User | null): {
    portal: 'user' | 'organizer' | 'teacher' | 'admin';
    page: 'discover' | 'portal' | 'how' | 'leaderboard';
    eventId?: string;
    wasTampered: boolean;
  } {
    const rawHash = window.location.hash.toLowerCase();
    const rawPath = window.location.pathname.toLowerCase();

    // 1. Detect Raw Unsecured URL Attempts (e.g. typing /admin, #admin, /organizer, #organizer, etc.)
    const isRawAdminAttempt = rawPath.includes('admin') || rawHash.includes('admin');
    const isRawOrganizerAttempt = rawPath.includes('organizer') || rawHash.includes('organizer');
    const isRawTeacherAttempt = rawPath.includes('teacher') || rawHash.includes('teacher');

    if (isRawAdminAttempt || isRawOrganizerAttempt || isRawTeacherAttempt) {
      // Check if user is actually authorized for the raw attempt
      if (isRawAdminAttempt) {
        if (currentUser?.role === 'admin') {
          return { portal: 'admin', page: 'discover', wasTampered: false };
        }
      } else if (isRawOrganizerAttempt) {
        if (currentUser?.role === 'organizer' || currentUser?.role === 'admin') {
          return { portal: 'organizer', page: 'discover', wasTampered: false };
        }
      } else if (isRawTeacherAttempt) {
        if (currentUser?.role === 'teacher' || currentUser?.role === 'admin') {
          return { portal: 'teacher', page: 'discover', wasTampered: false };
        }
      }

      // Unauthorized raw attempt: sanitize and flag as tampered
      this.sanitizeBrowserUrl();
      return { portal: 'user', page: 'discover', wasTampered: true };
    }

    // 2. Parse Encrypted Hash `#sec=...`
    if (rawHash.startsWith('#sec=')) {
      const token = rawHash.substring(5);
      const decrypted = this.decryptToken(token);

      if (decrypted) {
        // Verify that user ID and role match the token
        if (decrypted.userId && currentUser && decrypted.userId !== currentUser.id) {
          this.sanitizeBrowserUrl();
          return { portal: 'user', page: 'discover', wasTampered: true };
        }

        if (this.isRouteAuthorized(decrypted.portal, currentUser?.role)) {
          return {
            portal: decrypted.portal,
            page: decrypted.page || 'discover',
            eventId: decrypted.eventId,
            wasTampered: false,
          };
        } else {
          this.sanitizeBrowserUrl();
          return { portal: 'user', page: 'discover', wasTampered: true };
        }
      } else {
        this.sanitizeBrowserUrl();
        return { portal: 'user', page: 'discover', wasTampered: true };
      }
    }

    // 3. Standard public hash routes (discover, leaderboard, portal, how)
    let page: 'discover' | 'portal' | 'how' | 'leaderboard' = 'discover';
    if (rawHash.includes('leaderboard')) page = 'leaderboard';
    else if (rawHash.includes('portal') || rawHash.includes('my-portal')) page = 'portal';
    else if (rawHash.includes('how')) page = 'how';

    const defaultPortal =
      currentUser?.role === 'admin'
        ? 'admin'
        : currentUser?.role === 'teacher'
        ? 'teacher'
        : currentUser?.role === 'organizer'
        ? 'organizer'
        : 'user';

    return { portal: defaultPortal, page, wasTampered: false };
  }

  /**
   * Check if a requested route or portal is permitted for the given user role
   */
  public static isRouteAuthorized(
    targetPortal: 'user' | 'organizer' | 'teacher' | 'admin',
    userRole?: string
  ): boolean {
    if (!userRole) return false;
    if (targetPortal === 'admin') return userRole === 'admin';
    if (targetPortal === 'organizer') return userRole === 'organizer' || userRole === 'admin';
    if (targetPortal === 'teacher') return userRole === 'teacher' || userRole === 'admin';
    return true; // 'user' is accessible to all
  }

  /**
   * Sanitize current browser URL path and hash to prevent URL tampering
   */
  public static sanitizeBrowserUrl(): void {
    if (window.location.pathname !== '/' && window.location.pathname !== '') {
      window.history.replaceState(null, '', '/');
    }
  }

  /**
   * Create a secure session integrity signature for a user object
   */
  public static generateSessionSignature(user: User): string {
    const raw = `${user.id}:${user.role}:${user.email}:${SECRET_SALT}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return btoa(`${user.id}_${user.role}_${hash}`);
  }

  /**
   * Verify session integrity signature to prevent DevTools localStorage role escalation
   */
  public static verifySessionIntegrity(user: User, signature: string | null): boolean {
    if (!signature) return false;
    const expected = this.generateSessionSignature(user);
    return signature === expected;
  }
}
