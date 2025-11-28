// 聊天业务，IM信息业务封装

import type { ChatMessageEnvelope, SendChatMessageParams } from "../types/chat"

class ChatService {
    /**
     * 统一构建聊天消息载荷，保证字段完整性和幂等信息
     */
    buildMessageEnvelope(params: SendChatMessageParams): ChatMessageEnvelope {
        this.assertParams(params)

        const timestamp = params.timestamp ?? Date.now()
        const clientMessageId = params.clientMessageId ?? this.generateClientMessageId()

        if (params.kind === "text") {
            return {
                conversationId: params.conversationId,
                clientMessageId,
                kind: "text",
                payload: {
                    text: params.text.trim()
                },
                metadata: params.metadata,
                timestamp
            }
        }

        return {
            conversationId: params.conversationId,
            clientMessageId,
            kind: "image",
            payload: {
                image: params.image,
                caption: params.caption?.trim()
            },
            metadata: params.metadata,
            timestamp
        }
    }

    private assertParams(params: SendChatMessageParams) {
        if (!params.conversationId) {
            throw new Error("conversationId is required")
        }

        if (params.kind === "text" && !params.text.trim()) {
            throw new Error("text message can not be empty")
        }

        if (params.kind === "image") {
            if (!params.image || !params.image.url) {
                throw new Error("image url is required")
            }
        }
    }

    private generateClientMessageId() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID()
        }
        return `msg_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
    }
}

const chatService = new ChatService()

export default chatService