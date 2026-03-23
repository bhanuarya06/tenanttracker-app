import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import tokenManager from '../../services/tokenManager';
import { setUser } from '../../store/slices/authSlice';
import { handleOAuthCallback } from '../../services/oauthService';

export default function OAuthCallbackPage() {
  const { provider } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const providerError = searchParams.get('error');

    if (providerError) {
      const desc = searchParams.get('error_description') || 'Authentication was denied';
      setError(desc);
      toast.error(desc);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    if (!code || !state) {
      setError('Invalid callback — missing code or state');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    (async () => {
      try {
        const result = await handleOAuthCallback(provider, code, state);
        if (result.success && result.data) {
          tokenManager.setToken(result.data.token);
          dispatch(setUser(result.data.user));
          toast.success(result.message || 'Login successful');
          navigate('/dashboard', { replace: true });
        } else {
          throw new Error(result.message || 'Authentication failed');
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'OAuth authentication failed';
        setError(msg);
        toast.error(msg);
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      }
    })();
  }, [provider, searchParams, navigate, dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">Authentication Failed</p>
            <p className="text-sm text-gray-500">{error}</p>
            <p className="text-xs text-gray-400 mt-3">Redirecting to login...</p>
          </>
        ) : (
          <>
            <svg className="animate-spin mx-auto h-10 w-10 text-primary-600 mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-lg font-medium text-gray-900">Completing sign in...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we verify your account</p>
          </>
        )}
      </div>
    </div>
  );
}
