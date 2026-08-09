import { ref, get, set } from 'firebase/database';
import { rtdb } from '../config/firebase';

const LOCAL_VISITATION_KEY = 'eqa_has_visited_portal';
const LOCAL_IP_KEY = 'eqa_visitor_ip';

export interface VisitorInfo {
  isReturning: boolean;
  ip: string;
}

export class VisitorService {
  /**
   * Fetches public IP address of the client using ipify API with timeout
   */
  public static async fetchClientIP(): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.ip) return data.ip.trim();
      }
    } catch {
      // Fallback API if primary fails or times out
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch('https://api64.ipify.org?format=json', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.ip) return data.ip.trim();
      }
    } catch {
      // Ignore network failure fallback
    }

    return localStorage.getItem(LOCAL_IP_KEY) || 'unknown';
  }

  /**
   * Checks if current client is a returning visitor based on LocalStorage & Firebase RTDB IP history
   */
  public static async checkVisitorStatus(): Promise<VisitorInfo> {
    const hasLocalVisited = localStorage.getItem(LOCAL_VISITATION_KEY) === 'true';
    const clientIP = await this.fetchClientIP();

    let isReturningInRTDB = false;

    if (clientIP && clientIP !== 'unknown') {
      try {
        const sanitizedIPKey = clientIP.replace(/\./g, '_').replace(/:/g, '_');
        const visitorRef = ref(rtdb, `visitors/${sanitizedIPKey}`);
        const snapshot = await get(visitorRef);

        if (snapshot.exists()) {
          isReturningInRTDB = true;
        }

        // Record or update visitor log in Firebase RTDB asynchronously
        const existingData = snapshot.exists() ? snapshot.val() : null;
        const currentCount = (existingData?.visitCount || 0) + 1;

        await set(visitorRef, {
          ip: clientIP,
          visitCount: currentCount,
          lastVisitedAt: new Date().toISOString(),
          firstVisitedAt: existingData?.firstVisitedAt || new Date().toISOString(),
          userAgent: navigator.userAgent,
        });
      } catch (err) {
        console.warn('Firebase RTDB Visitor log notice:', err);
      }
    }

    // Set local storage flag for future visits
    localStorage.setItem(LOCAL_VISITATION_KEY, 'true');
    if (clientIP !== 'unknown') {
      localStorage.setItem(LOCAL_IP_KEY, clientIP);
    }

    return {
      isReturning: hasLocalVisited || isReturningInRTDB,
      ip: clientIP,
    };
  }
}
