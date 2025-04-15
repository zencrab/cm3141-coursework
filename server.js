// /public/scripts/login.js


// ---------------------------------------------------- DEPENDENCIES ---------------------------------------------------
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const {MongoClient} = require('mongodb');
const dotenv = require('dotenv');
const crypto = require('crypto');


// --------------------------------------------------- INITIALISATION --------------------------------------------------
// Initialise Dotenv
dotenv.config();
// Retrieve the ATLAS_URI for the MongoDB Connection.
const ATLAS_URI = process.env.ATLAS_URI;
// Retrieve the SECRET for the Express Session.
const SECRET = process.env.SECRET;

// Initialise Express.
const app = express();
// Port where the Express server will be running.
const port = 8080;
// Sets the public folder for the Express server.
app.use('/public', express.static(__dirname + "/pages"));
// Sets the view engine for the Express server.
app.set('view engine', 'ejs');

// Initialise Express Session.
app.use(cookieParser());
app.use(session({
    secret: SECRET,
    resave: false,
    saveUninitialized: true
}));

// Initialise MongoDB
let users;
const client = new MongoClient(ATLAS_URI);

(async function connect() {
    await client.connect()
        .then(() => console.log('MongoDB client connected.'))
        .catch(promise => console.error('MongoDB client NOT connected', promise));
    users = client.db('TradeCo').collection('tradesmen');

    app.listen(port, () => console.log(`Express server running on port ${port}.`));
})();


// --------------------------------------------------- EXPRESS ROUTES --------------------------------------------------
app.get('/client/login', (req, res) => {
    if (req.session.userId && req.session.userType === 'client') {
        res.redirect('/client/dashboard');
    } else {
        res.render('pages/client/login', {error: false});
    }
});

// Client signup page
app.get('/client/signup', (req, res) => {
    if (req.session.userId && req.session.userType === 'client') {
        res.redirect('/client/dashboard');
    } else {
        res.render('pages/client/signup', {error: false});
    }
});
//
// // Client dashboard
// app.get('/client/dashboard', async (req, res) => {
//     if (!req.session.userId || req.session.userType !== 'client') {
//         res.redirect('/client/login');
//     } else {
//         const clientData = await clients.findOne({_id: req.session.userId});
//         res.render('pages/client/dashboard', {client: clientData});
//     }
// });
//
// Client login POST
// app.post('/client/login', async (req, res) => {
//     if (req.session.userId && req.session.userType === 'client') {
//         res.redirect('/client/dashboard');
//     } else {
//         // Find client by email and password
//         const clientData = await clients.findOne({
//             email: req.body.email,
//             password: await sha256(req.body.password)
//         });
//
//         if (clientData) {
//             // Set session
//             req.session.userId = clientData._id;
//             req.session.userType = 'client';
//             if (req.body.remember_me) {
//                 req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
//             } else {
//                 req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
//             }
//             res.redirect('/client/dashboard');
//         } else {
//             res.render('pages/client/login', {error: 'Invalid email or password'});
//         }
//     }
});
//
// // Client signup POST
// app.post('/client/signup', async (req, res) => {
//     // Check if email already exists
//     const existingClient = await clients.findOne({email: req.body.email});
//
//     if (existingClient) {
//         res.render('pages/client/signup', {error: 'Email already in use'});
//         return;
//     }
//
//     // Validate password match
//     if (req.body.password !== req.body.confirm_password) {
//         res.render('pages/client/signup', {error: 'Passwords do not match'});
//         return;
//     }
//
//     // Create new client
//     const newClient = {
//         firstName: req.body.first_name,
//         lastName: req.body.last_name,
//         email: req.body.email,
//         password: await sha256(req.body.password),
//         phone: req.body.phone || '',
//         address: req.body.address || '',
//         registeredDate: new Date()
//     };
//
//     // Insert client into database
//     const result = await clients.insertOne(newClient);
//
//     // Set session
//     req.session.userId = result.insertedId;
//     req.session.userType = 'client';
//     res.redirect('/client/dashboard');
// });
//
// // ------------------------------------------------ TRADESMAN ROUTES --------------------------------------------------
// // Tradesman login page
// app.get('/tradesman/login', (req, res) => {
//     if (req.session.userId && req.session.userType === 'tradesman') {
//         res.redirect('/tradesman/dashboard');
//     } else {
//         res.render('pages/tradesman/login', {error: false});
//     }
// });
//
// // Tradesman signup page
// app.get('/tradesman/signup', (req, res) => {
//     if (req.session.userId && req.session.userType === 'tradesman') {
//         res.redirect('/tradesman/dashboard');
//     } else {
//         res.render('pages/tradesman/signup', {error: false});
//     }
// });
//
// // Tradesman dashboard
// app.get('/tradesman/dashboard', async (req, res) => {
//     if (!req.session.userId || req.session.userType !== 'tradesman') {
//         res.redirect('/tradesman/login');
//     } else {
//         const tradesmanData = await tradesmen.findOne({_id: req.session.userId});
//         res.render('pages/tradesman/dashboard', {tradesman: tradesmanData});
//     }
// });
//
// // Tradesman login POST
app.post('/tradesman/login', async (req, res) => {
    if (req.session.userId && req.session.userType === 'tradesman') {
        res.redirect('/pages/dashboard');
    } else {
        // Find tradesman by email and password
        const tradesmanData = await tradesmen.findOne({
            email: req.body.email,
            password: await sha256(req.body.password)
        });

        if (tradesmanData) {
            // Set session
            req.session.userId = tradesmanData._id;
            req.session.userType = 'tradesman';
            if (req.body.remember_me) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            } else {
                req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
            }
            res.redirect('/pages/dashboard');
        } else {
            res.render('pages/login', {error: 'Invalid email or password'});
        }
    }
});
//
// Tradesman signup POST
app.post('/tradesman/signup', async (req, res) => {
    // Check if email already exists
    const existingTradesman = await tradesmen.findOne({email: req.body.email});

    if (existingTradesman) {
        res.render('pages/tradesman/signup', {error: 'Email already in use'});
        return;
    }

    // Validate password match
    if (req.body.password !== req.body.confirm_password) {
        res.render('pages/tradesman/signup', {error: 'Passwords do not match'});
        return;
    }

    // Create new tradesman
    const newTradesman = {
        firstName: req.body.first_name,
        lastName: req.body.last_name,
        email: req.body.email,
        password: await sha256(req.body.password),
        phone: req.body.phone || '',
        trade: req.body.trade || '',
        experience: req.body.experience || '',
        qualifications: req.body.qualifications || [],
        hourlyRate: req.body.hourly_rate || '',
        registeredDate: new Date()
    };

    // Insert tradesman into database
    const result = await tradesmen.insertOne(newTradesman);

    // Set session
    req.session.userId = result.insertedId;
    req.session.userType = 'tradesman';
    res.redirect('/tradesman/dashboard');
});
//
// // --------------------------------------------------- SHARED ROUTES --------------------------------------------------
// // Logout route
// app.get('/logout', (req, res) => {
//     req.session.destroy();
//     res.redirect('/');
// });
//
// // Check authentication status
// app.get('/check-auth', (req, res) => {
//     if (req.session && req.session.userId) {
//         res.json({
//             authenticated: true, 
//             userType: req.session.userType
//         });
//     } else {
//         res.json({authenticated: false});
//     }
// });
//
// // 404 page
// // app.get('*', (req, res) => {
// //     res.status(404).render('pages/404');
// // });
//
