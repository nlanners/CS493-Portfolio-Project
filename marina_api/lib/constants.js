module.exports.constants = {
    'BOAT': 'Boats',
    'LOAD': 'Loads',
    'USER': 'Users',
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
        case this.constants.BAD_METHOD:
            res.set('Accept', 'GET, POST');
            res.status(this.constants.BAD_METHOD).json({"error":this.messages.BAD_METHOD});
            break;

    case    this.constants.BAD_REQUEST:
            res.status(this.constants.BAD_REQUEST).send(extra);
            break;

        case this.constants.FORBIDDEN:
            res.status(this.constants.FORBIDDEN).json({"error":this.messages.FORBIDDEN});
            break;

        case this.constants.CREATED:
            res.status(this.constants.CREATED).location(extra.self).json( extra );
            break;

        case this.constants.ERROR:
            res.status(this.constants.ERROR).json({"error": extra});
            break;

        case this.constants.NO_CONTENT:
            res.status(this.constants.NO_CONTENT).end();
            break;

        case this.constants.NOT_ACCEPTABLE:
            res.status(this.constants.NOT_ACCEPTABLE).json({"error": this.messages.NOT_ACCEPTABLE + extra});
            break;

        case this.constants.NOT_FOUND:
            res.status(this.constants.NOT_FOUND).json({"error":this.messages.NOT_FOUND});
            break;
        
        case this.constants.OK:
            res.status(this.constants.OK).json(extra[0]);
            break;
            
        case this.constants.SEE_OTHER:
            res.status(this.constants.SEE_OTHER).location(extra).end();
            break;

        case this.constants.UNSUPPORTED:
            res.status(this.constants.UNSUPPORTED).json({"error":this.messages.UNSUPPORTED});
            break;

    }
}

module.exports.check_accept = (req, res) => {
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        this.handle_response(res, this.constants.NOT_ACCEPTABLE, 'application/json');
        return false;
    }
    return true;
}