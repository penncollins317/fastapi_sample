

export interface LoginParams {
    username: string
    password: string
}

export interface RegisterParams {
    name: string
    email: string
    password: string
}

export interface RegisterResponse {
    id: number
}

export interface TokenDTO {
    access_token: string;
    refresh_token: string;
    expire_in: number;
    expire_time: string;
    refresh_expire_in?: number;
    refresh_expire_time?: string;
}

export interface UserinfoDTO {
    id: string
    email: string
    name: string
    avatar_url?: string
}