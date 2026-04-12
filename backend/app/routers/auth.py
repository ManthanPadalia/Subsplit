from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import (
    AuthResponse,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
    UserWithScore,
)
from app.services.scoring_service import check_longevity_bonus, get_user_score

router = APIRouter()


def _success_response(data: dict, message: str | None = None) -> dict:
    response = {"success": True, "data": data}
    if message is not None:
        response["message"] = message
    return response


def _auth_payload(user: User) -> AuthResponse:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=token,
    )


def _user_with_score(db: Session, user: User) -> UserWithScore:
    return UserWithScore(
        **UserOut.model_validate(user).model_dump(),
        subsplit_score=get_user_score(db, user.id),
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> dict:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EMAIL_ALREADY_EXISTS",
                "message": "An account with this email already exists",
            },
        )

    user = User(
        name=payload.name,
        email=str(payload.email),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.USER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _success_response(
        data=_auth_payload(user).model_dump(mode="json"),
        message="Account created successfully",
    )


@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Email or password is incorrect",
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_INACTIVE",
                "message": "This account has been deactivated",
            },
        )

    return _success_response(
        data=_auth_payload(user).model_dump(mode="json"),
        message="Login successful",
    )


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    check_longevity_bonus(db, current_user)
    db.refresh(current_user)
    return _success_response(data=_user_with_score(db, current_user).model_dump(mode="json"))


@router.put("/me")
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if payload.name is not None:
        current_user.name = payload.name
        db.add(current_user)
        db.commit()
        db.refresh(current_user)

    check_longevity_bonus(db, current_user)
    db.refresh(current_user)

    return _success_response(
        data=_user_with_score(db, current_user).model_dump(mode="json"),
        message="Profile updated successfully",
    )
