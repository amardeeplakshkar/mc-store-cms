import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    const res = this.schema.safeParse(value ?? {});
    if (!res.success) {
      throw new BadRequestException({
        message: res.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '),
        issues: res.error.issues,
      });
    }
    return res.data;
  }
}
