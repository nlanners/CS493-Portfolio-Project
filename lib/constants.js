module.exports.constants = {
    'BOAT': 'Boats',
    'LOAD': 'Loads',
    'OK': 200,
    'CREATED': 201,
    'NO_CONTENT': 204,
    'SEE_OTHER': 303,
    'BAD_REQUEST': 400,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'BAD_METHOD': 405,
    'NOT_ACCEPTABLE': 406,
    'UNSUPPORTED': 415,
    'ERROR': 500,
    'name_length': 25,
    'is_alpha': /^[a-z A-Z\s]+$/,
    'limit': 5
}

module.exports.messages = {
    'BAD_METHOD': 'Not an acceptable method.',
    'BAD_REQUEST_ATTR': "The request object is missing at least one of the required attributes",
    'BAD_REQUEST_ID': "Attribute 'id' can not be modified.",
    'BAD_REQUEST_NAME': `Boat name is invalid. Names must be ${this.constants.name_length} characters or less and contain no numbers or special characters.`,
    'FORBIDDEN': "Boat name has already been used. Please use a unique name.",
    'ERROR': "Something went wrong creating the object. Please try again",
    'ERROR_CONTENT': "Content type got messed up. Please try again.",
    'NOT_ACCEPTABLE': 'Response must be sent as ',
    'NOT_FOUND': "No object with this id exists",
    'UNSUPPORTED': "Data must be sent as Content-Type: application/json",
}

module.exports.handle_response = (res, result, extra=null) => {
    switch (result) {
        case constants.BAD_METHOD:
            res.set('Accept', 'GET, POST');
            res.status(constants.BAD_METHOD).send(messages.BAD_METHOD);
            break;

        case constants.BAD_REQUEST:
            res.status(constants.BAD_REQUEST).send(extra);
            break;

        case constants.FORBIDDEN:
            res.status(constants.FORBIDDEN).send(messages.FORBIDDEN);
            break;

        case constants.CREATED:
            res.status(constants.CREATED).location(extra.self).json( extra );
            break;

        case constants.ERROR:
            res.status(constants.ERROR).send(extra);
            break;

        case constants.NO_CONTENT:
            res.status(constants.NO_CONTENT).end();
            break;

        case constants.NOT_ACCEPTABLE:
            res.status(constants.NOT_ACCEPTABLE).send(messages.NOT_ACCEPTABLE + extra);
            break;

        case constants.NOT_FOUND:
            res.status(constants.NOT_FOUND).send(messages.NOT_FOUND);
            break;
        
        case constants.OK:
            res.status(constants.OK).json(extra[0]);
            break;
            
        case constants.SEE_OTHER:
            res.status(constants.SEE_OTHER).location(extra).end();
            break;

        case constants.UNSUPPORTED:
            res.status(constants.UNSUPPORTED).send(messages.UNSUPPORTED);
            break;

    }
}