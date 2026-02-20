from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    message: str
