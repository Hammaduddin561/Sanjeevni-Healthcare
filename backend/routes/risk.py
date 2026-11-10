from fastapi import APIRouter

router = APIRouter()

@router.get("/risk")
def get_risk():
    return {}
