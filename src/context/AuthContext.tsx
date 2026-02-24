"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { account } from '../lib/appwrite';
import { ID, Models } from 'appwrite';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    checkUserStatus: () => Promise<void>;
    loginWithGoogle: () => void;
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
            console.error("User status check failed", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUserStatus();
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

    const loginWithGoogle = () => {
        const redirectUrl = typeof window !== 'undefined' ? window.location.href : '';
        account.createOAuth2Session(
            'google',
            redirectUrl,
            redirectUrl
        );
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, register, checkUserStatus, loginWithGoogle }}>
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
