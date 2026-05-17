import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 本番環境では環境変数からDATABASE_URLを読み込むように変更
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./x_like_manager.db")
# connect_args is needed only for SQLite for multi-threading.
# It's to ensure that the same thread that created the connection is the one that uses it.
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
