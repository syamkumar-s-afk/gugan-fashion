import { authService, validatePassword } from '../services/auth';
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
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" placeholder="Enter password" required>
            <div id="password-validation" class="validation-info"></div>
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

  // Event Listeners
  const closeBtn = document.getElementById('modal-close');
  const overlay = document.getElementById('modal-overlay');
  const form = document.getElementById('auth-form');
  const passwordInput = document.getElementById('password');
  const validationDiv = document.getElementById('password-validation');

  const close = () => {
    modalRoot.innerHTML = '';
    actions.closeModal();
  };

  closeBtn.onclick = close;
  overlay.onclick = (e) => { if(e.target === overlay) close(); };

  // Real-time validation for signup
  if (type === 'signup') {
    passwordInput.oninput = (e) => {
      const { errors } = validatePassword(e.target.value);
      validationDiv.innerHTML = errors.map(err => `<p class="error">${err}</p>`).join('');
    };
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = passwordInput.value;
    const submitBtn = document.getElementById('auth-submit');
    
    submitBtn.disabled = true;
    submitBtn.innerText = 'PROCESSING...';

    try {
      if (type === 'signup') {
        const fullName = document.getElementById('full-name').value;
        await authService.signUp(email, password, fullName);
        alert('Signup successful! Please check your email for verification.');
      } else {
        await authService.signIn(email, password);
      }
      close();
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = type === 'login' ? 'LOGIN' : 'SIGN UP';
    }
  };

  document.getElementById('switch-to-signup')?.addEventListener('click', () => renderAuthModal('signup'));
  document.getElementById('switch-to-login')?.addEventListener('click', () => renderAuthModal('login'));
};
