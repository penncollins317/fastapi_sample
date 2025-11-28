import { Form, Input, Button, Card, Typography, message } from "antd"
import { Link, useNavigate } from "react-router-dom"
import type { FormProps } from "antd"
import authService from "../../service/auth"
import type { RegisterParams } from "../../types/user"


export default function RegisterScreen() {
    const [form] = Form.useForm()
    const navigate = useNavigate()

    const handleRegister = async (values: RegisterParams) => {
        await authService.register(values)
        message.success("注册成功，请使用账号登录")
        navigate("/login")
    }

    const onFinish: FormProps<RegisterParams>['onFinish'] = (values) => {
        handleRegister(values)
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <Card
                title="用户注册"
                style={{
                    width: 420,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
            >
                <Form
                    form={form}
                    name="register"
                    layout="vertical"
                    autoComplete="off"
                    onFinish={onFinish}
                >
                    <Form.Item
                        label="姓名"
                        name="name"
                        rules={[
                            { required: true, message: '请输入姓名' },
                            { min: 2, message: '姓名至少2个字符' }
                        ]}
                    >
                        <Input placeholder="请输入姓名" size="large" />
                    </Form.Item>

                    <Form.Item
                        label="邮箱"
                        name="email"
                        rules={[
                            { required: true, message: '请输入邮箱' },
                            { type: 'email', message: '请输入合法的邮箱' }
                        ]}
                    >
                        <Input placeholder="请输入邮箱" size="large" />
                    </Form.Item>

                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[
                            { required: true, message: '请输入密码' },
                            { min: 6, message: '密码至少6个字符' }
                        ]}
                    >
                        <Input.Password placeholder="请输入密码" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            size="large"
                        >
                            注册
                        </Button>
                    </Form.Item>
                </Form>

                <Typography.Paragraph style={{ marginBottom: 0, textAlign: 'center' }}>
                    已有账号？<Link to="/login">立即登录</Link>
                </Typography.Paragraph>
            </Card>
        </div>
    )
}

