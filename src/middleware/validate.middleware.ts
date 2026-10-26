import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";

import type { ZodType } from "zod";

/**
 * Validate the request body using a Zod schema.
 */
export function validateBody(
  schema: ZodType,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Request validation failed.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });

      return;
    }

    // Replace the body with validated and transformed data.
    req.body = result.data;

    next();
  };
}

/**
 * Validate URL query parameters.
 */
export function validateQuery(
  schema: ZodType,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Query validation failed.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });

      return;
    }

    // Store the validated query separately.
    res.locals.validatedQuery = result.data;

    next();
  };
}

/**
 * Validate URL route parameters.
 */
export function validateParams(
  schema: ZodType,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Route parameter validation failed.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });

      return;
    }

    // Store validated parameters separately.
    res.locals.validatedParams = result.data;

    next();
  };
}