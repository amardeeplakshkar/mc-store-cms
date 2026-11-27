import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@mcstore/db';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      return res.status(exception.getStatus()).json(typeof body === 'string' ? { message: body } : body);
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        return res.status(HttpStatus.CONFLICT).json({ message: `Already exists${target ? ` (${target})` : ''}` });
      }
      if (exception.code === 'P2025') return res.status(HttpStatus.NOT_FOUND).json({ message: 'Not found' });
      if (exception.code === 'P2003') return res.status(HttpStatus.CONFLICT).json({ message: 'Record is in use' });
    }
    console.error(exception);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
}
