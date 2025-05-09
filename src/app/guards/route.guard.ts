import { inject } from '@angular/core';
import { NavigationService } from '../services/navigation.service';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { take } from 'rxjs';

export const projectIdGuard = () => {
    const navigationService = inject(NavigationService);
    const router = inject(Router);

    return navigationService.selectedProjectId$.pipe(
      take(1),
      map(projectId => {
        if (projectId) {
          return true;
        } else {
          router.navigate(['/projects']);
          return false;
        }
      })
    );
  };