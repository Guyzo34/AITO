import type { Session, User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import type { BrandRecord, OrganizationSummary } from "@/lib/types";
type LoginPayload = {
    email: string;
    password: string;
};
type SignupPayload = LoginPayload & {
    fullName: string;
    organizationName: string;
    organizationSlug: string;
};
type AuthContextValue = {
    session: Session | null;
    user: User | null;
    organizations: OrganizationSummary[];
    brands: BrandRecord[];
    currentOrganization: OrganizationSummary | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    signIn: (payload: LoginPayload) => Promise<void>;
    signUp: (payload: SignupPayload) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    refreshClientContext: () => Promise<void>;
};
export declare function AuthProvider(props: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAuth(): AuthContextValue;
export {};
//# sourceMappingURL=auth-provider.d.ts.map