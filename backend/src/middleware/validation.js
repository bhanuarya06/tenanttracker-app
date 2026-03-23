const { sendError } = require('../utils/response');

const validate = (schema) => {
  return (req, res, next) => {
    const dataToValidate = { ...req.body, ...req.query, ...req.params };
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      return sendError(res, messages, 400);
    }
    // Merge validated values back
    Object.keys(req.body).forEach((k) => { if (value[k] !== undefined) req.body[k] = value[k]; });
    Object.keys(req.query).forEach((k) => { if (value[k] !== undefined) req.query[k] = value[k]; });
    next();
  };
};

const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      return sendError(res, messages, 400);
    }
    req.body = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      return sendError(res, messages, 400);
    }
    req.query = value;
    next();
  };
};

module.exports = { validate, validateBody, validateQuery };
