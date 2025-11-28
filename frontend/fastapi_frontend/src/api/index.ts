import type { RegisterParams, RegisterResponse, TokenDTO, UserinfoDTO } from "../types/user";
import { post, get } from "./request";



export const loginApi = (data: any) => post<TokenDTO>('/users/login', data)

export const registerApi = (data: RegisterParams) => post<RegisterResponse>('/users/register', data)

export const userinfoApi = () => get<UserinfoDTO>("/users/me")

export const getOnlineUsers = () => get<UserinfoDTO[]>("/connect/onlines")