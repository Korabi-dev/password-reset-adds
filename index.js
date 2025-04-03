// Dependencies
require("dotenv").config()
const express = require("express")
const app = express()
const nodemailer = require("nodemailer")
const mongoose = require("mongoose")
const crypto = require("crypto")

// Variables
const codes = {} // Codes stored in memory (default)
const models = require("./models") // Database models
const useDB = process.env.saveType?.toLowerCase() == "mongodb"


// Initialize database if the save type is database for codes
if(useDB) {
mongoose.connect(process.env.mongodb).then(connection => {
    console.log(`Connected to database`)
})
}

// Transporter, used to send emails using SMTP, we don't need IMAP or POP here as we are only sending emails
const transporter = nodemailer.createTransport({
    host: process.env.emailHost,
    port: Number(process.env.emailPort),
    auth: {
        user: process.env.emailUser,
        pass: process.env.emailPass
    }
})



// Functions

function generateSecureCode(length = 4) {
    // Here we use the crypto library to generate SAFE ENOUGH codes, meaning they wont be predictable enough for someone to just guess, or well predict
    return crypto.randomInt(10 ** (length - 1), 10 ** length).toString(); // We turn it into a string because thats what our database expects, and this gives us the ability to use more secure string based codes 
}


async function addCode(email, username, code){
    const options = {
        username,
        email,
        code,
        time: Date.now()
    }
    const success = {error: false};
    const duplicateError = {error: true, message: "Found duplicate entry, please wait for your current code to expire before submitting another request"};
    const unknownError = {error: true, message: "An unknown error occurred"} 
    try {
   if(useDB){
       // Query the database to see if there is a duplicate document, we do this so in case of a duplicate entry, we can handle the error easier 
       const find = await models.codes.find({"$or": {username,email,code}})
       if(find) return duplicateError
       const newModel = new models.codes(options) // Create the mongodb data
       await newModel.save() // Save it using async so we don't return a success output before it's saved
       return success; // return error false which in this case well uh means success (i think? my code is a mystery)
   } else {
    if(codes[email]) return duplicateError;
    codes[email] = options;
    return success;
   }
}catch(e) {return unknownError}
}


async function validateCode(email, code) {
    const find = useDB ? await models.codes.findOne({code}) : codes[email]
    if(!find) return {error: true, message: "This code is invalid"}
    if(email != find.email) return {error: true, message: "This code is invalid"};
    if(Date.now() - find.email >= 1000 * Number(process.env.expiryTime)) return {error: true, message: "This code has expired, please request a new one"}
    if(useDB) {
        await models.codes.findOneAndDelete({code})
    } else {
        delete codes[email]
    }
    return {error: false}
}


// Body parser
app.use(express.json())



// Endpoints
app.post("/newcode", async(req,res) => {
const {code, email, username} = req.body
if(!code || !email || !username) return;
})