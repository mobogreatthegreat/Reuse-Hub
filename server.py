import sys
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import db
import launcher


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    db.import_from_json()
    yield


app = FastAPI(title="Reuse Hub Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ItemCreate(BaseModel):
    name: str
    type: str
    path_or_url: str
    browser: Optional[str] = ""
    icon: Optional[str] = ""
    category: Optional[str] = "Uncategorized"
    sort_order: Optional[int] = 0
    console_mode: Optional[str] = "terminal"


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    path_or_url: Optional[str] = None
    browser: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    sort_order: Optional[int] = None
    console_mode: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str
    color: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class ReorderBody(BaseModel):
    ordered_ids: list[str]


@app.get("/api/items")
def get_items():
    return db.all_items()


@app.get("/api/categories")
def get_categories():
    return db.categories()


@app.post("/api/categories")
def create_category(cat: CategoryCreate):
    result = db.add_category(cat.name, cat.color)
    if not result:
        raise HTTPException(status_code=409, detail="Category already exists")
    return result


@app.put("/api/categories/{name}")
def update_category(name: str, cat: CategoryUpdate):
    clean = {k: v for k, v in cat.model_dump().items() if v is not None}
    result = db.update_category(name, clean)
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    return result


@app.delete("/api/categories/{name}")
def delete_category(name: str):
    if not db.delete_category(name):
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


@app.post("/api/items")
def create_item(item: ItemCreate):
    return db.add_item(item.model_dump())


@app.put("/api/items/{item_id}")
def update_item(item_id: str, item: ItemUpdate):
    clean = {k: v for k, v in item.model_dump().items() if v is not None}
    result = db.update_item(item_id, clean)
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
    return result


@app.delete("/api/items/{item_id}")
def delete_item(item_id: str):
    if not db.delete_item(item_id):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@app.patch("/api/items/reorder")
def reorder_items(body: ReorderBody):
    db.reorder_items(body.ordered_ids)
    return {"ok": True}


class LaunchRequest(BaseModel):
    type: str
    path_or_url: str
    browser: Optional[str] = None
    console_mode: Optional[str] = "terminal"


@app.post("/api/launch")
def launch_item(req: LaunchRequest):
    try:
        if req.type == "link":
            launcher.launch_url(req.path_or_url, req.browser)
        elif req.type == "executable":
            launcher.launch_executable(req.path_or_url)
        elif req.type == "console":
            launcher.launch_console(req.path_or_url, req.console_mode == "terminal")
        else:
            raise HTTPException(status_code=400, detail=f"Unknown type: {req.type}")
        return {"ok": True}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9876
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
