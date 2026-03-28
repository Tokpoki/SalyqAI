"""Error logging utilities."""

from __future__ import annotations

import logging
import uuid

from db import database as db_module

logger = logging.getLogger(__name__)


def log_error(
    user_id: str | None,
    session_id: str | None,
    error_type: str,
    message: str,
    stack: str,
):
    logger.exception(
        "Pipeline error user_id=%s session_id=%s error_type=%s message=%s",
        user_id,
        session_id,
        error_type,
        message,
    )

    insert_error_log = getattr(db_module, "insert_error_log", None)
    if callable(insert_error_log):
        insert_error_log(
            error_id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=session_id,
            error_type=error_type,
            error_message=message,
            stack_trace=stack,
        )
