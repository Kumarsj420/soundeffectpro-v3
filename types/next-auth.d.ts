import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            uid:  string;
            role: string;
            plan: string;   // 'free' | 'pro' | 'api'
            name?:  string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}
