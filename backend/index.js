const express = require('express')
require('dotenv').config()
const mongoose = require('mongoose')
const Course = require("./models/course.model")
const courseRoute = require("./routes/course.route")
const app = express()

// Middleware config
app.use(express.json()) // Allows us to send information in json
app.use(express.urlencoded({extended: false})) // Allows to send form data

// routes
app.use("/api/courses", courseRoute)

app.get("/", (req, res) => {
    res.send("Hello from port 8000")
})

mongoose.connect(process.env.MONGO_DB).then(() => {
    console.log("Connected to database!")
    app.listen(8000, () => {
        console.log('Server is running on port 8000 successfully')
    });
}).catch(() => {
    console.log("Connection failed")
})