class EntityNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "EntityNotFoundError";
        this.statusCode = 404;
    }
}
class ApiError extends Error {
    constructor(message) {
        super(message);
        this.name = "ApiError";
        this.statusCode = 500;
    }
}
class TooManyRequestsError extends Error {
    constructor(message) {
        super(message);
        this.name = "TooManyRequestsError";
        this.statusCode = 429;
    }
}

module.exports = { ApiError, EntityNotFoundError, TooManyRequestsError };
