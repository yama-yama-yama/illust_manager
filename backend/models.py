from sqlalchemy import Column, Integer, String, ForeignKey, Table, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Association table for the many-to-many relationship between Post and Tag
post_tag_association = Table('post_tag', Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id')),
    Column('tag_id', Integer, ForeignKey('tags.id'))
)

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, index=True, nullable=False)
    tweet_id = Column(String, unique=True, index=True, nullable=True)
    text = Column(Text, nullable=True) # Text型に変更
    author_name = Column(String, nullable=True)
    author_screen_name = Column(String, nullable=True)
    author_avatar_url = Column(String, nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True) # timezone=Trueを追加
    media_urls = Column(JSON, nullable=True) # JSON型に変更
    favorite_count = Column(Integer, default=0)
    
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # timezone=Trueを追加

    folder = relationship("Folder", back_populates="posts")
    
    tags = relationship("Tag", secondary=post_tag_association, back_populates="posts")
    

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    posts = relationship("Post", secondary=post_tag_association, back_populates="tags")

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    posts = relationship("Post", back_populates="folder")