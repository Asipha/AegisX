import bcrypt
from database import SessionLocal, init_db
from models import User

def create_demo():
    init_db()
    db = SessionLocal()
    existing = db.query(User).filter(User.username == "demo").first()
    if existing:
        print("Demo user already exists")
        db.close()
        return
    password = "SentinelX2024!"
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = User(username="demo", password_hash=hashed)
    db.add(user)
    db.commit()
    print(f"Demo user created: demo / {password}")
    db.close()

if __name__ == "__main__":
    create_demo()
