from models.db import db
from models.user import Favorite
from models.recipe import Recipe

class FavoriteService:
    def __init__(self):
        pass
    
    def add_to_favorites(self, user_id, recipe_id):
        try:
            # Проверяем, нет ли уже в избранном
            existing_favorite = Favorite.query.filter_by(
                user_id=user_id, 
                recipe_id=recipe_id
            ).first()
            
            if existing_favorite:
                return True  # Уже в избранном
                
            favorite = Favorite(user_id=user_id, recipe_id=recipe_id)
            db.session.add(favorite)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error adding to favorites: {e}")
            return False
    
    def remove_from_favorites(self, user_id, recipe_id):
        try:
            favorite = Favorite.query.filter_by(
                user_id=user_id, 
                recipe_id=recipe_id
            ).first()
            
            if favorite:
                db.session.delete(favorite)
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            print(f"Error removing from favorites: {e}")
            return False
    
    def get_favorites(self, user_id):
        favorites = Favorite.query.filter_by(user_id=user_id).all()
        return [fav.recipe_id for fav in favorites]
    
    def get_favorite_recipes(self, user_id):
        favorites = Favorite.query.filter_by(user_id=user_id).join(
            Recipe, Favorite.recipe_id == Recipe.id
        ).all()
        return [fav.recipe.to_dict() for fav in favorites]
    
    def is_favorite(self, user_id, recipe_id):
        favorite = Favorite.query.filter_by(
            user_id=user_id, 
            recipe_id=recipe_id
        ).first()
        return favorite is not None