import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Filter, Star, Clock, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { motion } from 'framer-motion';

const ExplorePage = () => {
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedCuisine, setSelectedCuisine] = useState('All');

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['restaurants-explore'],
    queryFn: async () => {
      const res = await api.get('/restaurants'); // In real app, pass filters to API
      return res.data.data;
    }
  });

  const filteredRestaurants = restaurants?.filter((r: any) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                          r.cuisine.toLowerCase().includes(search.toLowerCase());
    const matchesCity = selectedCity === 'All' || r.city === selectedCity;
    const matchesCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
    return matchesSearch && matchesCity && matchesCuisine && r.status === 'ACTIVE';
  });

  const cities = ['All', 'Mumbai', 'Delhi', 'Bangalore', 'Pune'];
  const cuisines = ['All', 'Indian', 'Chinese', 'Italian', 'Mexican', 'Japanese'];

  return (
    <div className="min-h-screen bg-background-light py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-secondary mb-4">Explore Restaurants</h1>
          <p className="text-muted">Discover the best dining spots and book your table instantly.</p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-6 mb-12">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by restaurant name or cuisine..."
              className="input-field pl-12 h-14"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
             <div className="flex items-center gap-3">
               <MapPin className="text-primary w-5 h-5" />
               <select 
                 className="input-field h-14 w-40"
                 value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
               >
                 {cities.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             
             <div className="flex items-center gap-3">
               <Filter className="text-primary w-5 h-5" />
               <select 
                 className="input-field h-14 w-40"
                 value={selectedCuisine} onChange={(e) => setSelectedCuisine(e.target.value)}
               >
                 {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
             <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-muted font-medium">Finding great places for you...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRestaurants?.map((r: any) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={r.id}
                className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-56 bg-stone-100 overflow-hidden">
                   <div className="absolute top-4 right-4 z-10">
                     <span className="bg-white/90 backdrop-blur-sm text-secondary px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1">
                        <Star className="text-accent w-3 h-3" fill="currentColor" /> 4.5
                     </span>
                   </div>
                   <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors"></div>
                   {/* Placeholder Image */}
                   <div className="w-full h-full flex items-center justify-center text-stone-300">
                     <Utensils size={48} />
                   </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{r.cuisine}</span>
                      <h3 className="text-xl font-bold text-secondary group-hover:text-primary transition-colors">{r.name}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted mb-6 flex items-center gap-1">
                    <MapPin size={14} /> {r.city} • {r.address.substring(0, 30)}...
                  </p>

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Avg. Price</span>
                      <span className="font-bold text-secondary">₹800 for two</span>
                    </div>
                    <Link 
                      to={`/restaurant/${r.tenantId}`}
                      className="bg-stone-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
                    >
                      Book Table
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filteredRestaurants?.length === 0 && (
          <div className="text-center py-20">
            <p className="text-2xl font-serif font-bold text-secondary mb-2">No restaurants found</p>
            <p className="text-muted">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
