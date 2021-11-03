const mongoose = require("mongoose");

const signupSchema = new mongoose.Schema({
    mail: {
        type: String,
        required: true
    },
    login: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    vkId: {
        type: String,
        required: true
    },
    fbId: {
        type: String,
        required: true
    },
    signed: {
        type: Boolean,
        required: true
    }
});

const signupModel = mongoose.model('signup', signupSchema);

module.exports = signupModel;

