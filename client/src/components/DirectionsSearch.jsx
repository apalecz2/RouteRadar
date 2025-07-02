import { useRef, useEffect, useState } from 'react';

const DirectionsSearch = ({ onSearch, mapsApiLoaded }) => {
  const originRef = useRef(null);
  const destRef = useRef(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    if (!mapsApiLoaded) return;
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    const autocompleteOrigin = new window.google.maps.places.Autocomplete(originRef.current, {
      types: ['geocode'],
      componentRestrictions: { country: 'ca' },
    });
    const autocompleteDest = new window.google.maps.places.Autocomplete(destRef.current, {
      types: ['geocode'],
      componentRestrictions: { country: 'ca' },
    });
    autocompleteOrigin.addListener('place_changed', () => {
      const place = autocompleteOrigin.getPlace();
      setOrigin(place);
    });
    autocompleteDest.addListener('place_changed', () => {
      const place = autocompleteDest.getPlace();
      setDestination(place);
    });
  }, [mapsApiLoaded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (origin && destination) {
      onSearch({ origin, destination });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-2 bg-white rounded shadow max-w-md mx-auto">
      <input
        ref={originRef}
        type="text"
        placeholder="Enter origin"
        className="p-2 border rounded"
        required
        disabled={!mapsApiLoaded}
      />
      <input
        ref={destRef}
        type="text"
        placeholder="Enter destination"
        className="p-2 border rounded"
        required
        disabled={!mapsApiLoaded}
      />
      <button
        type="submit"
        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
        disabled={!origin || !destination || !mapsApiLoaded}
      >
        Get Transit Directions
      </button>
    </form>
  );
};

export default DirectionsSearch; 