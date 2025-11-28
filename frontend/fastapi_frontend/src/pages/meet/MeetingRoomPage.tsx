import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Button, Card, Input, Layout, List, Space, Tag, Typography, Upload, Avatar, Badge, Tooltip, message } from "antd"
import {
    AudioMutedOutlined,
    AudioOutlined,
    VideoCameraOutlined,
    VideoCameraAddOutlined,
    ShareAltOutlined,
    StopOutlined,
    SendOutlined,
    FileOutlined,
    BgColorsOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    LoadingOutlined
} from "@ant-design/icons"
import type { RcFile, UploadFile } from "antd/es/upload"
import { get, websocket_addr } from "../../api/request"
import type { ChatMessage, MeetingInfo, Participant, ScreenShareStatus, WhiteboardEvent, WhiteboardPoint } from "../../types/meeting"

const { Header, Content, Sider } = Layout
const { TextArea } = Input
const { Title, Text } = Typography

interface MeetingSliceState {
    currentMeeting: MeetingInfo | null
    participants: Participant[]
    localStream: MediaStream | null
    remoteStreams: Record<string, MediaStream>
    recording: boolean
    connectionStatus: "idle" | "connecting" | "connected" | "disconnected"
}

type MeetingAction =
    | { type: "SET_MEETING"; payload: MeetingInfo }
    | { type: "SET_PARTICIPANTS"; payload: Participant[] }
    | { type: "UPSERT_PARTICIPANT"; payload: Participant }
    | { type: "REMOVE_PARTICIPANT"; payload: string }
    | { type: "SET_LOCAL_STREAM"; payload: MediaStream | null }
    | { type: "SET_REMOTE_STREAM"; payload: { userId: string; stream: MediaStream | null } }
    | { type: "SET_RECORDING"; payload: boolean }
    | { type: "SET_CONNECTION_STATUS"; payload: MeetingSliceState["connectionStatus"] }

interface ChatSliceState {
    messages: ChatMessage[]
}

type ChatAction =
    | { type: "SET_MESSAGES"; payload: ChatMessage[] }
    | { type: "PUSH_MESSAGE"; payload: ChatMessage }

interface ScreenShareSliceState {
    status: ScreenShareStatus
    stream: MediaStream | null
}

type ScreenShareAction =
    | { type: "SET_STATUS"; payload: ScreenShareStatus }
    | { type: "SET_STREAM"; payload: MediaStream | null }

const initialMeetingState: MeetingSliceState = {
    currentMeeting: null,
    participants: [],
    localStream: null,
    remoteStreams: {},
    recording: false,
    connectionStatus: "idle"
}

const initialChatState: ChatSliceState = {
    messages: []
}

const initialScreenShareState: ScreenShareSliceState = {
    status: "idle",
    stream: null
}

const createId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function meetingReducer(state: MeetingSliceState, action: MeetingAction): MeetingSliceState {
    switch (action.type) {
        case "SET_MEETING":
            return { ...state, currentMeeting: action.payload }
        case "SET_PARTICIPANTS":
            return { ...state, participants: action.payload }
        case "UPSERT_PARTICIPANT":
            return {
                ...state,
                participants: state.participants.some(p => p.id === action.payload.id)
                    ? state.participants.map(p => (p.id === action.payload.id ? { ...p, ...action.payload } : p))
                    : [...state.participants, action.payload]
            }
        case "REMOVE_PARTICIPANT":
            return {
                ...state,
                participants: state.participants.filter(p => p.id !== action.payload)
            }
        case "SET_LOCAL_STREAM":
            return { ...state, localStream: action.payload }
        case "SET_REMOTE_STREAM": {
            const remoteStreams = { ...state.remoteStreams }
            if (action.payload.stream) {
                remoteStreams[action.payload.userId] = action.payload.stream
            } else {
                delete remoteStreams[action.payload.userId]
            }
            return { ...state, remoteStreams }
        }
        case "SET_RECORDING":
            return { ...state, recording: action.payload }
        case "SET_CONNECTION_STATUS":
            return { ...state, connectionStatus: action.payload }
        default:
            return state
    }
}

function chatReducer(state: ChatSliceState, action: ChatAction): ChatSliceState {
    switch (action.type) {
        case "SET_MESSAGES":
            return { messages: action.payload }
        case "PUSH_MESSAGE":
            return { messages: [...state.messages, action.payload] }
        default:
            return state
    }
}

function screenShareReducer(state: ScreenShareSliceState, action: ScreenShareAction): ScreenShareSliceState {
    switch (action.type) {
        case "SET_STATUS":
            return { ...state, status: action.payload }
        case "SET_STREAM":
            return { ...state, stream: action.payload }
        default:
            return state
    }
}

export default function MeetingRoomPage() {
    const { meetingId: paramMeetingId } = useParams<{ meetingId: string }>()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const meetingId = paramMeetingId ?? searchParams.get("roomId") ?? "default"

    const [meetingState, dispatchMeeting] = useReducer(meetingReducer, initialMeetingState)
    const [chatState, dispatchChat] = useReducer(chatReducer, initialChatState)
    const [screenShareState, dispatchScreenShare] = useReducer(screenShareReducer, initialScreenShareState)
    const [whiteboardEvents, setWhiteboardEvents] = useState<WhiteboardEvent[]>([])
    const [pendingMessage, setPendingMessage] = useState("")
    const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
    const wsRef = useRef<WebSocket | null>(null)
    const pcRef = useRef<RTCPeerConnection | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])
    const localStreamRef = useRef<MediaStream | null>(null)
    const screenShareStreamRef = useRef<MediaStream | null>(null)
    const [whiteboardColor, setWhiteboardColor] = useState("#1677ff")
    const [whiteboardSize, setWhiteboardSize] = useState(3)

    const localParticipant = useMemo<Participant>(
        () =>
            meetingState.participants.find(p => p.id === "local") ?? {
                id: "local",
                name: "Me",
                muted: false,
                videoEnabled: true,
                stream: meetingState.localStream
            },
        [meetingState.localStream, meetingState.participants]
    )

    useEffect(() => {
        dispatchMeeting({ type: "UPSERT_PARTICIPANT", payload: localParticipant })
    }, [dispatchMeeting, localParticipant])

    useEffect(() => {
        localStreamRef.current = meetingState.localStream
    }, [meetingState.localStream])

    useEffect(() => {
        screenShareStreamRef.current = screenShareState.stream
    }, [screenShareState.stream])

    const sendSignal = useCallback((data: any) => {
        wsRef.current?.send(JSON.stringify({ type: "signal", data }))
    }, [])

    const handleSignal = useCallback(
        async (signal: any) => {
            if (!pcRef.current) {
                return
            }
            if (signal.sdp) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp))
                if (signal.sdp.type === "offer") {
                    const answer = await pcRef.current.createAnswer()
                    await pcRef.current.setLocalDescription(answer)
                    sendSignal({ sdp: pcRef.current.localDescription })
                }
            } else if (signal.candidate) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate))
            }
        },
        [sendSignal]
    )

    const handleIncomingEvent = useCallback(
        (payload: any) => {
            switch (payload.type) {
                case "meeting_state":
                    dispatchMeeting({ type: "SET_MEETING", payload: payload.data })
                    if (payload.data?.participants) {
                        dispatchMeeting({ type: "SET_PARTICIPANTS", payload: payload.data.participants })
                    }
                    break
                case "participant_join":
                    dispatchMeeting({ type: "UPSERT_PARTICIPANT", payload: payload.data })
                    break
                case "participant_leave":
                    dispatchMeeting({ type: "REMOVE_PARTICIPANT", payload: payload.data.id })
                    break
                case "chat_message":
                    dispatchChat({ type: "PUSH_MESSAGE", payload: payload.data })
                    break
                case "whiteboard_event":
                    setWhiteboardEvents(prev => [...prev, payload.data])
                    break
                case "screen_share":
                    dispatchScreenShare({ type: "SET_STATUS", payload: payload.data.status })
                    break
                case "meeting_end":
                    message.info("会议已结束")
                    wsRef.current?.close()
                    navigate("/meetings")
                    break
                case "signal":
                    handleSignal(payload.data)
                    break
                default:
                    break
            }
        },
        [dispatchChat, dispatchMeeting, dispatchScreenShare, handleSignal, navigate]
    )

    const connectWebSocket = useCallback(() => {
        if (!meetingId) {
            return
        }
        dispatchMeeting({ type: "SET_CONNECTION_STATUS", payload: "connecting" })
        const ws = new WebSocket(`${websocket_addr}/ws/meet/${meetingId}`)
        wsRef.current = ws
        ws.onopen = () => {
            dispatchMeeting({ type: "SET_CONNECTION_STATUS", payload: "connected" })
            ws.send(JSON.stringify({ type: "join", meetingId }))
        }
        ws.onmessage = evt => {
            try {
                const payload = JSON.parse(evt.data)
                handleIncomingEvent(payload)
            } catch (err) {
                console.error("Invalid payload", err)
            }
        }
        ws.onclose = () => {
            dispatchMeeting({ type: "SET_CONNECTION_STATUS", payload: "disconnected" })
        }
        ws.onerror = () => {
            message.error("WebSocket 连接异常")
            dispatchMeeting({ type: "SET_CONNECTION_STATUS", payload: "disconnected" })
        }
    }, [handleIncomingEvent, meetingId])

    const sendWhiteboardEvent = useCallback(
        (event: WhiteboardEvent) => {
            setWhiteboardEvents(prev => [...prev, event])
            wsRef.current?.send(JSON.stringify({ type: "whiteboard_event", data: event }))
        },
        []
    )

    const fetchMeetingState = useCallback(async () => {
        try {
            const data = await get<MeetingInfo>(`/meetings/${meetingId}`)
            dispatchMeeting({ type: "SET_MEETING", payload: data })
        } catch (err) {
            console.warn("无法获取会议详情", err)
        }
    }, [meetingId])

    const initLocalDevices = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            dispatchMeeting({ type: "SET_LOCAL_STREAM", payload: stream })
        } catch (err) {
            message.error("无法获取麦克风/摄像头权限")
        }
    }, [dispatchMeeting])

    const initPeerConnection = useCallback(
        async (stream: MediaStream) => {
            if (pcRef.current) return
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" }
                ]
            })
            pcRef.current = pc
            pc.onicecandidate = event => {
                if (event.candidate) {
                    sendSignal({ candidate: event.candidate })
                }
            }
            pc.ontrack = event => {
                const [remoteStream] = event.streams
                const userId = event.track.id || `remote-${Date.now()}`
                dispatchMeeting({ type: "SET_REMOTE_STREAM", payload: { userId, stream: remoteStream } })
            }
            stream.getTracks().forEach(track => pc.addTrack(track, stream))
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            sendSignal({ sdp: offer })
        },
        [dispatchMeeting, sendSignal]
    )

    useEffect(() => {
        fetchMeetingState()
        connectWebSocket()
        initLocalDevices()
        return () => {
            wsRef.current?.close()
            pcRef.current?.close()
            localStreamRef.current?.getTracks().forEach(track => track.stop())
            screenShareStreamRef.current?.getTracks().forEach(track => track.stop())
        }
    }, [connectWebSocket, fetchMeetingState, initLocalDevices])

    useEffect(() => {
        if (meetingState.localStream) {
            initPeerConnection(meetingState.localStream)
        }
    }, [initPeerConnection, meetingState.localStream])

    const toggleMute = useCallback(() => {
        if (!meetingState.localStream) return
        const enabled = meetingState.localStream.getAudioTracks().some(track => track.enabled)
        meetingState.localStream.getAudioTracks().forEach(track => {
            track.enabled = !enabled
        })
        dispatchMeeting({
            type: "UPSERT_PARTICIPANT",
            payload: { ...localParticipant, muted: enabled }
        })
        wsRef.current?.send(JSON.stringify({ type: "mute", payload: { muted: enabled } }))
    }, [dispatchMeeting, localParticipant, meetingState.localStream])

    const toggleCamera = useCallback(() => {
        if (!meetingState.localStream) return
        const enabled = meetingState.localStream.getVideoTracks().some(track => track.enabled)
        meetingState.localStream.getVideoTracks().forEach(track => {
            track.enabled = !enabled
        })
        dispatchMeeting({
            type: "UPSERT_PARTICIPANT",
            payload: { ...localParticipant, videoEnabled: !enabled }
        })
        wsRef.current?.send(JSON.stringify({ type: "camera", payload: { enabled: !enabled } }))
    }, [dispatchMeeting, localParticipant, meetingState.localStream])

    const toggleScreenShare = useCallback(async () => {
        if (screenShareState.status === "sharing") {
            screenShareState.stream?.getTracks().forEach(track => track.stop())
            dispatchScreenShare({ type: "SET_STREAM", payload: null })
            dispatchScreenShare({ type: "SET_STATUS", payload: "idle" })
            wsRef.current?.send(JSON.stringify({ type: "screen_share", payload: { status: "idle" } }))
            return
        }
        dispatchScreenShare({ type: "SET_STATUS", payload: "starting" })
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            dispatchScreenShare({ type: "SET_STREAM", payload: stream })
            dispatchScreenShare({ type: "SET_STATUS", payload: "sharing" })
            stream.getTracks()[0].addEventListener("ended", () => {
                dispatchScreenShare({ type: "SET_STREAM", payload: null })
                dispatchScreenShare({ type: "SET_STATUS", payload: "idle" })
                wsRef.current?.send(JSON.stringify({ type: "screen_share", payload: { status: "idle" } }))
            })
            wsRef.current?.send(JSON.stringify({ type: "screen_share", payload: { status: "sharing" } }))
        } catch {
            dispatchScreenShare({ type: "SET_STATUS", payload: "error" })
            message.error("无法开始屏幕共享")
        }
    }, [dispatchScreenShare, screenShareState.status, screenShareState.stream])

    const toggleRecording = useCallback(() => {
        if (!meetingState.localStream) {
            message.warning("请先开启摄像头")
            return
        }
        if (meetingState.recording) {
            mediaRecorderRef.current?.stop()
            dispatchMeeting({ type: "SET_RECORDING", payload: false })
            return
        }
        try {
            const recorder = new MediaRecorder(meetingState.localStream)
            mediaRecorderRef.current = recorder
            recordedChunksRef.current = []
            recorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data)
                }
            }
            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: "video/webm" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `meeting-${meetingId}.webm`
                a.click()
                URL.revokeObjectURL(url)
            }
            recorder.start()
            dispatchMeeting({ type: "SET_RECORDING", payload: true })
        } catch {
            message.error("无法开启录制")
        }
    }, [dispatchMeeting, meetingId, meetingState.localStream, meetingState.recording])

    const sendChatMessage = useCallback(() => {
        if (!pendingMessage.trim() && uploadFiles.length === 0) {
            return
        }
        const msg: ChatMessage = {
            id: createId(),
            userId: localParticipant.id,
            userName: localParticipant.name,
            content: pendingMessage,
            timestamp: Date.now(),
            attachmentName: uploadFiles[0]?.name,
            attachmentUrl: uploadFiles[0]?.url || uploadFiles[0]?.name
        }
        dispatchChat({ type: "PUSH_MESSAGE", payload: msg })
        wsRef.current?.send(JSON.stringify({ type: "chat_message", data: msg }))
        setPendingMessage("")
        setUploadFiles([])
    }, [dispatchChat, localParticipant, pendingMessage, uploadFiles])

    const beforeUpload = useCallback((file: RcFile) => {
        setUploadFiles([{ uid: file.uid, name: file.name, status: "done", url: URL.createObjectURL(file) }])
        return false
    }, [])

    const whiteboardToolbar = (
        <Space>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <BgColorsOutlined />
                <input
                    type="color"
                    value={whiteboardColor}
                    onChange={e => setWhiteboardColor(e.target.value)}
                    style={{ width: 40, height: 24, border: "none", background: "transparent" }}
                />
            </label>
            <Input
                type="number"
                min={1}
                max={10}
                value={whiteboardSize}
                onChange={e => {
                    const next = Number(e.target.value) || 1
                    setWhiteboardSize(Math.min(10, Math.max(1, next)))
                }}
                style={{ width: 80 }}
            />
        </Space>
    )

    const renderConnectionTag = () => {
        const status = meetingState.connectionStatus
        const colorMap: Record<typeof status, string> = {
            idle: "default",
            connecting: "processing",
            connected: "success",
            disconnected: "error"
        }
        return (
            <Tag color={colorMap[status]}>
                {status === "connecting" ? (
                    <Space size={4}>
                        <LoadingOutlined />
                        <span>连接中</span>
                    </Space>
                ) : status === "connected" ? (
                    "已连接"
                ) : status === "disconnected" ? (
                    "已断开"
                ) : (
                    "待连接"
                )}
            </Tag>
        )
    }

    return (
        <Layout style={{ height: "100%", minHeight: "100vh", background: "#0f172a" }}>
            <Header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617" }}>
                <Space direction="vertical" size={0}>
                    <Title level={4} style={{ color: "#fff", margin: 0 }}>
                        {meetingState.currentMeeting?.topic ?? "即时会议"}
                    </Title>
                    <Text style={{ color: "#94a3b8" }}>
                        主持人：{meetingState.currentMeeting?.hostName ?? "未知"} · {meetingState.currentMeeting?.startedAt ?? ""}
                    </Text>
                </Space>
                <Space>
                    {renderConnectionTag()}
                    <Button danger icon={<StopOutlined />} onClick={() => wsRef.current?.close()}>
                        结束会议
                    </Button>
                </Space>
            </Header>
            <Layout>
                <Content style={{ padding: 16 }}>
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        <Card
                            bordered={false}
                            style={{ background: "#0f172a", border: "1px solid #1e293b" }}
                            bodyStyle={{ padding: 0 }}
                        >
                            <VideoGrid participants={[localParticipant, ...meetingState.participants.filter(p => p.id !== "local")]} />
                        </Card>
                        <Toolbar
                            onToggleMic={toggleMute}
                            onToggleCamera={toggleCamera}
                            onScreenShare={toggleScreenShare}
                            onToggleRecording={toggleRecording}
                            recording={meetingState.recording}
                            micMuted={localParticipant.muted}
                            cameraOff={!localParticipant.videoEnabled}
                            screenShareStatus={screenShareState.status}
                        />
                        <Whiteboard
                            events={whiteboardEvents}
                            onEmit={sendWhiteboardEvent}
                            toolbar={whiteboardToolbar}
                            color={whiteboardColor}
                            size={whiteboardSize}
                        />
                    </Space>
                </Content>
                <Sider width={360} style={{ background: "#020617", padding: 16 }}>
                    <ChatBox
                        messages={chatState.messages}
                        pendingMessage={pendingMessage}
                        onPendingMessageChange={setPendingMessage}
                        onSend={sendChatMessage}
                        files={uploadFiles}
                        onFilesChange={setUploadFiles}
                        beforeUpload={beforeUpload}
                    />
                </Sider>
            </Layout>
        </Layout>
    )
}

interface VideoGridProps {
    participants: Participant[]
}

function VideoGrid({ participants }: VideoGridProps) {
    const gridStyle: CSSProperties = {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
        padding: 16
    }
    return (
        <div style={gridStyle}>
            {participants.map(participant => (
                <VideoTile key={participant.id} participant={participant} />
            ))}
        </div>
    )
}

function VideoTile({ participant }: { participant: Participant }) {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    useEffect(() => {
        if (videoRef.current && participant.stream) {
            videoRef.current.srcObject = participant.stream
        }
    }, [participant.stream])
    return (
        <Card
            size="small"
            style={{ background: "#020617", border: "1px solid #1e293b", color: "#e2e8f0" }}
            bodyStyle={{ padding: 8 }}
        >
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#1e293b", height: 180 }}>
                {participant.stream && participant.videoEnabled ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={participant.id === "local"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <Space
                        direction="vertical"
                        align="center"
                        style={{ width: "100%", height: "100%", justifyContent: "center", color: "#94a3b8" }}
                    >
                        <Avatar size={64}>{participant.name.charAt(0).toUpperCase()}</Avatar>
                        <span>{participant.name}</span>
                    </Space>
                )}
                <Badge
                    status={participant.muted ? "error" : "success"}
                    text={participant.muted ? "静音" : "声音开启"}
                    style={{ position: "absolute", top: 8, right: 8 }}
                />
            </div>
        </Card>
    )
}

interface ToolbarProps {
    onToggleMic: () => void
    onToggleCamera: () => void
    onScreenShare: () => Promise<void> | void
    onToggleRecording: () => void
    recording: boolean
    micMuted: boolean
    cameraOff: boolean
    screenShareStatus: ScreenShareStatus
}

function Toolbar({
    onToggleMic,
    onToggleCamera,
    onScreenShare,
    onToggleRecording,
    recording,
    micMuted,
    cameraOff,
    screenShareStatus
}: ToolbarProps) {
    return (
        <Card
            bordered={false}
            style={{ background: "#020617", border: "1px solid #1e293b" }}
            bodyStyle={{ display: "flex", justifyContent: "center", gap: 12 }}
        >
            <Tooltip title={micMuted ? "取消静音" : "静音"}>
                <Button
                    size="large"
                    shape="circle"
                    icon={micMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                    danger={micMuted}
                    onClick={onToggleMic}
                />
            </Tooltip>
            <Tooltip title={cameraOff ? "开启摄像头" : "关闭摄像头"}>
                <Button
                    size="large"
                    shape="circle"
                    icon={cameraOff ? <VideoCameraAddOutlined /> : <VideoCameraOutlined />}
                    danger={cameraOff}
                    onClick={onToggleCamera}
                />
            </Tooltip>
            <Tooltip title={screenShareStatus === "sharing" ? "停止共享" : "开始共享"}>
                <Button
                    size="large"
                    shape="circle"
                    icon={<ShareAltOutlined />}
                    loading={screenShareStatus === "starting"}
                    type={screenShareStatus === "sharing" ? "primary" : "default"}
                    onClick={onScreenShare}
                />
            </Tooltip>
            <Tooltip title={recording ? "停止录制" : "开始录制"}>
                <Button
                    size="large"
                    shape="circle"
                    icon={recording ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    type={recording ? "primary" : "default"}
                    danger={recording}
                    onClick={onToggleRecording}
                />
            </Tooltip>
        </Card>
    )
}

interface ChatBoxProps {
    messages: ChatMessage[]
    pendingMessage: string
    onPendingMessageChange: (val: string) => void
    onSend: () => void
    files: UploadFile[]
    onFilesChange: (files: UploadFile[]) => void
    beforeUpload: (file: RcFile) => boolean
}

function ChatBox({ messages, pendingMessage, onPendingMessageChange, onSend, files, onFilesChange, beforeUpload }: ChatBoxProps) {
    return (
        <Card
            title="聊天"
            bordered={false}
            style={{ height: "100%", background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b" }}
            bodyStyle={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
            <div style={{ flex: 1, overflowY: "auto", marginBottom: 16, paddingRight: 8 }}>
                <List
                    rowKey="id"
                    dataSource={messages}
                    split={false}
                    renderItem={item => (
                        <List.Item style={{ padding: "8px 0" }}>
                            <List.Item.Meta
                                title={
                                    <Space size={8}>
                                        <Text style={{ color: "#fff" }}>{item.userName}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {new Date(item.timestamp).toLocaleTimeString()}
                                        </Text>
                                    </Space>
                                }
                                description={
                                    <Space direction="vertical" size={4}>
                                        <Text style={{ color: "#cbd5f5" }}>{item.content}</Text>
                                        {item.attachmentName && (
                                            <Space>
                                                <FileOutlined />
                                                <a href={item.attachmentUrl} download style={{ color: "#38bdf8" }}>
                                                    {item.attachmentName}
                                                </a>
                                            </Space>
                                        )}
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            </div>
            <Space direction="vertical" size={8}>
                <TextArea
                    rows={3}
                    placeholder="输入消息..."
                    value={pendingMessage}
                    onChange={e => onPendingMessageChange(e.target.value)}
                    onPressEnter={e => {
                        if (!e.shiftKey) {
                            e.preventDefault()
                            onSend()
                        }
                    }}
                />
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Upload
                        fileList={files}
                        beforeUpload={beforeUpload}
                        onRemove={file => {
                            onFilesChange(files.filter(item => item.uid !== file.uid))
                            return true
                        }}
                        showUploadList={{ showRemoveIcon: true }}
                    >
                        <Button icon={<FileOutlined />}>上传文件</Button>
                    </Upload>
                    <Button type="primary" icon={<SendOutlined />} onClick={onSend}>
                        发送
                    </Button>
                </Space>
            </Space>
        </Card>
    )
}

interface WhiteboardProps {
    events: WhiteboardEvent[]
    onEmit: (event: WhiteboardEvent) => void
    toolbar: ReactNode
    color: string
    size: number
}

function Whiteboard({ events, onEmit, toolbar, color, size }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentPoints, setCurrentPoints] = useState<WhiteboardPoint[]>([])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        events.forEach(evt => drawStroke(ctx, evt.points, evt.color, evt.size))
        if (isDrawing && currentPoints.length > 1) {
            drawStroke(ctx, currentPoints, color, size)
        }
    }, [color, currentPoints, events, isDrawing, size])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect()
            if (!rect) return
            canvas.width = rect.width
            canvas.height = 360
        }
        resize()
        window.addEventListener("resize", resize)
        return () => window.removeEventListener("resize", resize)
    }, [])

    const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): WhiteboardPoint => {
        const rect = event.currentTarget.getBoundingClientRect()
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        }
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsDrawing(true)
        const point = getPoint(event)
        setCurrentPoints([point])
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return
        setCurrentPoints(prev => [...prev, getPoint(event)])
    }

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        event.currentTarget.releasePointerCapture(event.pointerId)
        setIsDrawing(false)
        if (currentPoints.length < 2) {
            setCurrentPoints([])
            return
        }
        const newEvent: WhiteboardEvent = {
            id: createId(),
            userId: "local",
            color,
            size,
            points: currentPoints,
            createdAt: Date.now()
        }
        onEmit(newEvent)
        setCurrentPoints([])
    }

    return (
        <Card
            title={
                <Space size={16}>
                    <span>白板</span>
                    {toolbar}
                </Space>
            }
            bordered={false}
            style={{ background: "#020617", border: "1px solid #1e293b" }}
        >
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: 360, background: "#0f172a", borderRadius: 8, cursor: "crosshair" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => {
                    setIsDrawing(false)
                    setCurrentPoints([])
                }}
            />
        </Card>
    )
}

function drawStroke(ctx: CanvasRenderingContext2D, points: WhiteboardPoint[], color: string, size: number) {
    if (points.length < 2) return
    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
}
