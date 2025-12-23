import React, { useState, useEffect } from 'react';
import './RecipeEditForm.css';

const RecipeEditForm = ({ recipe, onUpdate, onCancel }) => {
  // Функция парсинга ингредиентов
  const parseIngredients = (ingredients) => {
    if (!ingredients) return [{ id: 1, name: '', amount: '', unit: 'г' }];
    
    try {
      if (typeof ingredients === 'string') {
        const parsed = JSON.parse(ingredients);
        if (Array.isArray(parsed)) {
          return parsed.map((ing, index) => ({
            id: index + 1,
            name: ing.name || ing,
            amount: ing.amount || '',
            unit: ing.unit || 'г'
          }));
        }
      } else if (Array.isArray(ingredients)) {
        return ingredients.map((ing, index) => ({
          id: index + 1,
          name: ing.name || ing,
          amount: ing.amount || '',
          unit: ing.unit || 'г'
        }));
      }
    } catch (e) {
      if (typeof ingredients === 'string') {
        const lines = ingredients.split('\n').filter(line => line.trim());
        return lines.map((line, index) => ({
          id: index + 1,
          name: line,
          amount: '',
          unit: 'г'
        }));
      }
    }
    
    return [{ id: 1, name: '', amount: '', unit: 'г' }];
  };

  // Функция парсинга инструкций
  const parseInstructions = (instructions) => {
    if (!instructions) return [{ id: 1, description: '', image: null, imagePreview: '' }];
    
    try {
      if (typeof instructions === 'string') {
        const parsed = JSON.parse(instructions);
        if (Array.isArray(parsed)) {
          return parsed.map((step, index) => ({
            id: index + 1,
            description: step.description || step || '',
            image: null,
            imagePreview: step.image_url || ''
          }));
        }
      } else if (Array.isArray(instructions)) {
        return instructions.map((step, index) => ({
          id: index + 1,
          description: step.description || step || '',
          image: null,
          imagePreview: step.image_url || ''
        }));
      }
    } catch (e) {
      if (typeof instructions === 'string') {
        const lines = instructions.split('\n').filter(line => line.trim());
        return lines.map((line, index) => ({
          id: index + 1,
          description: line,
          image: null,
          imagePreview: ''
        }));
      }
    }
    
    return [{ id: 1, description: '', image: null, imagePreview: '' }];
  };

  // Состояние для динамических ингредиентов
  const [ingredients, setIngredients] = useState(() => parseIngredients(recipe.ingredients));

  // Состояние для динамических шагов
  const [steps, setSteps] = useState(() => parseInstructions(recipe.instructions));

  // Состояние для основных полей рецепта - теперь с основным изображением
  const [formData, setFormData] = useState({
    title: recipe.title || '',
    cooking_time: recipe.cooking_time || '',
    category: recipe.category || '',
    difficulty: recipe.difficulty || 'Легкий',
    servings: recipe.servings || 6, 
    mainImage: null,
    mainImagePreview: recipe.main_image_url || recipe.image_url || ''
  });

  // Инициализация существующего основного изображения
  useEffect(() => {
    if (recipe.main_image_url || recipe.image_url) {
      setFormData(prev => ({
        ...prev,
        mainImagePreview: recipe.main_image_url || recipe.image_url
      }));
    }
  }, [recipe]);
  // Или еще лучше - отдельные обработчики для числовых полей:
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : parseInt(value, 10);
    
    console.log(`🔢 Number change ${name}: ${value} → ${numValue}`);
    
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? '' : numValue
    }));
  };
  // Обработчик изменения основных полей
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик основного изображения
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

  // Удаление основного изображения
  const removeMainImage = (e) => {
    e.stopPropagation();
    
    // Проверяем, было ли у рецепта исходное изображение
    const hadOriginalImage = recipe.image_url || recipe.main_image_url;
    
    setFormData(prev => ({
      ...prev,
      mainImage: null,
      mainImagePreview: '',
      // Сохраняем информацию об исходном изображении
      hadOriginalImage: hadOriginalImage
    }));
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
          step.id === id ? { 
            ...step, 
            image: file, 
            imagePreview: reader.result,
          } : step
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  // Удаление изображения шага
  const removeStepImage = (id) => {
    setSteps(steps.map(step => 
      step.id === id ? { 
        ...step, 
        image: null, 
        imagePreview: '',
      } : step
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
    formDataToSend.append('category', formData.category);
    formDataToSend.append('difficulty', formData.difficulty);
    formDataToSend.append('servings', formData.servings || '6');
    
    // Основное изображение
    if (formData.mainImage) {
      formDataToSend.append('main_image', formData.mainImage);
      console.log('DEBUG: Adding main image to update');
    } else if (formData.mainImagePreview && !recipe.image_url) {
      // Если было изображение в рецепте, но мы его удалили в форме
      // Только если image_url был в исходном рецепте
      formDataToSend.append('remove_main_image', 'true');
      console.log('DEBUG: Removing main image from recipe');
    }

    // Ингредиенты (отправляем как JSON строку)
    const ingredientsData = ingredients.map(ing => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit
    }));
    formDataToSend.append('ingredients', JSON.stringify(ingredientsData));

    // Инструкции (шаги)
    const instructionsData = steps.map(step => ({
      description: step.description,
      hasImage: !!step.image
    }));
    formDataToSend.append('instructions', JSON.stringify(instructionsData));

    // Изображения шагов
    steps.forEach((step, index) => {
      if (step.image) {
        formDataToSend.append(`step_images_${index}`, step.image);
      }
    });
    console.log("📝 BEFORE SUBMIT - Form data:");
    console.log("Servings from state:", formData.servings);
    console.log("Type of servings:", typeof formData.servings);
    console.log("Full formData:", formData);
    // Отправляем на обновление
    if (onUpdate) {
      onUpdate(recipe.id, formDataToSend);
    }
  };

  return (
    <div className="modal-overlay-edit" onClick={onCancel}>
      <div 
        className="modal-content recipe-edit-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <i className="fas fa-edit"></i>
            Редактирование рецепта
          </h3>
          <button 
            type="button" 
            className="close-btn"
            onClick={onCancel}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <form className="recipe-form" onSubmit={handleSubmit}>
            <div className="section-line"></div>

            {/* Основное изображение */}
            <div className="main-image-section">
              <h4 className="section-title">
                <i className="fas fa-image"></i>
                Основное изображение блюда:
              </h4>
              
              <div className="main-image-upload-container">
                <div 
                  className="main-image-upload"
                  onClick={() => document.getElementById('main-image-input-edit').click()}
                >
                  <input
                    id="main-image-input-edit"
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
                        onClick={removeMainImage}
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
              
              <input
                type="text"
                name="category"
                placeholder="Категория (например: Супы, Десерты)"
                value={formData.category}
                onChange={handleChange}
                className="form-input"
              />
                <input
                  type="number"
                  name="servings"
                  placeholder="Количество порций"
                  value={formData.servings}
                  onChange={handleNumberChange} 
                  className="form-input"
                  min="1"
                  max="20"
                />
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
                    
                    <div className="image-upload" onClick={() => document.getElementById(`image-input-edit-${step.id}`).click()}>
                      <input
                        id={`image-input-edit-${step.id}`}
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
                Сохранить изменения
              </button>
              <button 
                type="button" 
                className="cancel-btn"
                onClick={onCancel}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecipeEditForm;