type ChatMessageKind = "text" | "image"

export interface BaseMessageParams {
    conversationId: string
    /** 客户端生成的唯一ID，便于幂等处理，若不传会自动生成 */
    clientMessageId?: string
    /** 发送时间戳，毫秒 */
    timestamp?: number
    /** 业务扩展字段，例如话题ID、引用消息等 */
    metadata?: Record<string, unknown>
}

export interface TextMessageParams extends BaseMessageParams {
    kind: "text"
    /** 文本内容，建议前端限制长度 */
    text: string
}

export interface ImageInfo {
    url: string
    width?: number
    height?: number
    sizeBytes?: number
    previewBase64?: string
}

export interface ImageMessageParams extends BaseMessageParams {
    kind: "image"
    image: ImageInfo
    /** 图片的补充描述（如文本说明、Alt） */
    caption?: string
}

export type SendChatMessageParams = TextMessageParams | ImageMessageParams

export interface ChatMessageEnvelope {
    conversationId: string
    clientMessageId: string
    kind: ChatMessageKind
    payload:
    | {
        text: string
    }
    | {
        image: ImageInfo
        caption?: string
    }
    metadata?: Record<string, unknown>
    timestamp: number
}
