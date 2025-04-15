// /public/scripts/login.js


// ---------------------------------------------------- DEPENDENCIES ---------------------------------------------------
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const {MongoClient} = require('mongodb');
const dotenv = require('dotenv');
const crypto = require('crypto');
const todayWord = require("today-word");


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
app.use('/public', express.static(__dirname + "/public"));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'));
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
    users = client.db('LiteraLinks').collection('users');

    app.listen(port, () => console.log(`Express server running on port ${port}.`));
})();


// --------------------------------------------------- EXPRESS ROUTES --------------------------------------------------
// ----------------------------------------------------- GET ROUTES ----------------------------------------------------
// GET /
app.get('/', async function (request, response) {
    response.render('pages/index');
});

// GET /search
app.get('/search', function (request, response) {
    response.render('pages/search');
});

// GET /login
app.get('/sign_in', function (request, response) {
    if (request.session.username) {
        response.redirect('/user');
    } else {
        response.render('pages/login', {error: false, toast: false});
    }
});

// GET /register
app.get('/sign_up', function (request, response) {
    if (request.session.username) {
        response.redirect('/user');
    } else {
        response.render('pages/register', {error: false});
    }
});

// GET /user
app.get('/user', async function (request, response) {
    if (!request.session.username)
        response.redirect('/sign_in');
    else {
        let user = await users.findOne({username: request.session.username});
        response.render('pages/user', {user: user, error: false, success: false});
    }
});

// GET /logout
app.get('/sign_out', async function (request, response) {
    request.session.destroy();
    response.redirect('/sign_in');
});

app.get('/check_signed_in', function (request, response) {
    if (request.session && request.session.username) {
        response.send(true);
    } else {
        response.send(false);
    }
});

app.get('/bookshelf', async function (request, response) {
    if (!request.session.username) {
        response.redirect('/sign_in');
    } else {
        response.render('pages/bookshelf', {user: (await users.findOne({username: request.session.username}))});
    }
});

app.get('/books', async function (request, response) {
    response.json((await users.findOne({username: request.session.username})).books);
});

//GET /book
app.get('/book', function (request, response) {
    response.render('pages/book', {bookId: request.query.id});
});

//add to bookshelf
app.get('/add_book_to_shelf', async function (request, response) {
    if (!request.session.username) {
        response.redirect('/sign_in')
    } else {


        await users.updateOne(
            {username: request.session.username},
            {
                $addToSet: {
                    books: {
                        bookId: request.query.bookId,
                        status: request.query.shelf
                    }
                }

            }
        )
        response.redirect("/book?id=" + request.query.bookId)

    }

});
//remove from bookshelf
app.get('/remove_bookshelf', async function (request, response) {
    if (!request.session.username) {
        response.redirect('/sign_in');
    } else {
        await users.updateOne(
            { username: request.session.username },
            {
                $pull: {
                    books: {
                        bookId: request.query.bookId,
                        status: request.query.shelf
                    }
                }
            }
        );
        response.redirect("/book?id=" + request.query.bookId);
    }
});

//404 page
app.get('*', function (request, response) {
    response.render('pages/404');
});

// ---------------------------------------------------- POST ROUTES ----------------------------------------------------
// Allow the Express server to read the body of a POST request.
app.use(express.urlencoded({extended: true}));

app.post('/sign_in', async function (request, response) {
    if (request.session.username) {
        response.redirect('/user');
    } else {
        // Retrieve the user from MongoDB with the credentials provided from the form.
        let user = await users.findOne({
            login: {
                email: request.body.email,
                password: (await sha256(request.body.password))
            }
        });

        // Check if the user with the provided credentials exists.
        if (user) {
            request.session.username = user.username;
            // Calculate the expiration time based on the current time and maxAge
            if (request.body.remember_me)
                request.session.cookie.maxAge = 3600000 * 24 * 30; // Remember login for 1 month.
            else
                request.session.cookie.maxAge = 3600000 * 24; // Remember login for 1 day.
            response.redirect('/user');
        } else {
            response.render('pages/login', {error: true, toast: false});
        }
    }
});

app.post('/sign_up', async function (request, response) {
    if (request.session.username) {
        response.redirect('/user');
    } else {
        if ((await sha256(request.body.password)) !== (await sha256(request.body.confirm_password))) {
            response.render('pages/register', {error: 'Passwords did not match.'});
        } else if (await users.findOne({username: request.body.username})) {
            response.render('pages/register', {error: 'The username is already taken.'});
        } else if (await users.findOne({'login.email': request.body.email})) {
            response.render('pages/register', {error: 'The email address is already in use.'});
        } else {
            await users.insertOne({
                name: {
                    first: request.body.first_name,
                    last: request.body.last_name
                },
                login: {
                    email: request.body.email,
                    password: (await sha256(request.body.password))
                },
                username: request.body.username,
                registered: {
                    date: new Date()
                },
                books: []
            });
            request.session.username = request.body.username;
            // Calculate the expiration time based on the current time and maxAge
            if (request.body.remember_me)
                request.session.cookie.maxAge = 3600000 * 24 * 30; // Remember login for 1 month.
            else
                request.session.cookie.maxAge = 3600000 * 24; // Remember login for 1 day.
            response.redirect('/user');
        }
    }
});

app.post('/update_user', async function (request, response) {
        if (!request.session.username) {
            response.redirect('/sign_in');
        } else {
            let user = {
                name: {
                    first: request.body.first_name.trim(),
                    last: request.body.last_name.trim()
                },
                'login.email': request.body.email.trim()
            };
            if (request.body.dob)
                user['dob'] = request.body.dob;
            if (request.body.city.trim() && request.body.country.trim())
                user['location'] = {
                    city: request.body.city.trim(),
                    country: request.body.country.trim()
                };
            if (request.body.bio.trim())
                user['bio'] = request.body.bio.trim();
            await users.updateOne(
                {username: request.session.username},
                {
                    $set: user
                }
            );
            response.redirect('/user')
        }
    }
)
;

app.post('/change_password', async function (request, response) {
    if ((await sha256(request.body.oldPassword)) === (await users.findOne({username: request.session.username})).login.password) {
        if (request.body.newPassword === request.body.confirmNewPassword) {
            await users.updateOne(
                {username: request.session.username},
                {$set: {'login.password': await sha256(request.body.newPassword)}}
            );
            let user = await users.findOne({username: request.session.username});
            response.render('pages/user', {
                user: user,
                error: false,
                success: 'Password has been changed successfully'
            });
        } else {
            let user = await users.findOne({username: request.session.username});
            response.render('pages/user', {
                user: user,
                success: false,
                error: 'Password has not been changed. The new passwords did not match.'
            });
        }
    }
    let user = await users.findOne({username: request.session.username});
    response.render('pages/user', {
        user: user,
        success: false,
        error: 'Password has not been changed. Old password does not match your current password.'
    });
});

app.post('/delete_user', async function (request, response) {
    if (!request.session && !request.session.username) {
        response.redirect('/sign_in');
    } else {
        let user = (await users.findOne({username: request.session.username}));
        if ((await sha256(request.body.password)) === user.login.password) {
            await users.deleteOne(user);
            response.redirect('/sign_out');
        } else {
            response.render('pages/user', {
                user: user,
                success: false,
                error: 'User has not been deleted. The password is incorrect.'
            });
        }
    }
});

// ------------------------------------------------- ADDITION FUNCTIONS ------------------------------------------------
async function sha256(str) {
    /* This function was not developed by the Lambda team. It was taken from code provided online on StackOverflow.
    https://stackoverflow.com/questions/18338890/are-there-any-sha-256-javascript-implementations-that-are-generally-considered-t
     */

    // Encode the string as a Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    // Calculate the SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert the buffer to hexadecimal
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}
