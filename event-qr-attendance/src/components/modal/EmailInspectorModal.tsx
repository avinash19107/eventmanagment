import React from 'react';
import { StorageRepository } from '../../services/storage';
import { X, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';

interface EmailInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailInspectorModal: React.FC<EmailInspectorModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const notifications = StorageRepository.getNotifications();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Visual Email Inspector</h3>
              <p className="text-xs text-slate-500">EmailJS dispatched messages & receipts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              No emails sent yet. Request a password reset or complete a registration to see emails here!
            </p>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-600 capitalize">{notif.type.replace('_', ' ')}</span>
                  <span className="text-[11px] text-slate-500">{new Date(notif.sentAt).toLocaleString()}</span>
                </div>

                <div className="text-xs text-slate-900 font-medium">
                  To: <span className="text-slate-700">{notif.recipientName} ({notif.recipientEmail})</span>
                </div>

                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 font-mono">
                  {notif.bodySnippet}
                </p>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500 font-mono">Provider: {notif.providerRef}</span>
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      notif.status === 'sent' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {notif.status === 'sent' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{notif.status.toUpperCase()}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
