// Calculate distance between two coordinates using Haversine formula
// Returns distance in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

// Filter properties by distance from a given location
function filterByDistance(properties, centerLat, centerLon, maxDistanceKm) {
  return properties.filter(property => {
    if (!property.location || !property.location.latitude || !property.location.longitude) {
      return false; // Skip properties without location data
    }
    const distance = calculateDistance(
      centerLat,
      centerLon,
      property.location.latitude,
      property.location.longitude
    );
    return distance <= maxDistanceKm;
  });
}

module.exports = {
  calculateDistance,
  filterByDistance
};

