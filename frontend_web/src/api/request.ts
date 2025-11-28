import axios, { type RawAxiosRequestHeaders } from "axios"
import { message } from "antd"
import PubSub from "pubsub-js"
import type { QueryParams, RequestParams } from "../types/request"
export const base_server_addr = import.meta.env.VITE_API_HOST || "http://192.168.2.20:8000"
export const websocket_addr = import.meta.env.VITE_WEBSOCKET_HOST || "ws://192.168.2.20:8000"
const instance = axios.create({
    baseURL: base_server_addr,
    timeout: 20000
})

instance.interceptors.request.use(config => {
    const token = localStorage.getItem("access_token")
    if (token) {
        config.headers.Authorization = "Bearer " + token
    }
    return config
})


async function actionRefreshToken(token: string) {
    const apiInstance = axios.create({
        baseURL: base_server_addr,
        timeout: 20000
    })
    localStorage.removeItem("access_token")
    const res = await apiInstance.post("/token/refresh", { refresh: token })
    localStorage.setItem("access_token", res.data.access_token)
    localStorage.setItem("refresh_token", res.data.refresh_token)
}

instance.interceptors.response.use(res => {
    if (res.headers['x-token-refresh'] === '1') {
        const refreshToken = localStorage.getItem("refresh_token") || localStorage.getItem("refresh_token")
        if (refreshToken) {
            actionRefreshToken(refreshToken)
        }
    }
    return res.data
},
    async err => {
        if (!err.response) {
            return Promise.reject("Network error.")
        }
        console.log(err.response)
        switch (err.response.status) {
            case 400:
                message.error(err.response.data.detail)
                break
            case 401:
                const refreshToken = localStorage.getItem("refresh_token")
                if (refreshToken) {
                    try {
                        await actionRefreshToken(refreshToken)
                        return await instance(err.config)
                    } catch (err) {
                        // localStorage.removeItem('refresh_token')
                        PubSub.publish("require_login")
                    }
                }
                message.error("请重新登录")
                break
            case 403:
                message.error("无权访问")
                break
            case 404:
                message.error(`资源 ${err.config.url} 不存在`)
                break
            case 500:
                message.error("服务器错误")
                break
        }
        return Promise.reject(err.response.data.detail)
    }
)


function request<T>(config: RequestParams) {
    return instance.request<T, T>({
        url: config.url,
        data: config.data,
        method: config.method || "GET",
        headers: config.header || {},
        params: config.params || {}
    })
}

const get = function <T>(url: string, params?: any, headers?: RawAxiosRequestHeaders, data?: Body) {
    return request<T>({
        url,
        method: "GET",
        params,
        data,
        header: headers
    });
};

const post = function <T>(url: string, data?: any, headers?: RawAxiosRequestHeaders, params?: QueryParams) {
    return request<T>({
        url,
        method: "POST",
        data,
        params,
        header: headers
    });
};

const put = function <T>(url: string, data?: Body, headers?: RawAxiosRequestHeaders, params?: QueryParams) {
    return request<T>({
        url,
        method: "PUT",
        data,
        params,
        header: headers
    });
};

const del = function <T>(url: string, params?: QueryParams, headers?: RawAxiosRequestHeaders, data?: Body) {
    return request<T>({
        url,
        method: "DELETE",
        params,
        data,
        header: headers
    });
};

export {
    request,
    get,
    post,
    put,
    del
}