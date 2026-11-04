const mongoose = require('mongoose')

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI
  try {
    if(!mongoURI) throw new Error('MongooDB URI was not found in the database!')
    const conn = await mongoose.connect(mongoURI)
    console.log('MongoDB connected successfully', conn.connection.host)
  } catch (error) {
    console.error('There was error trying to connect to database!')
    process.exit(1)
  }
}

module.exports = connectDB