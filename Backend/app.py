import os
import sys

# Добавляем путь к текущей директории ДО всех импортов
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_cors import cross_origin
from config import Config
import logging

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Определяем пути
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_BUILD_PATH = os.path.join(BASE_DIR, '..', 'frontend', 'build')

# Проверяем существование папки с фронтендом
logger.info(f"Checking frontend path: {FRONTEND_BUILD_PATH}")
logger.info(f"Frontend exists: {os.path.exists(FRONTEND_BUILD_PATH)}")
if os.path.exists(FRONTEND_BUILD_PATH):
    logger.info(f"Index.html exists: {os.path.exists(os.path.join(FRONTEND_BUILD_PATH, 'index.html'))}")

app = Flask(__name__, 
            static_folder=FRONTEND_BUILD_PATH if os.path.exists(FRONTEND_BUILD_PATH) else None,
            static_url_path='')
app.config.from_object(Config)

# Инициализация расширений
from models.db import db
db.init_app(app)
CORS(app, supports_credentials=True)

# Импорт моделей
from models.user import User, Favorite
from models.recipe import Recipe, Rating, Comment

# Импорт сервисов
from services.auth_service import AuthService
from services.recipe_service import RecipeService
from services.comment_service import CommentService
from services.rating_service import RatingService
from services.favorite_service import FavoriteService

# Импорт контроллеров
from controllers.auth_controller import AuthController
from controllers.recipe_controller import RecipeController

# Инициализация сервисов
auth_service = AuthService()
recipe_service = RecipeService()
comment_service = CommentService()
rating_service = RatingService()
favorite_service = FavoriteService()

# Инициализация контроллеров
auth_controller = AuthController(auth_service, favorite_service)
recipe_controller = RecipeController(recipe_service, comment_service, rating_service, auth_service)

# Создаем папку для загрузок если её нет
uploads_path = os.path.join(BASE_DIR, 'uploads')
if not os.path.exists(uploads_path):
    os.makedirs(uploads_path)
if not os.path.exists(os.path.join(uploads_path, 'recipes')):
    os.makedirs(os.path.join(uploads_path, 'recipes'))
if not os.path.exists(os.path.join(uploads_path, 'avatars')):
    os.makedirs(os.path.join(uploads_path, 'avatars'))

# ========== API МАРШРУТЫ ==========

@app.route('/api/test')
def test_api():
    return jsonify({"message": "Hello from Flask!", "status": "success"})

@app.route('/api/init-db')
def init_database():
    """Инициализация базы данных с тестовыми данными"""
    try:
        # Создаем таблицы
        db.create_all()
        
        # Добавляем тестового пользователя если его нет
        if not User.query.filter_by(username="admin").first():
            admin = User(username="admin", email="admin@example.com")
            admin.set_password("admin123")
            db.session.add(admin)
            
            test_user = User(username="test_user", email="test@example.com")
            test_user.set_password("test123")
            db.session.add(test_user)
            
            # Добавляем тестовые рецепты
            recipes = [
                Recipe(
                    title="Спагетти Карбонара",
                    ingredients="Спагетти - 400г, Яйца - 3 шт, Пармезан - 100г, Гуанчиале - 150г, Чёрный перец",
                    instructions="1. Варим спагетти...\n2. Обжариваем гуанчиале...\n3. Смешиваем с яичной смесью",
                    cooking_time=20,
                    category="Паста",
                    difficulty="Средний",
                    author="Алина Репа",
                    author_id=1
                ),
                Recipe(
                    title="Салат Цезарь",
                    ingredients="Листья салата - 1 пучок, Куриное филе - 300г, Сухарики - 100г, Пармезан - 50г, Соус Цезарь",
                    instructions="1. Готовим курицу...\n2. Нарезаем салат...\n3. Собираем салат",
                    cooking_time=15,
                    category="Салаты",
                    difficulty="Легкий",
                    author="Мария",
                    author_id=1
                )
            ]
            
            for recipe in recipes:
                db.session.add(recipe)
            
            db.session.commit()
        
        return jsonify({"message": "Database initialized successfully"})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Маршруты рецептов
@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    return recipe_controller.get_all_recipes()

@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    return recipe_controller.get_recipe(recipe_id)

@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    return recipe_controller.create_recipe()

@app.route('/api/recipes/search', methods=['GET'])
def search_recipes():
    return recipe_controller.search_recipes()

@app.route('/api/recipes/filter', methods=['GET'])
def filter_recipes():
    return recipe_controller.get_filtered_recipes()

# Маршрут для доступа к загруженным файлам
@app.route('/uploads/recipes/<path:filename>')
def serve_recipe_image(filename):
    return send_from_directory('uploads/recipes', filename)

@app.route('/static/recipes/<path:filename>')
def static_recipe_image(filename):
    return send_from_directory('uploads/recipes', filename)

# Маршруты комментариев и оценок
@app.route('/api/recipes/<int:recipe_id>/comments', methods=['GET'])
def get_comments(recipe_id):
    return recipe_controller.get_comments(recipe_id)

@app.route('/api/recipes/<int:recipe_id>/comments', methods=['POST'])
def add_comment(recipe_id):
    print(f"DEBUG [add_comment]: Recipe ID: {recipe_id}")
    print(f"DEBUG [add_comment]: Cookies: {request.cookies}")
    print(f"DEBUG [add_comment]: JSON data: {request.get_json()}")
    return recipe_controller.add_comment(recipe_id)

@app.route('/api/recipes/<int:recipe_id>/rating', methods=['POST'])
def add_rating(recipe_id):
    return recipe_controller.add_rating(recipe_id)

# Маршруты аутентификации
@app.route('/api/auth/register', methods=['POST'])
def register():
    return auth_controller.register()

@app.route('/api/auth/login', methods=['POST'])
def login():
    return auth_controller.login()

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    return auth_controller.logout()

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    return auth_controller.get_current_user()

@app.route('/api/auth/favorites', methods=['POST'])
def add_favorite():
    return auth_controller.add_favorite()

@app.route('/api/auth/favorites', methods=['GET'])
def get_favorites():
    return auth_controller.get_favorites()

@app.route('/api/auth/favorites/remove', methods=['POST'])
def remove_favorite():
    return auth_controller.remove_favorite()

# Маршруты для рецептов пользователя и избранного
@app.route('/api/recipes/my', methods=['GET'])
def get_my_recipes():
    return auth_controller.get_current_user_recipes()

@app.route('/api/auth/favorites/toggle', methods=['POST'])
def toggle_favorite():
    return auth_controller.toggle_favorite()

@app.route('/api/recipes/with-steps', methods=['POST'])
def create_recipe_with_steps():
    try:
        session_id = request.cookies.get('session_id')
        if not session_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        user = auth_service.get_current_user(session_id)
        if not user:
            return jsonify({'error': 'Invalid session'}), 401
        
        return recipe_controller.create_recipe_with_steps(user.id)
    except Exception as e:
        print(f"Error in create_recipe_with_steps route: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/recipes/<int:recipe_id>/update-with-steps', methods=['PATCH'])
def update_recipe_with_steps(recipe_id):
    try:
        session_id = request.cookies.get('session_id')
        print(f"DEBUG: Session ID: {session_id}")
        
        if not session_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        user = auth_service.get_current_user(session_id)
        print(f"DEBUG: User found: {user}")
        
        if not user:
            print(f"DEBUG: All sessions: {auth_service.sessions}")
            return jsonify({'error': 'Invalid session'}), 401
        
        print(f"DEBUG: Form data keys: {list(request.form.keys())}")
        print(f"DEBUG: Files keys: {list(request.files.keys())}")

        return recipe_controller.update_recipe_with_steps(recipe_id, user.id)
    except Exception as e:
        print(f"Error in update_recipe_with_steps route: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/recipes/<int:recipe_id>', methods=['PATCH'])
def update_recipe(recipe_id):
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = auth_service.get_current_user(session_id)
    if not user:
        return jsonify({'error': 'Invalid session'}), 401
    
    return recipe_controller.update_recipe(recipe_id)

@app.route('/api/debug/sessions', methods=['GET'])
def debug_sessions():
    """Отладочный маршрут для проверки сессий"""
    return jsonify({
        'total_sessions': len(auth_service.sessions),
        'sessions': list(auth_service.sessions.keys())
    })

@app.route('/api/recipes/user/<int:user_id>', methods=['GET'])
def get_user_recipes(user_id):
    recipes = Recipe.query.filter_by(author_id=user_id).all()
    return jsonify([recipe.to_dict() for recipe in recipes])

@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(supports_credentials=True)
def delete_recipe(recipe_id):
    session_id = request.cookies.get('session_id')
    print(f"DELETE DEBUG: Received session_id = {session_id}")
    
    if not session_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = auth_service.get_current_user(session_id)
    print(f"DELETE DEBUG: User found = {user}")
    
    if not user:
        print(f"DELETE DEBUG: Invalid session. Available sessions: {list(auth_service.sessions.keys())}")
        return jsonify({'error': 'Invalid session'}), 401
    
    return recipe_controller.delete_recipe(recipe_id)

@app.route('/api/users/<int:user_id>', methods=['GET', 'PUT'])
def user_profile(user_id):
    if request.method == 'GET':
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        recipes_count = Recipe.query.filter_by(author_id=user_id).count()
        favorites_count = Favorite.query.filter_by(user_id=user_id).count()
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'bio': user.bio if hasattr(user, 'bio') else '',
            'avatar_url': user.avatar_url if hasattr(user, 'avatar_url') else None,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'recipes_count': recipes_count,
            'favorites_count': favorites_count
        })
    
    elif request.method == 'PUT':
        session_id = request.cookies.get('session_id')
        if not session_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        user = auth_service.get_current_user(session_id)
        if not user or user.id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        try:
            if 'email' in request.form:
                user.email = request.form['email']
            
            if 'bio' in request.form:
                user.bio = request.form['bio']
            
            current_password = request.form.get('current_password')
            new_password = request.form.get('new_password')
            
            if current_password and new_password:
                if not user.check_password(current_password):
                    return jsonify({'error': 'Текущий пароль неверен'}), 400
                
                if len(new_password) < 8:
                    return jsonify({'error': 'Новый пароль должен содержать минимум 8 символов'}), 400
                
                user.set_password(new_password)
            
            if 'avatar' in request.files:
                avatar_file = request.files['avatar']
                if avatar_file and avatar_file.filename:
                    import uuid
                    from werkzeug.utils import secure_filename
                    from datetime import datetime
                    
                    file_ext = avatar_file.filename.rsplit('.', 1)[1].lower() if '.' in avatar_file.filename else ''
                    if file_ext not in ['png', 'jpg', 'jpeg', 'gif']:
                        return jsonify({'error': 'Недопустимый формат изображения'}), 400
                    
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    unique_id = str(uuid.uuid4())[:8]
                    filename = f"avatar_{timestamp}_{unique_id}.{file_ext}"
                    
                    upload_folder = 'uploads/avatars'
                    os.makedirs(upload_folder, exist_ok=True)
                    file_path = os.path.join(upload_folder, filename)
                    avatar_file.save(file_path)
                    
                    user.avatar_url = f"/uploads/avatars/{filename}"
            
            db.session.commit()
            
            return jsonify({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'bio': user.bio if hasattr(user, 'bio') else '',
                'avatar_url': user.avatar_url if hasattr(user, 'avatar_url') else None
            })
            
        except Exception as e:
            db.session.rollback()
            print(f"Error updating user profile: {e}")
            return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/favorite-recipes', methods=['GET'])
def get_favorite_recipes():
    session_id = request.cookies.get('session_id')
    if not session_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = auth_service.get_current_user(session_id)
    if not user:
        return jsonify({'error': 'Invalid session'}), 401
    
    favorites = Favorite.query.filter_by(user_id=user.id).all()
    favorite_ids = [f.recipe_id for f in favorites]
    
    recipes = Recipe.query.filter(Recipe.id.in_(favorite_ids)).all()
    
    return jsonify([recipe.to_dict() for recipe in recipes])

@app.route('/uploads/avatars/<path:filename>')
def serve_avatar(filename):
    return send_from_directory('uploads/avatars', filename)

# ========== REACT МАРШРУТЫ (В САМОМ КОНЦЕ) ==========

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """Обслуживание React приложения"""
    # Если запрос к API, пропускаем
    if path.startswith('api/') or path.startswith('uploads/'):
        return jsonify({'error': 'API route not found'}), 404
    
    # Если запрос к статическим файлам React
    if path and os.path.exists(os.path.join(FRONTEND_BUILD_PATH, path)):
        logger.info(f"Serving static file: {path}")
        return send_from_directory(FRONTEND_BUILD_PATH, path)
    
    # Все остальные запросы отправляем на index.html
    logger.info(f"Serving index.html for path: {path}")
    return send_from_directory(FRONTEND_BUILD_PATH, 'index.html')

# ========== ЗАПУСК ПРИЛОЖЕНИЯ ==========

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    # Проверяем, существует ли папка сборки фронтенда
    if os.path.exists(FRONTEND_BUILD_PATH):
        logger.info(f"Frontend found at: {FRONTEND_BUILD_PATH}")
    else:
        logger.warning(f"Frontend NOT found at: {FRONTEND_BUILD_PATH}")
        logger.warning("Run: cd Frontend && npm run build")
    
    with app.app_context():
        db.create_all()
    
    app.run(host='0.0.0.0', port=port, debug=True)