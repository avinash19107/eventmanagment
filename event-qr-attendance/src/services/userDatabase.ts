import { ref, set, get } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { User } from '../types';
import { StorageRepository } from './storage';

export interface UserDatabaseRecord extends User {
  authProvider: 'google.com' | 'password' | 'saml';
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export class UserDatabaseService {
  /**
   * Save user profile + password in Firebase Realtime Database under users/{userId}
   */
  public static async saveUserToRealtimeDB(
    user: User,
    provider: 'google.com' | 'password' | 'saml' = 'google.com',
    password?: string
  ): Promise<void> {
    try {
      const userRef = ref(rtdb, `users/${user.id}`);

      // Retain existing record properties if present
      const existing = await this.getUserFromRealtimeDB(user.id);

      const payload: UserDatabaseRecord = {
        ...existing,
        ...user,
        authProvider: provider,
        createdAt: existing?.createdAt || user.lastLogin || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store password for email/password accounts
      if (password) {
        payload.password = btoa(password); // Base64 encode
      } else if (existing?.password) {
        payload.password = existing.password;
      }

      await set(userRef, payload);
    } catch (err) {
      console.warn('Firebase RTDB User Save:', err);
    }
  }

  /**
   * Fetch user profile from Firebase Realtime Database by UID
   */
  public static async getUserFromRealtimeDB(userId: string): Promise<UserDatabaseRecord | null> {
    try {
      const userRef = ref(rtdb, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        return snapshot.val() as UserDatabaseRecord;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch all users from Firebase Realtime Database for Admin view
   */
  public static async getAllUsersFromRealtimeDB(): Promise<UserDatabaseRecord[]> {
    try {
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersMap = snapshot.val() as Record<string, UserDatabaseRecord>;
        return Object.values(usersMap);
      }
    } catch (err) {
      console.warn('Fetch all users notice:', err);
    }
    return [];
  }

  /**
   * Find user by email in Firebase Realtime Database
   */
  public static async findUserByEmail(email: string): Promise<UserDatabaseRecord | null> {
    try {
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users = snapshot.val() as Record<string, UserDatabaseRecord>;
        for (const userId of Object.keys(users)) {
          const u = users[userId];
          if (u.email && u.email.toLowerCase() === email.toLowerCase()) {
            return u;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Verify login credentials against Firebase Realtime Database
   */
  public static async verifyCredentials(emailOrName: string, password: string): Promise<UserDatabaseRecord | null> {
    await this.seedOrganizerIfEmpty();

    try {
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users = snapshot.val() as Record<string, UserDatabaseRecord>;
        const input = emailOrName.toLowerCase();
        const encodedPassword = btoa(password);

        for (const userId of Object.keys(users)) {
          const u = users[userId];
          const emailMatch = u.email && u.email.toLowerCase() === input;
          const nameMatch = u.name && u.name.toLowerCase() === input;
          const regMatch = u.registrationNumber && u.registrationNumber.toLowerCase() === input;

          if ((emailMatch || nameMatch || regMatch) && u.password === encodedPassword) {
            return u;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update Profile Details (Name, Registration Number, Avatar) with 1-Time Edit Enforcement
   */
  public static async updateUserProfileDetails(
    user: User,
    newName: string,
    newRegNum: string,
    newAvatarUrl: string
  ): Promise<User> {
    const existing = await this.getUserFromRealtimeDB(user.id);
    const editCount = (existing?.detailsEditCount || user.detailsEditCount || 0);

    const updatedUser: User = {
      ...user,
      name: newName.trim(),
      registrationNumber: newRegNum.trim(),
      avatarUrl: newAvatarUrl || user.avatarUrl,
      detailsEditCount: editCount + 1,
    };

    // Save to Firebase RTDB & LocalStorage
    await this.saveUserToRealtimeDB(updatedUser);
    StorageRepository.setCurrentUser(updatedUser);

    return updatedUser;
  }

  /**
   * Change Password after verifying Previous Password
   */
  public static async changeUserPassword(
    userId: string,
    previousPass: string,
    newPass: string
  ): Promise<void> {
    const dbUser = await this.getUserFromRealtimeDB(userId);
    if (!dbUser) {
      throw new Error('User profile record not found.');
    }

    if (!previousPass || !previousPass.trim()) {
      throw new Error('Please enter your previous password.');
    }

    if (!newPass || newPass.trim().length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const encodedPrevious = btoa(previousPass);
    if (dbUser.password && dbUser.password !== encodedPrevious) {
      throw new Error('Incorrect previous password. Please check and try again.');
    }

    // Update password in Firebase RTDB
    await this.saveUserToRealtimeDB(dbUser, dbUser.authProvider || 'password', newPass);
  }

  /**
   * Admin Option: Unlock a User's Profile Details for a Second Edit
   */
  public static async unlockUserEditPermission(targetUserId: string): Promise<void> {
    const dbUser = await this.getUserFromRealtimeDB(targetUserId);
    if (!dbUser) {
      throw new Error('Target user not found.');
    }

    const updatedUser: User = {
      ...dbUser,
      allowEditOverride: true,
    };

    await this.saveUserToRealtimeDB(updatedUser);
  }

  /**
   * Seed default Organizer account into Firebase RTDB if missing
   */
  public static async seedOrganizerIfEmpty(): Promise<void> {
    try {
      const existing = await this.findUserByEmail('organizer@apexevents.in');
      if (!existing) {
        const organizerUser: User = {
          id: 'usr-organizer-default',
          name: 'Apex Event Organizer',
          email: 'organizer@apexevents.in',
          role: 'organizer',
          organizationId: 'org-1',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          lastLogin: new Date().toISOString(),
        };
        await this.saveUserToRealtimeDB(organizerUser, 'password', 'organizer123');
      }
    } catch (err) {
      console.warn('Seed Organizer Notice:', err);
    }
  }
}
