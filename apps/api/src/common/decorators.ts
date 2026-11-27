import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AppRequest } from './types';

export const Auth = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AppRequest>().auth);
export const CurrentStore = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AppRequest>().store);
