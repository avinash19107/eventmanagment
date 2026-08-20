import { ref, set, get, remove, update } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { User, UserRole } from '../types';
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
    } catch (err) {
      console.warn('Firebase RTDB Find User By Email Notice:', err);
      return null;
    }
  }

  private static isSeeded = false;

  /**
   * Verify login credentials against Firebase Realtime Database with high performance
   */
  public static async verifyCredentials(emailOrName: string, password: string): Promise<UserDatabaseRecord | null> {
    // Seed organizer asynchronously in background if not yet done
    if (!this.isSeeded) {
      this.isSeeded = true;
      void this.seedOrganizerIfEmpty();
    }

    try {
      const usersRef = ref(rtdb, 'users');
      // Set a 3.5s timeout for the fetch to avoid UI lag
      const snapshotPromise = get(usersRef);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);

      if (snapshot && snapshot.exists()) {
        const users = snapshot.val() as Record<string, UserDatabaseRecord>;
        const input = emailOrName.trim().toLowerCase();
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
    } catch (err) {
      console.warn('Firebase RTDB Verify Credentials Notice:', err);
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
   * Admin Option: Create User Account (Attendee, Teacher, Organizer, Admin) directly in Firebase RTDB
   */
  public static async adminCreateUser(
    userData: {
      name: string;
      email: string;
      role: UserRole;
      registrationNumber?: string;
      status?: 'active' | 'inactive';
      avatarUrl?: string;
      organizationId?: string;
    },
    password: string
  ): Promise<UserDatabaseRecord> {
    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`);
    }

    const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord: UserDatabaseRecord = {
      id: userId,
      name: userData.name.trim(),
      email: cleanEmail,
      role: userData.role,
      registrationNumber: userData.registrationNumber?.trim() || '',
      status: userData.status || 'active',
      organizationId: userData.organizationId || 'org-1',
      avatarUrl:
        userData.avatarUrl ||
        (userData.role === 'teacher'
          ? 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'
          : userData.role === 'organizer'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
          : userData.role === 'admin'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'),
      authProvider: 'password',
      password: btoa(password),
      detailsEditCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firebase RTDB
    const userRef = ref(rtdb, `users/${userId}`);
    await set(userRef, newRecord);

    // Also update local cache
    const localUsers = StorageRepository.getUsers();
    StorageRepository.saveUser(newRecord);

    StorageRepository.logAuditEvent({
      actorId: 'admin',
      actorName: 'Admin Portal',
      actorRole: 'admin',
      action: 'ADMIN_CREATE_USER',
      entityType: 'user',
      entityId: userId,
      details: `Admin created ${userData.role.toUpperCase()} account for ${newRecord.name} (${newRecord.email})`,
    });

    return newRecord;
  }

  /**
   * Admin Option: Edit User details, role, status, or reset password
   */
  public static async adminUpdateUser(
    userId: string,
    updates: Partial<UserDatabaseRecord>,
    newPassword?: string
  ): Promise<void> {
    const existing = await this.getUserFromRealtimeDB(userId);
    if (!existing) {
      throw new Error('User record not found in database.');
    }

    const payload: UserDatabaseRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (newPassword && newPassword.trim()) {
      payload.password = btoa(newPassword.trim());
    }

    const userRef = ref(rtdb, `users/${userId}`);
    await set(userRef, payload);

    // Update local cache
    StorageRepository.saveUser(payload);

    StorageRepository.logAuditEvent({
      actorId: 'admin',
      actorName: 'Admin Portal',
      actorRole: 'admin',
      action: 'ADMIN_UPDATE_USER',
      entityType: 'user',
      entityId: userId,
      details: `Admin updated profile for ${payload.name} (${payload.email}) as ${payload.role.toUpperCase()}`,
    });
  }

  /**
   * Admin Option: Delete User permanently from Firebase RTDB and LocalStorage
   */
  public static async deleteUserFromRealtimeDB(userId: string): Promise<void> {
    try {
      const userRef = ref(rtdb, `users/${userId}`);
      await remove(userRef);

      // Remove from local cache
      StorageRepository.deleteUser(userId);

      StorageRepository.logAuditEvent({
        actorId: 'admin',
        actorName: 'Admin Portal',
        actorRole: 'admin',
        action: 'ADMIN_DELETE_USER',
        entityType: 'user',
        entityId: userId,
        details: `Admin permanently deleted user ID: ${userId}`,
      });
    } catch (err) {
      console.warn('Firebase RTDB Delete User Notice:', err);
      throw new Error('Failed to delete user from database.');
    }
  }

  /**
   * Seed default accounts into Firebase RTDB for all roles (Admin, Teacher, Organizer) if missing
   */
  public static async seedOrganizerIfEmpty(): Promise<void> {
    try {
      // 1. Seed Organizer
      const existingOrganizer = await this.findUserByEmail('organizer@apexevents.in');
      if (!existingOrganizer) {
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

      // 2. Seed Admin
      const existingAdmin = await this.findUserByEmail('admin@apexevents.in');
      if (!existingAdmin) {
        const adminUser: User = {
          id: 'usr-admin-default',
          name: 'Master Administrator',
          email: 'admin@apexevents.in',
          role: 'admin',
          organizationId: 'org-1',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          lastLogin: new Date().toISOString(),
        };
        await this.saveUserToRealtimeDB(adminUser, 'password', 'admin123');
      }

      // 3. Seed Teacher
      const existingTeacher = await this.findUserByEmail('teacher@apexevents.in');
      if (!existingTeacher) {
        const teacherUser: User = {
          id: 'usr-teacher-default',
          name: 'Prof. Sarah Jenkins (Faculty)',
          email: 'teacher@apexevents.in',
          role: 'teacher',
          organizationId: 'org-1',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
          lastLogin: new Date().toISOString(),
        };
        await this.saveUserToRealtimeDB(teacherUser, 'password', 'teacher123');
      }
    } catch (err) {
      console.warn('Seed Default Accounts Notice:', err);
    }
  }
}
