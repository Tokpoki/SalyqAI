from __future__ import annotations

import bcrypt

TEST_USER = {
    "email": "test@mail.com",
    "name": "Test User",
    "password": "123",
}


def generate_password_hash(password: str = TEST_USER["password"]) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


if __name__ == "__main__":
    print(generate_password_hash())
