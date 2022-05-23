const {Datastore} = require('@google-cloud/datastore');

const projectId = 'portfolio-project';

module.exports.Datastore = Datastore;
module.exports.datastore = new Datastore({projectId: projectId});

module.exports.fromDatastore = function fromDatastore(item) {
    item.id = item[Datastore.KEY].id;
    return item;
}

module.exports.createEntity = function createEntity(data) {
    return {
        key: data[Datastore.KEY],
        data: data
    }
}

module.exports.createURL = function createURL(req) {
    return req.protocol + '://' +  req.get('host') + req.baseUrl + '/'
}