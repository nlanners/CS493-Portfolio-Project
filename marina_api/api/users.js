const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../lib/datastore');
const constants = require('../lib/constants');
const { rulesToMonitor } = require('nodemon/lib/monitor/match');

const datastore = ds.datastore;
const c = constants.constants;
const m = constants.messages;

router.use(bodyParser.json());

/******************* Start Model Functions ***********************/

// POST user to database
async function post_user(name, sub) {
    const id = sub.slice(0,16);
    const key = datastore.key([c.USER, parseInt(id, 10)]);

    try {
        const new_user = {"name": name, "id": id, "boats": []};
        await datastore.upsert({"key": key, "data": new_user});
        return new_user;

    } catch (err) {
        console.log(err);
    }
}

// GET all users from database
async function get_all_users() {
    const q = datastore.createQuery(c.USER).order('name');
    const entities = await datastore.runQuery(q);
    return entities[0];
}

/********************* End Model Functions ***********************/


/********************** Start Controller Functions *******************/

// CREATE new user
router.post('/', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (req.body.name && req.body.id) {
        try {
            const user = await post_user(req.body.name, req.body.id);
            constants.handle_response(res, c.CREATED, user);
        } catch (err) {
            console.log(err);
            constants.handle_response(res, c.ERROR);
        }
    }
});

// READ all users
router.get('/', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    try {
        const users = await get_all_users();
        constants.handle_response(res, c.OK, [{"users":users}]);
    } catch (err) {
        console.log(err);
    }
});

/********************** End Controller Functions *********************/


module.exports = router;