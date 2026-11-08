import React from 'react';
import '../styles/GareSelector.css';

export default function GareSelector({ label, options, value, onChange }) {
  return (
    <div className="gare-selector">
      <label className="gare-label">{label}</label>
      <select className="gare-select" value={value} onChange={onChange}>
        {options.map((gare) => (
          <option key={gare.code} value={gare.code}>
            {gare.nom}
          </option>
        ))}
      </select>
    </div>
  );
}
