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
    // Check username exists
     db.collection('users').find({username}).toArray( (err, results) => {       
       if (results.length != 0) {
         db.close()
         res.send('user already exists with that name')
       } else {
         // create the user
         db.collection('users').insertOne({_id, username})
        .then(() => db.close())
         
        res.json({_id, username})
       }
     })
  })
})



// Get users
function getUsers(db, callback) {
  db.collection('users').find().toArray((err, results) => callback(results))
}

app.get('/api/exercise/users', (req, res) => {
  MongoClient.connect(dbUrl, function(err, db) {
    getUsers(db, results => {
      db.close()
      res.json(results)
    })
  })
})



// Add excersize
app.post('/api/exercise/add', (req, res) => {
  let _id = req.body.userId
  let description = req.body.description
  let duration = req.body.duration
  let date = req.body.date
  
  // if no date set then date is today
  if (date == '') date = new Date().toISOString().slice(0, 10)
  
  MongoClient.connect(dbUrl, function(err, db) {
    db.collection('users').update({_id}, { $push: { log: {description,duration,date} } })
    .then(() => db.close())
  })
  
  res.json({_id, description, duration, date})
})



// Get user log
app.get('/api/exercise/log', (req, res) => {
  let _id = req.query.userId
  let from = req.query.from
  let to = req.query.to
  let limit = req.query.limit
  
  MongoClient.connect(dbUrl, (err, db) => {
    
    db.collection('users').findOne({_id}, (err, user) => {
      let username = user.username
      let log = user.log
      let count = log.length
      
      db.close()
      
      // no parameters set
      if (!from && !to && !limit) {
        res.json({_id, username, count, log})
        return
      }
      
      // limit and no date
      if (limit && !from && !to) {
        let newLog = [] 
        let endLimit = Number(limit)
        for (let i = 0; i < endLimit; i++)
          newLog.push(log[i])
        
        let newCount = newLog.length
        res.json({_id, username, newCount, newLog})
        return
      }
      
      // limited date  
      let newLog = []
      
      if (from || to) {
        let fromDate = from ? Date.parse(from) : 0
        let toDate = to ? Date.parse(to) : Number.MAX_VALUE
        
        for (let entry of log)
          if (Date.parse(entry.date) > fromDate && Date.parse(entry.date) < toDate) {
            newLog.push(entry)
          }
      }
      
      // limited log after date
      if (limit) {
        let limitedLog = []
        let endLimit = Number(limit)
        for (let i = 0; i < endLimit; i++)
          limitedLog.push(newLog[i])        
        newLog = limitedLog
      }
      
      let newCount = newLog.length
      res.json({_id, username, newCount, newLog})
      return
      
    })
  
  })
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
