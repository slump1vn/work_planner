import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

import { AuthService } from '../../core/auth/auth.service';
import { TODAY_TAG } from '../../features/tag/tag.const';

@Component({
  selector: 'login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
  ],
})
export class LoginPageComponent {
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _activatedRoute = inject(ActivatedRoute);

  readonly userNameCtrl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly passwordCtrl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  readonly isInvalidCredentials = signal(false);

  login(): void {
    this.isInvalidCredentials.set(false);

    if (this.userNameCtrl.invalid || this.passwordCtrl.invalid) {
      this.userNameCtrl.markAsTouched();
      this.passwordCtrl.markAsTouched();
      return;
    }

    const isSuccess = this._authService.login(
      this.userNameCtrl.value,
      this.passwordCtrl.value,
    );

    if (!isSuccess) {
      this.isInvalidCredentials.set(true);
      return;
    }

    const redirectUrl = this._activatedRoute.snapshot.queryParamMap.get('redirectUrl');
    const fallbackUrl = `/tag/${TODAY_TAG.id}/tasks`;
    const targetUrl =
      redirectUrl && !redirectUrl.startsWith('/login') ? redirectUrl : fallbackUrl;

    void this._router.navigateByUrl(targetUrl, { replaceUrl: true }).catch(() => {
      void this._router.navigateByUrl(fallbackUrl, { replaceUrl: true });
    });
  }
}
