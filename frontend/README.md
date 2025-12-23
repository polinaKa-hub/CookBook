Запустить сервер:
cd Backend
.\venv\Scripts\activate  # активировать venv (Windows)
python app.py

http://localhost:5000/api/recipes

В новом терминале запустить фронтенд:
cd Frontend
npm start

python app.py
npm start



структура проекта:
CookBook/
├── Backend/
    ├── venv/
    ├── config.py
    ├── init_database.py
    ├── app.py
    ├── requirements.txt
    ├── models/
    │   └── db.py
    │   └── user.py
    │   └── recipe.py
    ├── controllers/
    │   ├── auth_controller.py
    │   └── recipe_controller.py
    └── services/
        ├── auth_service.py
        └── recipe_service.py
        └── rating_service.py
        └── favorit_service.py
        └── comment_service.py
├───Frontend/         
    ├── node_modules/  
    ├── public/
    ├── src/
    │   ├── components/
    │   │   └── LoginForm.js  
    │   │   └── RecipeForm.js
    │   │   └── RecipeCard.js    
    │   │   └── RecipeDetail.js    
    │   │   └── RegisterForm.js   
    │   │   └── SearchFilters.js   
    │   │   └── (и советующие им .css )
    │   └── App.css  
    │   └── App.js     
    │   └── App.test.js    
    │   └── index.js    
    │   └── index.css  
    │   └── reportWebVitals.js    
    │   └── setupTests.js    
    ├── package.json   
    └── package-lock.json
