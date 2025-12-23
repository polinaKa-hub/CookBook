from app import app
from models.db import db

with app.app_context():
    db.create_all()
    print('Database tables created successfully!')
    print('SQLite database file: cookbook.db')