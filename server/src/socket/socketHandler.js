module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a restaurant-specific room for real-time updates
    socket.on('join_restaurant', (restaurantId) => {
      socket.join(`restaurant-${restaurantId}`);
      console.log(`User ${socket.id} joined restaurant-${restaurantId}`);
    });

    // Handle table booking updates
    socket.on('table_update', (data) => {
      const { restaurantId, tableId, status } = data;
      io.to(`restaurant-${restaurantId}`).emit('table_status_changed', { tableId, status });
    });

    // Handle new bookings (admin notification)
    socket.on('new_booking', (data) => {
      const { restaurantId, booking } = data;
      io.to(`restaurant-${restaurantId}`).emit('booking_received', booking);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
