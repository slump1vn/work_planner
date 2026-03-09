import { AfterViewInit, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShepherdService } from './shepherd.service';
import { LS } from '../../core/persistence/storage-keys.const';
import { concatMap, first } from 'rxjs/operators';
import { ProjectService } from '../project/project.service';
import { DataInitStateService } from '../../core/data-init/data-init-state.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'shepherd',
  template: '',
  // templateUrl: './shepherd.component.html',
  // styleUrls: ['./shepherd.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShepherdComponent implements AfterViewInit {
  private shepherdMyService = inject(ShepherdService);
  private _dataInitStateService = inject(DataInitStateService);
  private _projectService = inject(ProjectService);
  private _authService = inject(AuthService);

  ngAfterViewInit(): void {
    const currentUser = this._authService.currentUser();
    if (!currentUser || !this._isFirstLoginForUser(currentUser)) {
      return;
    }

    if (
      !localStorage.getItem(LS.IS_SKIP_TOUR) &&
      navigator.userAgent !== 'NIGHTWATCH' &&
      !navigator.userAgent.includes('PLAYWRIGHT')
    ) {
      this._markFirstLoginHandled(currentUser);
      this._dataInitStateService.isAllDataLoadedInitially$
        .pipe(
          concatMap(() => this._projectService.list$),
          first(),
        )
        .subscribe((projectList) => {
          if (projectList.length <= 2) {
            this.shepherdMyService.init();
          } else {
            localStorage.setItem(LS.IS_SKIP_TOUR, 'true');
          }
        });
    }
  }

  private _isFirstLoginForUser(userName: string): boolean {
    return !localStorage.getItem(this._getFirstLoginHandledKey(userName));
  }

  private _markFirstLoginHandled(userName: string): void {
    localStorage.setItem(this._getFirstLoginHandledKey(userName), 'true');
  }

  private _getFirstLoginHandledKey(userName: string): string {
    return `SUP_TOUR_FIRST_LOGIN_HANDLED_${userName.toLowerCase()}`;
  }
}
