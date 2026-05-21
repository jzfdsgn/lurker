// Copyright (c) 2026 Brad Root
// SPDX-License-Identifier: MPL-2.0

import type { NextFunction, Request, Response } from 'express';

// Express 4 does not catch rejected promises returned from async route
// handlers — an unhandled rejection there crashes the process. Wrap an async
// handler with this so any rejection is forwarded to the error middleware via
// next() instead.
type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncRouteHandler) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}
