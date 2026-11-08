import React from 'react';

export default function FilterPanel({ filters, onFilter }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Gare de départ
        </label>
        <input
          type="text"
          name="gareDepart"
          value={filters.gareDepart}
          onChange={onFilter}
          className="form-input"
          placeholder="Gare de départ"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Gare d'arrivée
        </label>
        <input
          type="text"
          name="gareArrivee"
          value={filters.gareArrivee}
          onChange={onFilter}
          className="form-input"
          placeholder="Gare d'arrivée"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Date
        </label>
        <input
          type="date"
          name="date"
          value={filters.date}
          onChange={onFilter}
          className="form-input"
        />
      </div>
    </div>
  );
}