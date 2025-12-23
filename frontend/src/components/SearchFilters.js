import React, { useState } from 'react';
import './SearchFilters.css';

const SearchFilters = ({ 
  onSearch, 
  onFilter, 
  categories = [], 
  difficulties = ['Легкий', 'Средний', 'Сложный']
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');
  const [showIngredientsPanel, setShowIngredientsPanel] = useState(false);
  const clearIncludeInput = () => setIngredientInput('');
  const clearExcludeInput = () => setExcludeInput('');

  // 10 самых популярных ингредиентов
  const popularIngredients = [
    'мука', 'сахар', 'яйца', 'масло', 'молоко',
    'курица', 'картофель', 'лук', 'помидоры', 'сыр'
  ];

  // Обработчик поиска
  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  // Применение фильтров
  const applyAllFilters = () => {
    const filters = {
      category: selectedCategory || null,
      difficulty: selectedDifficulty || null,
      includeIngredients: ingredientInput ? ingredientInput.split(',').map(i => i.trim()).filter(i => i) : null,
      excludeIngredients: excludeInput ? excludeInput.split(',').map(i => i.trim()).filter(i => i) : null
    };
    onFilter(filters);
  };

  // Сброс фильтров
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedDifficulty('');
    setIngredientInput('');
    setExcludeInput('');
    onSearch('');
    onFilter({});
  };

  // Добавление ингредиента из списка в поле
  const addIngredientToInput = (ingredient, field) => {
    if (field === 'include') {
      const current = ingredientInput ? ingredientInput.split(',').map(i => i.trim()).filter(i => i) : [];
      if (!current.includes(ingredient)) {
        const newValue = [...current, ingredient].join(', ');
        setIngredientInput(newValue);
      }
    } else if (field === 'exclude') {
      const current = excludeInput ? excludeInput.split(',').map(i => i.trim()).filter(i => i) : [];
      if (!current.includes(ingredient)) {
        const newValue = [...current, ingredient].join(', ');
        setExcludeInput(newValue);
      }
    }
  };

  return (
    <div className="search-filters-container">
      <form onSubmit={handleSearch} className="search-form">
        {/* Поиск по названию */}
        <div className="search-input-group">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по названию рецепта..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-btn">
            <i className="fas fa-search"></i>
          </button>
        </div>

        {/* Основные фильтры */}
        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Категория:</label>
            <select
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Все категории</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Сложность:</label>
            <select
              className="filter-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">Любая сложность</option>
              {difficulties.map((difficulty, index) => (
                <option key={index} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <button 
              type="button" 
              className="ingredients-toggle-btn"
              onClick={() => setShowIngredientsPanel(!showIngredientsPanel)}
            >
              <i class="fa-solid fa-plus-minus"></i>
              {showIngredientsPanel ? 'Скрыть ингредиенты' : 'Ингридиенты'}
            </button>
          </div>

          <div className="filter-group">
            <button 
              type="button" 
              className="apply-filters-btn"
              onClick={applyAllFilters}
            >
              Применить фильтры
            </button>
          </div>

          <div className="filter-group">
            <button 
              type="button" 
              className="reset-filters-btn"
              onClick={resetFilters}
            >
              Сбросить все
            </button>
          </div>
        </div>
      </form>

      {/* Панель фильтрации по ингредиентам */}
      {showIngredientsPanel && (
        <div className="ingredients-panel">
          {/* Включаемые ингредиенты */}
          <div className="ingredients-section">
            <div className="ingredients-input-group">
              <label className="ingredients-label">
                <i className="fas fa-check-circle" style={{ color: '#7DBA4A' }}></i>
                Должны содержать:
              </label>
                <div className="input-with-clear">
                  <input
                    type="text"
                    className="ingredients-input"
                    placeholder="Введите ингредиенты через запятую (мука, яйца, сахар...)"
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                  />
                  {ingredientInput && (
                    <button 
                      type="button" 
                      className="clear-input-btn"
                      onClick={clearIncludeInput}
                      title="Очистить поле"
                    >
                      ×
                    </button>
                  )}
                </div>
                <small className="input-hint">
                  Можно ввести вручную или выбрать из списка ниже
                </small>
            </div>

            <div className="popular-ingredients">
              <small>Быстрый выбор:</small>
              <div className="quick-ingredients">
                {popularIngredients.map((ingredient, index) => (
                  <button
                    key={index}
                    type="button"
                    className="quick-ingredient-btn"
                    onClick={() => addIngredientToInput(ingredient, 'include')}
                    title={`Добавить ${ingredient}`}
                  >
                    + {ingredient}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Исключаемые ингредиенты */}
          <div className="ingredients-section">
            <div className="ingredients-input-group">
              <label className="ingredients-label">
                <i className="fas fa-times-circle" style={{ color: '#F44336' }}></i>
                Не должны содержать:
              </label>
                <div className="input-with-clear">
                  <input
                    type="text"
                    className="ingredients-input"
                    placeholder="Введите ингредиенты через запятую (грибы, орехи, специи...)"
                    value={excludeInput}
                    onChange={(e) => setExcludeInput(e.target.value)}
                  />
                  {excludeInput && (
                    <button 
                      type="button" 
                      className="clear-input-btn"
                      onClick={clearExcludeInput}
                      title="Очистить поле"
                    >
                      ×
                    </button>
                  )}
                </div>
                <small className="input-hint">
                  Можно ввести вручную или выбрать из списка ниже
                </small>
            </div>

            <div className="popular-ingredients">
              <small>Быстрый выбор:</small>
              <div className="quick-ingredients">
                {popularIngredients.map((ingredient, index) => (
                  <button
                    key={index}
                    type="button"
                    className="quick-ingredient-btn exclude"
                    onClick={() => addIngredientToInput(ingredient, 'exclude')}
                    title={`Исключить ${ingredient}`}
                  >
                    - {ingredient}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ingredients-hint">
            <small>
              <i className="fas fa-info-circle"></i>
              Фильтр будет искать рецепты, содержащие все указанные ингредиенты в первом поле 
              и не содержащие ни одного ингредиента из второго поля
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;