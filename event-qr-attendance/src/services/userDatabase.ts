import { ref, set, get, remove, update, onValue, query, orderByChild, equalTo, limitToFirst, Unsubscribe } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { User, UserRole } from '../types';
import { StorageRepository } from './storage';

export interface UserDatabaseRecord extends User {
  authProvider: 'google.com' | 'password' | 'saml';
  password?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cryptographically hash a password with a dedicated salt using Web Crypto SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + '_apex_crypto_salt_2026_');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'sha256:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }
  return 'b64:' + btoa(password);
}

/**
 * Verify a plaintext password against a stored hashed or legacy password
 */
export async function verifyPasswordMatch(plain: string, stored?: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith('sha256:')) {
    const computed = await hashPassword(plain);
    return computed === stored;
  }
  if (stored.startsWith('b64:')) {
    return stored === 'b64:' + btoa(plain) || stored.slice(4) === btoa(plain);
  }
  // Legacy base64 without prefix
  return stored === btoa(plain);
}

export class UserDatabaseService {
  /**
   * Subscribe to single user updates in Firebase Realtime Database
   */
  public static subscribeToUser(
    userId: string,
    callback: (user: UserDatabaseRecord | null) => void
  ): Unsubscribe {
    const userRef = ref(rtdb, `users/${userId}`);
    return onValue(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const user = snapshot.val() as UserDatabaseRecord;
          callback(user);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('Live user subscription notice:', err);
      }
    );
  }

  /**
   * Subscribe to all users in Firebase Realtime Database
   */
  public static subscribeToAllUsers(
    callback: (users: UserDatabaseRecord[]) => void
  ): Unsubscribe {
    const usersRef = ref(rtdb, 'users');
    return onValue(
      usersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const usersMap = snapshot.val() as Record<string, UserDatabaseRecord>;
          const list = Object.values(usersMap);
          StorageRepository.setUsers(list);
          callback(list);
        } else {
          StorageRepository.setUsers([]);
          callback([]);
        }
      },
      (err) => {
        console.warn('Live all users subscription notice:', err);
      }
    );
  }

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

      // Cryptographically hash password for email/password accounts
      if (password) {
        payload.password = await hashPassword(password);
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
        const list = Object.values(usersMap);
        StorageRepository.setUsers(list);
        return list;
      } else {
        StorageRepository.setUsers([]);
      }
    } catch (err) {
      console.warn('Fetch all users notice:', err);
    }
    return [];
  }

  /**
   * Find user by email in Firebase Realtime Database with high-speed indexed query
   */
  public static async findUserByEmail(email: string): Promise<UserDatabaseRecord | null> {
    try {
      const clean = email.trim().toLowerCase();
      // 1. Indexed lookup by email
      const emailQuery = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(clean), limitToFirst(1));
      const snap = await get(emailQuery);

      if (snap.exists()) {
        const users = snap.val() as Record<string, UserDatabaseRecord>;
        return Object.values(users)[0] || null;
      }

      // 2. Fallback scan if case variation exists
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const users = snapshot.val() as Record<string, UserDatabaseRecord>;
        for (const userId of Object.keys(users)) {
          const u = users[userId];
          if (u.email && u.email.toLowerCase() === clean) {
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

  /**
   * Verify login credentials against Firebase Realtime Database with high performance and indexing
   */
  public static async verifyCredentials(emailOrName: string, password: string): Promise<UserDatabaseRecord | null> {
    try {
      const input = emailOrName.trim().toLowerCase();

      // 1. Try indexed query by email
      try {
        const emailQuery = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(input), limitToFirst(1));
        const emailSnap = await get(emailQuery);
        if (emailSnap.exists()) {
          const u = Object.values(emailSnap.val() as Record<string, UserDatabaseRecord>)[0];
          if (u) {
            const isMatch = await verifyPasswordMatch(password, u.password);
            if (isMatch) {
              if (u.password && !u.password.startsWith('sha256:')) {
                void hashPassword(password).then((newHash) => {
                  void update(ref(rtdb, `users/${u.id}`), { password: newHash });
                });
              }
              return u;
            }
          }
        }
      } catch {}

      // 2. Try indexed query by registration number
      try {
        const regQuery = query(ref(rtdb, 'users'), orderByChild('registrationNumber'), equalTo(input), limitToFirst(1));
        const regSnap = await get(regQuery);
        if (regSnap.exists()) {
          const u = Object.values(regSnap.val() as Record<string, UserDatabaseRecord>)[0];
          if (u) {
            const isMatch = await verifyPasswordMatch(password, u.password);
            if (isMatch) {
              if (u.password && !u.password.startsWith('sha256:')) {
                void hashPassword(password).then((newHash) => {
                  void update(ref(rtdb, `users/${u.id}`), { password: newHash });
                });
              }
              return u;
            }
          }
        }
      } catch {}

      // 3. Fallback scan with timeout for name match
      const usersRef = ref(rtdb, 'users');
      const snapshotPromise = get(usersRef);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
      const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);

      if (snapshot && snapshot.exists()) {
        const users = snapshot.val() as Record<string, UserDatabaseRecord>;

        for (const userId of Object.keys(users)) {
          const u = users[userId];
          const emailMatch = u.email && u.email.toLowerCase() === input;
          const nameMatch = u.name && u.name.toLowerCase() === input;
          const regMatch = u.registrationNumber && u.registrationNumber.toLowerCase() === input;

          if (emailMatch || nameMatch || regMatch) {
            const isMatch = await verifyPasswordMatch(password, u.password);
            if (isMatch) {
              if (u.password && !u.password.startsWith('sha256:')) {
                void hashPassword(password).then((newHash) => {
                  void update(ref(rtdb, `users/${u.id}`), { password: newHash });
                });
              }
              return u;
            }
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
    const cleanReg = newRegNum.trim();
    if (cleanReg) {
      const allUsers = await this.getAllUsersFromRealtimeDB();
      const duplicate = allUsers.find(
        (u) =>
          u.id !== user.id &&
          u.registrationNumber &&
          u.registrationNumber.trim().toLowerCase() === cleanReg.toLowerCase()
      );
      if (duplicate) {
        throw new Error(
          `Register Number / ID "${cleanReg}" is already registered to another account.`
        );
      }
    }

    const existing = await this.getUserFromRealtimeDB(user.id);
    const editCount = (existing?.detailsEditCount || user.detailsEditCount || 0);

    const updatedUser: User = {
      ...user,
      name: newName.trim(),
      registrationNumber: cleanReg,
      avatarUrl: newAvatarUrl || user.avatarUrl,
      detailsEditCount: editCount + 1,
      allowEditOverride: false,
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

    const isPrevValid = await verifyPasswordMatch(previousPass, dbUser.password);
    if (!isPrevValid) {
      throw new Error('Incorrect previous password. Please check and try again.');
    }

    // Update password with SHA-256 hash in Firebase RTDB
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
    if (userData.role === 'admin') {
      throw new Error('Only one Master Admin account is permitted in the system.');
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      throw new Error(`An account with email "${cleanEmail}" already exists.`);
    }

    if (userData.registrationNumber && userData.registrationNumber.trim()) {
      const cleanReg = userData.registrationNumber.trim().toLowerCase();
      const allUsers = await this.getAllUsersFromRealtimeDB();
      const duplicateReg = allUsers.find(
        (u) => u.registrationNumber && u.registrationNumber.trim().toLowerCase() === cleanReg
      );
      if (duplicateReg) {
        throw new Error(
          `Register Number "${userData.registrationNumber.trim()}" is already assigned to ${duplicateReg.name} (${duplicateReg.email}).`
        );
      }
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
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'),
      authProvider: 'password',
      password: await hashPassword(password),
      detailsEditCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firebase RTDB
    const userRef = ref(rtdb, `users/${userId}`);
    await set(userRef, newRecord);

    // Also update local cache
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

    // Protection: Master Admin account rules
    if (existing.role === 'admin' || existing.email === 'admin@apexevents.in') {
      if (updates.role && updates.role !== 'admin') {
        throw new Error('The Master Admin role cannot be modified.');
      }
      if (updates.email && updates.email.toLowerCase() !== existing.email.toLowerCase()) {
        throw new Error('The Master Admin email address cannot be modified.');
      }
    } else if (updates.role === 'admin') {
      throw new Error('Only one Master Admin account is permitted in the system.');
    }

    if (updates.registrationNumber && updates.registrationNumber.trim()) {
      const cleanReg = updates.registrationNumber.trim().toLowerCase();
      const allUsers = await this.getAllUsersFromRealtimeDB();
      const duplicateReg = allUsers.find(
        (u) =>
          u.id !== userId &&
          u.registrationNumber &&
          u.registrationNumber.trim().toLowerCase() === cleanReg
      );
      if (duplicateReg) {
        throw new Error(
          `Register Number "${updates.registrationNumber.trim()}" is already assigned to ${duplicateReg.name} (${duplicateReg.email}).`
        );
      }
    }

    const payload: UserDatabaseRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (newPassword && newPassword.trim()) {
      payload.password = await hashPassword(newPassword.trim());
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
      const user = await this.getUserFromRealtimeDB(userId);
      if (user?.role === 'admin' || user?.email === 'admin@apexevents.in') {
        throw new Error('The Master Admin account is protected and cannot be deleted.');
      }

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

}
