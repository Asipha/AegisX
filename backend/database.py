import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

DB_PATH = os.path.join(os.path.dirname(__file__), "sentinelx.db")
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False, "timeout": 20})
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized at {DB_PATH}")
