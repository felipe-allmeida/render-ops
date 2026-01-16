'use client';

import { signIn } from 'next-auth/react';

export function SignInContent() {
  const handleSignIn = () => {
    signIn('keycloak', { callbackUrl: '/workspace' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to RenderOps
          </h1>
          <p className="text-gray-600">
            Sign in to manage your database connections
          </p>
        </div>

        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Sign in with Keycloak
        </button>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Demo credentials:</p>
          <p className="font-mono mt-1">
            Username: <span className="text-gray-700">demo</span>
          </p>
          <p className="font-mono">
            Password: <span className="text-gray-700">demo123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
