import React from 'react';

export default function TrajetCard({ trajet }) {
  return (
    <div className="bg-surface rounded-lg shadow-sm border border-border p-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            {trajet.gareDepart} → {trajet.gareArrivee}
          </h3>
          <p className="text-secondary-600">
            Départ: {trajet.heureDepart} - Arrivée: {trajet.heureArrivee}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary">{trajet.prix}€</p>
          <button className="btn-primary mt-2">
            Réserver
          </button>
        </div>
      </div>
    </div>
  );
}