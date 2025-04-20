const mongoose = require('mongoose')

const UserSchema = mongoose.Schema(
    {
        userId: {
            type: String,
            required: [true, "userId required"]
        },

        fullName: {
            type: String,
            required: false
        },

        email: {
            type: String,
            required: [true, "Email address required"]
        },

        profileImg: {
            type: String,
            required: false
        },

        phoneNumbers :{
            type: [String],
            required: false
        }
    },
    {
        timestamps: true,
    }
)

const User = mongoose.model("User", UserSchema)

module.exports = User