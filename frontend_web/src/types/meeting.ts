export type ScreenShareStatus = "idle" | "starting" | "sharing" | "error"

export interface Participant {
    id: string
    name: string
    muted: boolean
    videoEnabled: boolean
    isPresenter?: boolean
    stream?: MediaStream | null
}

export interface MeetingInfo {
    id: string
    topic: string
    hostName: string
    startedAt: string
    agenda?: string
    recordingEnabled?: boolean
}

export interface ChatMessage {
    id: string
    userId: string
    userName: string
    content: string
    timestamp: number
    attachmentUrl?: string
    attachmentName?: string
}

export interface WhiteboardPoint {
    x: number
    y: number
}

export interface WhiteboardEvent {
    id: string
    userId: string
    color: string
    size: number
    points: WhiteboardPoint[]
    createdAt: number
}

