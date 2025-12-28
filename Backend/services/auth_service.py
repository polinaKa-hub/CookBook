import uuid
from models.db import db
from models.user import User

session_store = {}
class AuthService:
    def __init__(self):
        self.sessions = session_store  # Простое хранилище сессий
    
    def _generate_session_id(self):
        return str(uuid.uuid4())
    
    def register_user(self, username, email, password):
        # Проверяем существующего пользователя
        if User.query.filter_by(username=username).first():
            return None, None, "Имя пользователя уже существует"
        if User.query.filter_by(email=email).first():
            return None, None, "Email уже зарегистрирован"
        
        # ПРОВЕРКИ ПАРОЛЯ
        errors = []
        
        # 1. Минимальная длина
        if len(password) < 8:
            errors.append("Пароль должен содержать минимум 8 символов")
        
        # 2. Максимальная длина
        if len(password) > 50:
            errors.append("Пароль слишком длинный (максимум 50 символов)")
        
        # 3. Проверка на пробелы в начале/конце
        if password.startswith(' ') or password.endswith(' '):
            errors.append("Пароль не может начинаться или заканчиваться пробелами")
        
        # 4. Проверка на простые пароли
        common_passwords = ['password', '12345678', 'qwerty', 'admin', 'password123']
        if password.lower() in common_passwords:
            errors.append("Пароль слишком простой. Выберите более сложный пароль")
        
        # 5. Проверка на наличие букв и цифр
        if not any(char.isalpha() for char in password):
            errors.append("Пароль должен содержать хотя бы одну букву")
        
        if not any(char.isdigit() for char in password):
            errors.append("Пароль должен содержать хотя бы одну цифру")
        
        # Если есть ошибки - возвращаем их
        if errors:
            error_message = "; ".join(errors)
            return None, None, error_message
        
        # Создаем нового пользователя
        new_user = User(
            username=username,
            email=email
        )
        new_user.set_password(password)
        
        try:
            db.session.add(new_user)
            db.session.commit()
            
            session_id = self._generate_session_id()
            self.sessions[session_id] = new_user.id
            return new_user, session_id, None
        except Exception as e:
            db.session.rollback()
            return None, None, str(e)
    
    def login_user(self, username, password):
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            session_id = self._generate_session_id()
            self.sessions[session_id] = user.id
            return user, session_id, None
        
        return None, None, "Invalid username or password"
    
    def get_current_user(self, session_id):
        if session_id in self.sessions:
            user_id = self.sessions[session_id]
            return User.query.get(user_id)
        return None
    
    def logout_user(self, session_id):
        if session_id in self.sessions:
            del self.sessions[session_id]
    
    def get_user_by_id(self, user_id):
        return User.query.get(user_id)
    
    def get_user_by_username(self, username):
        return User.query.filter_by(username=username).first()