import { Pipe, PipeTransform } from '@angular/core';
import { CustomField, Todo } from './todo.interface';

@Pipe({
  name: 'find',
  standalone: true
})
export class FindPipe implements PipeTransform {
  transform(fields: CustomField[], id: string): CustomField | undefined {
    return fields.find(field => field.id === id);
  }
} 

@Pipe({ 
  name: 'orderByOrder',
  standalone: true
 })
export class OrderByOrderPipe implements PipeTransform {
  transform(todos: Todo[]): Todo[] {
    return todos.slice().sort((a, b) => a.order - b.order);
  }
}