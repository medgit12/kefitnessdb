// models/Member.js
const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
    fullName: String,
    phone: String,
    nationalId: String,
    joinDate: String,
    gender: String,
    photo: String,
    subscription: {
        id: Number,
        name: String,
        price: Number,
        duration: Number
    },
    isArchived: Boolean,
    isInactive: Boolean,
    renewalHistory: Array
});

module.exports = mongoose.model('Member', MemberSchema);
