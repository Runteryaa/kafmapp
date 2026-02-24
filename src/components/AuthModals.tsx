import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function LoginModal({ isOpen, onClose, onSwitchToRegister }: { isOpen: boolean, onClose: () => void, onSwitchToRegister: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);
      try {
          await login(email, password);
          onClose(); // Close modal on success instead of reload
      } catch (err: unknown) {
          setError((err as Error).message || "Failed to login. Please check your credentials.");
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center p-4 animate-fade-in bg-white dark:bg-gray-800">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6 relative">
             <button
                onClick={onClose}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center gap-2"
             >
                <ArrowLeft size={20} /> <span className="font-medium">Back to Map</span>
            </button>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md mt-12">
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
            </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
            <form className="space-y-6" onSubmit={handleEmailLogin}>
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm text-center font-medium border border-red-100 dark:border-red-800">
                        {error}
                    </div>
                )}
                <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                </label>
                <div className="mt-1">
                    <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                </div>
                </div>

                <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                </label>
                <div className="mt-1">
                    <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                </div>
                </div>

                <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Remember me
                    </label>
                </div>

                <div className="text-sm">
                    <a href="#" className="font-medium text-amber-600 hover:text-amber-500 dark:text-amber-500 dark:hover:text-amber-400">
                    Forgot your password?
                    </a>
                </div>
                </div>

                <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-70"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Sign in"}
                </button>
                </div>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{' '}
                <button onClick={onSwitchToRegister} className="font-medium text-amber-600 hover:text-amber-500 dark:text-amber-500 dark:hover:text-amber-400">
                    Register
                </button>
                </p>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin }: { isOpen: boolean, onClose: () => void, onSwitchToLogin: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();

  if (!isOpen) return null;

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
        await register(email, password, name);
        onClose(); // Close modal on success instead of reload
    } catch (err: unknown) {
        setError((err as Error).message || "Failed to create account. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center p-4 animate-fade-in bg-white dark:bg-gray-800">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6 relative">
             <button
                onClick={onClose}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center gap-2"
             >
                <ArrowLeft size={20} /> <span className="font-medium">Back to Map</span>
            </button>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md mt-12">
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create a new account
            </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
            <form className="space-y-6" onSubmit={handleEmailRegister}>
                 {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm text-center font-medium border border-red-100 dark:border-red-800">
                        {error}
                    </div>
                )}

                <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                </label>
                <div className="mt-1">
                    <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                </div>
                </div>

                <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password (min. 8 characters)
                </label>
                <div className="mt-1">
                    <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                </div>
                </div>

                <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-70"
                >
                     {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Sign up"}
                </button>
                </div>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="font-medium text-amber-600 hover:text-amber-500 dark:text-amber-500 dark:hover:text-amber-400">
                    Sign in
                </button>
                </p>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
}
