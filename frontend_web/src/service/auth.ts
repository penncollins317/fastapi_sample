import { loginApi, registerApi, userinfoApi } from "../api"
import type { LoginParams, RegisterParams, RegisterResponse, UserinfoDTO } from "../types/user"
import { createAsyncCache } from "../utils/cache"


class AuthService {
    private userinfoCache = createAsyncCache<UserinfoDTO>(userinfoApi)

    async getUserinfo(force = false): Promise<UserinfoDTO> {
        return await this.userinfoCache.get(force)
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