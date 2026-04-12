from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import auth, plans, slots

app = FastAPI(title="SubSplit API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    error = {
        "code": detail.get("code", "INTERNAL_ERROR"),
        "message": detail.get("message", "An unexpected error occurred"),
    }
    if "details" in detail:
        error["details"] = detail["details"]
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": error},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": exc.errors()},
            },
        },
    )


app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(plans.router, prefix="/api/plans", tags=["Plans"])
app.include_router(slots.router, prefix="/api/slots", tags=["Slots"])


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "SubSplit API is running."}
