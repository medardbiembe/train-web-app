// components/Login.jsx - VERSION CORRIGÉE AVEC CSRF TOKEN
import React, { useState, useEffect } from 'react';
import RegisterModal from './RegisterModal';
import '../styles/Login.css';

export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  
  // ÉTATS POUR LA MODALE D'INSCRIPTION
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Fonction pour récupérer le token CSRF
  const getCSRFToken = () => {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Récupérer le token CSRF au chargement
  useEffect(() => {
    const token = getCSRFToken();
    setCsrfToken(token);
    console.log('🔑 Token CSRF initial:', token ? 'Présent' : 'Absent');
    
    // Si pas de token, faire une requête GET pour l'obtenir
    if (!token) {
      fetch('http://localhost:8000/api/gares/', {
        method: 'GET',
        credentials: 'include'
      }).then(() => {
        const newToken = getCSRFToken();
        setCsrfToken(newToken);
        console.log('🔄 Token CSRF récupéré:', newToken ? 'Présent' : 'Toujours absent');
      });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Récupérer le token CSRF à jour
      const token = getCSRFToken();
      console.log('📤 Envoi requête login avec token CSRF:', token ? 'Présent' : 'ABSENT');
      
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': token || '',  // ← AJOUT DU TOKEN CSRF
        },
        credentials: 'include',  // ← IMPORTANT pour les cookies
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      console.log('📥 Status de la réponse:', response.status);
      
      const responseText = await response.text();
      console.log('📥 Réponse brute:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📥 Données JSON parsées:', data);
      } catch (parseError) {
        console.error('❌ Erreur de parsing JSON:', parseError);
        setError('Format de réponse invalide du serveur');
        return;
      }

      if (response.ok) {
        // Format avec success (votre backend)
        if (data.success) {
          console.log('✅ Connexion réussie (format success)');
          
          // STOCKER LES TOKENS JWT DANS LOCALSTORAGE
          if (data.access) {
            localStorage.setItem('accessToken', data.access);
            console.log('🔑 Token access stocké');
          }
          if (data.refresh) {
            localStorage.setItem('refreshToken', data.refresh);
            console.log('🔄 Token refresh stocké');
          }
          
          const userData = {
            id: data.user?.id || 1,
            name: data.user?.name || data.user?.username || formData.username,
            username: data.user?.username || formData.username,
            email: data.user?.email || `${formData.username}@example.com`,
            first_name: data.user?.first_name || '',
            last_name: data.user?.last_name || ''
          };
          
          // Stocker aussi les infos user
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('👤 Utilisateur stocké dans localStorage');
          
          console.log('✅ Données utilisateur envoyées à onLogin:', userData);
          onLogin(userData);
          return;
        }
        
        // Format JWT direct
        else if (data.access) {
          console.log('✅ Connexion réussie (format JWT)');
          
          localStorage.setItem('accessToken', data.access);
          console.log('🔑 Token access stocké');
          
          if (data.refresh) {
            localStorage.setItem('refreshToken', data.refresh);
            console.log('🔄 Token refresh stocké');
          }
          
          const userData = {
            id: data.user?.id || 1,
            name: data.user?.name || data.user?.username || formData.username,
            username: data.user?.username || formData.username,
            email: data.user?.email || `${formData.username}@example.com`,
            first_name: data.user?.first_name || '',
            last_name: data.user?.last_name || ''
          };
          
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('👤 Utilisateur stocké dans localStorage');
          
          console.log('✅ Données utilisateur envoyées à onLogin:', userData);
          onLogin(userData);
          return;
        }
        
        // Format user direct
        else if (data.user) {
          console.log('✅ Connexion réussie (format user direct)');
          
          const userData = {
            id: data.user.id || 1,
            name: data.user.name || data.user.username || formData.username,
            username: data.user.username || formData.username,
            email: data.user.email || `${formData.username}@example.com`,
            first_name: data.user.first_name || '',
            last_name: data.user.last_name || ''
          };
          
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('👤 Utilisateur stocké dans localStorage');
          
          console.log('✅ Données utilisateur envoyées à onLogin:', userData);
          onLogin(userData);
          return;
        }
        
        else {
          console.log('⚠️ Connexion réussie mais format inconnu');
          
          const userData = {
            id: 1,
            name: formData.username,
            username: formData.username,
            email: `${formData.username}@example.com`,
            first_name: '',
            last_name: ''
          };
          
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('👤 Utilisateur stocké dans localStorage');
          
          console.log('✅ Données utilisateur envoyées à onLogin:', userData);
          onLogin(userData);
          return;
        }
      } else {
        let errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect';
        
        if (data.message) {
          errorMessage = data.message;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors.join(', ');
        }
        
        console.log('❌ Erreur de connexion:', errorMessage);
        
        if (errorMessage.toLowerCase().includes('incorrect') || 
            errorMessage.toLowerCase().includes('invalid')) {
          errorMessage += '. Essayez avec: admin / admin123';
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      console.error('❌ Erreur réseau ou serveur:', err);
      setError('Erreur de connexion au serveur. Vérifiez que le serveur Django tourne sur http://localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ouvrir la modale d'inscription
  const openRegisterModal = () => {
    setShowRegisterModal(true);
  };

  // Fonction pour fermer la modale d'inscription
  const closeRegisterModal = () => {
    setShowRegisterModal(false);
  };

  // Fonction pour basculer vers la connexion après inscription
  const switchToLogin = () => {
    setShowRegisterModal(false);
  };

  return (
    <>
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo">
              <i className="fas fa-train"></i>
              <div>
                <div className="login-logo-text">Voyageur<span className="login-logo-x">X</span></div>
                <div className="login-logo-subtext">Voyagez avec confiance</div>
              </div>
            </div>
          </div>

          <div className="login-card">
            <h2 className="login-title">Connexion à votre compte</h2>
            <p className="login-subtitle">Accédez à vos réservations et services</p>

            {error && (
              <div className="login-error">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  <i className="fas fa-user"></i> Nom d'utilisateur
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="admin"
                  required
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  <i className="fas fa-lock"></i> Mot de passe
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" disabled={loading} />
                  <span>Se souvenir de moi</span>
                </label>
                <a href="#mot-de-passe-oublie" className="forgot-password">
                  Mot de passe oublié ?
                </a>
              </div>

              <button 
                type="submit" 
                className="login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Connexion...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i> Se connecter
                  </>
                )}
              </button>

              {/* SECTION INSCRIPTION */}
              <div className="register-section">
                <div className="register-divider">
                  <span>ou</span>
                </div>
                
                <button 
                  type="button"
                  className="register-btn"
                  onClick={openRegisterModal}
                  disabled={loading}
                >
                  <i className="fas fa-user-plus"></i> Créer un nouveau compte
                </button>
                
                <p className="register-notice">
                  En créant un compte, vous pourrez :
                </p>
                <ul className="register-benefits">
                  <li><i className="fas fa-check-circle"></i> Réserver vos billets en ligne</li>
                  <li><i className="fas fa-check-circle"></i> Gérer vos réservations</li>
                  <li><i className="fas fa-check-circle"></i> Recevoir des offres exclusives</li>
                  <li><i className="fas fa-check-circle"></i> Accéder à votre historique</li>
                </ul>
              </div>

              <div className="login-footer">
                <p>En vous connectant, vous acceptez nos <a href="#conditions-generales">Conditions Générales</a></p>
              </div>
            </form>
          </div>

          <div className="login-footer-links">
            <a href="#aide">Aide</a>
            <a href="#confidentialite">Confidentialité</a>
            <a href="#conditions">Conditions</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </div>

      {/* MODALE D'INSCRIPTION */}
      {showRegisterModal && (
        <RegisterModal
          onClose={closeRegisterModal}
          onLoginSwitch={switchToLogin}
        />
      )}
    </>
  );
}