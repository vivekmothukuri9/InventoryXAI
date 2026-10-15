import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../services/supabase';
import { Network, Search, MapPin, Store, Navigation, Info, AlertTriangle, Phone, Clock, Mail } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet default icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to center map when user location changes
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const CityNetwork = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Location
  const [userLocation, setUserLocation] = useState(null);
  const [locationInput, setLocationInput] = useState('');
  const [locating, setLocating] = useState(false);

  // Filters & Sorting
  const [maxDistance, setMaxDistance] = useState(50);

  // Data
  const [currentUserDealerId, setCurrentUserDealerId] = useState(null);
  const [dealers, setDealers] = useState([]);
  const [selectedDealer, setSelectedDealer] = useState(null);

  // Fetch logged in dealer info and all dealers on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase.from('dealers').select('id, latitude, longitude').eq('user_id', session.user.id).single();
          if (data) {
            setCurrentUserDealerId(data.id);
            if (data.latitude && data.longitude) {
               setUserLocation({ lat: data.latitude, lng: data.longitude });
            }
          }
        }
        
        // Fetch all dealers for the map
        const { data: allDealers, error: dErr } = await supabase.from('dealers').select('*');
        if (dErr) throw dErr;
        setDealers(allDealers || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch dealers network.");
      } finally {
        setLoading(false);
      }
    };
    
    init();
    requestLocation();
  }, []);

  const requestLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationInput('Current Location');
          setLocating(false);
        },
        (err) => {
          console.warn('Geolocation blocked or failed', err);
          setLocating(false);
        }
      );
    } else {
      setLocating(false);
    }
  };

  const handleLocationSearch = async () => {
    if (!locationInput || locationInput === 'Current Location') return;
    setLocating(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setUserLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      } else {
        alert("Location not found. Please try a different city/area.");
      }
    } catch (e) {
      console.error(e);
      alert("Error fetching location.");
    } finally {
      setLocating(false);
    }
  };

  // Haversine formula
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Process results locally based on search, distance, etc.
  const processedDealers = dealers
    .filter(d => d.latitude && d.longitude) // must have valid coordinates
    .filter(d => {
       if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
             d.shop_name?.toLowerCase().includes(q) || 
             d.full_name?.toLowerCase().includes(q) || 
             d.city?.toLowerCase().includes(q) ||
             d.category?.toLowerCase().includes(q)
          );
       }
       return true;
    })
    .map(d => {
       let dist = Infinity;
       if (userLocation) {
         dist = getDistance(userLocation.lat, userLocation.lng, d.latitude, d.longitude);
       }
       return { ...d, distance: dist };
    })
    .filter(d => d.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);

  const getDirections = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629]; // Default India

  return (
    <Layout title="City Network">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
        
        {/* Left Side: Search & Results */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Search Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Network className="text-primary-600" /> Dealers & Shops Network
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder="Search by Shop Name, Owner, City, or Category..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder="Enter city or location..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
                <button 
                  type="button" 
                  onClick={handleLocationSearch}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {locating ? 'Locating...' : 'Set Location'}
                </button>
                <button 
                  type="button" 
                  onClick={requestLocation}
                  className="text-primary-600 hover:bg-primary-50 px-3 rounded-lg text-sm font-medium"
                  title="Use Current Location"
                >
                  <Navigation size={18} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
                <select 
                  className="text-sm border border-slate-200 rounded p-1 bg-white"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                >
                  <option value={5}>Within 5 km</option>
                  <option value={10}>Within 10 km</option>
                  <option value={20}>Within 20 km</option>
                  <option value={50}>Within 50 km</option>
                  <option value={100}>Within 100 km</option>
                  <option value={10000}>Any Distance</option>
                </select>
                <span className="text-sm text-slate-500 ml-auto font-medium">
                  Found {processedDealers.length} shops
                </span>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {loading ? (
              <div className="flex flex-col gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse h-32"></div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <AlertTriangle size={20} /> {error}
              </div>
            ) : processedDealers.length === 0 ? (
               <div className="text-center py-12 px-4">
                 <div className="bg-slate-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Store className="text-slate-400" size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-800 mb-1">No shops found in this area.</h3>
                 <p className="text-slate-500">Try expanding your search radius or changing the location.</p>
               </div>
            ) : (
              <div className="flex flex-col gap-4">
                {processedDealers.map(dealer => (
                  <div 
                    key={dealer.id} 
                    onClick={() => setSelectedDealer(dealer)}
                    className={`bg-white p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${selectedDealer?.id === dealer.id ? 'border-primary-500 shadow-sm' : 'border-slate-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                           {dealer.shop_name}
                           {dealer.id === currentUserDealerId && <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">You</span>}
                        </h3>
                        <p className="text-sm text-slate-600">{dealer.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-900">
                          {dealer.distance === Infinity ? 'Unknown dist' : `${dealer.distance.toFixed(1)} km`}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                      <MapPin size={12} /> {dealer.city}{dealer.state ? `, ${dealer.state}` : ''}
                    </p>

                    <div className="flex items-center gap-3 mt-3">
                      {dealer.rating > 0 && (
                        <span className="text-xs font-semibold text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                          ⭐ {dealer.rating}
                        </span>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); getDirections(dealer.latitude, dealer.longitude); }}
                        className="ml-auto text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-lg"
                      >
                        <Navigation size={14} /> Directions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map & Details */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          
          {/* Details Pane (Shows when a dealer is selected) */}
          {selectedDealer && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                     {selectedDealer.shop_name}
                     {selectedDealer.id === currentUserDealerId && <span className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full font-normal">Your Shop</span>}
                  </h2>
                  <p className="text-slate-500 flex items-start gap-1 mt-1 text-sm">
                    <MapPin size={16} className="mt-0.5 shrink-0" /> {selectedDealer.address}, {selectedDealer.city}, {selectedDealer.state} {selectedDealer.pincode}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedDealer(null)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1">Business Category</p>
                  <p className="font-bold text-slate-800 capitalize">{selectedDealer.category}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1">GST Number</p>
                  <p className="font-bold text-slate-800">{selectedDealer.gst_number || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-slate-700 flex items-center gap-3">
                  <Info size={18} className="text-slate-400"/> <strong>Owner:</strong> {selectedDealer.full_name}
                </p>
                <p className="text-sm text-slate-700 flex items-center gap-3">
                  <Phone size={18} className="text-slate-400"/> <strong>Phone:</strong> {selectedDealer.phone}
                </p>
                {selectedDealer.business_hours && (
                  <p className="text-sm text-slate-700 flex items-center gap-3">
                    <Clock size={18} className="text-slate-400"/> <strong>Hours:</strong> {selectedDealer.business_hours}
                  </p>
                )}
              </div>

              <button 
                onClick={() => getDirections(selectedDealer.latitude, selectedDealer.longitude)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Navigation size={18} /> Get Directions to Shop
              </button>
            </div>
          )}

          {/* Map View */}
          <div className="flex-1 rounded-xl shadow-sm border border-slate-200 overflow-hidden relative z-0">
            <MapContainer center={mapCenter} zoom={12} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]}>
                  <Popup><strong>You are here</strong></Popup>
                  <ChangeView center={[userLocation.lat, userLocation.lng]} zoom={12} />
                </Marker>
              )}

              {processedDealers.map(dealer => (
                <Marker 
                  key={dealer.id} 
                  position={[dealer.latitude, dealer.longitude]}
                  eventHandlers={{
                    click: () => setSelectedDealer(dealer),
                  }}
                >
                  <Popup>
                    <div className="text-center p-1">
                      <strong className="block mb-1 text-slate-900">{dealer.shop_name}</strong>
                      <span className="text-xs text-slate-600 block mb-1">{dealer.category}</span>
                      <p className="mt-1 text-sm font-bold flex items-center justify-center gap-1">
                         <Phone size={12}/> {dealer.phone}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Recenter map when selected dealer changes */}
              {selectedDealer && (
                <ChangeView center={[selectedDealer.latitude, selectedDealer.longitude]} zoom={14} />
              )}
            </MapContainer>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default CityNetwork;
