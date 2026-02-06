from fastapi import FastAPI, APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
import sys
sys.path.append("..")
from database import Database


#  To run the app, use the command:
#  uvicorn app:app --reload

app = FastAPI()
router = APIRouter()
db = Database()

class SVGRequest(BaseModel):
    mosaic_id: int
    svg: str
    embedding: List[float]

@router.get("/")
async def read_root():
    return {"message": "Hello World"}

@router.post("/add_svg")
async def add_svg(request: SVGRequest):
    """Add a new SVG fragment to the database."""
    try:
        result = db.add_fragment(
            mosaic_id=request.mosaic_id,
            svg=request.svg,
            embedding=request.embedding
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare")
async def compare_mosaics(items: List[int]) -> str:
    if len(items) == 2:
        return f"{items[0]} vs {items[1]}"
    else:
        return f"Comparing {len(items)} items"

app.include_router(router)