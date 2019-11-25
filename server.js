const express = require('express')
const app = express()


// Database
const MongoClient = require('mongodb').MongoClient
const dbUrl = process.env.MLAB_URI
const shortid = require('shortid')


// Setup middleware
const bodyParser = require('body-parser')
const cors = require('cors')
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


// Setup public directory
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});








// Create New User
app.post('/api/exercise/new-user', (req, res) => {
  let username = req.body.username
  let _id = shortid.generate()
  
  MongoClient.connect(dbUrl, (err, db) => {      
      // check if username exist
      
      // add url to latest
      db.collection('users').insertOne({_id, username})
      .then(() => db.close())
  })
  
  res.json({_id, username})
})











// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})


// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})


// Start server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
