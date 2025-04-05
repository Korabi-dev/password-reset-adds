const {model, Schema} = require("mongoose")

const codeSchema = new Schema({
    code: {type: String, required: true, unique: true}, // The code might begin with 0, so we need to store as a string to preserve it. It's also required, and should be unique
    email: {type: String, required: true, unique: true}, // Self explanatory, store the users email in a required unique string, so we cant have a null email, or 2 codes for the same email
    username: {type: String, required: true, unique: true}, // Same as above, we cant have 2 codes for 1 user 
    time: {type: Number, required: true} // This will store the UNIX timestamp of the code generation in miliseconds
})

/* 
This one's very simple looking but is cool.
I'm exporting "codes" so i can require the models in another file, put them in a variable like "models", and access all the different models from it like an object
Also, its name is "code" and not "codes" as mongo will automatically rename them in compass (meaning code will become codes), fun fact! 
*/
exports.codes = model("code", codeSchema) 

const userSchema = new Schema({
    username: {type: String, required: true, unique: true}, // The username of the user, required and unique
    email: {type: String, required: true, unique: true}, // The email of the user, required and unique
})

exports.users = model("user", userSchema)