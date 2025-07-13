const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  time: { type: String, required: true },
  people_count: { type: Number, required: true },
});

module.exports = mongoose.model("Reservations", reservationSchema);
