from fastapi import FastAPI, APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
import sys
sys.path.append("..")
from database import Database
from .agent import Agent
from embedding import SVGEmbedder


#  To run the app, use the command:
#  uvicorn app:app --reload

app = FastAPI()
router = APIRouter()
db = Database()
agent = Agent()
embedder = SVGEmbedder()

class AddFragmentRequest(BaseModel):
    mosaic_id: int
    svg: str

@router.get("/")
async def read_root():
    return {"message": "Hello World"}

@router.post("/add_fragment")
async def add_fragment(request: AddFragmentRequest) -> dict:
    """Add a new SVG fragment to the database."""
    try:
        svg_string = request.svg

        embedding, caption = embedder.embed_svg(svg_string)  # Get embedding from the SVG content

        result = db.add_fragment(
            mosaic_id=request.mosaic_id,
            svg=svg_string,
            embedding=embedding, 
            caption=caption
        )
        return {"status": "success", "data": result}
    
    except Exception as e:

        raise HTTPException(status_code=500, detail=str(e))

# @router.post("/add_fragment")
# async def add_fragment(request: SVGRequest):
#     """Add a new SVG fragment to the database."""
#     try:
#         result = db.add_fragment(
#             mosaic_id=request.mosaic_id,
#             svg=request.svg,
#             embedding=request.embedding, 
#             caption=request.caption
#         )
#         return {"status": "success", "data": result}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare")
async def compare_mosaics(items: List[int]) -> dict:
    mosaic1 = items[0]
    mosaic2 = items[1]

    db_response = db.query_similar_fragments_between_mosaics(mosaic1, mosaic2, top_k=3)


    if len(db_response) > 0:
        person_1_interests = ", ".join([db.get_caption(item["fragment_a_id"]) for item in db_response])
        person_2_interests = ", ".join([db.get_caption(item["fragment_b_id"]) for item in db_response])

        agent_response = await agent.agent_conversation(person_1_interests, person_2_interests)
        
        return {"similar_fragments": db_response, "agent_response": agent_response}
    else:
        raise HTTPException(status_code=404, detail="No similar fragments found between the specified mosaics.")
    
@router.post("/notify")
def send_notification(user_ids: List[int], message: str) -> dict:
    """Send a push notification to specified users."""
    try:
        # Database logic for notifications, not agent
        result = db.send_notification(user_ids[0], message)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


app.include_router(router)