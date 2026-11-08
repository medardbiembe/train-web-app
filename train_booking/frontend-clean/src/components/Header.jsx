import React from 'react';

const Header = ({ toggleDarkMode }) => {
  return (
    <header className="bg-indigo-600 text-white p-4 shadow-md flex justify-between items-center">
      <h1 className="text-2xl font-bold tracking-wide">TFC Réservation</h1>
      <button
        onClick={toggleDarkMode}
        className="text-sm bg-white text-indigo-600 px-3 py-1 rounded hover:bg-gray-100 transition"
      >
        🌙 / ☀️
      </button>
    </header>
  );
};

export default Header;
