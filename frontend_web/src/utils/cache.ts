export interface CachedResource<T> {
    get(force?: boolean): Promise<T>
    clear(): void
}

/**
 * 创建一个简单的异步资源缓存，默认只请求一次并缓存结果
 */
export function createAsyncCache<T>(loader: () => Promise<T>): CachedResource<T> {
    let cachedPromise: Promise<T> | null = null

    const get = async (force = false) => {
        if (!cachedPromise || force) {
            cachedPromise = loader().catch(err => {
                cachedPromise = null
                throw err
            })
        }
        return cachedPromise
    }

    const clear = () => {
        cachedPromise = null
    }

    return { get, clear }
}

