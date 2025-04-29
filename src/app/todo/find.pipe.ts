import { Pipe, PipeTransform } from '@angular/core';
import { CustomField } from './todo.interface';

@Pipe({
  name: 'find',
  standalone: true
})
export class FindPipe implements PipeTransform {
  transform(fields: CustomField[], id: string): CustomField | undefined {
    return fields.find(field => field.id === id);
  }
} 