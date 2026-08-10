import emailjs from '@emailjs/browser';
import { Event, NotificationRecord, Registration } from '../types';
import { StorageRepository } from './storage';

export class EmailService {
  /**
   * Send 6-Digit Registration Verification OTP via EmailJS
   */
  public static async sendOTPEmail(email: string, name: string, otpCode: string): Promise<NotificationRecord> {
    const notifId = `notif-otp-${Date.now()}`;

    // Read EmailJS credentials directly from environment variables
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

    // Calculate OTP expiry time (15 minutes from now)
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
    const timeString = expiryTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Template variables matching EmailJS template: {{passcode}}, {{time}}, {{to_email}}
    const templateParams = {
      to_name: name,
      to_email: email,
      passcode: otpCode,
      time: timeString,
    };

    if (!serviceId || !templateId || !publicKey) {
      throw new Error(
        `EmailJS is not configured. Please add your EmailJS credentials to .env:\n` +
        `VITE_EMAILJS_SERVICE_ID=${serviceId || '(missing)'}\n` +
        `VITE_EMAILJS_TEMPLATE_ID=${templateId || '(missing)'}\n` +
        `VITE_EMAILJS_PUBLIC_KEY=${publicKey || '(missing)'}`
      );
    }

    try {
      const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);

      if (response.status !== 200) {
        throw new Error(`EmailJS returned status ${response.status}: ${response.text}`);
      }

      const notifRecord: NotificationRecord = {
        id: notifId,
        recipientEmail: email,
        recipientName: name,
        eventId: 'system',
        eventTitle: 'Account Verification OTP',
        type: 'registration_receipt',
        status: 'sent',
        providerRef: `EMAILJS_${response.text || '200_OK'}`,
        sentAt: new Date().toISOString(),
        bodySnippet: `ApexEvents OTP Code: [ ${otpCode} ] sent to ${email}`,
      };

      StorageRepository.saveNotification(notifRecord);
      return notifRecord;
    } catch (err: any) {
      const errorMsg = err?.text || err?.message || 'Unknown error';
      throw new Error(`Failed to send OTP email to ${email}: ${errorMsg}`);
    }
  }

  public static async sendRegistrationConfirmation(
    registration: Registration,
    event: Event,
    _qrDataUrl?: string
  ): Promise<NotificationRecord> {
    const notifRecord: NotificationRecord = {
      id: `notif-${Date.now()}`,
      recipientEmail: registration.attendeeEmail,
      recipientName: registration.attendeeName,
      eventId: event.id,
      eventTitle: event.title,
      type: 'registration_receipt',
      status: 'sent',
      providerRef: 'NO_EMAIL_DISPATCH',
      sentAt: new Date().toISOString(),
      bodySnippet: `Registration logged for ${registration.attendeeName} (${registration.reference}). Email dispatch disabled per event configuration.`,
    };

    StorageRepository.saveNotification(notifRecord);
    return notifRecord;
  }

  /**
   * Send 6-Digit Password Reset OTP via EmailJS
   */
  public static async sendPasswordResetOTPEmail(
    email: string,
    name: string,
    otpCode: string
  ): Promise<NotificationRecord> {
    const notifId = `notif-pwd-reset-${Date.now()}`;

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
    const templateId =
      import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID ||
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID ||
      '';
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

    const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
    const timeString = expiryTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const templateParams = {
      to_name: name,
      to_email: email,
      passcode: otpCode,
      time: timeString,
      subject: 'Password Reset OTP Code - ApexEvents',
      message: `Your 6-digit verification code to reset your account password is: ${otpCode}. Valid for 15 minutes.`,
    };

    if (!serviceId || !templateId || !publicKey) {
      throw new Error(
        `EmailJS credentials missing. Please check .env settings.`
      );
    }

    try {
      const response = await emailjs.send(serviceId, templateId, templateParams, publicKey);

      if (response.status !== 200) {
        throw new Error(`EmailJS returned status ${response.status}: ${response.text}`);
      }

      const notifRecord: NotificationRecord = {
        id: notifId,
        recipientEmail: email,
        recipientName: name,
        eventId: 'system',
        eventTitle: 'Password Reset Verification OTP',
        type: 'password_reset',
        status: 'sent',
        providerRef: `EMAILJS_${response.text || '200_OK'}`,
        sentAt: new Date().toISOString(),
        bodySnippet: `Password Reset OTP Code: [ ${otpCode} ] sent to ${email}`,
      };

      StorageRepository.saveNotification(notifRecord);
      return notifRecord;
    } catch (err: any) {
      const errorMsg = err?.text || err?.message || 'Unknown error';
      throw new Error(`Failed to send Password Reset OTP email to ${email}: ${errorMsg}`);
    }
  }

  public static async sendPasswordResetEmail(email: string, resetLink: string): Promise<NotificationRecord> {
    const settings = StorageRepository.getEmailJSSettings();
    const notifId = `notif-reset-${Date.now()}`;

    const templateParams = {
      to_email: email,
      reset_link: resetLink,
      expires_in: '1 hour',
    };

    let status: 'sent' | 'failed' = 'sent';
    let providerRef = 'SIMULATED_LOCAL';

    if (settings.isConfigured && settings.serviceId && settings.templateId && settings.publicKey) {
      try {
        const response = await emailjs.send(
          settings.serviceId,
          settings.templateId,
          templateParams,
          settings.publicKey
        );
        status = response.status === 200 ? 'sent' : 'failed';
        providerRef = `EMAILJS_${response.text || '200_OK'}`;
      } catch {
        status = 'failed';
      }
    }

    const notifRecord: NotificationRecord = {
      id: notifId,
      recipientEmail: email,
      recipientName: email.split('@')[0],
      eventId: 'system',
      eventTitle: 'System Account Recovery',
      type: 'password_reset',
      status,
      providerRef,
      sentAt: new Date().toISOString(),
      bodySnippet: `Password reset requested for ${email}. Reset URL: ${resetLink}`,
    };

    StorageRepository.saveNotification(notifRecord);
    return notifRecord;
  }
}
