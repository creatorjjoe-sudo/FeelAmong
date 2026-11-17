const mongoose = require('mongoose')
const User = require('../models/User')

const ensureUserIndexes = async () => {
  const collection = User.collection
  let indexes = []
  try {
    indexes = await collection.indexes()
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error
  }

  const emailIndex = indexes.find((index) =>
    Object.keys(index.key).length === 1 && index.key.email === 1
  )
  const usernameIndex = indexes.find((index) =>
    Object.keys(index.key).length === 1 && index.key.username === 1
  )
  const hasExpectedEmailIndex = emailIndex?.unique === true
    && emailIndex.partialFilterExpression?.email?.$type === 'string'
  const hasExpectedUsernameIndex = usernameIndex?.unique === true && usernameIndex.sparse === true

  if (emailIndex && !hasExpectedEmailIndex) {
    await collection.dropIndex(emailIndex.name)
  }
  if (usernameIndex && !hasExpectedUsernameIndex) {
    await collection.dropIndex(usernameIndex.name)
  }

  await collection.createIndex(
    { email: 1 },
    { name: 'email_1', unique: true, partialFilterExpression: { email: { $type: 'string' } } }
  )
  await collection.createIndex(
    { username: 1 },
    { name: 'username_1', unique: true, sparse: true }
  )
}

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI
  try {
    if(!mongoURI) throw new Error('MongooDB URI was not found in the database!')
    const conn = await mongoose.connect(mongoURI)
    await ensureUserIndexes()
    console.log('MongoDB connected successfully', conn.connection.host)
  } catch (error) {
    console.error('There was error trying to connect to database!', error.message)
    process.exit(1)
  }
}

module.exports = connectDB