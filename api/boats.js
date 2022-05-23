const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('../lib/datastore');
const Loads = require('./loads.js');
const constants = require('../lib/constants');

const datastore = ds.datastore;
const c = constants.constants;
const m = constants.messages;

router.use(bodyParser.json());

module.exports.get_boat = get_boat;



/******************************* MODEL FUNCTIONS ************************************************/

// Create new boat in database
async function post_boat(name, type, length, url){
    let key = datastore.key(c.BOAT);

    const new_boat = {"name":name, "type":type, "length":length, "loads": [], "self": ""};
    await datastore.save({"key":key, "data":new_boat});
    const [boat] = await datastore.get(key);
    boat.self = url + boat[ds.Datastore.KEY].id;
    await datastore.update({key:key, data:boat});
    return ds.fromDatastore(boat);
                
}

// Get all boats from database
async function get_all_boats(req) {
    try {
        let q = datastore.createQuery(c.BOAT).limit(c.limit);
        const results = {};
        if (Object.keys(req.query).includes('cursor')) {
            q = q.start(req.query.cursor);
        }
        const entities = await datastore.runQuery(q)
        results.boats = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
            results.next = ds.createURL(req) + '?cursor=' + entities[1].endCursor;
        }
        return results;
    } catch (err) {
        console.log(err);
    }
}

// Get a single boat from database by id
async function get_boat(id) {
    try {
        const key = datastore.key([c.BOAT, parseInt(id, 10)]);
        const [boat] = await datastore.get(key);
        return ds.fromDatastore(boat);
    } catch (err) {
        return false;
    }
}

// Delete a boat from database by id
async function delete_boat(id) {
    try {
        let boat = await get_boat(id);

        if (!boat) {
            return NOT_FOUND;
        }
    
        for (let l in boat.loads) {
            let load = await Loads.get_load(boat.loads[l].id);
            load.carrier = null;
            await datastore.update(ds.createEntity(load));
        }
    
        return datastore.delete(boat[ds.Datastore.KEY]);
    } catch (err) {
        console.log(err);
    }   
}

// Put load on boat in the database
async function assign_load_to_boat(boat_id, load_id) {
    try {
        let boat = await get_boat(boat_id);
        let load = await Loads.get_load(load_id);

        if (boat && load) {
            if (load.carrier != null) {
                return c.FORBIDDEN;
            } else {
                boat.loads.push({"id": load.id, "self": load.self});
                load.carrier = {"id": boat.id, "name": boat.name, "self": boat.self};
                
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
async function remove_load_from_boat(boat_id, load_id) {
    try {
        let load = await Loads.get_load(load_id);
        let boat = await get_boat(boat_id);
        if (load.carrier === null || !boat || !load) {
            return c.NOT_FOUND;
        } else {
            load.carrier = null;
            let boatLoads = boat.loads.filter( value => value.id != load.id);
            boat.loads = boatLoads;
            
            await datastore.update(ds.createEntity(boat));
            await datastore.update(ds.createEntity(load));

            return c.NO_CONTENT;
        }
    } catch (err) {
        console.log(err);
    }
}

// Get all the loads on a boat in the database
async function get_boat_loads(boat_id) {
    try {
        const boat = await get_boat(boat_id);
        if (boat && boat.loads.length > 0) {
            let loads = [];
            for (let load of boat.loads) {
                const l = await Loads.get_load(load.id);
                loads.push(l);
            }

            return loads;
            
        } else {
            return false;
        }
        
    } catch (err) {
        console.log(err);
    }   
}


/******************************* CONTROLLERS ********************************************/

router.post('/', async (req, res) => {
    if (req.body.name && req.body.type && req.body.length) {
        try {
            const url = ds.createURL(req);
            const boat = await post_boat(req.body.name, req.body.type, req.body.length, url);
            constants.handle_response(res, c.CREATED, boat);
        } catch (err) {
            constants.handle_response(res, c.ERROR);
        }
    } else {
        constants.handle_response(res, c.BAD_REQUEST, m.BAD_REQUEST_ATTR);
    }
});

// READ all boats in database
router.get('/', async (req, res) => {
    const boats = await get_all_boats(req);
    constants.handle_response(res, c.OK, boats);
});

// READ one boat from database
router.get('/:boat_id', async (req, res) => {
    const boat = await get_boat(req.params.boat_id)
    if (boat) {
        constants.handle_response(res, c.OK, boat);
    } else {
        constants.handle_response(res, c.NOT_FOUND)
    }
});

// DELETE a boat from database
router.delete('/:boat_id', async (req, res) => {
    try {
        const stuff = await delete_boat(req.params.boat_id)
        if (stuff === c.NOT_FOUND) {
            constants.handle_response(res, c.NOT_FOUND);
        } else {
            constants.handle_response(res, c.NO_CONTENT);
        }
    } catch (err) {
        console.log(err);
    }
});

// PUT load on boat
router.put('/:boat_id/loads/:load_id', async (req, res) => {
    try {
        const status = await assign_load_to_boat(req.params.boat_id, req.params.load_id);
        constants.handle_response(res, status);
    } catch (err) {
        console.log(err);
    }
});

// DELETE a load from a boat
router.delete('/:boat_id/loads/:load_id', async (req, res) => {
    try {
        const status = await remove_load_from_boat(req.params.boat_id, req.params.load_id);
        constants.handle_response(res, status);
    } catch (err) {
        console.log(err);
    }
});

// GET all loads on a single boat
router.get('/:boat_id/loads', async (req, res) => {
    try {
        const loads = await get_boat_loads(req.params.boat_id);
        if (loads) {
            constants.handle_response(res, c.OK, {"loads": loads});
        } else {
            constants.handle_response(res, c.NOT_FOUND);
        }
        

    } catch (err) {
        console.log(err);
    }
});


module.exports = router;