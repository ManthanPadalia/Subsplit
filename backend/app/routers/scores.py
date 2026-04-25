from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.score import ScoreBreakdown, ScoreEventOut, ScoreSummaryOut
from app.services import scoring_service

router = APIRouter()


def _success_response(data: dict, message: str | None = None) -> dict:
    response = {"success": True, "data": data}
    if message is not None:
        response["message"] = message
    return response


@router.get("/my")
def get_my_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    subsplit_score = scoring_service.get_user_score(db, current_user.id)
    history = scoring_service.get_score_history(db, current_user.id)
    total_delta = sum(event.delta for event in history)

    response = ScoreSummaryOut(
        subsplit_score=subsplit_score,
        score_breakdown=ScoreBreakdown(
            base=100,
            total_delta=total_delta,
            final_score=subsplit_score,
        ),
        events=[
            ScoreEventOut(
                id=event.id,
                event_type=event.event_type,
                delta=event.delta,
                description=event.description,
                created_at=event.created_at,
            )
            for event in history
        ],
    )
    return _success_response(data=response.model_dump(mode="json"))
