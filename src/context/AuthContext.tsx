"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account, databases } from '../lib/appwrite';
import { ID, Models } from 'appwrite';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    checkUserStatus: () => Promise<void>;
    updateAccount: (data: any) => Promise<void>;
    deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [loading, setLoading] = useState(true);

    const checkUserStatus = async () => {
        try {
            const loggedInUser = await account.get();
            setUser(loggedInUser);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUserStatus();

        // Background Sync: Check permissions every 60 seconds
        // This ensures roles/ban status update automatically without relogging
        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.cookie.includes('kafmap_auth')) {
                checkUserStatus();
            }
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const login = async (email: string, password: string) => {
        await account.createEmailPasswordSession(email, password);
        await checkUserStatus();
    };

    const logout = async () => {
        await account.deleteSession('current');
        setUser(null);
    };

    const register = async (email: string, password: string, name?: string) => {
        await account.create(ID.unique(), email, password, name);
        await login(email, password);
    };

    const updateAccount = async (data: any) => {
        if (!user || !user.$id) throw new Error("No user logged in");
        // Convert to backend format
        const payload: any = {};
        if (data.name) payload.name = data.name;
        if (data.password) payload.password = data.password; // Note: Next.js proxy should ideally hash this, but we'll send it as is and hash it in worker. Ah wait, worker only handles POST /api/register. We need a way to hash the password on update. Let's handle password update in the backend or frontend. Appwrite.ts has hashPassword. We should export it or move it to a shared place. Actually, appwrite.ts has `databases.updateDocument`. We can hash the password in the component before calling updateAccount.

        await databases.updateDocument('kafmap', 'users', user.$id, data);
        await checkUserStatus(); // Refresh session data
    };

    const deleteAccount = async () => {
        if (!user || !user.$id) throw new Error("No user logged in");
        await databases.deleteDocument('kafmap', 'users', user.$id);
        await logout();
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, register, checkUserStatus, updateAccount, deleteAccount }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
