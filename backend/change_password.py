import getpass, bcrypt
from database import SessionLocal
from models import User

username = input("Username: ").strip()
new_pw = getpass.getpass("New password: ")

hashed = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
db = SessionLocal()
u = db.query(User).filter(User.username == username).first()
if u:
    u.password_hash = hashed
    db.commit()
    print(f"Password updated for {username}")
else:
    print(f"{username} not found")
db.close()
