from flask import jsonify, request
from services.auth_service import AuthService
from services.favorite_service import FavoriteService

class AuthController:
    def __init__(self, auth_service, favorite_service):
        self.auth_service = auth_service
        self.favorite_service = favorite_service
    
    def register(self):
        data = request.get_json()
        
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Username, email and password are required'}), 400
        
        if len(data['password']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        user, session_id, error = self.auth_service.register_user(
            data['username'],
            data['email'],
            data['password']
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        response = jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict(),
            'session_id': session_id
        })
        response.set_cookie('session_id', session_id, httponly=True, samesite='Lax')
        return response, 201
    
    def login(self):
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
        
        user, session_id, error = self.auth_service.login_user(data['username'], data['password'])
        
        if error:
            return jsonify({'error': error}), 401
        
        response = jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'session_id': session_id
        })
        response.set_cookie('session_id', session_id, httponly=True, samesite='Lax')
        return response
    
    def logout(self):
        session_id = request.cookies.get('session_id')
        if session_id:
            self.auth_service.logout_user(session_id)
        
        response = jsonify({'message': 'Logout successful'})
        response.set_cookie('session_id', '', expires=0)
        return response
    
    def get_current_user(self):
        session_id = request.cookies.get('session_id')
        user = self.auth_service.get_current_user(session_id)
        if user:
            return jsonify({'user': user.to_dict()})
        return jsonify({'user': None})
    
    def add_favorite(self):
        session_id = request.cookies.get('session_id')
        user = self.auth_service.get_current_user(session_id)
        
        if not user:
            return jsonify({'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        recipe_id = data.get('recipe_id')
        
        if not recipe_id:
            return jsonify({'error': 'Recipe ID is required'}), 400
        
        if self.favorite_service.add_to_favorites(user.id, int(recipe_id)):
            return jsonify({'message': 'Recipe added to favorites'})
        return jsonify({'error': 'Failed to add to favorites'}), 400
    
    def remove_favorite(self):
        session_id = request.cookies.get('session_id')
        user = self.auth_service.get_current_user(session_id)
        
        if not user:
            return jsonify({'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        recipe_id = data.get('recipe_id')
        
        if not recipe_id:
            return jsonify({'error': 'Recipe ID is required'}), 400
        
        if self.favorite_service.remove_from_favorites(user.id, int(recipe_id)):
            return jsonify({'message': 'Recipe removed from favorites'})
        return jsonify({'error': 'Failed to remove from favorites'}), 400
    
    def get_favorites(self):
        session_id = request.cookies.get('session_id')
        user = self.auth_service.get_current_user(session_id)
        
        if not user:
            return jsonify({'error': 'Not authenticated'}), 401
        
        favorites = self.favorite_service.get_favorites(user.id)
        return jsonify({'favorites': favorites})
    

    def get_current_user_recipes(self):
        """Получить рецепты текущего пользователя"""
        session_id = request.cookies.get('session_id')
        user = self.auth_service.get_current_user(session_id)
        
        if not user:
            return jsonify({'error': 'Not authenticated'}), 401
        
        # Используем сервис рецептов для получения рецептов пользователя
        from services.recipe_service import RecipeService
        recipe_service = RecipeService()
        recipes = recipe_service.get_user_recipes(user.id)
        
        return jsonify([recipe.to_dict() for recipe in recipes])
    
    def toggle_favorite(self):
        """Добавить/удалить рецепт из избранного"""
        session_id = request.cookies.get('session_id')
        user = self.auth_service.get_current_user(session_id)
        
        if not user:
            return jsonify({'error': 'Not authenticated'}), 401
        
        data = request.get_json()
        recipe_id = data.get('recipe_id')
        
        if not recipe_id:
            return jsonify({'error': 'Recipe ID is required'}), 400
        
        # Проверяем, есть ли уже в избранном
        if self.favorite_service.is_favorite(user.id, int(recipe_id)):
            # Удаляем из избранного
            if self.favorite_service.remove_from_favorites(user.id, int(recipe_id)):
                return jsonify({'message': 'Removed from favorites', 'is_favorite': False})
        else:
            # Добавляем в избранное
            if self.favorite_service.add_to_favorites(user.id, int(recipe_id)):
                return jsonify({'message': 'Added to favorites', 'is_favorite': True})
        
        return jsonify({'error': 'Failed to update favorites'}), 500
    
    def get_favorite_recipes(self):
        """Получить избранные рецепты пользователя"""
        session_id = request.cookies.get('session_id')
        user = self.auth_service.get_current_user(session_id)
        
        if not user:
            return jsonify({'error': 'Not authenticated'}), 401
        
        favorite_recipes = self.favorite_service.get_favorite_recipes(user.id)
        return jsonify(favorite_recipes)
    
