from models.db import db
from datetime import datetime
from models.recipe import Recipe

class CommentService:
    def __init__(self):
        pass
    
    def add_comment(self, recipe_id, user_id, text):
        try:
            from models.recipe import Comment
            comment = Comment(
                recipe_id=recipe_id,
                user_id=user_id,
                text=text,
                created_at=datetime.utcnow()
            )
            db.session.add(comment)
            
            # Обновляем счетчик комментариев в рецепте
            recipe = db.session.get(Recipe, recipe_id)
            if recipe:
                recipe.comments_count += 1
            
            db.session.commit()
            return comment
        except Exception as e:
            db.session.rollback()
            print(f"Error adding comment: {e}")
            return None
    
    def get_comments_for_recipe(self, recipe_id):
        from models.recipe import Comment
        return Comment.query.filter_by(recipe_id=recipe_id).order_by(Comment.created_at.desc()).all()
    
    def delete_comment(self, comment_id, user_id):
        try:
            from models.recipe import Comment
            comment = Comment.query.get(comment_id)
            if comment and comment.user_id == user_id:
                # Обновляем счетчик комментариев в рецепте
                recipe = db.session.get(Recipe, comment.recipe_id)
                if recipe and recipe.comments_count > 0:
                    recipe.comments_count -= 1
                
                db.session.delete(comment)
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting comment: {e}")
            return False