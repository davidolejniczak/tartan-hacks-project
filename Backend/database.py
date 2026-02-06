import os
import time
from typing import List
from urllib import response
from supabase import create_client, Client
from dotenv import load_dotenv

class Database:
    def __init__(self):
        load_dotenv()
        url: str = os.getenv("SUPABASE_URL")
        key: str = os.getenv("SUPABASE_SERVICE_KEY")
        self.supabase: Client = create_client(url, key)

    def get_data(self, table: str):
        response = self.supabase.table(table).select("*").execute()
        return response.data

    def get_mosaic_context(self, mosaic_id: int) -> List[str]:
        response = self.supabase.table("Fragments").select("context").eq("mosaic_id", mosaic_id).execute()
        return [fragment["context"] for fragment in response.data]

    def get_fragment_svg(self, fragment_id: int) -> str:
        response = self.supabase.table("Fragments").select("svg").eq("fragment_id", fragment_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]["svg"]
        return -1

    def add_fragment(self, mosaic_id: int, svg: str, embedding: list[float]) -> dict:
        data = {
            "mosaic_id": mosaic_id,
            "svg": svg,
            "embedding": embedding
        }
        response = self.supabase.table("Fragments").insert(data).execute()
        return response.data[0]
    
    def query_similar_fragments_between_mosaics(
            self,
            mosaic_a: int,
            mosaic_b: int,
            top_k: int = 5
        ) -> list[dict]:
            response = self.supabase.rpc(
                "find_similar_fragment_pairs_between_mosaics",
                {
                    "mosaic_a": mosaic_a,
                    "mosaic_b": mosaic_b,
                    "top_k": top_k
                }
            ).execute()

            return response.data


