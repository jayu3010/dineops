import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  MapPin, 
  Clock, 
  Utensils, 
  Star, 
  Info, 
  ChevronRight,
  Users,
  Calendar as CalendarIcon
} from 'lucide-react';
import api from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';

const RestaurantDetail = () => {
  const { tenantId } = useParams();
  
  useSocket(tenantId || '');

  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    guests: 2,
    tableId: '',
    fullName: '',
    email: '',
    phone: ''
  });

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant', tenantId],
    queryFn: async () => {
      const res = await api.get(`/restaurants`); // Should be get by tenantId in real app
      return res.data.data.find((r: any) => r.tenantId === tenantId);
    }
  });

  const { data: tables } = useQuery({
    queryKey: ['tables', tenantId],
    queryFn: async () => {
      const res = await api.get(`/tables/${tenantId}`);
      return res.data.data;
    },
    enabled: !!restaurant
  });

  const handleBooking = async () => {
    try {
      const res = await api.post('/bookings', {
        ...bookingData,
        restaurantId: restaurant.id
      });
      if (res.data.success) {
        toast.success('Table booked successfully!');
        setStep(4); // Success step
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Booking failed');
    }
  };

  if (isLoading) return <div className="p-20 text-center">Loading restaurant...</div>;
  if (!restaurant) return <div className="p-20 text-center text-danger font-bold text-2xl font-serif">Restaurant not found</div>;

  return (
    <div className="min-h-screen bg-background-light">
      {/* Hero Header */}
      <div className="relative h-[400px] bg-stone-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{restaurant.cuisine}</span>
                <div className="flex items-center gap-1 text-accent">
                  <Star fill="currentColor" size={14} />
                  <Star fill="currentColor" size={14} />
                  <Star fill="currentColor" size={14} />
                  <Star fill="currentColor" size={14} />
                  <Star size={14} />
                  <span className="text-white ml-2 text-sm font-medium">(120+ Reviews)</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-6 text-white/80">
                <span className="flex items-center gap-2"><MapPin size={18} className="text-primary" /> {restaurant.address}, {restaurant.city}</span>
                <span className="flex items-center gap-2"><Clock size={18} className="text-primary" /> {restaurant.openTime} - {restaurant.closeTime}</span>
              </div>
            </div>
            <button 
              onClick={() => document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-primary px-10 py-4 text-lg shadow-xl shadow-orange-500/20"
            >
              Book a Table
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12" id="booking-section">
        {/* About & Info */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-3xl font-serif font-bold text-secondary mb-6 flex items-center gap-3">
              <Info className="text-primary" /> About the Restaurant
            </h2>
            <p className="text-muted leading-relaxed text-lg">
              {restaurant.description || "Welcome to Gourmet Heaven, where exceptional flavors meet an unforgettable atmosphere. Our team is dedicated to providing you with a seamless dining experience."}
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-serif font-bold text-secondary mb-8">Our Menu Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="w-20 h-20 bg-stone-100 rounded-xl overflow-hidden shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-secondary">Signature Dish #{i}</h4>
                    <p className="text-xs text-muted mt-1">Savor the authentic taste of our chef's special creation.</p>
                    <span className="text-primary font-bold mt-2 inline-block">₹499</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 3-Step Booking Wizard */}
        <div className="relative">
          <div className="sticky top-24 card-base p-0 overflow-hidden border-primary border-t-8">
            <div className="p-6 bg-orange-50/50 border-b border-orange-100">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xl font-bold text-secondary">Reserve Your Table</h3>
                 <span className="text-xs font-bold text-primary uppercase tracking-widest">Step {step}/3</span>
              </div>
              <div className="w-full bg-gray-200 h-1 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${(step/3)*100}%` }} className="bg-primary h-full transition-all" />
              </div>
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="text-sm font-bold text-gray-700 block mb-2">Date</label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type="date" className="input-field pl-10"
                          value={bookingData.date} onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">Time</label>
                        <select 
                          className="input-field"
                          value={bookingData.time} onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
                        >
                          <option>18:00</option><option>19:00</option><option>20:00</option><option>21:00</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">Guests</label>
                        <select 
                          className="input-field"
                          value={bookingData.guests} onChange={(e) => setBookingData({...bookingData, guests: parseInt(e.target.value)})}
                        >
                          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Guests</option>)}
                        </select>
                      </div>
                    </div>
                    <button onClick={() => setStep(2)} className="btn-primary w-full py-4 mt-4 flex items-center justify-center gap-2 group">
                      Next Step <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <label className="text-sm font-bold text-gray-700 block">Select a Table</label>
                    <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-2">
                       {tables?.filter((t: any) => t.capacity >= bookingData.guests).map((table: any) => (
                         <button
                           key={table.id}
                           onClick={() => setBookingData({...bookingData, tableId: table.id})}
                           className={`
                             p-4 rounded-xl border-2 flex flex-col items-center gap-1 transition-all
                             ${bookingData.tableId === table.id ? 'border-primary bg-orange-50 text-primary shadow-md' : 'border-gray-100 hover:border-orange-200'}
                             ${table.status !== 'AVAILABLE' ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                           `}
                           disabled={table.status !== 'AVAILABLE'}
                         >
                           <Utensils size={18} />
                           <span className="text-xs font-bold">{table.number}</span>
                         </button>
                       ))}
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3">Back</button>
                      <button onClick={() => setStep(3)} disabled={!bookingData.tableId} className="btn-primary flex-[2] py-3">Confirm Details</button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1">Full Name</label>
                      <input 
                        type="text" className="input-field" placeholder="John Doe"
                        value={bookingData.fullName} onChange={(e) => setBookingData({...bookingData, fullName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1">Email Address</label>
                      <input 
                        type="email" className="input-field" placeholder="john@example.com"
                        value={bookingData.email} onChange={(e) => setBookingData({...bookingData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-700 block mb-1">Phone Number</label>
                      <input 
                        type="tel" className="input-field" placeholder="+91 12345 67890"
                        value={bookingData.phone} onChange={(e) => setBookingData({...bookingData, phone: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">Back</button>
                      <button onClick={handleBooking} className="btn-primary flex-[2] py-3">Book Now</button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div 
                    key="step4"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-10 space-y-6"
                  >
                    <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                      <Star size={40} fill="currentColor" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-secondary">Table Secured!</h3>
                    <p className="text-muted">Your reservation at {restaurant.name} is confirmed for {bookingData.date} at {bookingData.time}.</p>
                    <button onClick={() => window.location.href = '/my-bookings'} className="btn-primary w-full py-4 shadow-lg shadow-orange-500/20">
                      View My Bookings
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 bg-stone-50 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-muted font-medium">
               🛡️ Secure Instant Confirmation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetail;
