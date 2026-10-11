const mongoose = require("mongoose");

let connectionPromise;

module.exports = async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (mongoose.connection.readyState === 2 && connectionPromise) return connectionPromise;

  connectionPromise = mongoose.connect(process.env.MONGO_URI)
    .then((connection) => {
      console.log("MongoDB connected");
      return connection;
    })
    .catch((err) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
};
