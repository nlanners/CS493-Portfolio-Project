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


module.exports = router;