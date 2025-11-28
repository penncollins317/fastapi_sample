import { createHashRouter, Navigate } from 'react-router-dom'
import PubSub from 'pubsub-js'
import LoginScreen from '../pages/login'
import RegisterScreen from '../pages/register'
import HomeScreen from '../pages/home'
import MeetingRoomPage from '../pages/meet/MeetingRoomPage'

const router = createHashRouter([
    {
        path: '/',
        element: <Navigate to="/home" />,
    },
    {
        path: '/home',
        element: <HomeScreen />,
    },
    {
        path: '/meet',
        element: <MeetingRoomPage />,
    },
    {
        path: '/login',
        element: <LoginScreen />,
    },
    {
        path: '/register',
        element: <RegisterScreen />,
    },
])

export default router

PubSub.subscribe("require_login", () => {
    router.navigate("/login")
})