from passlib.context import CryptContext


class PasswordHelper:
    """
    密码工具类：支持 Argon2 + Bcrypt，自动验证与迁移
    """

    def __init__(self):
        # 默认算法为 argon2，bcrypt 作为旧算法兼容
        self.pwd_context = CryptContext(
            schemes=["argon2"],
            deprecated="auto",  # 除第一个（argon2）外的算法均视为过时
        )

    def hash_password(self, password: str) -> str:
        """
        生成密码哈希
        """
        if not isinstance(password, str):
            raise TypeError("password 必须是字符串类型")
        return self.pwd_context.hash(password)

    def verify_password(self, password: str, hashed: str) -> bool:
        """
        校验密码是否匹配
        """
        if not hashed:
            return False
        return self.pwd_context.verify(password, hashed)

    def needs_update(self, hashed: str) -> bool:
        """
        判断哈希算法是否需要升级（例如旧的 bcrypt）
        """
        return self.pwd_context.needs_update(hashed)

    def verify_and_update(self, password: str, hashed: str):
        """
        验证密码并在需要时返回新的哈希
        返回: (验证是否通过, 新哈希或 None)
        """
        verified, new_hash = self.pwd_context.verify_and_update(password, hashed)
        return verified, new_hash


password_helper = PasswordHelper()

if __name__ == "__main__":
    hashed = password_helper.hash_password("admin123")
    print("argon2 哈希:", hashed)
    print("验证正确密码:", password_helper.verify_password("admin123", hashed))
    print("验证错误密码:", password_helper.verify_password("wrong", hashed))
