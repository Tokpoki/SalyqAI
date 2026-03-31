"""Request logging middleware — colored console output for fly logs."""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("salyq.requests")

_SKIP_PATHS = {"/api/v1/health"}


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint,
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        path = request.url.path
        if path in _SKIP_PATHS:
            return response

        status = response.status_code
        method = request.method
        user_id = self._extract_user_id(request)

        color = "\033[32m" if status < 400 else ("\033[33m" if status < 500 else "\033[31m")
        reset = "\033[0m"
        user_part = f" user={user_id}" if user_id else ""

        logger.info(
            "%s%s%s %s %s [%dms]%s",
            color, status, reset, method, path, duration_ms, user_part,
        )
        return response

    @staticmethod
    def _extract_user_id(request: Request) -> str | None:
        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer "):
            return None
        try:
            from src.auth.jwt_utils import decode_token

            payload = decode_token(auth[7:])
            return payload.get("sub")
        except Exception:
            return None
