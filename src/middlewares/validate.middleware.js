import ApiError from "../utils/ApiError.js";

export const validate = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details.map((detail) => detail.message).join(", ");
    return next(new ApiError(400, message, error.details));
  }

  req.body = value;
  next();
};
