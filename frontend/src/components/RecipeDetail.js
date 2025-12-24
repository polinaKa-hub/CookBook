import React, { useState, useEffect } from 'react';
import './RecipeDetail.css';

const RecipeDetail = ({ recipe, currentUser, onBack, onAddToFavorites, onViewProfile }) => {
  //const [servings, setServings] = useState(6);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(recipe?.comments || []);
  const [loading, setLoading] = useState(false);
  const [selectedServings, setSelectedServings] = useState(recipe?.servings || 6);

  // Функция для получения ингредиентов как массива
  const getIngredientsArray = () => {
    if (!recipe?.ingredients) return [];
    
    // Если ingredients уже массив
    if (Array.isArray(recipe.ingredients)) {
      return recipe.ingredients;
    }
    
    // Если ingredients - строка, парсим её
    if (typeof recipe.ingredients === 'string') {
      // Пробуем распарсить как JSON
      try {
        const parsed = JSON.parse(recipe.ingredients);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Если не JSON, разбиваем по запятым
        return recipe.ingredients.split(/[,;]/).map(ing => ({
          name: ing.trim(),
          amount: '',
          unit: ''
        }));
      }
    }
    
    return [];
  };

  const ingredients = getIngredientsArray();
  
  // Используем инструкции из рецепта или пустой массив по умолчанию
  const instructions = recipe?.instructions || [];

  // Если instructions - это массив объектов, преобразуем его
  const instructionSteps = Array.isArray(instructions) 
    ? instructions.map(step => 
        typeof step === 'object' ? step.description || step.text || step.instruction || '' : step
      )
    : typeof instructions === 'string' 
      ? instructions.split('\n').filter(Boolean)
      : [];

  // Функция для отображения ингредиентов с учетом порций
  const getAdjustedIngredient = (ingredient) => {
    if (!ingredient) return { name: '', amount: '' };
    
    let name = '';
    let amount = '';
    let unit = '';
    let baseAmount = '';
    
    if (typeof ingredient === 'string') {
      name = ingredient;
    } else if (typeof ingredient === 'object') {
      name = ingredient.name || ingredient.ingredient || '';
      amount = ingredient.amount || ingredient.quantity || '';
      unit = ingredient.unit || '';
      baseAmount = amount;
      
      // Логика адаптации количества под порции
      if (amount && selectedServings !== recipe.servings) {
        const baseServings = recipe.servings || 6;
        const baseAmountNum = parseFloat(amount);
        
        if (!isNaN(baseAmountNum) && baseServings > 0) {
          const multiplier = selectedServings / baseServings;
          const adjustedAmount = baseAmountNum * multiplier;
          
          // Форматируем количество (убираем лишние нули)
          amount = adjustedAmount % 1 === 0 ? 
            adjustedAmount.toString() : 
            adjustedAmount.toFixed(1);
        }
      }
      
      if (unit) {
        amount = amount ? `${amount} ${unit}` : unit;
      }
    }
    
    return { 
      name, 
      amount: amount || '', 
      unit: unit || '',
      baseAmount: baseAmount || ''
    };
  };

  // Функция для загрузки комментариев с сервера
  const fetchComments = async () => {
    try {
      console.log('Fetching comments for recipe:', recipe.id);
      const response = await fetch(`https://cookbook-9xc5.onrender.com/api/recipes/${recipe.id}/comments`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Проверяем, что data - массив
        if (Array.isArray(data)) {
          setComments(data);
        } else {
          console.error('Comments data is not an array:', data);
          setComments([]);
        }
      } else {
        console.error('Failed to fetch comments:', response.status);
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  };

  // Загружаем комментарии при монтировании компонента
  useEffect(() => {
    if (recipe?.id) {
      fetchComments();
    }
  }, [recipe?.id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert('Введите текст комментария');
      return;
    }
    
    if (!currentUser) {
      alert('Для добавления комментария необходимо войти в систему');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending comment to server:', newComment);
      
      // Сохраняем текст комментария до очистки поля
      const commentTextToSend = newComment;
      setNewComment('');
      
      // Отправляем на сервер
      const response = await fetch(`https://cookbook-9xc5.onrender.com/api/recipes/${recipe.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: commentTextToSend }),
        credentials: 'include'
      });

      const data = await response.json();
      console.log('Server response:', data);
      
      if (response.ok) {
        // Добавляем новый комментарий в начало списка
        setComments(prev => [data, ...prev]);
      } else {
        alert(data.error || 'Ошибка при добавлении комментария');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Ошибка при добавлении комментария: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServingsChange = (delta) => {
    const newServings = selectedServings + delta;
    if (newServings >= 1 && newServings <= 20) {
      setSelectedServings(newServings);
    }
  };

  // Обработчик ввода порций
  const handleServingsInput = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 20) {
      setSelectedServings(value);
    }
  };

  // Функции для навигации
  const handleLogout = async () => {
    try {
      await fetch('https://cookbook-9xc5.onrender.com/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      // Если нужно перенаправить на главную после выхода
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // НАВИГАЦИОННЫЕ ФУНКЦИИ
  const handleGoToHome = () => {
    if (typeof onBack === 'function') {
      onBack();
    }
  };

  const handleGoToMyProfile = () => {
    if (currentUser && onViewProfile) {
      onViewProfile(currentUser.id);
    }
  };

  const handleGoToMyRecipes = () => {
    // Перенаправляем на главную и показываем "Мои рецепты"
    if (typeof onBack === 'function') {
      onBack();
      // Здесь можно добавить логику для переключения на вкладку "Мои рецепты"
      setTimeout(() => {
        // Можно использовать localStorage для передачи состояния
        localStorage.setItem('defaultView', 'myRecipes');
        // Или вызвать событие
        window.dispatchEvent(new CustomEvent('navigateToMyRecipes'));
      }, 100);
    }
  };

  const handleGoToRecipeBook = () => {
    // Перенаправляем на главную и показываем "Книгу рецептов"
    if (typeof onBack === 'function') {
      onBack();
      setTimeout(() => {
        localStorage.setItem('defaultView', 'recipeBook');
        window.dispatchEvent(new CustomEvent('navigateToRecipeBook'));
      }, 100);
    }
  };

  // Функция для перехода на профиль автора рецепта
  const handleGoToAuthorProfile = () => {
    if (recipe?.author_id && onViewProfile) {
      onViewProfile(recipe.author_id);
    }
  };

  // Функция для открытия окна входа
  const handleOpenLogin = () => {
    // Открываем модальное окно входа
    window.dispatchEvent(new CustomEvent('openAuthModal', { 
      detail: { view: 'login' } 
    }));
  };

  // Функция для открытия окна регистрации
  const handleOpenRegister = () => {
    window.dispatchEvent(new CustomEvent('openAuthModal', { 
      detail: { view: 'register' } 
    }));
  };

  return (
    <div className="recipe-detail-container">
      
      {/* Шапка сайта */}
      <header className="recipe-detail-header">
        <div className="recipe-detail-header-content">
          <div className="recipe-detail-logo" onClick={handleGoToHome} style={{ cursor: 'pointer' }}>
            Cook Book
          </div>
          
          {currentUser ? (
            <div className="user-nav">
              <button 
                onClick={handleGoToMyProfile}
                className="nav-btn"
                title="Мой профиль"
              >
                <i className="fas fa-user-circle"></i>
                <span>Профиль</span>
              </button>

              <button 
                onClick={handleGoToMyRecipes} 
                className="nav-btn"
                title="Мои рецепты"
              >
                <i className="fas fa-utensils"></i>
                <span>Мои рецепты</span>
              </button>
              <button 
                onClick={handleGoToRecipeBook} 
                className="nav-btn"
                title="Книга рецептов"
              >
                <i className="fas fa-bookmark"></i>
                <span>Книга рецептов</span>
              </button>
              <button onClick={handleLogout} className="logout-btn" title="Выйти">
                <i className="fas fa-sign-out-alt"></i>
                <span>Выйти</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="auth-btn" onClick={handleOpenLogin}>
                Вход
              </button>
              <button className="auth-btn" onClick={handleOpenRegister}>
                Регистрация
              </button>
            </div>
          )}
        </div>
        <div className="recipe-detail-header-divider"></div>
      </header>

      
    <div className="recipe-det-content">
      {/* Заголовок рецепта */}
      <div className="recipe-detail-title-section">
        <h1 className="recipe-detail-title">{recipe?.title || 'Рецепт без названия'}</h1>
      </div>

      {/* Блок с изображением блюда */}
      <div className="recipe-detail-image-section">
        <div className="recipe-detail-image">
          {recipe?.image_url ? (
            <img src={`http://localhost:5000${recipe.image_url}`} alt={recipe.title} />
          ) : (
            <div className="recipe-detail-image-placeholder">
              <span>📷</span>
              <p>Изображение блюда</p>
            </div>
          )}
        </div>
      </div>

      {/* Блок автора - СДЕЛАЕМ КЛИКАБЕЛЬНЫМ */}
      <div 
        className="recipe-detail-author-section"
        onClick={handleGoToAuthorProfile}
        style={{ cursor: recipe?.author_id ? 'pointer' : 'default' }}
      >
        <span className="recipe-detail-author-label">Автор:</span>
        <span className="recipe-detail-author-name">
          {recipe?.author || 'Неизвестный автор'}
          {recipe?.author_id && (
            <i  style={{ marginLeft: '5px', fontSize: '0.8em' }}></i>
          )}
        </span>
      </div>

      {/* Блок ингредиентов */}
      <div className="recipe-detail-section">
        <h2>Ингредиенты:</h2>
        
        <div className="recipe-detail-servings-control">
          <span className="recipe-detail-servings-label">Порции:</span>
          <div className="recipe-detail-servings-selector">
            <button 
              className="recipe-detail-servings-btn minus" 
              onClick={() => handleServingsChange(-1)}
            >
              −
            </button>
            <input
              type="number"
              className="recipe-detail-servings-input"
              value={selectedServings}
              onChange={handleServingsInput}
              min="1"
              max="20"
            />
            <button 
              className="recipe-detail-servings-btn plus" 
              onClick={() => handleServingsChange(1)}
            >
              +
            </button>
          </div>
          <div className="recipe-detail-servings-info">
              {recipe?.servings && selectedServings !== recipe.servings && (
                <span className="servings-original">
                  (оригинальный рецепт на {recipe.servings} порций)
                </span>
              )}
          </div>
        </div>

        <div className="recipe-detail-ingredients">
          <h3>Ингредиенты на {selectedServings} порций:</h3>
          {ingredients.length > 0 ? (
            ingredients.map((ingredient, index) => {
              const { name, amount } = getAdjustedIngredient(ingredient);
              return (
                <div key={index} className="recipe-detail-ingredient-item">
                  <span className="recipe-detail-ingredient-name">{name}</span>
                  {amount && (
                    <>
                      <div className="recipe-detail-ingredient-line"></div>
                      <span className="recipe-detail-ingredient-amount">{amount}</span>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <p>Ингредиенты не указаны</p>
          )}
        </div>

        {currentUser && (
          <button 
            className="recipe-detail-add-to-favorites-btn"
            onClick={() => recipe?.id && onAddToFavorites(recipe.id)}
          >
            Добавить в книгу рецептов
          </button>
        )}
      </div>

      {/* Блок инструкций */}
      <div className="recipe-detail-section">
        <h2>Инструкция приготовления:</h2>
        
        <div className="recipe-detail-instructions">
          {instructionSteps.length > 0 ? (
            instructionSteps.map((instruction, index) => (
              <div key={index} className="recipe-detail-instruction-step">
                <div className="recipe-detail-step-image">
                  {/* Проверяем наличие изображения шага */}
                  {recipe?.step_images && 
                  Array.isArray(recipe.step_images) && 
                  recipe.step_images[index] && (
                  <img 
                        src={`http://localhost:5000${recipe.step_images[index].image_url}`}
                        alt={`Шаг ${index + 1}`} 
                        onError={(e) => {
                          console.error(`Failed to load image: ${recipe.step_images[index].image_url}`);
                          e.target.style.display = 'none';
                        }}
                      />
                  )}
                </div>
                <div className="recipe-detail-step-content">
                  <div className="recipe-detail-step-number">{index + 1}.</div>
                  <div className="recipe-detail-step-text">{instruction}</div>
                </div>
              </div>
            ))
          ) : (
            <p>Инструкция приготовления не указана</p>
          )}
        </div>
      </div>
      {/* Блок комментариев */}
      <div className="recipe-detail-section">
        <h2>Комментарии:</h2>
        
        <div className="recipe-detail-comments-container">
          {comments && comments.length > 0 ? (
            comments.map(comment => {
              const commentId = comment.id || comment._id || Math.random();
              return (
                <div key={commentId} className="recipe-detail-comment-card">
                  <div className="recipe-detail-comment-card-content">
                    <div className="recipe-detail-comment-header">
                      <div className="recipe-detail-comment-author">
                        {comment.username || comment.author || 'Пользователь'}:
                      </div>
                      {comment.created_at && (
                        <div className="recipe-detail-comment-date">
                          {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>
                    <div className="recipe-detail-comment-text">{comment.text}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <p>Пока нет комментариев. Будьте первым!</p>
          )}
        </div>

        {currentUser && (
          <div className="recipe-detail-add-comment">
            <input
              type="text"
              className="recipe-detail-comment-input"
              placeholder="Добавить комментарий"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              disabled={loading}
            />
            <button 
              className="recipe-detail-comment-btn"
              onClick={handleAddComment}
              disabled={!newComment.trim() || loading}
            >
              Добавить комментарий
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Футер */}
      <footer className="recipe-detail-footer">
        <div className="recipe-detail-footer-divider"></div>
        <div className="recipe-detail-footer-logo">Cook Book</div>
        <div className="recipe-detail-footer-divider"></div>
      </footer>
    </div>
  );
};

export default RecipeDetail;