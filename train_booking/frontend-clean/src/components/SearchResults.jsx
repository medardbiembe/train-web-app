import TrajetCard from './TrajetCard';

const SearchResult = ({ trajets }) => {
  if (!trajets.length) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 mt-6">
        Aucun trajet trouvé.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {trajets.map((t) => (
        <TrajetCard key={t.id} trajet={t} />
      ))}
    </div>
  );
};

export default SearchResult;
