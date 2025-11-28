import { useEffect, useMemo, useState } from "react"
import authService from "../../service/auth"
import type { UserinfoDTO } from "../../types/user"

export default function UserProfile() {
    const [user, setUser] = useState<UserinfoDTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>()

    useEffect(() => {
        let mounted = true
        const fetchUserinfo = async () => {
            try {
                const res = await authService.getUserinfo()
                if (mounted) {
                    setUser(res)
                }
            } catch (err) {
                if (mounted) {
                    setError("获取用户信息失败，请稍后再试")
                }
            } finally {
                if (mounted) {
                    setLoading(false)
                }
            }
        }
        fetchUserinfo()
        return () => {
            mounted = false
        }
    }, [])

    const initials = useMemo(() => {
        if (!user?.name) return "?"
        return user.name
            .trim()
            .split(" ")
            .map((part) => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join("")
    }, [user?.name])

    if (loading) {
        return <div style={styles.state}>正在加载用户信息...</div>
    }

    if (error) {
        return <div style={{ ...styles.state, color: "#c53030" }}>{error}</div>
    }

    if (!user) {
        return <div style={styles.state}>未找到用户信息</div>
    }

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                <div style={styles.avatar}>
                    {user.avatar_url ? (
                        <img src={user.avatar_url} style={styles.avatarImage} alt="avatar" />
                    ) : (
                        <span style={styles.initials}>{initials}</span>
                    )}
                </div>
                <div style={styles.info}>
                    <h2 style={styles.name}>{user.name}</h2>
                    <p style={styles.email}>{user.email}</p>
                    <div style={styles.meta}>
                        <span style={styles.metaLabel}>用户 ID</span>
                        <span style={styles.metaValue}>{user.id}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f7fafc",
        padding: "32px",
    },
    card: {
        width: "100%",
        maxWidth: "480px",
        background: "#fff",
        borderRadius: "24px",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
        padding: "32px",
        display: "flex",
        gap: "24px",
    },
    avatar: {
        width: "120px",
        height: "120px",
        borderRadius: "32px",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
    },
    avatarImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    initials: {
        fontSize: "40px",
        color: "#fff",
        fontWeight: 600,
        letterSpacing: "2px",
    },
    info: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    name: {
        margin: 0,
        fontSize: "28px",
        color: "#1a202c",
    },
    email: {
        margin: 0,
        fontSize: "16px",
        color: "#4a5568",
    },
    meta: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "16px",
        borderRadius: "16px",
        background: "#f1f5f9",
    },
    metaLabel: {
        fontSize: "14px",
        color: "#718096",
        textTransform: "uppercase",
        letterSpacing: "1px",
    },
    metaValue: {
        fontSize: "18px",
        color: "#2d3748",
        fontWeight: 600,
    },
    state: {
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        color: "#4a5568",
    },
}
