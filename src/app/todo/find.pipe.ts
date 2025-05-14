import { Pipe, PipeTransform } from '@angular/core';
import { CustomField, Todo } from './todo.interface';

@Pipe({
  name: 'find',
  standalone: true
})
export class FindPipe implements PipeTransform {
  transform(fields: CustomField[] | undefined | null, id: string): CustomField | undefined {
    if (!fields || !Array.isArray(fields)) {
      return undefined;
    }
    return fields.find(field => field.id === id);
  }
}

@Pipe({ 
  name: 'orderByOrder',
  standalone: true
 })
export class OrderByOrderPipe implements PipeTransform {
  transform(todos: Todo[]): Todo[] {
    if (!todos || !Array.isArray(todos)) {
      return [];
    }
    return todos.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}