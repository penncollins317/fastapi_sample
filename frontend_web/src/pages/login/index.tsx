import { Form, Input, Button, Card, Typography } from "antd"
import { Link, useNavigate } from "react-router-dom"
import type { FormProps } from "antd"
import authService from "../../service/auth"
import type { LoginParams } from "../../types/user"


export default function LoginScreen() {
    const navigate = useNavigate()
    const [form] = Form.useForm()

    const actionLogin = async (values: LoginParams) => {
        await authService.login(values)
        navigate('/home')
    }

    const onFinish: FormProps<LoginParams>['onFinish'] = (values) => {
        actionLogin(values)
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
                title="用户登录"
                style={{
                    width: 400,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
            >
                <Form
                    form={form}
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    autoComplete="off"
                >
                    <Form.Item
                        label="用户名"
                        name="username"
                        rules={[
                            { required: true, message: '请输入用户名' },
                            { min: 3, message: '用户名至少3个字符' }
                        ]}
                    >
                        <Input placeholder="请输入用户名" size="large" />
                    </Form.Item>

                    <Form.Item
                        label="密码"
                        name="password"
                        rules={[
                            { required: true, message: '请输入密码' },
                            { min: 4, message: '密码至少4个字符' }
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
                            登录
                        </Button>
                    </Form.Item>
                </Form>
                <Typography.Paragraph style={{ marginBottom: 0, textAlign: 'center' }}>
                    还没有账号？<Link to="/register">立即注册</Link>
                </Typography.Paragraph>
            </Card>
        </div>
    )
}
