import React from 'react';
import '../styles/Home.css';

export default function AdminDashboard({ user, onLogout }) {
  return (
    <div className="bg-background min-h-screen">
      <header className="bg-surface shadow-sm border-b border-border">
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-primary mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 1.16.21 2.76.21 3.92 0 5.16-1 9-5.45 9-11V7l-10-5z"/>
                <path d="M8 11h8v2H8v-2zm0 4h8v2H8v-2z"/>
              </svg>
              <span className="text-xl font-bold text-primary">RailwayTicket - Admin</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-secondary-600">Bienvenue, {user.name}</span>
              <button onClick={onLogout} className="btn-secondary">
                Déconnexion
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-surface rounded-lg shadow-sm border border-border p-8">
          <h1 className="text-3xl font-bold text-text-primary mb-6">Tableau de bord Administrateur</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-primary mb-2">Gestion des Trains</h3>
              <p className="text-secondary-600">Gérer les horaires et disponibilités</p>
            </div>
            
            <div className="bg-success-50 border border-success-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-success mb-2">Réservations</h3>
              <p className="text-secondary-600">Voir et gérer toutes les réservations</p>
            </div>
            
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-warning mb-2">Utilisateurs</h3>
              <p className="text-secondary-600">Gérer les comptes utilisateurs</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}