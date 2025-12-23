from models.db import db
from models.recipe import Rating, Recipe

class RatingService:
    def __init__(self):
        pass
    
    def add_rating(self, recipe_id, user_id, rating_value):
        try:
            # Проверяем существующий рейтинг
            existing_rating = Rating.query.filter_by(
                user_id=user_id, 
                recipe_id=recipe_id
            ).first()
            
            if existing_rating:
                # Обновляем существующий рейтинг
                old_rating = existing_rating.rating
                existing_rating.rating = rating_value
            else:
                # Добавляем новый рейтинг
                rating = Rating(
                    user_id=user_id,
                    recipe_id=recipe_id,
                    rating=rating_value
                )
                db.session.add(rating)
            
            # Пересчитываем средний рейтинг
            self._update_recipe_rating(recipe_id)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error adding rating: {e}")
            return False
    
    def _update_recipe_rating(self, recipe_id):
        ratings = Rating.query.filter_by(recipe_id=recipe_id).all()
        if ratings:
            total_score = sum(r.rating for r in ratings)
            average_rating = total_score / len(ratings)
            
            recipe = Recipe.query.get(recipe_id)
            if recipe:
                recipe.rating = round(average_rating, 1)
                recipe.rating_count = len(ratings)
    
    def get_user_rating(self, recipe_id, user_id):
        rating = Rating.query.filter_by(
            recipe_id=recipe_id, 
            user_id=user_id
        ).first()
        return rating.rating if rating else None
    
    def get_recipe_ratings(self, recipe_id):
        return Rating.query.filter_by(recipe_id=recipe_id).all()