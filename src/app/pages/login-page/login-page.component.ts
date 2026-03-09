import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButton, MatFormField, MatInput, MatLabel],
})
export class LoginPageComponent {
  readonly authService = inject(AuthService);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);

  username = '';
  password = '';
  statusMessage = signal('');
  submitCount = signal(0);
  isLoading = signal(false);

  async login(): Promise<void> {
    this.submitCount.set(this.submitCount() + 1);
    this.statusMessage.set('');
    this.isLoading.set(true);

    const isLoggedIn = await this.authService.login(this.username, this.password);
    if (!isLoggedIn) {
      this.statusMessage.set('Invalid username or password');
      this.isLoading.set(false);
      return;
    }

    this.statusMessage.set('Login successful');
    const returnUrl = this._route.snapshot.queryParamMap.get('returnUrl');
    await this._router.navigateByUrl(returnUrl || '/');
    this.isLoading.set(false);
  }
}
