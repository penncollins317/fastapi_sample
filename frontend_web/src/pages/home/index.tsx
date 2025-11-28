import { Link } from "react-router-dom";

export default function index() {
    return (
        <div>
            <Link to={'/login'}>登录页面</Link>
            <Link to={"/user/me"}>用户信息</Link>
        </div>
    )
}
