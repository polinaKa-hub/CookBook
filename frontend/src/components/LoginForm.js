import React, { useState } from 'react';
import './AuthForms.css';

const LoginForm = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(formData);
  };

  return (
    <div className="auth-form">
      <h3>Вход в аккаунт</h3>
      
      <form onSubmit={handleSubmit}>
        <p className="p-label" >Имя пользователя:</p>
        <input
          type="text"
          name="username"
          placeholder="Имя пользователя"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <p className="p-label" >Пароль:</p>
        <input
          type="password"
          name="password"
          placeholder="Пароль"
          value={formData.password}
          onChange={handleChange}
          required
        />
        
        <button type="submit" className="auth-btn">
          Войти
        </button>
      </form>
      
      <p className="auth-switch">
        Нет аккаунта? 
        <button type="button" onClick={onSwitchToRegister} className="link-btn">
          Зарегистрироваться
        </button>
      </p>
    </div>
  );
};

export default LoginForm;