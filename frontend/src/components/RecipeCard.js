import React, { useState, useEffect } from 'react';
import './RecipeCard.css';
import Swal from 'sweetalert2';

const RecipeCard = ({ 
  recipe, 
  onView, 
  onViewProfile,
  onAddToFavorites, 
  currentUser, 
  onEdit, 
  onDelete,
  onRemoveFromFavorites,
  checkIfFavorite,
  isMyRecipe,
  currentView  // Добавляем этот проп
}) => {
  const isAuthor = currentUser && (currentUser.id === recipe.author_id || currentUser.username === recipe.author);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAddToFavoritesBtn, setShowAddToFavoritesBtn] = useState(true);
  
  const shouldShowAddButton = !isMyRecipe && 
                            currentView !== 'recipeBook' && 
                            !isAuthor && 
                            !isFavorite;  // не показывать для своих рецептов
  const shouldShowRemoveButton = currentView === 'recipeBook' && currentUser;
  useEffect(() => {
    const checkFavorite = async () => {
      if (currentUser && checkIfFavorite) {
        const favoriteStatus = await checkIfFavorite(recipe.id);
        setIsFavorite(favoriteStatus);
      }
    };
    
    checkFavorite();
    
    // Определяем, показывать ли кнопку "Добавить в избранное"
    // Не показываем если: 1) Это "Мои рецепты" 2) Это "Книга рецептов"
    //setShowAddToFavoritesBtn(!(isMyRecipe || currentView === 'recipeBook'));
    
  }, [recipe.id, currentUser, checkIfFavorite, isMyRecipe, currentView]);

  const handleRemoveFromFavorites = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('Для удаления из избранного необходимо войти в систему');
      return;
    }
    
    if (window.confirm('Удалить рецепт из избранного?')) {
      if (onRemoveFromFavorites) {
        await onRemoveFromFavorites(recipe.id);
      }
      // Обновляем локальное состояние
      setIsFavorite(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(recipe);
  };
  
  const handleDelete = (e) => {
    e.stopPropagation();
    console.log('Delete button clicked for recipe ID:', recipe.id); // Добавьте эту строку
    Swal.fire({
      title: 'Удалить рецепт?',
      text: 'Вы уверены, что хотите удалить этот рецепт?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Да, удалить!',
      cancelButtonText: 'Отмена',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (result.isConfirmed) {
         onDelete(recipe.id);
      }
    });
  };

  const handleAddToBook = (e) => {
    e.stopPropagation();
    if (!currentUser) {
      //alert('Для добавления в избранное необходимо войти в систему');
        Swal.fire({
          title: 'Войдите в систему!',
          text: 'Для добавления в избранное необходимо войти в систему',
          //icon: 'success',
          showCancelButton: false,
          confirmButtonText: 'ОК',
          confirmButtonColor: '#7DBA4A',
        })      
      return;
    }
    
    // Если уже в избранном - не добавляем
    if (isFavorite) {
        Swal.fire({
          title: 'Этот рецепт уже в избранном!',
          //text: 'Этот рецепт уже в избранном!',
          //icon: 'success',
          showCancelButton: false,
          confirmButtonText: 'ОК',
          confirmButtonColor: '#7DBA4A',
        })
      //alert('Этот рецепт уже в избранном!');
      return;
    }
    
    onAddToFavorites(recipe.id);
    setIsFavorite(true); // Обновляем локальное состояние
  };
  
  const handleAuthorClick = (e) => {
    e.stopPropagation();
    if (recipe.author_id && onViewProfile) {
      onViewProfile(recipe.author_id);
    }
  };

  return (
    <div className="recipe-card" onClick={() => onView(recipe.id)}>
      <div className="recipe-image">
        {recipe.image_url ? (
          <img src={`http://localhost:5000${recipe.image_url}`} alt={recipe.title} />
        ) : (
          <div className="image-placeholder">
            <span>📷</span>
            <p>Изображение блюда</p>
          </div>
        )}
      </div>
      
      <div className="recipe-content">
        <div className="recipe-category">
          {recipe.category}
        </div>
        
        <div className="recipe-header">
          <h3 className="recipe-title">{recipe.title}</h3>
          {/* <div className="recipe-author">Автор: {recipe.author}</div> */}
          <div className="recipe-author" onClick={handleAuthorClick} style={{ cursor: 'pointer' }}>
            <i className="fas fa-user" style={{ marginRight: '5px' }}></i>
            {recipe.author}
          </div>
        </div>

        <div className="recipe-meta">
          <> <i class="fa-solid fa-hourglass-half"></i>{recipe.cooking_time} минут</> 
          <> <i class="fa-solid fa-bolt"></i>{recipe.difficulty}</>
          <> <i class="fas fa-utensils"></i>{recipe.servings} порций</>
          {/* <> <i class="fa-solid fa-star"></i>{recipe.rating || 'Нет оценок'}</> */}
        </div>

        <p className="recipe-ingredients">
          {Array.isArray(recipe.ingredients) 
            ? recipe.ingredients.map(ing => 
                `${ing.name}${ing.amount ? ` - ${ing.amount}${ing.unit || ''}` : ''}`
              ).join(', ')
            : recipe.ingredients || 'Ингредиенты не указаны'}
        </p>

        <div className="recipe-actions">
          {isAuthor && (
            <div className="recipe-author-actions">
              <button className="btn-actions" onClick={handleEdit} > <i class="fa-regular fa-pen-to-square"></i></button> 
              <button className="btn-actions" onClick={handleDelete} > <i class="fa-solid fa-trash-can"></i></button>
            </div>
          )}
          
          {/* Кнопка УДАЛЕНИЯ из избранного (показываем только в книге рецептов) */}
          {shouldShowRemoveButton && (
            <button 
              className="remove-from-favorites-btn"
              onClick={handleRemoveFromFavorites}
              title="Удалить из книги"
            >
              <i className="fa-solid fa-bookmark" style={{color: '#7DBA4A', marginRight: '8px'}}></i> 
              
            </button>
          )}

          {shouldShowAddButton && (
            <button 
              className={`add-to-book-btn ${isFavorite ? 'favorite-active' : ''}`}
              onClick={handleAddToBook}
              disabled={isFavorite}
            >
              {isFavorite ? (
                <>
                  <i className="fa-solid fa-bookmark" style={{color: '#7DBA4A'}}></i>
                  
                </>
              ) : (
                <>
                  <i className="fa-regular fa-bookmark" style={{color: '#7DBA4A', marginRight: '15px'}}></i>
                    Добавить в книгу рецептов
                </>
              )}
            </button>
          )}
            {/* Показываем иконку "уже в избранном" если рецепт в избранном но не в разделе "Книга рецептов" */}
            {isFavorite && currentView !== 'recipeBook' && !isAuthor && (
              <div className="already-favorite">
                <i className="fa-solid fa-bookmark" style={{color: '#7DBA4A', marginRight: '8px'}}></i>
                <span>В вашей книге</span>
              </div>
            )}
          
          <div className="recipe-stats">
            <> <i class="fa-solid fa-bookmark" style={{marginRight: '-15px'}}></i>{recipe.favorites_count || 0}</> 
            <> <i class="fa-solid fa-comment" style={{marginRight: '-15px'}}></i> {recipe.comments_count || 0}</> 
            <> <i class="fa-solid fa-eye" style={{marginRight: '-15px'}}></i> {recipe.views || 0}</> 

          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;