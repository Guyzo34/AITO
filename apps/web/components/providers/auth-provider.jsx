"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
const AuthContext = createContext(null);
async function applySession(session) {
    if (!session) {
        return;
    }
    await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
    });
}
export function AuthProvider(props) {
    const [session, setSession] = useState(null);
    const [clientContext, setClientContext] = useState({
        organizations: [],
        currentOrganizationId: null,
        brands: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const refreshClientContext = useCallback(async () => {
        const accessToken = session?.access_token;
        if (!accessToken) {
            setClientContext({
                organizations: [],
                currentOrganizationId: null,
                brands: []
            });
            return;
        }
        const nextClientContext = await apiClient.getClientContext(accessToken);
        setClientContext(nextClientContext);
    }, [session?.access_token]);
    useEffect(() => {
        let mounted = true;
        async function bootstrap() {
            try {
                const { data: { session: nextSession } } = await supabase.auth.getSession();
                if (!mounted) {
                    return;
                }
                setSession(nextSession);
                if (nextSession?.access_token) {
                    const nextClientContext = await apiClient.getClientContext(nextSession.access_token);
                    if (mounted) {
                        setClientContext(nextClientContext);
                    }
                }
            }
            finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }
        void bootstrap();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!mounted) {
                return;
            }
            setSession(nextSession);
            if (!nextSession?.access_token) {
                setClientContext({
                    organizations: [],
                    currentOrganizationId: null,
                    brands: []
                });
            }
        });
        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);
    const signIn = useCallback(async (payload) => {
        const response = await apiClient.login(payload);
        await applySession(response.session);
        setSession(response.session);
        if (response.session?.access_token) {
            const nextClientContext = await apiClient.getClientContext(response.session.access_token);
            setClientContext(nextClientContext);
        }
    }, []);
    const signUp = useCallback(async (payload) => {
        const response = await apiClient.signup(payload);
        await applySession(response.session);
        setSession(response.session);
        if (response.session?.access_token) {
            const nextClientContext = await apiClient.getClientContext(response.session.access_token);
            setClientContext(nextClientContext);
        }
    }, []);
    const signOut = useCallback(async () => {
        const currentSession = session;
        try {
            if (currentSession?.access_token && currentSession.refresh_token) {
                await apiClient.logout({
                    accessToken: currentSession.access_token,
                    refreshToken: currentSession.refresh_token
                });
            }
        }
        catch { }
        await supabase.auth.signOut();
        setSession(null);
        setClientContext({
            organizations: [],
            currentOrganizationId: null,
            brands: []
        });
    }, [session]);
    const resetPassword = useCallback(async (email) => {
        await apiClient.resetPassword(email);
    }, []);
    const currentOrganization = useMemo(() => clientContext.organizations.find((organization) => organization.id === clientContext.currentOrganizationId) ??
        clientContext.organizations[0] ??
        null, [clientContext.currentOrganizationId, clientContext.organizations]);
    const value = useMemo(() => ({
        session,
        user: session?.user ?? null,
        organizations: clientContext.organizations,
        brands: clientContext.brands.filter((brand) => !currentOrganization || brand.organization.id === currentOrganization.id),
        currentOrganization,
        isAuthenticated: Boolean(session?.access_token),
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshClientContext
    }), [
        clientContext.brands,
        clientContext.organizations,
        currentOrganization,
        isLoading,
        refreshClientContext,
        resetPassword,
        session,
        signIn,
        signOut,
        signUp
    ]);
    return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth doit être utilisé dans AuthProvider.");
    }
    return context;
}
