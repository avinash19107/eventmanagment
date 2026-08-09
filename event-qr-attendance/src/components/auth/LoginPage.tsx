import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { AuthService } from '../../services/auth';
import { VisitorService } from '../../services/visitor';
import { LoginVideoBackground } from './LoginVideoBackground';
import {
  User as UserIcon,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Dedicated page view state: 'signin' | 'register' | 'otp_verify' | 'forgot'
  const [pageView, setPageView] = useState<'signin' | 'register' | 'otp_verify' | 'forgot'>('signin');

  // Visitor IP Detection state
  const [isReturningVisitor, setIsReturningVisitor] = useState<boolean>(false);

  // Input states start from remembered state if available
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    VisitorService.checkVisitorStatus().then((info) => {
      setIsReturningVisitor(info.isReturning);
    });
  }, []);

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);

  // Password Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  // Errors & Loading
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. EMAIL / USERNAME SIGN IN HANDLER
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = await AuthService.loginWithCredentials(usernameOrEmail, password);
      setIsLoading(false);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to sign in. Please check your credentials.');
      setIsLoading(false);
    }
  };

  // 2. STEP 1: REGISTER FORM SUBMIT -> DISPATCH EMAILJS OTP
  const handleRegisterFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name || !usernameOrEmail || !password) {
      setErrorMsg('Please fill in your full name, email address, and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await AuthService.sendAccountVerificationOTP(name, usernameOrEmail);
      setGeneratedOTP(res.otpCode);
      setIsLoading(false);
      setPageView('otp_verify');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  // 3. STEP 2: VERIFY OTP AND COMPLETE ACCOUNT CREATION
  const handleVerifyOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit OTP code sent to your email.');
      return;
    }

    setIsLoading(true);

    try {
      const newUser = await AuthService.verifyOTPAndCreateAccount(
        name,
        usernameOrEmail,
        password,
        otpCode.trim(),
        generatedOTP || ''
      );
      setIsLoading(false);
      onLoginSuccess(newUser);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid OTP code. Please try again.');
      setIsLoading(false);
    }
  };

  // RESEND OTP HANDLER
  const handleResendOTP = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await AuthService.sendAccountVerificationOTP(name, usernameOrEmail);
      setGeneratedOTP(res.otpCode);
      setIsLoading(false);
      alert(`New OTP Code sent to ${usernameOrEmail}!`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resend OTP.');
      setIsLoading(false);
    }
  };

  // 4. FIREBASE GOOGLE OAUTH POPUP SIGN IN HANDLER
  const handleGoogleOAuthLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const user = await AuthService.signInWithGoogleFirebase();
      setIsLoading(false);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google Sign-In failed.');
      setIsLoading(false);
    }
  };

  // 5. FORGOT PASSWORD RECOVERY HANDLER
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetStatus(null);
    setIsLoading(true);

    try {
      const res = await AuthService.requestPasswordReset(resetEmail);
      setIsLoading(false);
      setResetStatus(res.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send recovery email.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-200 via-indigo-100 to-purple-300 flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans selection:bg-purple-600 selection:text-white">
      {/* Outer Card: Mobile Stacked Top Video Banner vs Laptop 50/50 Split Screen */}
      <div className="w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-0 md:min-h-[560px] border border-white/50 relative transition-all">
        
        {/* Banner Panel: Mobile Compact Header (h-48 sm:h-56) vs Laptop Full Height (md:w-1/2 md:h-auto) */}
        <div className="relative w-full md:w-1/2 h-52 sm:h-64 md:h-auto bg-gradient-to-br from-[#7C5CFC] via-[#6846EC] to-[#4F2FD4] p-5 sm:p-8 md:p-12 flex flex-col justify-between text-white overflow-hidden select-none rounded-t-[32px] md:rounded-l-[32px] md:rounded-tr-none shrink-0">
          
          {/* Motion Graphics Video Background Container */}
          <LoginVideoBackground />

          {/* Top Navigation Back Link */}
          <div className="relative z-20 min-h-[28px] sm:min-h-[32px]">
            {pageView !== 'signin' && (
              <button
                onClick={() => {
                  setPageView('signin');
                  setErrorMsg(null);
                  setResetStatus(null);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-white/90 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-white/20 transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Back to Sign In</span>
              </button>
            )}
          </div>

          {/* Center Text Layered Cleanly ON TOP OF Video Background */}
          <div className="relative z-20 space-y-1.5 sm:space-y-3 my-auto py-2 sm:py-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg">
              {pageView === 'signin'
                ? (isReturningVisitor ? 'Welcome back!' : 'Hi, Welcome!')
                : pageView === 'register'
                ? 'Create Account!'
                : pageView === 'otp_verify'
                ? 'Verify Email OTP!'
                : 'Account Recovery'}
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-normal max-w-sm drop-shadow-md">
              {pageView === 'signin'
                ? (isReturningVisitor ? 'Sign in to access your portal.' : 'Log in to access our portal.')
                : pageView === 'register'
                ? 'Join ApexEvents platform to manage events and digital ticket passes.'
                : pageView === 'otp_verify'
                ? `Enter the 6-digit OTP code sent to ${usernameOrEmail} via EmailJS.`
                : 'Enter your account email to receive recovery instructions.'}
            </p>
          </div>

          {/* Bottom Filler Space */}
          <div className="relative z-10 hidden md:block min-h-[24px]" />
        </div>

        {/* Form Container: Mobile Touch-Friendly Padding vs Laptop Centered Form */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-white relative rounded-b-[32px] md:rounded-b-none md:rounded-r-[32px]">
          <div className="max-w-sm mx-auto w-full space-y-5 sm:space-y-6">

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PAGE VIEW 1: SIGN IN PAGE */}
            {pageView === 'signin' && (
              <>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Sign In</h1>
                </div>

                <form onSubmit={handleSignInSubmit} className="space-y-3.5 sm:space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      placeholder="Email, Username, or Register Number"
                      className="w-full bg-slate-50/90 border border-slate-200 rounded-full px-4 sm:px-5 py-3 sm:py-3.5 pl-11 sm:pl-12 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner-sm"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 sm:top-4" />
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-slate-50/90 border border-slate-200 rounded-full px-4 sm:px-5 py-3 sm:py-3.5 pl-11 sm:pl-12 pr-11 sm:pr-12 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner-sm"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 sm:top-4" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 sm:top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs px-1 text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-slate-600 font-medium">Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setPageView('forgot');
                        setErrorMsg(null);
                      }}
                      className="text-slate-500 hover:text-purple-600 font-medium transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* 1-Click Pre-fill Demo Organizer Credentials */}
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameOrEmail('organizer@apexevents.in');
                        setPassword('organizer123');
                        setErrorMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
                    >
                      <span>🔑 Click to Pre-fill Organizer ID & Pass</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-full bg-gradient-to-r from-[#6B46C1] to-[#553C9A] hover:from-[#5F3CB4] hover:to-[#4A328C] text-white font-bold py-3.5 px-6 shadow-lg shadow-purple-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm tracking-wide mt-2 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleGoogleOAuthLogin}
                    disabled={isLoading}
                    className="w-full rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold py-3 px-4 transition-all cursor-pointer border border-slate-200 text-xs flex items-center justify-center gap-2 mt-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </form>

                <div className="text-center pt-3 sm:pt-4 text-xs text-slate-500">
                  New here?{' '}
                  <button
                    onClick={() => {
                      setPageView('register');
                      setErrorMsg(null);
                    }}
                    className="text-purple-600 hover:text-purple-700 font-semibold underline cursor-pointer ml-1"
                  >
                    Create an Account
                  </button>
                </div>
              </>
            )}

            {/* PAGE VIEW 2: REGISTER FORM PAGE */}
            {pageView === 'register' && (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Register</h1>
                  <button
                    onClick={() => {
                      setPageView('signin');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                </div>

                <form onSubmit={handleRegisterFormSubmit} className="space-y-3.5 sm:space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-slate-50/90 border border-slate-200 rounded-full px-4 sm:px-5 py-3 sm:py-3.5 pl-11 sm:pl-12 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner-sm"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 sm:top-4" />
                  </div>

                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-slate-50/90 border border-slate-200 rounded-full px-4 sm:px-5 py-3 sm:py-3.5 pl-11 sm:pl-12 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner-sm"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 sm:top-4" />
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-slate-50/90 border border-slate-200 rounded-full px-4 sm:px-5 py-3 sm:py-3.5 pl-11 sm:pl-12 pr-11 sm:pr-12 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner-sm"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 sm:top-4" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 sm:top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-full bg-gradient-to-r from-[#6B46C1] to-[#553C9A] hover:from-[#5F3CB4] hover:to-[#4A328C] text-white font-bold py-3.5 px-6 shadow-lg shadow-purple-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm tracking-wide mt-2 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Email OTP...</span>
                      </>
                    ) : (
                      <span>Send Verification OTP</span>
                    )}
                  </button>
                </form>

                <div className="text-center pt-3 sm:pt-4 text-xs text-slate-500">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setPageView('signin');
                      setErrorMsg(null);
                    }}
                    className="text-purple-600 hover:text-purple-700 font-semibold underline cursor-pointer ml-1"
                  >
                    Sign In
                  </button>
                </div>
              </>
            )}

            {/* PAGE VIEW 3: 6-DIGIT EMAILJS OTP VERIFICATION PAGE */}
            {pageView === 'otp_verify' && (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Verify OTP</h1>
                  <button
                    onClick={() => {
                      setPageView('register');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-xs text-purple-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                  <span>Enter the 6-digit verification code sent to <strong>{usernameOrEmail}</strong></span>
                </div>

                <form onSubmit={handleVerifyOTPSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-Digit OTP (e.g. 849201)"
                      className="w-full bg-slate-50/90 border border-slate-300 rounded-2xl px-5 py-3.5 text-center text-lg font-mono font-bold tracking-[0.3em] text-slate-900 placeholder:text-slate-400 placeholder:text-xs placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-full bg-gradient-to-r from-[#6B46C1] to-[#553C9A] hover:from-[#5F3CB4] hover:to-[#4A328C] text-white font-bold py-3.5 px-6 shadow-lg shadow-purple-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm tracking-wide flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <span>Verify OTP & Complete Account</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-1">
                    <span>Didn't receive the code?</span>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resend OTP</span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* PAGE VIEW 4: FORGOT PASSWORD PAGE */}
            {pageView === 'forgot' && (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Reset Password</h1>
                  <button
                    onClick={() => {
                      setPageView('signin');
                      setErrorMsg(null);
                      setResetStatus(null);
                    }}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                </div>

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5 sm:space-y-4">
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter account email address"
                      className="w-full bg-slate-50/90 border border-slate-200 rounded-full px-4 sm:px-5 py-3 sm:py-3.5 pl-11 sm:pl-12 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all shadow-inner-sm"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 sm:top-4" />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-full bg-gradient-to-r from-[#6B46C1] to-[#553C9A] text-white font-bold py-3.5 px-6 shadow-lg shadow-purple-500/25 cursor-pointer text-xs flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <span>Send Recovery Link</span>
                    )}
                  </button>

                  {resetStatus && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{resetStatus}</span>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPageView('signin');
                        setErrorMsg(null);
                        setResetStatus(null);
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700 font-semibold underline cursor-pointer"
                    >
                      Return to Sign In
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
