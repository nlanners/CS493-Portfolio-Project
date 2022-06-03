const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../lib/datastore');
const Loads = require('./loads.js');
const constants = require('../lib/constants');
const {OAuth2Client} = require('google-auth-library');
const credentials = require('../lib/oauth_creds');

const datastore = ds.datastore;
const c = constants.constants;
const m = constants.messages;
const creds = credentials.creds;
const client = new OAuth2Client(creds.client_id);

router.use(bodyParser.json());

module.exports.get_boat = get_boat;



/******************************* MODEL FUNCTIONS ************************************************/

// Create new boat in database
async function post_boat(name, type, length, url, sub){
    let key = datastore.key(c.BOAT);

    try {
        const new_boat = {"name":name, "type":type, "length":length, "loads": [], "self": "", "owner": sub};
        await datastore.save({"key":key, "data":new_boat});
        const [boat] = await datastore.get(key);
        boat.self = url + boat[ds.Datastore.KEY].id;
        await datastore.update({key:key, data:boat});
        return ds.fromDatastore(boat);
    } catch (err) {
        console.log(err);
    }

}

// Get all boats from database
async function get_all_boats(req, sub) {
    try {
        let q = datastore.createQuery(c.BOAT).filter('owner', '=', sub).limit(c.limit);
        const results = {};
        if (Object.keys(req.query).includes('cursor')) {
            q = q.start(req.query.cursor);
        }
        const entities = await datastore.runQuery(q);
        results.boats = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
            results.next = ds.createURL(req) + '?cursor=' + entities[1].endCursor;
        }

        q = datastore.createQuery(c.BOAT).filter('owner', '=', sub).select('__key__');
        const keys = await datastore.runQuery(q);
        results.total = keys[0].length;

        return results;
    } catch (err) {
        console.log(err);
    }
}

// Get a single boat from database by id
async function get_boat(id, sub) {
    try {
        const key = datastore.key([c.BOAT, parseInt(id, 10)]);
        const [boat] = await datastore.get(key);

        if (!boat) {
            return false;
        }

        if (boat.owner === sub) {
            return ds.fromDatastore(boat);
        } else {
            return c.UNAUTHORIZED;
        }

    } catch (err) {
        console.log(err);
        return false;
    }
}

// Update a boat with all the parameters
async function put_boat(id, name, type, length, url, sub) {
    let key = datastore.key([c.BOAT, parseInt(id, 10)]);

    try {
        const try_boat = await get_boat(id, sub);
        if (try_boat === c.UNAUTHORIZED) {
            return c.UNAUTHORIZED;
        }

        if (try_boat) {
            const params = {
                "name": name,
                "type": type,
                "length": length,
                "loads": try_boat.loads,
                "self": try_boat.self,
                "owner": sub
            };
            await datastore.update({"key": key, "data": params});
            return c.NO_CONTENT;

        } else {
            const p_boat = await post_boat(name, type, length, url, sub);
            return p_boat;
        }

    } catch (err) {
        console.log(err);
    }
}

// Update boat partially
async function patch_boat(id, body, sub) {
    try {
        const boat = await get_boat(id, sub);
        if (!boat) {
            return c.NOT_FOUND;
        }

        if (boat === c.UNAUTHORIZED) {
            return c.UNAUTHORIZED;
        }

        for (let param of Object.keys(body)) {
            if (Object.keys(boat).includes(param)) {
                boat[param] = body[param];
            }
        }
        delete boat.id;
        await datastore.update({key:boat[ds.Datastore.KEY], data:boat});

        return c.NO_CONTENT;

    } catch (err) {
        console.log(err);
    }
}

// Delete a boat from database by id
async function delete_boat(id, sub) {
    try {
        let boat = await get_boat(id, sub);

        if (!boat) {
            return c.NOT_FOUND;
        }

        if (boat.owner != sub) {
            return c.UNAUTHORIZED
        }

        for (let l in boat.loads) {
            let load = await Loads.get_load(boat.loads[l].id);
            load.carrier = null;
            delete load.id;
            await datastore.update(ds.createEntity(load));
        }

        return datastore.delete(boat[ds.Datastore.KEY]);
    } catch (err) {
        console.log(err);
    }
}

// Put load on boat in the database
async function assign_load_to_boat(boat_id, load_id, sub) {
    try {
        let boat = await get_boat(boat_id, sub);
        let load = await Loads.get_load(load_id);

        if (boat === c.UNAUTHORIZED) {
            return c.UNAUTHORIZED;
        }

        if (boat && load) {
            if (load.carrier != null) {
                return c.FORBIDDEN;
            } else {
                boat.loads.push({"id": load.id, "self": load.self});
                load.carrier = {"id": boat.id, "name": boat.name, "self": boat.self};

                delete boat.id;
                delete load.id;
                await datastore.update(ds.createEntity(boat));
                await datastore.update(ds.createEntity(load));
                return c.NO_CONTENT;
            }
        } else {
            return c.NOT_FOUND;
        }

    } catch (err) {
        console.log(err);
    }
}

// Remove a load from a boat in the database
async function remove_load_from_boat(boat_id, load_id, sub) {
    try {
        let load = await Loads.get_load(load_id);
        let boat = await get_boat(boat_id, sub);

        if (boat === c.UNAUTHORIZED) {
            return c.UNAUTHORIZED;
        } else if (load.carrier === null || !boat || !load) {
            return c.NOT_FOUND;
        } else {
            load.carrier = null;
            let boatLoads = boat.loads.filter( value => value.id != load.id);
            boat.loads = boatLoads;

            delete boat.id;
            delete load.id;

            await datastore.update(ds.createEntity(boat));
            await datastore.update(ds.createEntity(load));

            return c.NO_CONTENT;
        }
    } catch (err) {
        console.log(err);
    }
}

// verify JWT and send back sub
async function verify(token) {
    if (token) {
        try {
            const ticket = await client.verifyIdToken({
                idToken: getToken(token),
                audience: creds.client_id
            });
            const payload = ticket.getPayload();
            const user_id = payload['sub'];
            return user_id;
        } catch (err) {
            console.log(err);
            return false;
        }
    }
}

// parse Authorization header
function getToken(auth) {
    const token = auth.split(' ');
    return token[1];
}


/******************************* CONTROLLERS ********************************************/

// CREATE a new boat in the database
router.post('/', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (!req.headers.authorization) {
        constants.handle_response(res, c.UNAUTHORIZED, m.UNAUTHORIZED);
    }

    if (!req.body.name || !req.body.type || !req.body.length) {
        constants.handle_response(res, c.BAD_REQUEST, m.BAD_REQUEST_ATTR);
    }

    try {
        const sub = await verify(req.headers.authorization);
        const url = ds.createURL(req);
        const boat = await post_boat(req.body.name, req.body.type, req.body.length, url, sub);
        constants.handle_response(res, c.CREATED, boat);
    } catch (err) {
        constants.handle_response(res, c.ERROR);
    }
});

// READ all boats in database
router.get('/', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (!req.headers.authorization) {
        constants.handle_response(res, c.UNAUTHORIZED, m.UNAUTHORIZED);
        return;
    }

    try {
        const sub = await verify(req.headers.authorization);
        if (!sub) {
            constants.handle_response(res, c.UNAUTHORIZED);
            return;
        }
        const boats = await get_all_boats(req, sub);
        constants.handle_response(res, c.OK, [boats]);
    } catch (err) {
        console.log(err);
    }
});

// READ one boat from database
router.get('/:boat_id', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (!req.headers.authorization) {
        constants.handle_response(res, c.UNAUTHORIZED, m.UNAUTHORIZED);
    }

    try {
        const sub = await verify(req.headers.authorization);
        const boat = await get_boat(req.params.boat_id, sub);
        if (boat === c.UNAUTHORIZED) {
            constants.handle_response(res, c.UNAUTHORIZED);
        } else if (boat) {
            constants.handle_response(res, c.OK, [boat]);
        } else {
            constants.handle_response(res, c.NOT_FOUND)
        }
    } catch (err) {
        console.log(err);
    }
});

// UPDATE all properties of a boat
router.put('/:boat_id', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (!req.headers.authorization) {
        constants.handle_response(res, c.UNAUTHORIZED, m.UNAUTHORIZED);
    }

    if (!req.body.name || !req.body.type || !req.body.length) {
        constants.handle_response(res, c.BAD_REQUEST, m.BAD_REQUEST_ATTR);
    }

    try {
        const sub = await verify(req.headers.authorization);
        if (!sub) {
            constants.handle_response(res, c.UNAUTHORIZED);
        }
        const url = ds.createURL(req);
        const boat = await put_boat(req.params.boat_id, req.body.name, req.body.type, req.body.length, url, sub);
        if (boat === c.UNAUTHORIZED) {
            constants.handle_response(res, c.UNAUTHORIZED);
            return;
        }
        if (boat === c.NO_CONTENT) {
            constants.handle_response(res, c.NO_CONTENT);
            return;
        }
        constants.handle_response(res, c.CREATED, boat);
    } catch (err) {
        constants.handle_response(res, c.ERROR);
    }
});

// UPDATE a boat partially
router.patch('/:boat_id', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (!req.headers.authorization) {
        constants.handle_response(res, c.UNAUTHORIZED, m.UNAUTHORIZED);
    }

    try {
        const sub = await verify(req.headers.authorization);
        if (!sub) {
            constants.handle_response(res, c.UNAUTHORIZED);
        }

        const result = await patch_boat(req.params.boat_id, req.body, sub);
        constants.handle_response(res, result);

    } catch (err) {
        console.log(err);
    }
});

// DELETE a boat from database
router.delete('/:boat_id', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (!req.headers.authorization) {
        constants.handle_response(res, c.UNAUTHORIZED, m.UNAUTHORIZED);
    }

    try {
        const sub = await verify(req.headers.authorization);
        const result = await delete_boat(req.params.boat_id, sub);
        if (result === c.NOT_FOUND) {
            constants.handle_response(res, c.NOT_FOUND);
            return;
        } else if (result === c.UNAUTHORIZED) {
            constants.handle_response(res, c.UNAUTHORIZED);
            return;
        } else {
            constants.handle_response(res, c.NO_CONTENT);
        }
    } catch (err) {
        console.log(err);
    }
});

// PUT load on boat
router.put('/:boat_id/loads/:load_id', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (!req.headers.authorization) {
        constants.handle_response(res, c.UNAUTHORIZED, m.UNAUTHORIZED);
        return;
    }

    try {
        const sub = await verify(req.headers.authorization);
        const status = await assign_load_to_boat(req.params.boat_id, req.params.load_id, sub);
        constants.handle_response(res, status);
    } catch (err) {
        console.log(err);
    }
});

// DELETE a load from a boat
router.delete('/:boat_id/loads/:load_id', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (!req.headers.authorization) {
        constants.handle_response(res, c.UNAUTHORIZED, m.UNAUTHORIZED);
        return;
    }

    try {
        const sub = await verify(req.headers.authorization);
        const status = await remove_load_from_boat(req.params.boat_id, req.params.load_id, sub);
        constants.handle_response(res, status);
    } catch (err) {
        console.log(err);
    }
});



module.exports = router;