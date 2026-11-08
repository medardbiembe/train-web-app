// ThemeLanguageProvider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeLanguageContext = createContext();

export const useThemeLanguage = () => {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error('useThemeLanguage must be used within ThemeLanguageProvider');
  }
  return context;
};

export const ThemeLanguageProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Récupérer le thème depuis le localStorage ou utiliser 'light' par défaut
    return localStorage.getItem('theme') || 'light';
  });

  const [language, setLanguage] = useState(() => {
    // Récupérer la langue depuis le localStorage ou utiliser 'fr' par défaut
    return localStorage.getItem('language') || 'fr';
  });

  // Textes multilingues
  const translations = {
    fr: {
      // Header
      myTickets: 'Mes billets',
      reservationHistory: 'Historique des réservations',
      settings: 'Paramètres',
      logout: 'Déconnexion',
      
      // Recherche
      departureStation: 'Gare de départ',
      arrivalStation: 'Gare d\'arrivée',
      travelDate: 'Date de voyage',
      passengers: 'Passagers',
      selectStation: 'Sélectionnez une gare',
      search: 'Rechercher',
      clear: 'Effacer',
      searching: 'Recherche en cours...',
      
      // Résultats
      availableTrips: 'trajet(s) disponible(s) chaque jour',
      passenger: 'passager',
      passengers: 'passagers',
      backToTop: '↑ Haut de page',
      noResults: 'Aucun trajet trouvé',
      searchTrip: 'Recherchez votre trajet',
      selectStations: 'Sélectionnez les gares de départ et d\'arrivée pour trouver des trajets',
      
      // Cartes trajet
      book: 'Réserver',
      loginRequired: 'Connectez-vous',
      insufficientSeats: 'Places insuffisantes',
      freeCancellation: 'Annulation gratuite',
      loginRequiredShort: 'Connexion requise',
      directTrip: 'Trajet direct',
      availableEveryDay: 'Disponible tous les jours',
      
      // Billets
      download: '📄 Télécharger',
      cancel: '❌ Annuler',
      viewAllHistory: 'Voir tout l\'historique →'
    },
    en: {
      // Header
      myTickets: 'My tickets',
      reservationHistory: 'Reservation history',
      settings: 'Settings',
      logout: 'Logout',
      
      // Recherche
      departureStation: 'Departure station',
      arrivalStation: 'Arrival station',
      travelDate: 'Travel date',
      passengers: 'Passengers',
      selectStation: 'Select a station',
      search: 'Search',
      clear: 'Clear',
      searching: 'Searching...',
      
      // Résultats
      availableTrips: 'trip(s) available every day',
      passenger: 'passenger',
      passengers: 'passengers',
      backToTop: '↑ Back to top',
      noResults: 'No trips found',
      searchTrip: 'Search for your trip',
      selectStations: 'Select departure and arrival stations to find trips',
      
      // Cartes trajet
      book: 'Book',
      loginRequired: 'Login required',
      insufficientSeats: 'Insufficient seats',
      freeCancellation: 'Free cancellation',
      loginRequiredShort: 'Login required',
      directTrip: 'Direct trip',
      availableEveryDay: 'Available every day',
      
      // Billets
      download: '📄 Download',
      cancel: '❌ Cancel',
      viewAllHistory: 'View all history →'
    }
  };

  // Appliquer le thème au document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.add('theme-transition');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sauvegarder la langue
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const value = {
    theme,
    language,
    toggleTheme,
    changeLanguage,
    t
  };

  return (
    <ThemeLanguageContext.Provider value={value}>
      {children}
    </ThemeLanguageContext.Provider>
  );
};