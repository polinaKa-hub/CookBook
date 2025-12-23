import React, { useState } from 'react';
import './RecipeForm.css';

// Изменяем объявление компонента, чтобы принимать categories как пропс
const RecipeForm = ({ onAddRecipe, categories = [] }) => { // Добавляем categories
  // Состояние для динамических ингредиентов
  const [ingredients, setIngredients] = useState([
    { id: 1, name: '', amount: '', unit: 'г' }
  ]);

  // Состояние для динамических шагов
  const [steps, setSteps] = useState([
    { id: 1, description: '', image: null, imagePreview: '' }
  ]);

  // Состояние для основных полей рецепта
  const [formData, setFormData] = useState({
    title: '',
    cooking_time: '',
    category: '',
    newCategory: '',  // Добавляем поле для новой категории
    difficulty: 'Легкий',
    servings: 6, 
    mainImage: null,
    mainImagePreview: '',
  });

  const handleMainImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          mainImage: file,
          mainImagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Обработчик изменения основных полей
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'category') {
      // Если выбрали существующую категорию, очищаем поле новой категории
      if (value !== 'new') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          newCategory: ''
        }));
      } else {
        // Если выбрали "Добавить новую", очищаем выбранную категорию
        setFormData(prev => ({
          ...prev,
          category: ''
        }));
      }
    } else if (name === 'newCategory') {
      // При вводе новой категории очищаем выбранную
      setFormData(prev => ({
        ...prev,
        category: '',
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Добавление нового ингредиента
  const addIngredient = () => {
    const newId = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.id)) + 1 : 1;
    setIngredients([
      ...ingredients,
      { id: newId, name: '', amount: '', unit: 'г' }
    ]);
  };

  // Изменение ингредиента
  const handleIngredientChange = (id, field, value) => {
    setIngredients(ingredients.map(ingredient => 
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    ));
  };

  // Удаление ингредиента
  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ingredient => ingredient.id !== id));
    } else {
      alert('Должен остаться хотя бы один ингредиент');
    }
  };

  // Добавление нового шага
  const addStep = () => {
    const newId = steps.length > 0 ? Math.max(...steps.map(s => s.id)) + 1 : 1;
    setSteps([
      ...steps,
      { id: newId, description: '', image: null, imagePreview: '' }
    ]);
  };

  // Изменение описания шага
  const handleStepChange = (id, value) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, description: value } : step
    ));
  };

  // Загрузка изображения для шага
  const handleStepImage = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        alert('Пожалуйста, выберите файл изображения');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSteps(steps.map(step => 
          step.id === id ? { ...step, image: file, imagePreview: reader.result } : step
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  // Удаление изображения шага
  const removeStepImage = (id) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, image: null, imagePreview: '' } : step
    ));
  };

  // Удаление шага
  const removeStep = (id) => {
    if (steps.length > 1) {
      setSteps(steps.filter(step => step.id !== id));
    } else {
      alert('Должен остаться хотя бы один шаг');
    }
  };

  // Валидация формы
  const validateForm = () => {
    // Проверка названия рецепта
    if (!formData.title.trim()) {
      alert('Введите название рецепта');
      return false;
    }

    // Проверка ингредиентов
    for (const ingredient of ingredients) {
      if (!ingredient.name.trim()) {
        alert('Заполните название ингредиента');
        return false;
      }
      if (!ingredient.amount || parseFloat(ingredient.amount) <= 0) {
        alert('Введите корректное количество ингредиента');
        return false;
      }
    }

    // Проверка шагов
    for (const step of steps) {
      if (!step.description.trim()) {
        alert('Заполните описание шага приготовления');
        return false;
      }
    }
    //проверка на основное изображение
    if (!formData.mainImage) {
      if (!window.confirm('Вы не добавили основное изображение. Продолжить без изображения?')) {
        return false;
      }
    }

    return true;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Подготовка данных для отправки
    const formDataToSend = new FormData();
    
    // Основные поля
    formDataToSend.append('title', formData.title);
    formDataToSend.append('cooking_time', formData.cooking_time || '0');
    
    // Определяем категорию для отправки
    const categoryToSend = formData.category || formData.newCategory;
    formDataToSend.append('category', categoryToSend);
    
    formDataToSend.append('difficulty', formData.difficulty);
    
    // Основное изображение
    if (formData.mainImage) {
      formDataToSend.append('main_image', formData.mainImage);
      console.log('Main image added to FormData:', formData.mainImage.name);
    }
    
    // Ингредиенты (отправляем как JSON строку)
    const ingredientsData = ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit
    }));
    formDataToSend.append('ingredients', JSON.stringify(ingredientsData));
    console.log('Ingredients JSON:', JSON.stringify(ingredientsData));

    // Инструкции (шаги)
    const instructionsData = steps.map(step => ({
      description: step.description,
      hasImage: !!step.image
    }));
    formDataToSend.append('instructions', JSON.stringify(instructionsData));
    console.log('Instructions JSON:', JSON.stringify(instructionsData));

    // Изображения шагов
    steps.forEach((step, index) => {
      if (step.image) {
        formDataToSend.append(`step_images_${index}`, step.image);
        console.log(`Step image ${index} added:`, step.image.name);
      }
    });

    // Отладка: проверка FormData
    console.log('FormData entries:');
    for (let pair of formDataToSend.entries()) {
      console.log(pair[0] + ': ', pair[1]);
    }

    try {
      // Используем правильный endpoint
      const response = await fetch('http://localhost:5000/api/recipes/with-steps', {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include'  // Для cookies с session_id
      });

      const data = await response.json();
      console.log('Server response:', data);
      
      if (response.ok) {
        alert('Рецепт успешно сохранен!');
        
        // Сбрасываем форму
        resetForm();
        
        // Вызываем callback если есть
        if (onAddRecipe) {
          onAddRecipe(data);
        }
      } else {
        alert(`Ошибка: ${data.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Ошибка при отправке формы');
    }
  };
  
  // Сброс формы
  const resetForm = () => {
    setFormData({
      title: '',
      cooking_time: '',
      category: '',
      newCategory: '',
      difficulty: 'Легкий',
      mainImage: null,
      mainImagePreview: ''
    });
    setIngredients([{ id: 1, name: '', amount: '', unit: 'г' }]);
    setSteps([{ id: 1, description: '', image: null, imagePreview: '' }]);
  };

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <h3>
        <i className="fas fa-plus-circle"></i>
        Добавление рецепта
      </h3>
      
      <div className="section-line"></div>
      {/* Секция основного изображения */}
      <div className="section-line"></div>

      <div className="main-image-section">
        <h4 className="section-title">
          <i className="fas fa-image"></i>
          Основное изображение блюда:
        </h4>
        
        <div className="main-image-upload-container">
          <div 
            className="main-image-upload"
            onClick={() => document.getElementById('main-image-input').click()}
          >
            <input
              id="main-image-input"
              type="file"
              accept="image/*"
              onChange={handleMainImage}
              className="image-input"
            />
            
            {formData.mainImagePreview ? (
              <>
                <img 
                  src={formData.mainImagePreview} 
                  alt="Preview" 
                  className="main-image-preview"
                />
                <button 
                  type="button" 
                  className="remove-main-image-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData(prev => ({
                      ...prev,
                      mainImage: null,
                      mainImagePreview: ''
                    }));
                  }}
                >
                  Удалить изображение
                </button>
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                <span>Загрузить основное изображение</span>
                <small>(рекомендуется 800×600px, JPG или PNG)</small>
              </>
            )}
          </div>
          
          <div className="main-image-info">
            <p>Основное изображение будет отображаться на карточке рецепта</p>
          </div>
        </div>
      </div>
      
      {/* Основные поля рецепта */}
      <div className="form-row">
        <input
          type="text"
          name="title"
          placeholder="Название рецепта *"
          value={formData.title}
          onChange={handleChange}
          className="form-input"
          required
        />
        
        <select 
          name="difficulty" 
          value={formData.difficulty} 
          onChange={handleChange}
          className="form-select"
        >
          <option value="Легкий">Легкий</option>
          <option value="Средний">Средний</option>
          <option value="Сложный">Сложный</option>
        </select>
      </div>

      <div className="form-row">
        <input
          type="number"
          name="cooking_time"
          placeholder="Время приготовления (мин)"
          value={formData.cooking_time}
          onChange={handleChange}
          className="form-input"
          min="0"
        />
        
        {/* Вместо текстового поля для категории делаем select с возможностью ввода новой */}
        <div className="category-select-wrapper">
          <select
            name="category"
            value={formData.category || (formData.newCategory ? 'new' : '')}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Выберите категорию или введите новую</option>
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
            <option value="new">+ Добавить новую категорию</option>
          </select>
          
          {/* Поле для ввода новой категории */}
          {(!formData.category && (formData.newCategory || formData.category === 'new')) && (
            <input
              type="number"
              name="servings"
              placeholder="Количество порций"
              value={formData.servings}
              onChange={handleChange}
              className="form-input"
              min="1"
              max="20"
            />
            
          )}
        </div>
      </div>

      {/* Блок ингредиентов */}
      <div className="ingredients-block">
        <h4 className="section-title">
          <i className="fas fa-carrot"></i>
          Ингредиенты:
        </h4>
        
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id} className="ingredient-item">
            <div className="ingredient-number">{index + 1}.</div>
            <input
              type="text"
              placeholder="Название ингредиента *"
              value={ingredient.name}
              onChange={(e) => handleIngredientChange(ingredient.id, 'name', e.target.value)}
              className="form-input"
              required
            />
            <input
              type="number"
              placeholder="Количество *"
              value={ingredient.amount}
              onChange={(e) => handleIngredientChange(ingredient.id, 'amount', e.target.value)}
              className="form-input"
              min="0"
              step="0.1"
              required
            />
            <select
              value={ingredient.unit}
              onChange={(e) => handleIngredientChange(ingredient.id, 'unit', e.target.value)}
              className="form-select"
            >
              <option value="г">г.</option>
              <option value="кг">кг</option>
              <option value="мл">мл</option>
              <option value="л">л</option>
              <option value="шт">шт.</option>
              <option value="ч.л.">ч. л.</option>
              <option value="ст.л.">ст. л.</option>
            </select>
            <button 
              type="button" 
              className="remove-ingredient"
              onClick={() => removeIngredient(ingredient.id)}
              title="Удалить ингредиент"
            >
              ×
            </button>
          </div>
        ))}
        
        <button 
          type="button" 
          className="add-btn"
          onClick={addIngredient}
          title="Добавить ингредиент"
        >
          +
        </button>
      </div>

      <div className="section-line"></div>

      {/* Блок шагов приготовления */}
      <div className="steps-block">
        <h4 className="section-title">
          <i className="fas fa-list-ol"></i>
          Шаги приготовления:
        </h4>
        
        {steps.map((step, index) => (
          <div key={step.id} className="step-item">
            <div className="step-number">{index + 1}.</div>
            <div className="step-content">
              <textarea
                placeholder="Опишите шаг приготовления... *"
                value={step.description}
                onChange={(e) => handleStepChange(step.id, e.target.value)}
                className="form-textarea step-textarea"
                required
              />
              
              <div className="image-upload" onClick={() => document.getElementById(`image-input-${step.id}`).click()}>
                <input
                  id={`image-input-${step.id}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleStepImage(step.id, e)}
                  className="image-input"
                />
                {step.imagePreview ? (
                  <>
                    <img 
                      src={step.imagePreview} 
                      alt="Preview" 
                      className="image-preview"
                      style={{ display: 'block' }}
                    />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStepImage(step.id);
                      }}
                    >
                      Удалить изображение
                    </button>
                  </>
                ) : (
                  <>
                    <i className="fas fa-camera"></i>
                    <span>Добавить изображение</span>
                  </>
                )}
              </div>
            </div>
            <button 
              type="button" 
              className="remove-btn"
              onClick={() => removeStep(step.id)}
              title="Удалить шаг"
            >
              ×
            </button>
          </div>
        ))}
        
        <button 
          type="button" 
          className="add-btn"
          onClick={addStep}
          title="Добавить шаг"
        >
          +
        </button>
      </div>

      <div className="form-buttons">
        <button type="submit" className="submit-btn">
          Сохранить рецепт
        </button>
        <button 
          type="button" 
          className="cancel-btn"
          onClick={resetForm}
        >
          Очистить форму
        </button>
      </div>
    </form>
  );
};

export default RecipeForm;