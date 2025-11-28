import { loginApi, registerApi, userinfoApi } from "../api"
import type { LoginParams, RegisterParams, RegisterResponse, UserinfoDTO } from "../types/user"


class AuthService {
    async getUserinfo(): Promise<UserinfoDTO> {
        return await userinfoApi()
    }
    async login(params: LoginParams) {
        const res = await loginApi(params)
        localStorage.setItem("access_token", res.access_token)
        localStorage.setItem("refresh_token", res.refresh_token)
    }

    async register(params: RegisterParams): Promise<RegisterResponse> {
        return await registerApi(params)
    }
}

const authService = new AuthService()

export default authService