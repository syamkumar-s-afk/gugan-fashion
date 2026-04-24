import { authService, validateSignupEmail } from '../services/auth';
import { actions } from '../store';

export const renderAuthModal = (type = 'login') => {
  const modalRoot = document.getElementById('auth-modal-root');

  modalRoot.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-content glass">
        <button class="close-btn" id="modal-close">&times;</button>
        <div class="auth-header">
          <h2>${type === 'login' ? 'Login' : 'Signup'}</h2>
          <p>${type === 'login' ? 'Welcome back to Gugan Fashions' : 'Create an account to start shopping'}</p>
        </div>

        <form id="auth-form" class="auth-form">
          ${type === 'signup' ? `
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" id="full-name" placeholder="Enter your name" required>
            </div>
          ` : ''}
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="email" placeholder="Enter your email" required>
            <div id="email-validation" class="validation-info"></div>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" placeholder="Enter password" required>
          </div>

          <button type="submit" class="submit-btn" id="auth-submit">
            ${type === 'login' ? 'LOGIN' : 'SIGN UP'}
          </button>
        </form>

        <div class="auth-footer">
          ${type === 'login'
            ? `New to Gugan Fashions? <button id="switch-to-signup">Create Account</button>`
            : `Already have an account? <button id="switch-to-login">Login</button>`}
        </div>
      </div>
    </div>
  `;

  const closeBtn = document.getElementById('modal-close');
  const overlay = document.getElementById('modal-overlay');
  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailValidationDiv = document.getElementById('email-validation');

  const close = () => {
    modalRoot.innerHTML = '';
    actions.closeModal();
  };

  closeBtn.onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  if (type === 'signup') {
    emailInput.oninput = (e) => {
      const { errors } = validateSignupEmail(e.target.value);
      emailValidationDiv.innerHTML = errors.map(err => `<p class="error">${err}</p>`).join('');
    };
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const submitBtn = document.getElementById('auth-submit');

    submitBtn.disabled = true;
    submitBtn.innerText = 'PROCESSING...';

    try {
      if (type === 'signup') {
        const fullName = document.getElementById('full-name').value.trim();
        const { isValid, errors } = validateSignupEmail(email);
        if (!isValid) {
          emailValidationDiv.innerHTML = errors.map(err => `<p class="error">${err}</p>`).join('');
          throw new Error('Please correct the highlighted email issues.');
        }
        await authService.signUp(email, password, fullName);
        toast.success('Signup successful! Please check your email for verification.');
      } else {
        await authService.signIn(email, password);
        toast.success('Login successful!');
      }
      close();
    } catch (err) {
      toast.error(err.message || 'Authentication failed.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = type === 'login' ? 'LOGIN' : 'SIGN UP';
    }
  };

  document.getElementById('switch-to-signup')?.addEventListener('click', () => {
    close();
    window.app?.navigate('/signup');
  });
  document.getElementById('switch-to-login')?.addEventListener('click', () => {
    close();
    window.app?.navigate('/login');
  });
};
