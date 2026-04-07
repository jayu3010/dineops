import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Users, Calendar, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Mumbai');

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600"></div>
        
        {/* Decorative Circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight"
          >
            Book Your Perfect <br /> <span className="text-accent">Table Instantly.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/90 text-lg md:text-xl mb-12 max-w-2xl mx-auto"
          >
            Discover the best dining experiences in your city. Real-time availability, 
            exclusive deals, and seamless booking.
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2"
          >
            <div className="flex-1 flex items-center px-4 border-r border-gray-100">
              <MapPin className="text-primary w-5 h-5 mr-3" />
              <select 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-transparent outline-none text-gray-700 font-medium py-3 cursor-pointer"
              >
                <option>Mumbai</option>
                <option>Delhi</option>
                <option>Bangalore</option>
                <option>Pune</option>
              </select>
            </div>
            
            <div className="flex-[2] flex items-center px-4">
              <Search className="text-gray-400 w-5 h-5 mr-3" />
              <input 
                type="text" 
                placeholder="Search cuisines, restaurants, or dishes..."
                className="w-full outline-none py-3 text-gray-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Link 
              to={`/explore?search=${search}&city=${city}`}
              className="bg-primary hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-orange-200"
            >
              <Search className="w-5 h-5" />
              Find a Table
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Cuisines */}
      <section className="py-20 bg-background-light px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-serif font-bold text-secondary mb-2">Popular Cuisines</h2>
              <p className="text-muted">Explore the flavors near you</p>
            </div>
            <button className="text-primary font-semibold hover:underline">View All</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {['Indian', 'Chinese', 'Italian', 'Mexican', 'Japanese', 'Thai'].map((cuisine) => (
              <motion.button
                key={cuisine}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md border border-orange-50 text-center transition-all group"
              >
                <span className="block text-3xl mb-3">
                  {cuisine === 'Indian' ? '🍛' : cuisine === 'Chinese' ? '🥢' : cuisine === 'Italian' ? '🍕' : cuisine === 'Mexican' ? '🌮' : cuisine === 'Japanese' ? '🍣' : '🍜'}
                </span>
                <span className="font-semibold text-secondary group-hover:text-primary">{cuisine}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-stone-900 text-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold mb-4">How It Works</h2>
            <p className="text-gray-400">Book your table in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Search, title: 'Find a Restaurant', desc: 'Browse through thousands of top-rated restaurants in your city.' },
              { icon: Calendar, title: 'Select Date & Time', desc: 'Pick your preferred slot and guest count with real-time availability.' },
              { icon: Users, title: 'Confirm Booking', desc: 'Instantly receive your confirmation and get ready for a great meal.' }
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <step.icon className="w-8 h-8 text-white -rotate-3" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
