from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import tempfile
import os

from fastapi.middleware.cors import CORSMiddleware

from . import models, schemas, crud
from .database import SessionLocal, engine

# Adjust the path to import from the `scripts` directory
import sys
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)
from scripts import import_mhtml


# Create the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="X Like Manager API")

# CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the X-Like-Manager API"}

# --- Folders ---

@app.post("/api/folders/", response_model=schemas.Folder)
def create_folder(folder: schemas.FolderCreate, db: Session = Depends(get_db)):
    db_folder = crud.get_folder_by_name(db, name=folder.name)
    if db_folder:
        raise HTTPException(status_code=400, detail="Folder already registered")
    return crud.create_folder(db=db, folder=folder)

@app.get("/api/folders/", response_model=List[schemas.Folder])
def read_folders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    folders = crud.get_folders(db, skip=skip, limit=limit)
    return folders

# --- Tags ---

@app.get("/api/tags/", response_model=List[schemas.Tag])
def read_tags(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tags = crud.get_tags(db, skip=skip, limit=limit)
    return tags

# --- Posts ---

@app.post("/api/posts/", response_model=schemas.Post)
def create_post(post: schemas.PostCreate, db: Session = Depends(get_db)):
    return crud.create_post(db=db, post=post)

@app.get("/api/posts/", response_model=List[schemas.Post])
def read_posts(
    folder_id: Optional[int] = None,
    tag_names: Optional[str] = None,  # tag_name から tag_names (複数形) に変更
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # 複数タグのAND検索ロジック
    if tag_names:
        # カンマ区切りの文字列をリストに変換
        tag_list = [t.strip() for t in tag_names.split(",") if t.strip()]
        if tag_list:
            return crud.get_posts_by_tags_and(db, tag_list, skip=skip, limit=limit)

    # 既存のフォルダフィルタリング
    if folder_id is not None:
        return crud.get_posts_by_folder(db, folder_id=folder_id, skip=skip, limit=limit)
    
    # フィルタなし
    return crud.get_posts(db, skip=skip, limit=limit)

@app.get("/api/posts/{post_id}", response_model=schemas.Post)
def read_post(post_id: int, db: Session = Depends(get_db)):
    db_post = crud.get_post(db, post_id=post_id)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return db_post

@app.put("/api/posts/{post_id}/tags", response_model=schemas.Post)
def update_post_tags(post_id: int, tags_update: schemas.TagsUpdate, db: Session = Depends(get_db)):
    db_post = crud.update_post_tags(db, post_id=post_id, tags=tags_update.tags)
    if db_post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return db_post

@app.post("/api/upload_mhtmls/")
async def upload_mhtml_files(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files sent.")

    summary = {"added": 0, "skipped": 0, "failed": 0}
    details = []

    for file in files:
        tmp_path = None  # Initialize tmp_path
        try:
            # Use a with statement to ensure the file is closed
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mhtml") as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            # Process the temporary file
            result = import_mhtml.parse_and_import(tmp_path)
            
            # Aggregate results
            status = result.get("status", "failed")
            if status in summary:
                summary[status] += 1
            
            result["filename"] = file.filename
            details.append(result)

        except Exception as e:
            summary["failed"] += 1
            details.append({"filename": file.filename, "status": "failed", "error": str(e)})
        finally:
            # Clean up the temporary file
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)

    return {
        "message": f"Processed {len(files)} files. Added: {summary['added']}, Skipped: {summary['skipped']}, Failed: {summary['failed']}.",
        "results": summary,
        "details": details
    }

