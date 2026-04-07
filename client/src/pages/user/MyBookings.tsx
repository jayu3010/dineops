import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, ChevronRight, Utensils } from 'lucide-react';
import api from '../../api/axios';
import { motion } from 'framer-motion';

const MyBookings = () => {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings/my');
      return res.data.data;
    }
  });

  if (isLoading) return <div className="p-20 text-center">Loading your bookings...</div>;

  return (
    <div className="min-h-screen bg-background-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-serif font-bold text-secondary mb-2">My Reservations</h1>
          <p className="text-muted">Manage and view your upcoming dining experiences.</p>
        </div>

        <div className="space-y-6">
          {bookings?.map((booking: any) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={booking.id} 
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-center"
            >
              <div className="w-24 h-24 bg-orange-50 rounded-2xl flex items-center justify-center text-primary shrink-0 font-serif text-2xl font-bold">
                 {new Date(booking.date).getDate()}
                 <span className="text-xs uppercase block text-muted font-sans mt-0.5">
                   {new Date(booking.date).toLocaleString('default', { month: 'short' })}
                 </span>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-secondary">{booking.restaurant?.name}</h3>
                  <span className={`badge-${booking.status.toLowerCase()} w-fit mx-auto md:mx-0`}>
                    {booking.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
                  <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary" /> {booking.restaurant?.city}</span>
                  <span className="flex items-center gap-1.5"><Clock size={14} className="text-primary" /> {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="flex items-center gap-1.5"><Utensils size={14} className="text-primary" /> Table {booking.table?.number}</span>
                  <span className="flex items-center gap-1.5 font-semibold text-secondary">{booking.guests} Guests</span>
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <button className="btn-secondary flex-1 md:flex-none px-6 py-2.5 text-sm">Cancel</button>
                <button className="btn-primary flex-1 md:flex-none px-6 py-2.5 text-sm flex items-center justify-center gap-2">
                  Details <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}

          {(!bookings || bookings.length === 0) && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
               <Calendar size={48} className="mx-auto mb-4 text-gray-200" />
               <p className="text-xl font-bold text-secondary mb-2">No bookings yet</p>
               <p className="text-muted mb-6">Start exploring restaurants to make your first reservation.</p>
               <a href="/explore" className="btn-primary px-8">Explore Restaurants</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBookings;
