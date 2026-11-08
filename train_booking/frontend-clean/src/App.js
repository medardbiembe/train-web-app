// App.js CORRIGÉ
import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Login from './components/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Vérifier le token JWT dans localStorage
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          // Essayer de vérifier avec l'API
          try {
            const response = await fetch('http://localhost:8000/api/auth/me/', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              setIsAuthenticated(true);
            } else {
              // Token invalide ou expiré
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
            }
          } catch (error) {
            console.error('Erreur vérification token:', error);
            // En cas d'erreur, utiliser les données stockées
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Erreur vérification auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    // Stocker le token JWT s'il est présent
    if (userData.access_token) {
      localStorage.setItem('access_token', userData.access_token);
      localStorage.setItem('refresh_token', userData.refresh_token || '');
    } else if (userData.token) {
      // Stocker le token legacy
      localStorage.setItem('access_token', userData.token);
    }
    
    // Stocker les données utilisateur
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Mettre à jour l'état
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Appeler l'API de logout
        await fetch('http://localhost:8000/api/auth/logout/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Erreur logout:', error);
    } finally {
      // Nettoyer localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Mettre à jour l'état
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Fonction pour rafraîchir le token JWT si expiré
  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;
    
    try {
      const response = await fetch('http://localhost:8000/api/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        return data.access;
      }
    } catch (error) {
      console.error('Erreur refresh token:', error);
    }
    
    return null;
  };

  // Intercepteur pour rafraîchir automatiquement les tokens expirés
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      let [url, options = {}] = args;
      
      // Ajouter le token aux requêtes API Django
      if (typeof url === 'string' && url.includes('localhost:8000/api')) {
        const token = localStorage.getItem('access_token');
        if (token) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
          };
        }
      }
      
      let response = await originalFetch(url, options);
      
      // Si 401, essayer de rafraîchir le token
      if (response.status === 401 && isAuthenticated) {
        const newToken = await refreshToken();
        if (newToken) {
          // Réessayer la requête avec le nouveau token
          if (options.headers) {
            options.headers['Authorization'] = `Bearer ${newToken}`;
          }
          response = await originalFetch(url, options);
        } else {
          // Token non rafraîchi, déconnecter
          handleLogout();
        }
      }
      
      return response;
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#666' }}>Chargement de VoyageurX...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <Home user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;