import type { Method, RawAxiosRequestHeaders } from "axios";

export interface QueryParams {
    [key: string]: string;
}

export interface Body {
    [key: string]: any;
}


export interface RequestParams {
    url: string
    method?: Method
    data?: Body,
    params?: QueryParams,
    header?: RawAxiosRequestHeaders
}

export interface ResponseParams<T> {
    code: number,
    message: string,
    data: T
}