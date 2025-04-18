// /public/scripts/login.js


// -------------------------------------------- DEPENDENCIES -------------------------------------------------
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const crypto = require('crypto');


// ------------------------------------------- INITIALISATION ------------------------------------------------

// Retrieve environment variables
dotenv.config();
const ATLAS_URI = process.env.ATLAS_URI;
const SECRET = process.env.SECRET;

// Setup express.js
const app = express();
const port = 8080;
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(__dirname + "/public"));
app.set('view engine', 'ejs');

// Setup express-session.
app.use(cookieParser())
app.use(session({
    secret: SECRET,
    resave: false,
    saveUninitialized: true
}));

// Setup mongodb
let trademen;
let clients;
let jobs;
const client = new MongoClient(ATLAS_URI);

(async function connect() {
    await client.connect()
        .then(() => console.log('MongoDB client connected.'))
        .catch(promise => console.error('MongoDB client NOT connected', promise));
    trademen = client.db('TradeCo').collection('trademen');
    clients = client.db('TradeCo').collection('clients');
    jobs = client.db("TradeCo").collection('jobs');

    app.listen(port, () => console.log(`Express server running on port ${port}.`));
})();


// --------------------------------- CLIENT ROUTES -----------------------------------------------
app.get('/client/login', (req, res) => {
    if (req.session.userId && req.session.userType === 'client') {
        res.redirect('/client/dashboard');
        return;
    } else {
        res.render('client/login');
    }
});

app.get('/client/register', (req, res) => {
    if (req.session.userId && req.session.userType === 'client') {
        res.redirect('/client/dashboard');
        return;
    } else {
        res.render('client/register');
    }
});

app.post('/login_client', async (req, res) => {
    if (req.session.userId && req.session.userType === 'client') {
        res.redirect('client/dashboard');
    } else {

        const existing_client = await clients.findOne({
            email: req.body.email,
            password: await sha256(req.body.password)
        });

        if (existing_client) {
            req.session.userId = existing_client._id;
            req.session.userType = 'client';
            res.redirect('client/dashboard');
            return;
        } else {
            res.render('client/login');
        }
    }
});


app.post('/register_client', async (req, res) => {
    const existingClient = await clients.findOne({ email: req.body.email });

    if (existingClient) {
        res.render('client/register');
        return;
    }

    if (req.body.password !== req.body.confirm_password) {
        res.render('client/register');
        return;
    }

    const new_client = {
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        password: await sha256(req.body.password),
    };

    const result = await clients.insertOne(new_client);

    req.session.userId = result.insertedId;
    req.session.userType = 'client';
    res.redirect('/client/dashboard');
});

app.get('/client/dashboard', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'client') {
        res.redirect('/client/login');
        return;
    }
    const data = await trademen.findOne({ _id: new ObjectId(String(req.session.userId)) });
    res.render('client/dashboard', { data: data });
});

// ------------------------------- TRADESMAN ROUTES ----------------------------------------------

app.get('/trademan/login', (req, res) => {
    if (req.session.userId && req.session.userType === 'trademan') {
        res.redirect('/trademan/dashboard');
        return;
    }
    res.render('trademan/login');
});

app.get('/trademan/register', (req, res) => {
    if (req.session.userId && req.session.userType === 'trademan') {
        res.redirect('/trademan/dashboard');
        return;
    }
    res.render('trademan/register');
});

app.post('/login_trademan', async (req, res) => {
    if (req.session.userId && req.session.userType === 'trademan') {
        res.redirect('trademan/dashboard');
    } else {

        const trademan = await trademen.findOne({
            email: req.body.email,
            password: await sha256(req.body.password)
        });

        if (trademan) {
            req.session.userId = trademan._id;
            req.session.userType = 'trademan';
            res.redirect('trademan/dashboard');
            return;
        } else {
            res.render('trademan/login', { error: 'Invalid email or password' });
        }
    }
});


app.post('/create_trademan', async (req, res) => {
    const existingTradesman = await trademen.findOne({ email: req.body.email });

    if (existingTradesman) {
        res.render('trademan/register');
        return;
    }

    if (req.body.password !== req.body.confirm_password) {
        res.render('trademan/register');
        return;
    }

    const new_trademan = {
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        password: await sha256(req.body.password),
        phone: req.body.phone,
        trade: req.body.trade,
        sortcode: req.body.sortcode,
        account: req.body.account,
    };

    const result = await trademen.insertOne(new_trademan);

    req.session.userId = result.insertedId;
    req.session.userType = 'trademan';
    res.redirect('/trademan/dashboard');
});

app.get('/trademan/dashboard', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'trademan') {serve
        res.redirect('/trademan/login');
        return;
    }
    const trademan_id = new ObjectId(String(req.session.userId));

    const data = await trademen.findOne({ _id: trademan_id })

    const reserved = await jobs.find({
        status: "reserved",
        reservedBy: trademan_id
    }).toArray();

    const open = await jobs.find({
        status: "available"
    }).toArray();

    res.render('trademan/dashboard', { data: data, reserved: reserved, open: open });
});

app.get('/create_jobs', async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'trademan') {
        res.redirect('/trademan/login');
        return;
    }

    jobs.insertMany([
        {
            title: "Fix Wiring Issue",
            location: "123 Main Street",
            description: "Repair faulty wiring in a residential property.",
            budget: 200,
            status: "reserved",
            reservedBy: new ObjectId(String(req.session.userId)),
            createdAt: new Date()
        },
        {
            title: "Install Outdoor Lighting",
            location: "555 Maple Drive",
            description: "Add motion‑sensor floodlights around the garage.",
            budget: 320,
            status: "reserved",
            reservedBy: new ObjectId(String(req.session.userId)),
            createdAt: new Date()
        },
        {
            title: "Replace Circuit Breaker",
            location: "101 Pine Road",
            description: "Swap out a tripping 40 A breaker in the main panel.",
            budget: 250,
            status: "reserved",
            reservedBy: new ObjectId(String(req.session.userId)),
            createdAt: new Date()
        },
        {
            title: "Install New Lighting",
            location: "456 Elm Avenue",
            description: "Fit LED panels in a commercial office ceiling.",
            budget: 300,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "Electrical Safety Inspection",
            location: "789 Oak Lane",
            description: "Full EICR for a 3‑bed rental property.",
            budget: 150,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "Upgrade Consumer Unit",
            location: "18 Cedar Close",
            description: "Replace old fuse box with 18‑way RCBO consumer unit.",
            budget: 600,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "Add EV Charger",
            location: "272 Birch Crescent",
            description: "Install 7 kW wall box and run 6 mm cable from meter.",
            budget: 900,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "Garden Socket Install",
            location: "43 Willow Way",
            description: "Weatherproof twin socket on exterior brick wall.",
            budget: 120,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "Smart Thermostat Wiring",
            location: "67 Poplar Street",
            description: "Add C‑wire and mount Nest Learning Thermostat.",
            budget: 180,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "PAT Testing – 30 Items",
            location: "89 Chestnut Court",
            description: "Portable appliance test for small office kit.",
            budget: 90,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "Run New Ring Main",
            location: "12 Hazel Grove",
            description: "Second‑fix sockets for loft conversion.",
            budget: 550,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "Emergency Call‑out",
            location: "3 Rowan Terrace",
            description: "No power in kitchen after kettle tripped MCB.",
            budget: 75,
            status: "available",
            createdAt: new Date()
        },
        {
            title: "Replace Outdoor Lantern",
            location: "221B Baker Street",
            description: "Swap broken PIR lantern with new LED unit.",
            budget: 110,
            status: "available",
            createdAt: new Date()
        }
    ]);

    res.redirect('/trademan/dashboard');

});

app.post("/reserveJob", async (req, res) => {
    if (!req.session.userId || req.session.userType !== 'trademan') {
        res.redirect('/trademan/login');
        return;
    }

    // Extract the job ID - handle both string and array cases
    const jobId = Array.isArray(req.body.job) ? req.body.job[1] : req.body.job;
    const traderId = req.session.userId;

    console.log("Job ID to reserve:", jobId);
    console.log("Trader ID:", traderId);

    try {
        // The updateOne method returns information about the operation
        const result = await jobs.updateOne(
            { _id: new ObjectId(jobId) },  // No need for String() here as jobId is already a string
            {
                $set: {
                    status: "reserved",
                    reservedBy: new ObjectId(traderId)
                }
            }
        );

        console.log("Update result:", result);

        // Check if any document was actually updated
        if (result.matchedCount === 0) {
            console.error("No job found with ID:", jobId);
        } else if (result.modifiedCount === 0) {
            console.error("Job found but not modified:", jobId);
        } else {
            console.log("Job successfully reserved:", jobId);
        }

        res.redirect("/trademan/dashboard");
    } catch (error) {
        console.error("Error reserving job:", error);
        res.redirect("/trademan/dashboard");
    }

});

// ---------------------------------------- SHARED ROUTES ---------------------------------------------------
app.get('/', (req, res) => {
    res.render('main');
});

app.get('/enter', (req, res) => {
    if (req.session.userId) {
        if (req.session.userType === 'client') {
            res.redirect('/client/dashboard');
            return;
        } else if (req.session.userType === 'trademan') {
            res.redirect('/trademan/dashboard');
            return;
        }
    }
    res.render('enter');
});

app.get('/contact_us', (req, res) => {
    res.render('contact');
});

// ----------------------------------------- HELPER FUNTIONS -------------------------------------------------
async function sha256(str) {
    // https://stackoverflow.com/questions/18338890/are-there-any-sha-256-javascript-implementations-that-are-generally-considered-t

    // Encode the string as a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    // Calculate the SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert the buffer to hexadecimal
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}
