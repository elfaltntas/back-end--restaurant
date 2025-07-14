const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const Reservation = require("./models/reservation");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB bağlantısı başarılı"))
  .catch((err) => console.log("Bağlantı hatası:", err));

// 🔽 TAM BURASI GEREKİYOR 🔽
app.post("/api/reservations", async (req, res) => {
  try {
    const { date, time, people_count } = req.body;

    if (!date || !time || !people_count) {
      return res.status(400).json({ message: "Eksik alan var." });
    }

    // Date objesini al ve sadece tarih kısmını al (saat/dakika olmadan)
    const reservationDate = new Date(date);
    reservationDate.setHours(0, 0, 0, 0);

    // Aynı gün için tarih aralığını belirle
    const nextDate = new Date(reservationDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Aynı günkü rezervasyonların toplam kişi sayısını hesapla
    const todaysReservations = await Reservation.aggregate([
      {
        $match: {
          date: {
            $gte: reservationDate,
            $lt: nextDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPeople: { $sum: "$people_count" },
        },
      },
    ]);

    const totalPeopleToday = todaysReservations.length > 0 ? todaysReservations[0].totalPeople : 0;

    if (totalPeopleToday + people_count > 50) {
      return res.status(400).json({
        message: `Bugün için maksimum kapasite (50 kişi) dolmuştur. Mevcut rezervasyon sayısı: ${totalPeopleToday}`,
      });
    }

    // Kapasite uygunsa rezervasyonu oluştur
    const newReservation = new Reservation({
      date: reservationDate,
      time,
      people_count,
    });

    await newReservation.save();

    res.status(201).json({ message: "Rezervasyon başarıyla oluşturuldu." });
  } catch (error) {
    console.error("Rezervasyon ekleme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});
// server.js içine ekle
app.get("/api/fully-booked-dates", async (req, res) => {
  try {
    // Tüm rezervasyonlar gruplanır tarih bazında toplam kişi sayısı hesaplanır
    const results = await Reservation.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          totalPeople: { $sum: "$people_count" }
        }
      },
      {
        $match: {
          totalPeople: { $gte: 50 }  // 50 veya üzeri dolu olan günler
        }
      }
    ]);
    app.get('/', (req, res) => {
  res.send('API is working 🚀');
});

    // Yalnızca tarih dizisini çıkaralım
    const fullyBookedDates = results.map(r => r._id);

    res.status(200).json(fullyBookedDates);
  } catch (error) {
    console.error("Fully booked dates error:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
