const express = require('express')
const User = require("../models/users.model")
const { viewUsers } = require("../controllers/user.controller")
const router = express.Router()

// view all users
router.get("/", viewUsers)

module.exports = router