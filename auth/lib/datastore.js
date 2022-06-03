const {Datastore} = require('@google-cloud/datastore');

const projectId = 'lannersn-portfolio-project';

module.exports.Datastore = Datastore;
module.exports.datastore = new Datastore({projectId: projectId});