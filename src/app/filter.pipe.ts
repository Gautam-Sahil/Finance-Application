import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], field: string, value?: string): any {
    if (!items) return [];
    return items.find(item => item._id === value);
  }
}