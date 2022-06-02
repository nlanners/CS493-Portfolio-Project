const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../lib/datastore');
const Boats = require('./boats.js');
const constants = require('../lib/constants');

const datastore = ds.datastore;
const c = constants.constants;
const m = constants.messages;

router.use(bodyParser.json());



/******************************* MODEL FUNCTIONS ************************************************/

// Create a load in the database
async function post_load(volume, item, date, url) {
    try {
        const key = datastore.key(c.LOAD);
    const new_load = {"volume": volume, "item": item, "carrier": null, "creation_date": date, "self": ""};

    await datastore.save({"key":key, "data":new_load});
    const [load] = await datastore.get(key);
    load.self = url + load[ds.Datastore.KEY].id;
    await datastore.update({key:key, data:load});
    return ds.fromDatastore(load);
    } catch (err) {
        console.log(err);
    }
}

// Get all loads from database
async function get_all_loads(req) {
    try {
        let q = datastore.createQuery(c.LOAD).limit(c.limit);
        const results = {};
        if (Object.keys(req.query).includes('cursor')) {
            q = q.start(req.query.cursor);
        }
        const entities = await datastore.runQuery(q)
        results.loads = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
            results.next = ds.createURL(req) + '?cursor=' + entities[1].endCursor;
        }
        return results;
    } catch (err) {
        console.log(err);
    }
}

// Get one load from database
async function get_load(id) {
    try {
        const key = datastore.key([c.LOAD, parseInt(id, 10)]);
        const [load] = await datastore.get(key);
        return ds.fromDatastore(load);
    } catch (err) {
        return false;
    }
}

// Delete a load from database
async function delete_load(id) {
    try {
        const load = await get_load(id);

        if (!load) {
            return NOT_FOUND;
        }

        if (load.carrier != null) {
            let boat = await Boats.get_boat(load.carrier.id);
            let boatLoads = boat.loads.filter( value => value.id != load.id);
            
            boat.loads = boatLoads;
            await datastore.update(ds.createEntity(boat));
        }
        return await datastore.delete(load[ds.Datastore.KEY]);

    } catch (err) {
        console.log(err);
    }
}


/******************************* CONTROLLERS ********************************************/

// CREATE a load
router.post('/', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    if (req.body.volume && req.body.item && req.body.creation_date) {
        try {
            const url = ds.createURL(req);
            const load = await post_load(req.body.volume, req.body.item, req.body.creation_date, url);
            constants.handle_response(res, c.CREATED, load);
        } catch (err) {
            constants.handle_response(res, c.BAD_REQUEST, m.ERROR);
        }
    } else {
        constants.handle_response(res, c.BAD_REQUEST, m.BAD_REQUEST_ATTR);
    }
});

// READ all loads in database
router.get('/', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }
    

    try {
        const loads = await get_all_loads(req);
        constants.handle_response(res, c.OK, [loads]);
    } catch (err) {
        console.log(err);
    }
});

// READ one load from database
router.get('/:load_id', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    const load = await get_load(req.params.load_id);
    if (load) {
        constants.handle_response(res, c.OK, [load]);
    } else {
        constants.handle_response(res, c.NOT_FOUND);
    }
});

// DELETE a load from database
router.delete('/:load_id', async (req, res) => {
    if (!constants.check_accept(req, res)) {
        return;
    }

    try {
        const status = await delete_load(req.params.load_id)
        constants.handle_response(res, status);
    } catch (err) {
        console.log(err);
    }
});


module.exports = router;
module.exports.get_load = get_load;