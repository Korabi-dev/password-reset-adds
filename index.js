// Dependencies
const config = require("./config.js") // Config file 
const express = require("express"); // Express is a web framework for Node.js, we use it to create the server and handle requests
const app = express(); // Express is a web framework for Node.js, we use it to create the server and handle requests
const nodemailer = require("nodemailer"); // Nodemailer is a module to send emails using SMTP, we don't need IMAP or POP here as we are only sending emails
const mongoose = require("mongoose"); // MongoDB library to connect to the database
const crypto = require("crypto"); // Crypto library to generate secure codes
const child = require("child_process"); // Child process to run the password reset script
const helmet = require("helmet"); // Helmet is a middleware that helps secure Express apps by setting various HTTP headers
const path = require("path"); // Path module to handle file paths
// Validate config variables
const requiredConfigVars = [
  "mongodb",
  "emailHost",
  "emailPort",
  "emailUser",
  "emailPass",
  "emailFrom",
  "emailSubject",
  "emailHTML",
  "expiryTime",
  "token",
];

requiredConfigVars.forEach((varName) => {
  if (!config[varName]) {
    console.error(`Missing required config variable: ${varName}`);
    process.exit(1);
  }
});

// Variables
const models = require("./models"); // Database models
const PORT = process.env.port || config.port || 3000 // Port to run the webserver on, to be compatible with platforms such as railway, heroku, etc. We use process.env.port as the first option, then config.port, and if that fails we use 3000 as the default port. This way we can run the server on any port we want, and it will work on any platform that supports Node.js
// Initialize database 
mongoose.connect(config.mongodb).then((connection) => {
  console.log(`Connected to database`);
});

// Transporter, used to send emails using SMTP, we don't need IMAP or POP here as we are only sending emails
const transporter = nodemailer.createTransport({
  host: config.emailHost,
  port: Number(config.emailPort),
  auth: {
    user: config.emailUser,
    pass: config.emailPass,
  },
});

// Functions

function generateSecureCode(length = 4) {
  // Here we use the crypto library to generate SAFE ENOUGH codes, meaning they wont be predictable enough for someone to just guess, or well predict
  return crypto.randomInt(10 ** (length - 1), 10 ** length).toString(); // We turn it into a string because thats what our database expects, and this gives us the ability to use more secure string based codes
}

async function addCode(email, username) {
  try {
    const code = generateSecureCode(4); // Generate a code using the generateSecureCode function, we pass in 4 as the length of the code, can be changed
    const options = {
      username,
      email,
      code,
      time: Date.now(),
    }; // Create an object with the username, email, code and time, we use Date.now() to get the current time in milliseconds since 1970, this is what our database expects
    // Query the database to see if there is a duplicate document, we do this so in case of a duplicate entry, we can handle the error easier
    const find = await models.codes
      .findOne({ $or: [{username}, {email}, {code}]  })
      .lean();
    if (find)
      return {
        error: true,
        message:
          "Found duplicate entry, please wait for your current code to expire before submitting another request",
      };
    const newModel = new models.codes(options); // Create the mongodb data
    await newModel.save(); // Save it using async so we don't return a success output before it's saved
    await transporter.sendMail({
      from: config.emailFrom,
      to: email,
      subject: config.emailSubject,
      html: config.emailHTML
        .replace(/{code}/gi, code)
        .replace(/{expires}/gi, config.expiryTime), // Replace the {code} placeholder with the code we generated, replace {expires} with the time in seconds until the code expires
    }); // Send the email using the transporter we created earlier
    return { error: false }; // return error false which in this case well uh means success (i think? my code is a mystery)
  } catch (e) {
    console.error(e); // Log the error to the console
    return { error: true, message: "An unknown error occurred" }; // If there was an unknown error, like a database error, return it
  }
}

async function validateCode(email, code) {
  const find = await models.codes.findOne({code}).lean() // Find the code in the database
  if (!find) return { error: true, message: "This code is invalid" }; // If the code is not found, return an error
  if (email != find.email)
    return { error: true, message: "This code is invali2d" }; // If the email does not match the code, return an error
  if (Date.now() - find.time >= 1000 * Number(config.expiryTime)) {
    await models.codes.findOneAndDelete({ code }); // Delete the code from the database, we do this so we don't have to worry about duplicates in the future, and also to save space
    return {
      error: true,
      message: "This code has expired, please request a new one",
    }; // If the code has expired, return an error
  }
  await models.codes.findOneAndDelete({ code }); // Delete the code from the database, we do this so we don't have to worry about duplicates in the future, and also to save space
  return { error: false };
}


// Function to clean up expired codes
async function cleanupExpiredCodes() {
  try {
    const expirationThreshold = 3 * 1000 * Number(config.expiryTime); // 3x the expiration time in milliseconds
    const now = Date.now();
    const result = await models.codes.deleteMany({
      time: { $lt: now - expirationThreshold }, // Find codes where the time is older than the threshold
    });
    console.log(`Cleanup complete. Deleted ${result.deletedCount} expired codes.`);
  } catch (error) {
    console.error("Error during cleanup of expired codes:", error);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupExpiredCodes, 1000 * 60 * 30);

// Body parser
app.use(express.json());

// Helmet
app.use(helmet()); // Use helmet to secure the app by setting various HTTP headers

// Middleware
app.use((req, res, next) => {
  res.error = (message, code) => {
    return res.status(code || 400).json({ error: true, message }); // Return an error response with the message and code, defaulting to 400 if no code is provided
  };
  res.success = (message, code) => {
    return res.status(code || 200).json({ error: false, message }); // Return a success response with the message and code, defaulting to 200 if no code is provided
  };
  next(); // Call the next middleware in the stack
});

function secureEndpoint(req, res, next) {
  // Middleware to secure endpoints, we can use this to secure any endpoint we want
  const token = req.headers["authorization"]; // Get the token from the request headers
  if (!token) return res.error("Missing token"); // Check if the token is present
  if (token !== config.token) return res.error("Invalid token"); // Check if the token is valid
  next(); // Call the next middleware in the stack
}

function validateInfo(options) {
  // Function to validate the information passed to the endpoints, we can use this to validate any endpoint we want
  if (options.username) {
    if (options.username.length > 50)
      return { error: true, message: "Username is too long" }; // Check if the username is too long
    if (options.username.length < 3)
      return { error: true, message: "Username is too short" }; // Check if the username is too short
    if (options.username.match(/[^a-zA-Z0-9]/))
      return { error: true, message: "Username must be alphanumeric only" }; // Check if the username is alphanumeric only
  }
  if (options.email) {
    if (options.email.match(/[^a-zA-Z0-9@.]/))
      return { error: true, message: "Email must be alphanumeric only" }; // Check if the email is alphanumeric only
    if (options.email.length > 50)
      return { error: true, message: "Email is too long" }; // Check if the email is too long
  }
  if (options.code) {
    if (options.code.length != 4)
      return { error: true, message: "Code must be 4 digits long" }; // Check if the code is 4 digits long
    if (options.code.match(/[^0-9]/))
      return { error: true, message: "Code must be numeric only" }; // Check if the code is numeric only
  }
  return true; // If there was no error, return success
}

const ratLimitHolder = {}; // This will hold the rate limit data for each IP address, we can use this to rate limit any endpoint we want
function rateLimit(req, res, next) {
  // Middleware to rate limit the endpoints, we can use this to rate limit any endpoint we want
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress; // Get the IP address of the request
  if (!ip) return res.error("Missing IP address"); // Check if the IP address is present
  const now = Date.now(); // Get the current time
  // use the ratelimitHolder to store the data for each IP address, we can use this to rate limit any endpoint we want
  if (!ratLimitHolder[ip]) {
    ratLimitHolder[ip] = { count: 1, time: now }; // If the IP address is not present, create a new entry for it
  } else {
    ratLimitHolder[ip].count++; // If the IP address is present, increment the count
    if (now - ratLimitHolder[ip].time >= 1000 * 60) {
      // If the time since the last request is greater than 1 minute, reset the count and time
      ratLimitHolder[ip].count = 1;
      ratLimitHolder[ip].time = now;
    }
  }
  if (ratLimitHolder[ip].count > 5) {
    // If the count is greater than 5, return an error
    return res.error("Rate limit exceeded, please try again later", 429); // Return a 429 error
  } else {
    next(); // Call the next middleware in the stack
  }
}

setInterval(() => {
  const now = Date.now();
  for (const ip in ratLimitHolder) {
    if (now - ratLimitHolder[ip].time > 1000 * 60) {
      delete ratLimitHolder[ip];
    }
  }
}, 1000 * 30); // Run cleanup every 30 seconds, this will remove old entries from the rate limit holder, we can use this to rate limit any endpoint we want

// Endpoints
app.post("/codes/new", rateLimit, async (req, res) => {
  const { email, username } = req.body; // Get the email and username from the request body
  if (!email || !username) return res.error("Missing parameters"); // Check if all parameters are present
  if (validateInfo({ email, username }) !== true)
    return res.error(validateInfo({ email, username }).message); // Check if the details are valid, if not return the error message
  const user = await models.users.findOne({ email, username }).lean(); // Find the user in the database using the email and username, meaning the ones that are given match since we are using those to query
  // and mongodb will by default use an AND operator on queries, so we can just use findOne here
  if (!user) return res.error("User not found"); // If the user is not found, return an error
  const result = await addCode(email, username); // Call the addCode function and pass in the email and username
  if (result.error) return res.error(result.message); // If there was an error, return it
  return res.success("Code sent to email"); // If there was no error, return success
});

app.post("/codes/validate", rateLimit, async (req, res) => {
  const { code, username, email, newPassword } = req.body; // Get the code and email from the request body
  if (!code || !email || !newPassword) return res.error("Missing parameters"); // Check if all parameters are present
  if (validateInfo({ code, email }) !== true)
    return res.error(validateInfo({ code, email, username }).message); // Check if the details are valid, if not return the error message
  const user = await models.users.findOne({ email, username }); // Find the user in the database using the email and username, meaning the ones that are given match since we are using those to query
  if (!user) return res.error("User not found"); // If the user is not found, return an error
  const result = await validateCode(email, code); // Call the validateCode function and pass in the email and code
  if (result.error) return res.error(result.message); // If there was an error, return it
  // If the code is valid, we can spawn a new process to run the password reset script, we do this in the background so we dont block the main thread, or show a window on the windows server
  const childProcess = child.spawn("powershell.exe", [path.join(__dirname, "changepass.ps1"), username, newPassword]); // Spawn a new process to run the password reset script
 let ret = false;
  childProcess.stdout.on("data", (data) => {
    if (data.toString().toLowerCase().includes("success") && !ret) {
      ret = true;
      return res.success("Password changed successfully");
    }
  });
  childProcess.stderr.on("data", (data) => {
    console.error(`Error: ${data}`);
   if (!ret){ ret = true; return res.error("Password change failed"); }
  });

  childProcess.on("error", (err) => {
    console.error(`Failed to execute script: ${err}`);
   if(!ret){ ret = true; return res.error("Failed to execute password reset script"); }
  });

  childProcess.on("close", (code) => {
    if (code !== 0 && !ret) {
      console.error(`Script exited with code ${code}`);
      ret = true;
      return res.error("Password reset script exited with an error");
    }
  });
});

app.post("/users/new", secureEndpoint, async (req, res) => {
  const { email, username } = req.body; // Get the email and username from the request body
  if (!email || !username) return res.error("Missing parameters"); // Check if all parameters are present
  if (validateInfo({ email, username }) !== true)
    return res.error(validateInfo({ code, email, username }).message); // Check if the details are valid, if not return the error message
  const find = await models.users.findOne({ email, username }).lean(); // Find the user in the database using the email and username, meaning the ones that are given match since we are using those to query
  // and mongodb will by default use an AND operator on queries, so we can just use findOne here
  if (find) return res.error("User already exists"); // If the user already exists, return an error
  const newModel = new models.users({ email, username }); // Create a new user model using the email and username
  await newModel.save(); // Save it using async so we don't return a success output before it's saved
  return res.success("User created successfully"); // If there was no error, return success
});

app.post("/users/delete", secureEndpoint, async (req, res) => {
  const { email, username } = req.body; // Get the email and username from the request body
  if (!email || !username) return res.error("Missing parameters"); // Check if all parameters are present
  if (email.match(/[^a-zA-Z0-9@.]/))
    return res.error("Email must be alphanumeric only"); // Check if the email is alphanumeric only
  if (email.length > 50) return res.error("Email is too long"); // Check if the email is too long
  if (username.length > 50) return res.error("Username is too long"); // Check if the username is too long
  if (username.length < 3) return res.error("Username is too short"); // Check if the username is too short
  if (username.match(/[^a-zA-Z0-9]/))
    return res.error("Username must be alphanumeric only"); // Check if the username is alphanumeric only
  const find = await models.users.findOne({ email, username }); // Find the user in the database using the email and username, meaning the ones that are given match since we are using those to query
  // and mongodb will by default use an AND operator on queries, so we can just use findOne here
  if (!find) return res.error("User not found"); // If the user is not found, return an error
  await models.users.findOneAndDelete({ email, username }); // Delete the user from the database using findOneAndDelete so we don't have to worry about duplicates in the future, and also to save space
  return res.success("User deleted successfully"); // If there was no error, return success
});


// Start the server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`); // Log the server is running on the port specified in the config file
})


// If you read until down here, you're a fucking nerd, and that makes you cool. or you just scrolled down to see the code, which is also cool.
// Either way, you're cool.