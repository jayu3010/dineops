import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const CITIES = {
  'Tier 1': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata'],
  'Tier 2': ['Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh'],
  'Tier 3': ['Indore', 'Bhopal', 'Kochi', 'Goa', 'Surat']
};

const LandingPage = () => {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Mumbai');

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[700px] flex items-center justify-center overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-primary/20"></div>
        
        {/* Decorative Circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>

        {/* Video Overlay Placeholder or Image */}
        <img 
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2070" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
          alt="Restaurant Background"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            Special Offer: 100 Days Free for New Restaurants
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-serif font-bold text-white mb-6 leading-tight"
          >
            The Future of <br /> <span className="text-primary italic">Dining</span> is Here.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/80 text-lg md:text-2xl mb-12 max-w-3xl mx-auto font-light"
          >
            Book premium tables, discover curated recipes, and experience 
            culinary excellence like never before.
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto bg-white p-2 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-2"
          >
            <div className="flex-1 flex items-center px-4 border-r border-gray-100">
              <MapPin className="text-primary w-5 h-5 mr-3" />
              <select 
                value={city} 
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-transparent outline-none text-gray-700 font-bold py-4 cursor-pointer"
              >
                {Object.entries(CITIES).map(([tier, cityList]) => (
                  <optgroup key={tier} label={tier}>
                    {cityList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            
            <div className="flex-[2] flex items-center px-4">
              <Search className="text-gray-400 w-5 h-5 mr-3" />
              <input 
                type="text" 
                placeholder="Cuisine, restaurant, or dish..."
                className="w-full outline-none py-4 text-gray-700 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Link 
              to={`/explore?search=${search}&city=${city}`}
              className="bg-primary hover:bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-orange-200"
            >
              <Search className="w-5 h-5" />
              Explore
            </Link>
          </motion.div>
        </div>
      </section>

      {/* List Your Restaurant Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-orange-50/50 -skew-x-12 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">For Partners</span>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-secondary mb-6 leading-tight">
                Grow Your Restaurant <br /> with DineOps
              </h2>
              <p className="text-muted text-lg mb-8 leading-relaxed">
                Join thousands of restaurant owners who are transforming their business 
                with our all-in-one POS, booking, and inventory management system. 
                Get started today and enjoy your first 100 days completely free.
              </p>
              
              <div className="space-y-4 mb-10">
                {[
                  'Advanced Cloud POS System',
                  'Real-time Table Management',
                  'Integrated Inventory & Stock',
                  'Customer Loyalty & Analytics'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <Users className="w-3 h-3" />
                    </div>
                    <span className="font-semibold text-secondary">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="btn-primary px-10 py-4 text-lg shadow-xl shadow-orange-500/20">
                  List Your Restaurant
                </Link>
                <Link to="/contact" className="px-10 py-4 text-lg font-bold text-secondary border-2 border-stone-100 rounded-xl hover:bg-stone-50 transition-colors">
                  Contact Sales
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-stone-900 rounded-[3rem] p-8 shadow-2xl transform rotate-2">
                <img 
                  src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=2070" 
                  alt="POS Dashboard"
                  className="rounded-2xl shadow-lg mb-6"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm">
                    <p className="text-stone-400 text-xs mb-1 uppercase tracking-wider">Today's Revenue</p>
                    <p className="text-white text-xl font-bold">₹42,850</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl backdrop-blur-sm">
                    <p className="text-stone-400 text-xs mb-1 uppercase tracking-wider">Active Tables</p>
                    <p className="text-white text-xl font-bold">18/24</p>
                  </div>
                </div>
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-primary text-white p-6 rounded-3xl shadow-2xl transform -rotate-3">
                <p className="text-3xl font-bold">100</p>
                <p className="text-xs uppercase font-black tracking-widest">Days Free</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cuisines */}
      <section className="py-24 bg-background-light px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl font-serif font-bold text-secondary mb-3">Popular Cuisines</h2>
              <p className="text-muted text-lg">Explore the flavors near you</p>
            </div>
            <button className="text-primary font-bold text-lg hover:underline">View All</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {['Indian', 'Chinese', 'Italian', 'Mexican', 'Japanese', 'Thai'].map((cuisine) => (
              <motion.button
                key={cuisine}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl border border-orange-50 text-center transition-all group"
              >
                <span className="block text-4xl mb-4 transform group-hover:scale-110 transition-transform">
                  {cuisine === 'Indian' ? '🍛' : cuisine === 'Chinese' ? '🥢' : cuisine === 'Italian' ? '🍕' : cuisine === 'Mexican' ? '🌮' : cuisine === 'Japanese' ? '🍣' : '🍜'}
                </span>
                <span className="font-bold text-secondary group-hover:text-primary text-lg">{cuisine}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-stone-900 text-white px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(249,115,22,0.1),transparent)]"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-serif font-bold mb-6">Simple. Seamless. <span className="text-primary italic">Perfect.</span></h2>
            <p className="text-stone-400 text-xl max-w-2xl mx-auto font-light">Book your next culinary adventure in seconds.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-16">
            {[
              { icon: Search, title: 'Discover', desc: 'Browse curated collections of top-rated restaurants in your city.' },
              { icon: Calendar, title: 'Reserve', desc: 'Real-time availability and instant confirmation for your perfect table.' },
              { icon: Users, title: 'Enjoy', desc: 'Skip the wait and enjoy a seamless dining experience with your loved ones.' }
            ].map((step, idx) => (
              <div key={idx} className="text-center relative">
                {idx < 2 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-[2px] bg-gradient-to-r from-primary to-transparent -translate-x-1/2 opacity-20"></div>
                )}
                <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-6 hover:rotate-0 transition-transform">
                  <step.icon className="w-10 h-10 text-primary -rotate-6" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-stone-400 leading-relaxed text-lg font-light">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
