from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime # datetimeを追加

# --- Tag Schemas ---
class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int
    
    model_config = {"from_attributes": True}

class TagsUpdate(BaseModel):
    tags: List[str]

# --- Folder Schemas ---
class FolderBase(BaseModel):
    name: str

class FolderCreate(FolderBase):
    pass

class Folder(FolderBase):
    id: int
    
    model_config = {"from_attributes": True}

# --- Post Schemas ---
class PostBase(BaseModel):
    url: str
    folder_id: Optional[int] = None
    # 新しいフィールドを追加
    tweet_id: Optional[str] = None
    text: Optional[str] = None
    author_name: Optional[str] = None
    author_screen_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    posted_at: Optional[datetime] = None
    media_urls: Optional[List[str]] = None # List[str]に変更
    favorite_count: Optional[int] = 0

    @field_validator('favorite_count', mode='before')
    @classmethod
    def set_favorite_count_default(cls, v):
        return v or 0

class PostCreate(PostBase):
    tags: Optional[List[str]] = [] # Accept a list of tag names during creation

class Post(PostBase):
    id: int
    created_at: datetime # created_atを追加

    # Use the nested schemas for reading
    folder: Optional[Folder] = None
    tags: List[Tag] = []

    model_config = {"from_attributes": True}

# For displaying lists of folders with their posts
class FolderWithPosts(Folder):
    posts: List[Post] = []