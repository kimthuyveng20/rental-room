'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import { AlertCircle, CheckCircle, LoaderCircle } from 'lucide-react';

type UserRole = 'owner' | 'tenant' | 'admin';

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'owner' as UserRole,
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('Failed to authenticate with Google.');
      setIsGoogleLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName || !formData.confirmPassword) {
      setError('All fields are required');
      return false;
    }
    if (formData.email.length < 3 || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.fullName.length < 2) {
      setError('Full name must be at least 2 characters');
      return false;
    }
    return true;
  };

  // Step 1: Submit Initial Registration Details
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('We have sent a 6-digit verification code to your email.');
      setStep('verify'); // Transition layout to code verification view

    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle Verification Code Submission
  // Step 2: Handle Verification Code Submission & Auto Login
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verificationCode || verificationCode.trim().length !== 6) {
      setError('Please enter the valid 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Validate the code with your verification API
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired verification code');
      }

      setSuccess('Email verified successfully! Logging you in...');

      // 2. Automatically sign the user in using NextAuth credentials 
      // since we already have their email and password cached in the state!
      const result = await signIn('credentials', {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        redirect: false, // Prevent NextAuth from doing a hard page reload
      });

      if (result?.error) {
        // If auto-login fails for some reason, fallback gracefully to the login page
        setError('Auto-login failed, redirecting to sign in page...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else if (result?.ok) {
        // 3. Send them straight to the dashboard seamlessly
        router.push('/dashboard');
        router.refresh();
      }

    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full border-muted/40 shadow-xl bg-card/70 backdrop-blur-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          {step === 'register' ? 'Create Account' : 'Verify Your Email'}
        </CardTitle>
        <CardDescription className="text-center">
          {step === 'register' 
            ? 'Join RoomFlow to manage your rental properties' 
            : `Enter the code we sent to ${formData.email}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {error && (
          <Alert variant="destructive" className="py-2 px-3 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-600/30 bg-green-500/10 py-2 px-3 animate-in fade-in duration-200">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-xs text-green-700 dark:text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        {step === 'register' ? (
          <>
            {/* Google Signup Shortcut */}
            {/* <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <svg className="h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
              )}
              {isGoogleLoading ? 'Connecting...' : 'Sign up with Google'}
            </Button> */}

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-muted/60" />
              <span className="flex-shrink mx-4 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                Or setup profile
              </span>
              <div className="flex-grow border-t border-muted/60" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-xs font-semibold tracking-wide text-foreground">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold tracking-wide text-foreground">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="role" className="text-xs font-semibold tracking-wide text-foreground">
                  Account Type
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full px-3 py-2 border border-input bg-background/50 rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
                >
                  <option value="owner">Property Owner</option>
                  <option value="tenant">Tenant</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold tracking-wide text-foreground">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-semibold tracking-wide text-foreground">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading || isGoogleLoading}
                  required
                  className="bg-background/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2 font-medium"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </>
        ) : (
          /* Step 2: Verification View Screen */
          <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="verificationCode" className="text-sm font-medium text-foreground">
                Verification Code
              </label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={isLoading}
                required
                maxLength={6}
                className="bg-background/50 text-center text-xl tracking-widest font-mono"
              />
            </div>

            <Button
              type="submit"
              className="w-full font-medium"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Email'
              )}
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep('register');
                setError('');
                setSuccess('');
              }}
              disabled={isLoading}
            >
              ← Back to Registration
            </Button>
          </form>
        )}

        <div className="pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}