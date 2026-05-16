export type AuthUser = {
    id: string;
    email: string;
    username?: string;
    is_active: boolean;
    created_at: string;
};

export type AuthSession = {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: AuthUser;
};
