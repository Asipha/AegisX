from fastapi import HTTPException, Request
from itsdangerous import URLSafeSerializer, BadSignature
import os

SECRET_KEY = os.environ.get("SENTINELX_SECRET", "dev-secret-change-in-production")
serializer = URLSafeSerializer(SECRET_KEY, salt="session")

def get_current_user(request: Request):
    token = request.cookies.get("session")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        data = serializer.loads(token)
    except BadSignature:
        raise HTTPException(401, "Invalid session")
    return data
