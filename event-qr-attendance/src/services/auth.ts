import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { User } from '../types';
import { StorageRepository } from './storage';
import { EmailService } from './email';
import { UserDatabaseService, verifyPasswordMatch } from './userDatabase';

export class AuthService {
  /**
   * Email / Username + Password Sign In — checks Firebase RTDB for stored credentials
   */
  public static async loginWithCredentials(usernameOrEmail: string, pass: string): Promise<User> {
    if (!usernameOrEmail || !usernameOrEmail.trim()) {
      throw new Error('Please enter your username or email address.');
    }
    if (!pass || !pass.trim()) {
      throw new Error('Please enter your password.');
    }

    const input = usernameOrEmail.trim().toLowerCase();

    // 1. Check local storage first for instant sub-millisecond response
    const users = StorageRepository.getUsers();
    const localUser = users.find(
      (u) =>
        u.email.toLowerCase() === input ||
        u.name.toLowerCase() === input ||
        (u.registrationNumber && u.registrationNumber.toLowerCase() === input)
    );

    // 2. Query Firebase Realtime Database for stored credentials
    const dbUserPromise = UserDatabaseService.verifyCredentials(input, pass);
    const dbUser = await dbUserPromise;

    if (dbUser) {
      if (dbUser.status === 'inactive') {
        throw new Error('This account has been deactivated. Please contact an administrator.');
      }

      // User found in Firebase RTDB with matching password
      const user: User = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        avatarUrl: dbUser.avatarUrl,
        organizationId: dbUser.organizationId,
        status: dbUser.status,
        registrationNumber: dbUser.registrationNumber,
        lastLogin: new Date().toISOString(),
      };

      StorageRepository.setCurrentUser(user);
      StorageRepository.setIsAuthenticated(true);

      // Fire RTDB sync and audit logging asynchronously in background without blocking UI
      void UserDatabaseService.saveUserToRealtimeDB(user, 'password', pass);
      void StorageRepository.logAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'USER_LOGIN_EMAIL',
        entityType: 'user',
        entityId: user.id,
        details: `User signed in from Firebase RTDB (${user.email}) as ${user.role.toUpperCase()}`,
      });

      return user;
    }

    if (localUser && (localUser as any).password) {
      const isLocalPasswordValid = await verifyPasswordMatch(pass, (localUser as any).password);
      if (isLocalPasswordValid) {
        if (localUser.status === 'inactive') {
          throw new Error('This account has been deactivated. Please contact an administrator.');
        }

        const user = { ...localUser, lastLogin: new Date().toISOString() };
        StorageRepository.setCurrentUser(user);
        StorageRepository.setIsAuthenticated(true);

        void UserDatabaseService.saveUserToRealtimeDB(user, 'password', pass);
        void StorageRepository.logAuditEvent({
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          action: 'USER_LOGIN_EMAIL',
          entityType: 'user',
          entityId: user.id,
          details: `User signed in from local storage (${user.email}) as ${user.role.toUpperCase()}`,
        });

        return user;
      }
    }

    // 3. Check if user exists with wrong password
    const existingUser = await UserDatabaseService.findUserByEmail(input);
    if (existingUser || localUser) {
      throw new Error('Incorrect password. Please try again.');
    }

    throw new Error('No registered account found with this email address. Please click "Create an Account" to register.');
  }

  public static async requestRegistrationOTP(name: string, email: string, _pass?: string): Promise<{ otpCode: string; email: string }> {
    return this.sendAccountVerificationOTP(name, email);
  }

  /**
   * Step 1: Send 6-Digit Verification OTP via EmailJS prior to creating account
   */
  public static async sendAccountVerificationOTP(name: string, email: string): Promise<{ otpCode: string; email: string }> {
    if (!name || !name.trim()) {
      throw new Error('Please enter your full name.');
    }
    if (!email || !email.trim() || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check Firebase RTDB if account already exists
    const existingUser = await UserDatabaseService.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    // Generate 6-Digit OTP Code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Send EmailJS Email containing OTP Code
    await EmailService.sendOTPEmail(cleanEmail, name.trim(), otpCode);

    return { otpCode, email: cleanEmail };
  }

  /**
   * Step 2: Verify Entered OTP and Complete Account Registration — saves to Firebase RTDB
   */
  public static async verifyOTPAndCreateAccount(
    name: string,
    email: string,
    pass: string,
    enteredOTP: string,
    expectedOTP: string,
    regNumber?: string
  ): Promise<User> {
    if (!enteredOTP || enteredOTP.trim() !== expectedOTP) {
      throw new Error('Invalid OTP Code. Please check the 6-digit code sent to your email.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Double-check Firebase RTDB
    const existingUser = await UserDatabaseService.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('An account with this email address already exists.');
    }

    if (regNumber && regNumber.trim()) {
      const cleanReg = regNumber.trim().toLowerCase();
      const allUsers = await UserDatabaseService.getAllUsersFromRealtimeDB();
      const duplicateReg = allUsers.find(
        (u) => u.registrationNumber && u.registrationNumber.trim().toLowerCase() === cleanReg
      );
      if (duplicateReg) {
        throw new Error(`Register Number "${regNumber.trim()}" is already registered to another student account.`);
      }
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      registrationNumber: regNumber ? regNumber.trim() : undefined,
      role: 'attendee',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      organizationId: 'org-1',
      status: 'active',
      lastLogin: new Date().toISOString(),
    };

    // Save to local storage
    const users = StorageRepository.getUsers();
    users.push(newUser);
    StorageRepository.setCurrentUser(newUser);
    StorageRepository.setIsAuthenticated(true);

    // Save to Firebase RTDB with email + password
    await UserDatabaseService.saveUserToRealtimeDB(newUser, 'password', pass);

    StorageRepository.logAuditEvent({
      actorId: newUser.id,
      actorName: newUser.name,
      actorRole: newUser.role,
      action: 'USER_REGISTERED_OTP_VERIFIED',
      entityType: 'user',
      entityId: newUser.id,
      details: `OTP-verified account created in Firebase RTDB (${newUser.email})`,
    });

    return newUser;
  }

  /**
   * Firebase Google Authentication Popup — Unifies account by Email Address
   */
  public static async signInWithGoogleFirebase(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const email = (fbUser.email || 'kasukurthiavinash16@gmail.com').trim().toLowerCase();
      const name = fbUser.displayName || 'Avinash Kasukurthi (Google Verified)';
      const photo = fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      // 1. Check Firebase Realtime Database for existing account with SAME email
      const existingDbUser = await UserDatabaseService.findUserByEmail(email);

      let user: User;

      if (existingDbUser) {
        // UNIFY WITH EXISTING ACCOUNT (Preserves exact User ID & Role!)
        user = {
          id: existingDbUser.id,
          name: existingDbUser.name || name,
          email: existingDbUser.email,
          role: existingDbUser.role,
          avatarUrl: photo || existingDbUser.avatarUrl,
          organizationId: existingDbUser.organizationId || 'org-1',
          status: 'active',
          lastLogin: new Date().toISOString(),
        };
      } else {
        // Fallback: Check local storage
        const users = StorageRepository.getUsers();
        const localUser = users.find((u) => u.email.toLowerCase() === email);

        if (localUser) {
          user = {
            ...localUser,
            lastLogin: new Date().toISOString(),
            avatarUrl: photo || localUser.avatarUrl,
          };
        } else {
          // Create new unified account
          user = {
            id: fbUser.uid || `usr-google-${Date.now()}`,
            name,
            email,
            role: 'attendee',
            avatarUrl: photo,
            organizationId: 'org-1',
            status: 'active',
            lastLogin: new Date().toISOString(),
          };
        }
      }

      StorageRepository.setCurrentUser(user);
      StorageRepository.setIsAuthenticated(true);
      await UserDatabaseService.saveUserToRealtimeDB(user, 'google.com');

      StorageRepository.logAuditEvent({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'FIREBASE_GOOGLE_SIGNIN',
        entityType: 'user',
        entityId: user.id,
        details: `Google unified login (${email}) with role ${user.role.toUpperCase()}`,
      });

      return user;
    } catch (err: any) {
      console.warn('Firebase Google Auth Popup error:', err?.message);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        throw new Error('Google Sign-In was cancelled.');
      }
      if (err?.code === 'auth/popup-blocked') {
        throw new Error('Popup blocked by browser. Please allow popups for Google Sign-In.');
      }
      throw new Error(err?.message || 'Google Sign-In failed. Please try again or use email login.');
    }
  }

  /**
   * Step 1: Request Password Reset 6-Digit OTP via EmailJS
   */
  public static async requestPasswordResetOTP(email: string): Promise<{ otpCode: string; email: string; userName: string }> {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify account exists in Firebase RTDB or local storage
    const dbUser = await UserDatabaseService.findUserByEmail(cleanEmail);
    const users = StorageRepository.getUsers();
    const localUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!dbUser && !localUser) {
      throw new Error('No registered account found with this email address.');
    }

    const userName = dbUser?.name || localUser?.name || cleanEmail.split('@')[0];
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Dispatch Password Reset OTP Email
    await EmailService.sendPasswordResetOTPEmail(cleanEmail, userName, otpCode);

    StorageRepository.logAuditEvent({
      actorId: 'system',
      actorName: 'Password Reset Service',
      actorRole: 'admin',
      action: 'PASSWORD_RESET_OTP_DISPATCHED',
      entityType: 'user',
      entityId: cleanEmail,
      details: `Dispatched 6-Digit Password Reset OTP to ${cleanEmail}`,
    });

    return {
      otpCode,
      email: cleanEmail,
      userName,
    };
  }

  /**
   * Step 2: Verify Password Reset OTP and Save New Password
   */
  public static async verifyOTPAndResetPassword(
    email: string,
    expectedOTP: string,
    enteredOTP: string,
    newPass: string
  ): Promise<User> {
    if (!enteredOTP || enteredOTP.trim() !== expectedOTP) {
      throw new Error('Invalid OTP Code. Please check the 6-digit verification code sent to your email.');
    }

    if (!newPass || newPass.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = await UserDatabaseService.findUserByEmail(cleanEmail);
    if (!user) {
      const users = StorageRepository.getUsers();
      const local = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!local) {
        throw new Error('Target user account not found.');
      }
      user = {
        ...local,
        authProvider: 'password',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Save updated password to Firebase Realtime Database
    await UserDatabaseService.saveUserToRealtimeDB(user, 'password', newPass);

    StorageRepository.setCurrentUser(user);
    StorageRepository.setIsAuthenticated(true);

    StorageRepository.logAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'user',
      entityId: user.id,
      details: `Password reset successfully completed for ${cleanEmail}`,
    });

    return user;
  }

  /**
   * Password Reset Handler (Sends 6-Digit OTP)
   */
  public static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const res = await this.requestPasswordResetOTP(email);
    return {
      success: true,
      message: `Password reset OTP verification code sent to ${res.email}. Check your inbox!`,
    };
  }
}
